import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { formatBusinessRecord } from "@/lib/format-business";
import { calculateAndPersistBusinessHealth } from "@/lib/business-health";
import { checkConfirmationStatus, confirmBusinessInformation } from "@/lib/confirmation-engine";
import { syncAndGetBusinessReminders } from "@/lib/reminders-engine";
import { sendBusinessSMS } from "@/lib/sms";
import { logAuditEvent } from "@/lib/audit";
import { validateCategoryHierarchy } from "@/lib/taxonomy";

/**
 * GET /api/owner/business
 * Returns the authenticated owner's business with operational health, reminders, and confirmation status.
 */
export async function GET(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    let business;

    if (requestedBizId) {
      const targetBiz = await prisma.business.findUnique({
        where: { id: requestedBizId },
        include: {
          products: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } },
          businessHours: true,
          offers: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
          localArea: true,
          districtRel: true,
          sectorRel: true,
          cellRel: true,
        },
      });

      if (!targetBiz) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
      }

      if (auth.user.role === Role.BUSINESS_OWNER && targetBiz.ownerId !== auth.user.id) {
        return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
      }

      business = targetBiz;
    } else {
      // Find business owned by this user
      business = await prisma.business.findFirst({
        where: { ownerId: auth.user.id },
        include: {
          products: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } },
          businessHours: true,
          offers: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
          localArea: true,
          districtRel: true,
          sectorRel: true,
          cellRel: true,
        },
      });
    }

    if (!business) {
      return NextResponse.json({
        success: true,
        hasBusiness: false,
        business: null,
        message: "No business found for this owner account. Please claim or register your business.",
      });
    }

    // Calculate operational intelligence and fetch verification history + notifications
    const [healthReport, reminders, verifications, notifications] = await Promise.all([
      calculateAndPersistBusinessHealth(business.id),
      syncAndGetBusinessReminders(business.id),
      prisma.verificationRecord.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.notification.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const confirmationStatus = checkConfirmationStatus(business);

    return NextResponse.json({
      success: true,
      business: formatBusinessRecord(business),
      health: healthReport,
      confirmationStatus,
      reminders,
      verifications,
      notifications,
    });
  } catch (error) {
    console.error("[Owner Business GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch owner business" }, { status: 500 });
  }
}

