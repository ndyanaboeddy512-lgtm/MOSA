import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { store } from "@/lib/store";
import { VerificationStatus, ReportStatus, Role } from "@prisma/client";
import { formatBusinessRecord } from "@/lib/format-business";
import { sendBusinessSMS } from "@/lib/sms";

// GET /api/admin - Fetch administrative overview, metrics, and queues
export async function GET() {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const [
      totalBusinesses,
      verifiedCount,
      demoCount,
      researchedCount,
      verifiedDataCount,
      totalUsers,
      agentCount,
      openReportsCount,
      totalCaptures,
      totalProvinces,
      totalDistricts,
      totalSectors,
      totalCells,
      totalLocalAreas,
      totalProducts,
      estimatedProductsCount,
      recentAuditLogs,
      businesses,
      captures,
      reports,
      demands,
      pendingClaimsCount,
      claims,
      smsMessages,
      changeHistories,
    ] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { verificationStatus: { in: [VerificationStatus.AGENT_VERIFIED, VerificationStatus.HIGH_CONFIDENCE] } } }),
      prisma.business.count({ where: { dataStatus: "DEMO" } }),
      prisma.business.count({ where: { dataStatus: "RESEARCHED" } }),
      prisma.business.count({ where: { dataStatus: "VERIFIED" } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.COMMUNITY_AGENT } }),
      prisma.report.count({ where: { status: ReportStatus.OPEN } }),
      prisma.receiptCapture.count(),
      prisma.geographicProvince.count(),
      prisma.geographicDistrict.count(),
      prisma.geographicSector.count(),
      prisma.geographicCell.count(),
      prisma.localArea.count(),
      prisma.product.count(),
      prisma.product.count({ where: { isEstimated: true } }),
      prisma.auditLog.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true, role: true } } },
      }),
      prisma.business.findMany({
        take: 150,
        orderBy: { updatedAt: "desc" },
        include: {
          products: true,
          verifications: true,
          localArea: true,
          districtRel: true,
          provinceRel: true,
          sectorRel: true,
          cellRel: true,
        },
      }),
      prisma.receiptCapture.findMany({
        take: 30,
        orderBy: { uploadedAt: "desc" },
        include: { items: true, agent: { select: { name: true, phone: true } } },
      }),
      prisma.report.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          business: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.communityDemand.findMany({
        take: 20,
        orderBy: { searchCount: "desc" },
      }),
      prisma.businessClaim.count({ where: { status: "PENDING" } }),
      prisma.businessClaim.findMany({
        take: 40,
        orderBy: { claimedAt: "desc" },
        include: {
          business: { select: { id: true, name: true, phone: true, cell: true, sector: true } },
          user: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.sMSMessage.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          business: { select: { id: true, name: true } },
        },
      }),
      prisma.businessChangeHistory.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          business: { select: { id: true, name: true, cell: true } },
          actor: { select: { id: true, name: true, role: true } },
          product: { select: { name: true } },
        },
      }),
    ]);

    // Duplicate detection analysis across businesses
    const duplicatesMap: Record<string, string[]> = {};
    for (const b of businesses) {
      const key = `${b.name.trim().toLowerCase()}__${b.cell.trim().toLowerCase()}`;
      if (!duplicatesMap[key]) duplicatesMap[key] = [];
      duplicatesMap[key].push(b.id);
    }
    const duplicateIds = new Set<string>();
    for (const ids of Object.values(duplicatesMap)) {
      if (ids.length > 1) {
        ids.forEach((id) => duplicateIds.add(id));
      }
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalBusinesses,
        verifiedCount,
        unverifiedCount: totalBusinesses - verifiedCount,
        demoCount,
        researchedCount,
        verifiedDataCount,
        totalUsers,
        agentCount,
        openReportsCount,
        totalCaptures,
        totalProvinces,
        totalDistricts,
        totalSectors,
        totalCells,
        totalLocalAreas,
        totalProducts,
        estimatedProductsCount,
        potentialDuplicatesCount: duplicateIds.size,
        pendingClaimsCount,
        totalSMSCount: smsMessages.length,
      },
      auditLogs: recentAuditLogs,
      businesses: businesses.map((b: any) => ({
        ...formatBusinessRecord(b),
        isPotentialDuplicate: duplicateIds.has(b.id),
      })),
      captures,
      reports,
      demands,
      claims: claims.map((c: any) => ({
        id: c.id,
        businessId: c.businessId,
        businessName: c.business.name,
        businessPhone: c.business.phone,
        businessLocation: `${c.business.cell}, ${c.business.sector}`,
        userId: c.userId,
        claimantName: c.ownerName || c.user.name,
        claimPhone: c.claimPhone,
        status: c.status,
        verificationNotes: c.verificationNotes,
        claimedAt: c.claimedAt.toISOString(),
      })),
      smsMessages: smsMessages.map((s: any) => ({
        id: s.id,
        businessId: s.businessId,
        businessName: s.business?.name || "System Alert",
        recipientPhone: s.recipientPhone,
        templateId: s.templateId,
        language: s.language,
        messageBody: s.messageBody,
        provider: s.provider,
        status: s.status,
        sentAt: s.sentAt ? s.sentAt.toISOString() : null,
        createdAt: s.createdAt.toISOString(),
      })),
      changeHistories: changeHistories.map((h: any) => ({
        id: h.id,
        businessId: h.businessId,
        businessName: h.business.name,
        businessCell: h.business.cell,
        actorId: h.actorId,
        actorName: h.actor?.name || "System",
        actorRole: h.actor?.role || "SYSTEM",
        action: h.action,
        fieldChanged: h.fieldChanged,
        previousValue: h.previousValue,
        newValue: h.newValue,
        approvalStatus: h.approvalStatus,
        source: h.source,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.warn("[Admin API DB Fallback]:", error);
    // Fallback to store
    const biz = store.getBusinesses();
    const reps = store.getReports();
    const caps = store.getCaptures();
    const dems = store.getDemands();

    return NextResponse.json({
      success: true,
      metrics: {
        totalBusinesses: biz.length,
        verifiedCount: biz.filter((b) => b.verificationStatus === "HIGH_CONFIDENCE" || b.verificationStatus === "AGENT_VERIFIED").length,
        unverifiedCount: biz.filter((b) => b.verificationStatus === "UNVERIFIED").length,
        totalUsers: 6,
        agentCount: 1,
        openReportsCount: reps.filter((r) => r.status === "OPEN").length,
        totalCaptures: caps.length,
      },
      auditLogs: [],
      businesses: biz,
      captures: caps,
      reports: reps,
      demands: dems,
    });
  }
}

// PATCH /api/admin - Execute administrative actions (verify, suspend, resolve report)
export async function PATCH(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const { action, businessId, reportId, verificationStatus, status, notes } = body;

    if (action === "TOGGLE_VERIFICATION" && businessId) {
      const newStatus = verificationStatus === "HIGH_CONFIDENCE" || verificationStatus === "AGENT_VERIFIED"
        ? VerificationStatus.HIGH_CONFIDENCE
        : VerificationStatus.AGENT_VERIFIED;

      await prisma.business.update({
        where: { id: businessId },
        data: { verificationStatus: newStatus },
      });

      await prisma.verificationRecord.create({
        data: {
          businessId,
          userId: auth.user.id,
          type: "ADMIN_STATUS_UPDATE",
          notes: notes || `Verification updated to ${newStatus} by ${auth.user.name}`,
        },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "BUSINESS_VERIFICATION_UPDATED",
        entityType: "BUSINESS",
        entityId: businessId,
        metadata: { newStatus, previousStatus: verificationStatus },
      });

      // Keep store synchronized
      store.updateBusinessVerification(businessId, newStatus as any);

      return NextResponse.json({ success: true, newStatus });
    }

    if (action === "RESOLVE_REPORT" && reportId) {
      const targetStatus = status === "RESOLVED" ? ReportStatus.RESOLVED : ReportStatus.DISMISSED;

      await prisma.report.update({
        where: { id: reportId },
        data: { status: targetStatus },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "REPORT_RESOLVED",
        entityType: "REPORT",
        entityId: reportId,
        metadata: { status: targetStatus, resolvedBy: auth.user.name },
      });

      // Keep store synchronized
      store.updateReportStatus(reportId, targetStatus as any);

      return NextResponse.json({ success: true, status: targetStatus });
    }

    if (action === "UPDATE_STATUS" && businessId) {
      const bizStatus = status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";

      await prisma.business.update({
        where: { id: businessId },
        data: { status: bizStatus },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "BUSINESS_STATUS_MODIFIED",
        entityType: "BUSINESS",
        entityId: businessId,
        metadata: { status: bizStatus },
      });

      return NextResponse.json({ success: true, status: bizStatus });
    }

    if (action === "UPDATE_DATA_STATUS" && businessId) {
      const { dataStatus: targetDataStatus } = body;
      const validStatuses = ["DEMO", "RESEARCHED", "VERIFIED"];
      if (!validStatuses.includes(targetDataStatus)) {
        return NextResponse.json({ error: "Invalid dataStatus" }, { status: 400 });
      }

      const updated = await prisma.business.update({
        where: { id: businessId },
        data: {
          dataStatus: targetDataStatus as any,
          lastVerifiedAt: targetDataStatus === "VERIFIED" ? new Date() : undefined,
        },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "BUSINESS_DATA_STATUS_MODIFIED",
        entityType: "BUSINESS",
        entityId: businessId,
        metadata: { newDataStatus: targetDataStatus },
      });

      return NextResponse.json({ success: true, dataStatus: updated.dataStatus });
    }

    if (action === "EDIT_BUSINESS" && businessId) {
      const {
        name,
        category,
        description,
        phone,
        cell,
        sector,
        district,
        priceRangeMin,
        priceRangeMax,
        dataStatus: editDataStatus,
        verificationStatus: editVerifStatus,
      } = body;

      const updated = await prisma.business.update({
        where: { id: businessId },
        data: {
          ...(name ? { name } : {}),
          ...(category ? { category, categoryDisplay: category } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(phone ? { phone } : {}),
          ...(cell ? { cell } : {}),
          ...(sector ? { sector } : {}),
          ...(district ? { district } : {}),
          ...(priceRangeMin !== undefined ? { priceRangeMin: Number(priceRangeMin) } : {}),
          ...(priceRangeMax !== undefined ? { priceRangeMax: Number(priceRangeMax) } : {}),
          ...(editDataStatus ? { dataStatus: editDataStatus } : {}),
          ...(editVerifStatus ? { verificationStatus: editVerifStatus } : {}),
        },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "ADMIN_BUSINESS_EDITED",
        entityType: "BUSINESS",
        entityId: businessId,
        metadata: { updatedFields: Object.keys(body) },
      });

      return NextResponse.json({ success: true, business: updated });
    }

    if (action === "ARCHIVE_BUSINESS" && businessId) {
      const updated = await prisma.business.update({
        where: { id: businessId },
        data: { status: "ARCHIVED" },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "ADMIN_BUSINESS_ARCHIVED",
        entityType: "BUSINESS",
        entityId: businessId,
      });

      return NextResponse.json({ success: true, status: "ARCHIVED" });
    }

    if (action === "APPROVE_CLAIM" && body.claimId) {
      const claim = await prisma.businessClaim.update({
        where: { id: body.claimId },
        data: {
          status: "APPROVED",
          reviewedBy: auth.user.name,
          reviewedAt: new Date(),
        },
        include: { business: true },
      });

      await prisma.business.update({
        where: { id: claim.businessId },
        data: {
          ownerId: claim.userId,
          isClaimed: true,
          claimedAt: new Date(),
          claimPhone: claim.claimPhone,
          verificationStatus: VerificationStatus.BUSINESS_VERIFIED,
        },
      });

      await prisma.user.update({
        where: { id: claim.userId },
        data: { role: Role.BUSINESS_OWNER },
      });

      await prisma.businessChangeHistory.create({
        data: {
          businessId: claim.businessId,
          actorId: auth.user.id,
          action: "CLAIM_APPROVED",
          fieldChanged: "ownerId",
          previousValue: null,
          newValue: claim.userId,
          approvalStatus: "APPROVED",
          source: "COMMAND_CENTER",
          metadata: JSON.stringify({ approvedBy: auth.user.name, claimId: claim.id }),
        },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "ADMIN_CLAIM_APPROVED",
        entityType: "BUSINESS_CLAIM",
        entityId: claim.id,
        metadata: { businessId: claim.businessId, claimant: claim.userId },
      });

      if (claim.claimPhone) {
        await sendBusinessSMS({
          businessId: claim.businessId,
          recipientPhone: claim.claimPhone,
          templateId: "PROFILE_CONFIRMATION",
          language: "rw",
          variables: { businessName: claim.business.name },
        }).catch(() => {});
      }

      revalidatePath(`/business/${claim.businessId}`);
      revalidatePath("/explore");

      return NextResponse.json({ success: true, claim });
    }

    if (action === "REJECT_CLAIM" && body.claimId) {
      const claim = await prisma.businessClaim.update({
        where: { id: body.claimId },
        data: {
          status: "REJECTED",
          reviewedBy: auth.user.name,
          reviewedAt: new Date(),
          verificationNotes: body.notes || "Rejected by governance team",
        },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "ADMIN_CLAIM_REJECTED",
        entityType: "BUSINESS_CLAIM",
        entityId: claim.id,
        metadata: { reason: body.notes },
      });

      return NextResponse.json({ success: true, claim });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (error) {
    console.error("[Admin API PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to perform admin action" }, { status: 500 });
  }
}
