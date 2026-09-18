import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, maskNationalId, decryptSensitiveText } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
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
      flaggedMediaCount,
      flaggedProductsCount,
      businessesRequiringReviewCount,
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
          owner: { select: { id: true, name: true, phone: true } },
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
      prisma.businessMedia.count({ where: { moderationStatus: { in: ["FLAGGED", "REMOVED"] } } }),
      prisma.product.count({ where: { moderationStatus: { in: ["FLAGGED", "REMOVED"] } } }),
      prisma.business.count({ where: { status: { in: ["PENDING", "NEEDS_CORRECTION"] } } }),
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

    // Structured Location & Category Cross-tabulation Breakdown
    const locationCategoryBreakdown: Record<string, {
      sector: string;
      district: string;
      province: string;
      total: number;
      categories: Record<string, number>;
      subCategories: Record<string, number>;
      businessTypes: Record<string, number>;
      cells: Record<string, number>;
    }> = {};

    for (const b of businesses) {
      const sectorKey = b.sector?.trim() || "Unspecified";
      if (!locationCategoryBreakdown[sectorKey]) {
        locationCategoryBreakdown[sectorKey] = {
          sector: sectorKey,
          district: b.district?.trim() || "Unspecified",
          province: b.provinceRel?.name || (b as any).province || "Kigali City",
          total: 0,
          categories: {},
          subCategories: {},
          businessTypes: {},
          cells: {},
        };
      }
      const item = locationCategoryBreakdown[sectorKey];
      item.total += 1;

      const mainCat = b.mainCategory || b.category || "retail";
      item.categories[mainCat] = (item.categories[mainCat] || 0) + 1;

      if (b.subCategory) {
        item.subCategories[b.subCategory] = (item.subCategories[b.subCategory] || 0) + 1;
      }

      const bType = b.businessType || b.businessTypeDisplay || b.category || "general";
      item.businessTypes[bType] = (item.businessTypes[bType] || 0) + 1;

      if (b.cell) {
        item.cells[b.cell.trim()] = (item.cells[b.cell.trim()] || 0) + 1;
      }
    }

    // Global Category & Subcategory Aggregates
    const categorySummary: Record<string, {
      count: number;
      subCategories: Record<string, number>;
      businessTypes: Record<string, number>;
    }> = {};

    for (const b of businesses) {
      const mainCat = b.mainCategory || b.category || "retail";
      if (!categorySummary[mainCat]) {
        categorySummary[mainCat] = { count: 0, subCategories: {}, businessTypes: {} };
      }
      categorySummary[mainCat].count += 1;
      if (b.subCategory) {
        categorySummary[mainCat].subCategories[b.subCategory] = (categorySummary[mainCat].subCategories[b.subCategory] || 0) + 1;
      }
      if (b.businessType) {
        categorySummary[mainCat].businessTypes[b.businessType] = (categorySummary[mainCat].businessTypes[b.businessType] || 0) + 1;
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
        itemsRequiringAttention: openReportsCount + flaggedMediaCount + flaggedProductsCount,
        flaggedMediaCount,
        flaggedProductsCount,
        businessesRequiringReview: businessesRequiringReviewCount,
      },
      locationCategoryBreakdown,
      categorySummary,
      auditLogs: recentAuditLogs,
      businesses: businesses.map((b: any) => ({
        ...formatBusinessRecord(b),
        isPotentialDuplicate: duplicateIds.has(b.id),
        owner: b.owner,
        verifications: b.verifications,
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
        nationalId: c.nationalIdOrDoc ? maskNationalId(decryptSensitiveText(c.nationalIdOrDoc)) : undefined,
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
    console.error("[Admin API DB Error]:", error);
    return NextResponse.json({
      error: "Failed to load administrative dashboard from PostgreSQL database",
    }, { status: 500 });
  }
}

// PATCH /api/admin - Execute administrative actions (verify, suspend, resolve report)
export async function PATCH(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const adminUser = auth.user;

  try {
    const body = await request.json();
    const { action, businessId, reportId, verificationStatus, status, notes } = body;

    if (action === "APPROVE_BUSINESS" && businessId) {
      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id: businessId },
          data: {
            status: "ACTIVE",
            verificationStatus: VerificationStatus.HIGH_CONFIDENCE,
            dataStatus: "VERIFIED",
            lastVerifiedAt: new Date(),
          },
        });

        await tx.verificationRecord.create({
          data: {
            businessId,
            userId: adminUser.id,
            type: "ADMIN_APPROVAL",
            notes: notes || `Business approved and verified by ${adminUser.name}`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "BUSINESS_APPROVED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({
              approvedBy: adminUser.name,
              status: "ACTIVE",
              verificationStatus: "HIGH_CONFIDENCE",
            }),
          },
        });

        // Automatically create persistent database notification for the owner
        if (b.ownerId) {
          await tx.notification.create({
            data: {
              userId: b.ownerId,
              title: "Business Verified by MOSA / Ubucuruzi Bwawe Bwemejwe",
              message: `Congratulations! Your business "${b.name}" has been verified by MOSA. Your business profile is now approved and active on the platform. You can access your Business Dashboard to manage your operations and catalogue.`,
            },
          });
        }

        return b;
      });

      // Send SMS alert to business owner
      if (updated.phone) {
        sendBusinessSMS({
          businessId,
          recipientPhone: updated.phone,
          templateId: "PROFILE_CONFIRMATION",
          language: "rw",
          variables: {
            businessName: updated.name,
          },
        }).catch(() => {});
      }

      revalidatePath(`/business/${businessId}`);
      revalidatePath("/explore");
      revalidatePath("/admin");

      return NextResponse.json({
        success: true,
        status: updated.status,
        verificationStatus: updated.verificationStatus,
      });
    }

    if (action === "REQUEST_CORRECTIONS" && businessId) {
      const feedbackNotes = notes || "Please review and update your business information according to MOSA verification guidelines.";

      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id: businessId },
          data: {
            status: "NEEDS_CORRECTION",
          },
        });

        await tx.verificationRecord.create({
          data: {
            businessId,
            userId: adminUser.id,
            type: "CORRECTIONS_REQUESTED",
            notes: feedbackNotes,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "CORRECTIONS_REQUESTED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({
              requestedBy: adminUser.name,
              status: "NEEDS_CORRECTION",
              notes: feedbackNotes,
            }),
          },
        });

        // Create notification for owner with feedback notes
        if (b.ownerId) {
          await tx.notification.create({
            data: {
              userId: b.ownerId,
              title: "Corrections Requested / Amavugurura Arasabwa",
              message: `MOSA Admin reviewed your application for "${b.name}" and requested the following corrections: "${feedbackNotes}". Please visit your Business Dashboard to update your details and resubmit.`,
            },
          });
        }

        return b;
      });

      // Send SMS alert regarding requested corrections
      if (updated.phone) {
        sendBusinessSMS({
          businessId,
          recipientPhone: updated.phone,
          templateId: "SECURITY_ALERT",
          language: "rw",
          variables: {
            businessName: updated.name,
            reason: feedbackNotes,
          },
        }).catch(() => {});
      }

      revalidatePath(`/business/${businessId}`);
      revalidatePath("/admin");

      return NextResponse.json({
        success: true,
        status: updated.status,
        notes: feedbackNotes,
      });
    }

    if (action === "REJECT_BUSINESS" && businessId) {
      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id: businessId },
          data: {
            status: "SUSPENDED",
          },
        });

        await tx.verificationRecord.create({
          data: {
            businessId,
            userId: adminUser.id,
            type: "ADMIN_REJECTION",
            notes: notes || `Business registration rejected by ${adminUser.name}`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "BUSINESS_REJECTED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({
              rejectedBy: adminUser.name,
              status: "SUSPENDED",
              reason: notes || "Did not meet verification criteria",
            }),
          },
        });

        if (b.ownerId) {
          await tx.notification.create({
            data: {
              userId: b.ownerId,
              title: "Application Status Update / Imiterere y'Ubucuruzi",
              message: `Your business application for "${b.name}" was not approved: ${notes || "Did not meet verification criteria."}`,
            },
          });
        }

        return b;
      });

      revalidatePath(`/business/${businessId}`);
      revalidatePath("/explore");
      revalidatePath("/admin");

      return NextResponse.json({
        success: true,
        status: updated.status,
      });
    }

    if (action === "TOGGLE_VERIFICATION" && businessId) {
      const newStatus = verificationStatus === "HIGH_CONFIDENCE" || verificationStatus === "AGENT_VERIFIED"
        ? VerificationStatus.HIGH_CONFIDENCE
        : VerificationStatus.AGENT_VERIFIED;

      await prisma.$transaction([
        prisma.business.update({
          where: { id: businessId },
          data: { verificationStatus: newStatus },
        }),
        prisma.verificationRecord.create({
          data: {
            businessId,
            userId: adminUser.id,
            type: "ADMIN_STATUS_UPDATE",
            notes: notes || `Verification updated to ${newStatus} by ${adminUser.name}`,
          },
        }),
        prisma.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "BUSINESS_VERIFICATION_UPDATED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({ newStatus, previousStatus: verificationStatus }),
          },
        }),
      ]);

      return NextResponse.json({ success: true, newStatus });
    }

    if (action === "RESOLVE_REPORT" && reportId) {
      const targetStatus = status === "RESOLVED" ? ReportStatus.RESOLVED : ReportStatus.DISMISSED;

      await prisma.$transaction([
        prisma.report.update({
          where: { id: reportId },
          data: { status: targetStatus },
        }),
        prisma.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "REPORT_RESOLVED",
            entityType: "REPORT",
            entityId: reportId,
            metadata: JSON.stringify({ status: targetStatus, resolvedBy: adminUser.name }),
          },
        }),
      ]);

      return NextResponse.json({ success: true, status: targetStatus });
    }

    if (action === "UPDATE_STATUS" && businessId) {
      const bizStatus = status === "SUSPENDED" ? "SUSPENDED" : status === "PENDING" ? "PENDING" : "ACTIVE";

      await prisma.$transaction([
        prisma.business.update({
          where: { id: businessId },
          data: { status: bizStatus },
        }),
        prisma.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "BUSINESS_STATUS_MODIFIED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({ status: bizStatus }),
          },
        }),
      ]);

      return NextResponse.json({ success: true, status: bizStatus });
    }

    if (action === "UPDATE_DATA_STATUS" && businessId) {
      const { dataStatus: targetDataStatus } = body;
      const validStatuses = ["DEMO", "RESEARCHED", "VERIFIED"];
      if (!validStatuses.includes(targetDataStatus)) {
        return NextResponse.json({ error: "Invalid dataStatus" }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id: businessId },
          data: {
            dataStatus: targetDataStatus as any,
            lastVerifiedAt: targetDataStatus === "VERIFIED" ? new Date() : undefined,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "BUSINESS_DATA_STATUS_MODIFIED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({ newDataStatus: targetDataStatus }),
          },
        });

        return b;
      });

      return NextResponse.json({ success: true, dataStatus: updated.dataStatus });
    }

    if (action === "EDIT_BUSINESS" && businessId) {
      const {
        name,
        category,
        mainCategory,
        subCategory,
        businessType,
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

      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id: businessId },
          data: {
            ...(name ? { name } : {}),
            ...(category ? { category, categoryDisplay: category } : {}),
            ...(mainCategory ? { mainCategory } : {}),
            ...(subCategory ? { subCategory } : {}),
            ...(businessType ? { businessType, businessTypeDisplay: businessType } : {}),
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

        await tx.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "ADMIN_BUSINESS_EDITED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({ updatedFields: Object.keys(body) }),
          },
        });

        return b;
      });

      return NextResponse.json({ success: true, business: updated });
    }

    if (action === "ARCHIVE_BUSINESS" && businessId) {
      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id: businessId },
          data: { status: "ARCHIVED" },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminUser.id,
            action: "ADMIN_BUSINESS_ARCHIVED",
            entityType: "BUSINESS",
            entityId: businessId,
          },
        });

        return b;
      });

      return NextResponse.json({ success: true, status: "ARCHIVED" });
    }

    if (action === "APPROVE_CLAIM" && body.claimId) {
      const adminUser = auth.user!;
      const claim = await prisma.$transaction(async (tx) => {
        const c = await tx.businessClaim.update({
          where: { id: body.claimId },
          data: {
            status: "APPROVED",
            reviewedBy: adminUser.name,
            reviewedAt: new Date(),
          },
          include: { business: true },
        });

        await tx.business.update({
          where: { id: c.businessId },
          data: {
            ownerId: c.userId,
            isClaimed: true,
            claimedAt: new Date(),
            claimPhone: c.claimPhone,
            verificationStatus: VerificationStatus.BUSINESS_VERIFIED,
          },
        });

        await tx.user.update({
          where: { id: c.userId },
          data: { role: Role.BUSINESS_OWNER },
        });

        await tx.businessChangeHistory.create({
          data: {
            businessId: c.businessId,
            actorId: adminUser.id,
            action: "CLAIM_APPROVED",
            fieldChanged: "ownerId",
            previousValue: null,
            newValue: c.userId,
            approvalStatus: "APPROVED",
            source: "COMMAND_CENTER",
            metadata: JSON.stringify({ approvedBy: adminUser.name, claimId: c.id }),
          },
        });

        return c;
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