/**
 * PATCH /api/owner/business
 * Updates business profile, hours, or triggers 1-click confirmation.
 * Enforces ownership check, records audit change history, updates Neon PostgreSQL, and revalidates public cache.
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const actorId = auth.user.id;

  try {
    const body = await request.json();
    let businessId = body.businessId;
    const action = body.action || body.actionType;
    const { businessId: _b, action: _a, actionType: _at, ...fields } = body;

    if (!businessId) {
      const owned = await prisma.business.findFirst({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });
      if (owned) businessId = owned.id;
    }

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    // Security check: verify ownership server-side
    const existing = await prisma.business.findUnique({
      where: { id: businessId },
      include: { businessHours: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (existing.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    // 1-Click "Keep My Business Alive" Confirmation Action
    if (action === "CONFIRM_ALIVE") {
      const result = await confirmBusinessInformation(businessId, auth.user.id, auth.user.role);
      revalidatePath(`/business/${businessId}`);
      revalidatePath("/explore");
      const updatedHealth = await calculateAndPersistBusinessHealth(businessId);
      return NextResponse.json({ action: "CONFIRMED", ...result, health: updatedHealth });
    }

    // Resubmit Application after corrections
    if (action === "RESUBMIT_APPLICATION") {
      const updated = await prisma.$transaction(async (tx) => {
        const b = await tx.business.update({
          where: { id: businessId },
          data: {
            status: "PENDING",
            verificationStatus: "UNVERIFIED",
          },
        });

        await tx.verificationRecord.create({
          data: {
            businessId,
            userId: actorId,
            type: "OWNER_RESUBMITTED",
            notes: fields.resubmissionNotes || "Business application resubmitted by owner after revisions.",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: "APPLICATION_RESUBMITTED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({
              businessId,
              status: "PENDING",
              notes: fields.resubmissionNotes || "Resubmitted for verification",
            }),
          },
        });

        await tx.notification.create({
          data: {
            userId: actorId,
            title: "Application Resubmitted / Ibisabwa Byongeye Koherezwa",
            message: `Your updated business details for "${b.name}" have been resubmitted to MOSA Admin for review.`,
          },
        });

        return b;
      });

      revalidatePath(`/business/${businessId}`);
      revalidatePath("/admin");

      return NextResponse.json({
        success: true,
        action: "RESUBMITTED",
        status: updated.status,
      });
    }

    // Update Opening Hours if provided
    if (fields.openingHours && Array.isArray(fields.openingHours)) {
      await prisma.$transaction(async (tx) => {
        await tx.businessHour.deleteMany({ where: { businessId } });
        await tx.businessHour.createMany({
          data: fields.openingHours.map((h: any) => ({
            businessId,
            day: h.day,
            dayRw: h.dayRw || h.day,
            open: h.open || "08:00",
            close: h.close || "20:00",
            isClosed: Boolean(h.isClosed),
          })),
        });

        await tx.businessChangeHistory.create({
          data: {
            businessId,
            actorId,
            action: "HOURS_UPDATED",
            fieldChanged: "openingHours",
            previousValue: JSON.stringify(existing.businessHours.map((h) => `${h.day}: ${h.open}-${h.close}`)),
            newValue: JSON.stringify(fields.openingHours.map((h: any) => `${h.day}: ${h.open}-${h.close}`)),
            approvalStatus: "APPROVED",
            source: "OWNER_DASHBOARD",
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: "HOURS_UPDATED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({ count: fields.openingHours.length }),
          },
        });
      });
    }

    // Batch update Products/Services if provided
    if (fields.products && Array.isArray(fields.products)) {
      await prisma.$transaction(async (tx) => {
        for (const prod of fields.products) {
          if (prod && prod.id) {
            await tx.product.updateMany({
              where: { id: prod.id, businessId },
              data: {
                name: prod.name,
                nameRw: prod.nameRw,
                description: prod.description,
                price: Number(prod.price) || 0,
                priceMin: prod.priceMin ? Number(prod.priceMin) : null,
                priceMax: prod.priceMax ? Number(prod.priceMax) : null,
                isAvailable: typeof prod.isAvailable === "boolean" ? prod.isAvailable : true,
                isService: Boolean(prod.isService),
                isEstimated: Boolean(prod.contactForPrice || prod.isEstimated),
                unit: prod.unit || "item",
              },
            });
          }
        }
      });
    }

    // Prepare profile fields update
    const updateData: any = {};
    const changedFields: string[] = [];

    const allowedKeys = [
      "name",
      "nameRw",
      "nameFr",
      "nameSw",
      "description",
      "descriptionRw",
      "descriptionFr",
      "descriptionSw",
      "category",
      "mainCategory",
      "subCategory",
      "businessType",
      "phone",
      "whatsapp",
      "email",
      "logo",
      "isOpenNow",
      "province",
      "district",
      "sector",
      "cell",
      "localAreaId",
      "addressNote",
      "nearestLandmark",
      "streetName",
      "nearbyPlace",
      "locationDescription",
      "locationSource",
      "locationAccuracy",
      "locationVerificationStatus",
      "latitude",
      "longitude",
      "coverImage",
    ];

    for (const key of allowedKeys) {
      if (fields[key] !== undefined && fields[key] !== (existing as any)[key]) {
        updateData[key] = fields[key];
        changedFields.push(key);
      }
    }

    // Validate 3-Tier Category if category fields are updated
    if (fields.mainCategory || fields.subCategory || fields.businessType) {
      const targetMain = fields.mainCategory || existing.mainCategory || existing.category;
      const targetSub = fields.subCategory || existing.subCategory;
      const targetType = fields.businessType || existing.businessType;

      const catVal = validateCategoryHierarchy(targetMain, targetSub, targetType);
      if (!catVal.isValid) {
        return NextResponse.json({ error: catVal.error || "Invalid category hierarchy." }, { status: 400 });
      }

      if (catVal.resolvedType) {
        updateData.businessTypeDisplay = catVal.resolvedType.name;
        updateData.businessTypeDisplayRw = catVal.resolvedType.nameRw;
      }
    }

    // Check if business is currently Active/Verified and owner is changing major classification or location
    const isCurrentlyActiveOrVerified = existing.status === "ACTIVE" || 
      existing.verificationStatus === "AGENT_VERIFIED" || 
      existing.verificationStatus === "HIGH_CONFIDENCE";

    const isMajorCategoryChange = 
      (fields.mainCategory && fields.mainCategory !== existing.mainCategory) ||
      (fields.category && fields.category !== existing.category);

    const isMajorLocationChange = 
      (fields.sector && fields.sector !== existing.sector) ||
      (fields.district && fields.district !== existing.district);

    const requiresReverification = auth.user.role !== Role.SUPER_ADMIN && 
      isCurrentlyActiveOrVerified && 
      (Boolean(isMajorCategoryChange) || Boolean(isMajorLocationChange));

    if (requiresReverification) {
      updateData.status = "PENDING";
      updateData.verificationStatus = "UNVERIFIED";
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.business.update({
          where: { id: businessId },
          data: updateData,
        });

        for (const f of changedFields) {
          await tx.businessChangeHistory.create({
            data: {
              businessId,
              actorId,
              action: "PROFILE_UPDATED",
              fieldChanged: f,
              previousValue: String((existing as any)[f] ?? ""),
              newValue: String(updateData[f] ?? ""),
              approvalStatus: requiresReverification ? "PENDING" : "APPROVED",
              source: "OWNER_DASHBOARD",
            },
          });
        }

        if (requiresReverification) {
          const changeReasons = [
            isMajorCategoryChange ? `Category: "${existing.mainCategory || existing.category}" → "${fields.mainCategory || fields.category}"` : null,
            isMajorLocationChange ? `Location: "${existing.district}, ${existing.sector}" → "${fields.district || existing.district}, ${fields.sector || existing.sector}"` : null,
          ].filter(Boolean).join("; ");

          await tx.verificationRecord.create({
            data: {
              businessId,
              userId: actorId,
              type: "CLASSIFICATION_CHANGE_REQUESTED",
              notes: `Owner initiated major classification change (${changeReasons}). Business moved to Pending Verification for administrative audit.`,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId,
              action: "CLASSIFICATION_CHANGE_REQUESTED",
              entityType: "BUSINESS",
              entityId: businessId,
              metadata: JSON.stringify({
                changeReasons,
                previousCategory: existing.mainCategory || existing.category,
                newCategory: fields.mainCategory || fields.category,
                previousLocation: `${existing.district}, ${existing.sector}`,
                newLocation: `${fields.district || existing.district}, ${fields.sector || existing.sector}`,
              }),
            },
          });

          await tx.notification.create({
            data: {
              userId: actorId,
              title: "Classification Review Initiated / Gusubiramo Ibyiciro Byatangiye",
              message: `You updated your major business category or administrative location (${changeReasons}). To maintain data integrity across MOSA, your business is undergoing administrative re-verification.`,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId,
            action: "OWNER_PROFILE_UPDATED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({ changedFields, requiresReverification }),
          },
        });
      });

      // Trigger SMS Notification if phone or identity changed
      if (fields.name || fields.phone) {
        await sendBusinessSMS({
          businessId,
          recipientPhone: existing.phone || auth.user?.phone || "",
          templateId: "UPDATE_SUCCESS",
          language: (auth.user.language as any) || "rw",
          variables: {
            businessName: fields.name || existing.name,
          },
        }).catch(() => {});
      }
    }

    // Instant Public Page Cache Revalidation
    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");
    revalidatePath("/search");
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/owner/dashboard");

    // Recalculate health and confirmation
    const [updatedBusiness, updatedHealth] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        include: {
          products: { where: { isArchived: false } },
          businessHours: true,
          offers: { where: { status: "ACTIVE" } },
          localArea: true,
        },
      }),
      calculateAndPersistBusinessHealth(businessId),
    ]);

    return NextResponse.json({
      success: true,
      reviewRequired: requiresReverification,
      message: requiresReverification
        ? "Your classification updates have been saved and submitted to MOSA Admin for re-verification."
        : "Business information successfully updated and published",
      business: formatBusinessRecord(updatedBusiness),
      health: updatedHealth,
    });
  } catch (error) {
    console.error("[Owner Business PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update business profile" }, { status: 500 });
  }
}
