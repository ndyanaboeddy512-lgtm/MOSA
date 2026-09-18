import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role, ReportStatus } from "@prisma/client";

/**
 * GET /api/admin/moderation
 * Returns high-level moderation indicators and flagged/reported items across the entire MOSA ecosystem.
 * Keeps the main Command Center lightweight while providing deep inspection when accessed.
 */
export async function GET(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType"); // ALL, VIDEO, PHOTO, PRODUCT, REVIEW
    const status = searchParams.get("status"); // OPEN, FLAGGED, REMOVED, ALL

    // High-level summary indicators (never bloated)
    const [
      openReportsCount,
      flaggedMediaCount,
      flaggedProductsCount,
      businessesNeedingReviewCount,
      updatesCount,
      opportunitiesCount,
    ] = await Promise.all([
      prisma.report.count({ where: { status: ReportStatus.OPEN } }),
      prisma.businessMedia.count({ where: { moderationStatus: { in: ["FLAGGED", "REMOVED"] } } }),
      prisma.product.count({ where: { moderationStatus: { in: ["FLAGGED", "REMOVED"] } } }),
      prisma.business.count({ where: { status: { in: ["PENDING", "NEEDS_CORRECTION"] } } }),
      prisma.businessUpdate.count(),
      prisma.businessOpportunity.count(),
    ]);

    const itemsRequiringAttention = openReportsCount + flaggedMediaCount + flaggedProductsCount;

    // Load open/pending reports with relations
    const reportWhere: any = {};
    if (status && status !== "ALL") {
      reportWhere.status = status as ReportStatus;
    } else {
      reportWhere.status = { in: [ReportStatus.OPEN, ReportStatus.REVIEWED] };
    }
    if (targetType && targetType !== "ALL") {
      reportWhere.targetType = targetType;
    }

    const openReports = await prisma.report.findMany({
      where: reportWhere,
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            category: true,
            sector: true,
            district: true,
            phone: true,
            verificationStatus: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    // Load all flagged or removed media (videos & photos)
    const flaggedMedia = await prisma.businessMedia.findMany({
      where: {
        moderationStatus: { in: ["FLAGGED", "REMOVED"] },
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            sector: true,
            phone: true,
          },
        },
      },
    });

    // Load recent business updates
    const updates = await prisma.businessUpdate.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            sector: true,
            phone: true,
          },
        },
      },
    });

    // Load recent business opportunities
    const opportunities = await prisma.businessOpportunity.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            sector: true,
            phone: true,
          },
        },
        _count: {
          select: { inquiries: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      indicators: {
        itemsRequiringAttention,
        openReportsCount,
        flaggedMediaCount,
        flaggedProductsCount,
        businessesNeedingReviewCount,
        updatesCount,
        opportunitiesCount,
      },
      openReports,
      flaggedMedia,
      updates,
      opportunities,
    });
  } catch (error) {
    console.error("[Admin Moderation GET Error]:", error);
    return NextResponse.json({ error: "Failed to load moderation data" }, { status: 500 });
  }
}

/**
 * POST /api/admin/moderation
 * Authoritative administrative moderation actions.
 * Allows removing prohibited videos, photos, products, and resolving community reports.
 * Emits AuditLog in Neon PostgreSQL and notifies the business owner.
 */
