import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { store } from "@/lib/store";
import { VerificationStatus, ReportStatus, Role } from "@prisma/client";
import { formatBusinessRecord } from "@/lib/format-business";

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
      totalSectors,
      totalCells,
      recentAuditLogs,
      businesses,
      captures,
      reports,
      demands,
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
      prisma.geographicSector.count(),
      prisma.geographicCell.count(),
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true, role: true } } },
      }),
      prisma.business.findMany({
        take: 50,
        orderBy: { updatedAt: "desc" },
        include: { products: true, verifications: true, localArea: true },
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
    ]);

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
        totalSectors,
        totalCells,
      },
      auditLogs: recentAuditLogs,
      businesses: businesses.map(formatBusinessRecord),
      captures,
      reports,
      demands,
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

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (error) {
    console.error("[Admin API PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to perform admin action" }, { status: 500 });
  }
}