export async function POST(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const {
      action, // "REMOVE_MEDIA" | "APPROVE_MEDIA" | "REMOVE_PRODUCT" | "APPROVE_PRODUCT" | "DISMISS_REPORT" | "RESOLVE_REPORT"
      targetId,
      reason,
      reportId,
    } = body;

    if (!action || !targetId) {
      return NextResponse.json({ error: "action and targetId are required" }, { status: 400 });
    }

    const adminId = auth.user.id;
    let businessIdToRevalidate: string | null = null;
    let resultMessage = "";

    // -------------------------------------------------------------------------
    // 1. REMOVE / PROHIBIT MEDIA (VIDEO OR PHOTO)
    // -------------------------------------------------------------------------
    if (action === "REMOVE_MEDIA") {
      const media = await prisma.businessMedia.findUnique({
        where: { id: targetId },
        include: { business: { select: { id: true, ownerId: true, name: true } } },
      });

      if (!media) {
        return NextResponse.json({ error: "Media item not found" }, { status: 404 });
      }

      businessIdToRevalidate = media.businessId;

      await prisma.$transaction(async (tx) => {
        // Mark media as REMOVED
        await tx.businessMedia.update({
          where: { id: targetId },
          data: {
            moderationStatus: "REMOVED",
            moderationReason: reason || "Removed by MOSA Administrator for community standard compliance.",
            moderatedById: adminId,
            moderatedAt: new Date(),
          },
        });

        // Resolve any open reports linked to this media
        await tx.report.updateMany({
          where: { targetId, status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWED] } },
          data: {
            status: ReportStatus.RESOLVED,
            actionTaken: "REMOVED",
            resolvedById: adminId,
            resolvedAt: new Date(),
          },
        });

        // Record Audit Log in Neon PostgreSQL
        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: "CONTENT_MODERATED_REMOVE",
            entityType: "BUSINESS_MEDIA",
            entityId: targetId,
            metadata: JSON.stringify({
              businessId: media.businessId,
              mediaType: media.mediaType,
              url: media.url,
              reason: reason || "Community standard compliance",
            }),
          },
        });

        // Notify Business Owner in Neon PostgreSQL
        if (media.business.ownerId) {
          await tx.notification.create({
            data: {
              userId: media.business.ownerId,
              title: media.mediaType === "VIDEO" ? "Video Removed by Moderator" : "Photo Removed by Moderator",
              message: `Your ${media.mediaType === "VIDEO" ? "short showcase video" : "business photo"} was removed from your public listing. Reason: ${reason || "Does not comply with MOSA verified commercial standards."}`,
            },
          });
        }
      });

      resultMessage = `${media.mediaType === "VIDEO" ? "Video" : "Photo"} successfully removed from public mini-website.`;
    }

    // -------------------------------------------------------------------------
    // 2. APPROVE / REINSTATE MEDIA
    // -------------------------------------------------------------------------
    else if (action === "APPROVE_MEDIA") {
      const media = await prisma.businessMedia.findUnique({
        where: { id: targetId },
        include: { business: { select: { id: true, ownerId: true } } },
      });

      if (!media) {
        return NextResponse.json({ error: "Media item not found" }, { status: 404 });
      }

      businessIdToRevalidate = media.businessId;

      await prisma.$transaction(async (tx) => {
        await tx.businessMedia.update({
          where: { id: targetId },
          data: {
            moderationStatus: "APPROVED",
            moderationReason: null,
            moderatedById: adminId,
            moderatedAt: new Date(),
          },
        });

        // Resolve reports
        await tx.report.updateMany({
          where: { targetId, status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWED] } },
          data: {
            status: ReportStatus.DISMISSED,
            actionTaken: "DISMISSED",
            resolvedById: adminId,
            resolvedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: "CONTENT_MODERATED_APPROVE",
            entityType: "BUSINESS_MEDIA",
            entityId: targetId,
            metadata: JSON.stringify({ businessId: media.businessId, mediaType: media.mediaType }),
          },
        });
      });

      resultMessage = "Media approved and reinstated.";
    }

    // -------------------------------------------------------------------------
    // 3. REMOVE / PROHIBIT PRODUCT OR SERVICE
    // -------------------------------------------------------------------------
    else if (action === "REMOVE_PRODUCT") {
      const product = await prisma.product.findUnique({
        where: { id: targetId },
        include: { business: { select: { id: true, ownerId: true } } },
      });

      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      businessIdToRevalidate = product.businessId;

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: targetId },
          data: {
            moderationStatus: "REMOVED",
            moderationNote: reason || "Removed by administrator for compliance.",
            isArchived: true,
            isAvailable: false,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: "PRODUCT_MODERATED_REMOVE",
            entityType: "PRODUCT",
            entityId: targetId,
            metadata: JSON.stringify({ businessId: product.businessId, productName: product.name, reason }),
          },
        });

        if (product.business.ownerId) {
          await tx.notification.create({
            data: {
              userId: product.business.ownerId,
              title: "Product Listing Removed",
              message: `Item "${product.name}" was removed from your public catalogue by a moderator. Reason: ${reason || "Price or product policy violation."}`,
            },
          });
        }
      });

      resultMessage = "Product removed from catalogue.";
    }

    // -------------------------------------------------------------------------
    // 4. DISMISS REPORT
    // -------------------------------------------------------------------------
    else if (action === "DISMISS_REPORT") {
      const report = await prisma.report.findUnique({
        where: { id: targetId },
      });

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      await prisma.report.update({
        where: { id: targetId },
        data: {
          status: ReportStatus.DISMISSED,
          actionTaken: "DISMISSED",
          resolvedById: adminId,
          resolvedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: "REPORT_DISMISSED",
          entityType: "REPORT",
          entityId: targetId,
          metadata: JSON.stringify({ businessId: report.businessId, reason: report.reason }),
        },
      });

      resultMessage = "Report dismissed.";
    }

    // -------------------------------------------------------------------------
    // 5. REMOVE / DEACTIVATE BUSINESS UPDATE
    // -------------------------------------------------------------------------
    else if (action === "REMOVE_UPDATE") {
      const update = await prisma.businessUpdate.findUnique({
        where: { id: targetId },
        include: { business: { select: { id: true, ownerId: true, name: true } } },
      });

      if (!update) {
        return NextResponse.json({ error: "Business update not found" }, { status: 404 });
      }

      businessIdToRevalidate = update.businessId;

      await prisma.$transaction(async (tx) => {
        await tx.businessUpdate.update({
          where: { id: targetId },
          data: {
            status: "REMOVED",
            moderationStatus: "REMOVED",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: "UPDATE_MODERATED_REMOVE",
            entityType: "BUSINESS_UPDATE",
            entityId: targetId,
            metadata: JSON.stringify({
              businessId: update.businessId,
              title: update.title,
              reason: reason || "Deactivated by administrator for policy compliance.",
            }),
          },
        });

        if (update.business.ownerId) {
          await tx.notification.create({
            data: {
              userId: update.business.ownerId,
              title: "Business Update Deactivated",
              message: `Your business update "${update.title}" was deactivated by a moderator. Reason: ${reason || "Does not comply with community guidelines."}`,
            },
          });
        }
      });

      resultMessage = "Business update deactivated.";
    }

    // -------------------------------------------------------------------------
    // 6. APPROVE / ACTIVATE BUSINESS UPDATE
    // -------------------------------------------------------------------------
    else if (action === "APPROVE_UPDATE") {
      const update = await prisma.businessUpdate.findUnique({
        where: { id: targetId },
        include: { business: { select: { id: true, ownerId: true } } },
      });

      if (!update) {
        return NextResponse.json({ error: "Business update not found" }, { status: 404 });
      }

      businessIdToRevalidate = update.businessId;

      await prisma.$transaction(async (tx) => {
        await tx.businessUpdate.update({
          where: { id: targetId },
          data: {
            status: "ACTIVE",
            moderationStatus: "APPROVED",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: "UPDATE_MODERATED_APPROVE",
            entityType: "BUSINESS_UPDATE",
            entityId: targetId,
            metadata: JSON.stringify({ businessId: update.businessId, title: update.title }),
          },
        });
      });

      resultMessage = "Business update activated.";
    }

    // -------------------------------------------------------------------------
    // 7. REMOVE / CLOSE BUSINESS OPPORTUNITY
    // -------------------------------------------------------------------------
    else if (action === "REMOVE_OPPORTUNITY") {
      const opp = await prisma.businessOpportunity.findUnique({
        where: { id: targetId },
        include: { business: { select: { id: true, ownerId: true, name: true } } },
      });

      if (!opp) {
        return NextResponse.json({ error: "Business opportunity not found" }, { status: 404 });
      }

      businessIdToRevalidate = opp.businessId;

      await prisma.$transaction(async (tx) => {
        await tx.businessOpportunity.update({
          where: { id: targetId },
          data: { status: "CLOSED" },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: "OPPORTUNITY_MODERATED_REMOVE",
            entityType: "BUSINESS_OPPORTUNITY",
            entityId: targetId,
            metadata: JSON.stringify({
              businessId: opp.businessId,
              title: opp.title,
              reason: reason || "Closed by administrator for policy compliance.",
            }),
          },
        });

        if (opp.business.ownerId) {
          await tx.notification.create({
            data: {
              userId: opp.business.ownerId,
              title: "Business Opportunity Closed",
              message: `Your opportunity "${opp.title}" was closed by a moderator. Reason: ${reason || "Does not comply with community guidelines."}`,
            },
          });
        }
      });

      resultMessage = "Business opportunity closed.";
    }

    // -------------------------------------------------------------------------
    // 8. APPROVE / REOPEN BUSINESS OPPORTUNITY
    // -------------------------------------------------------------------------
    else if (action === "APPROVE_OPPORTUNITY") {
      const opp = await prisma.businessOpportunity.findUnique({
        where: { id: targetId },
        include: { business: { select: { id: true, ownerId: true } } },
      });

      if (!opp) {
        return NextResponse.json({ error: "Business opportunity not found" }, { status: 404 });
      }

      businessIdToRevalidate = opp.businessId;

      await prisma.$transaction(async (tx) => {
        await tx.businessOpportunity.update({
          where: { id: targetId },
          data: { status: "OPEN" },
        });

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: "OPPORTUNITY_MODERATED_APPROVE",
            entityType: "BUSINESS_OPPORTUNITY",
            entityId: targetId,
            metadata: JSON.stringify({ businessId: opp.businessId, title: opp.title }),
          },
        });
      });

      resultMessage = "Business opportunity reopened and approved.";
    }

    // Revalidate public page if affected
    if (businessIdToRevalidate) {
      revalidatePath(`/business/${businessIdToRevalidate}`);
      revalidatePath("/explore");
    }

    return NextResponse.json({
      success: true,
      message: resultMessage,
    });
  } catch (error) {
    console.error("[Admin Moderation POST Error]:", error);
    return NextResponse.json({ error: "Failed to apply moderation action" }, { status: 500 });
  }
}
