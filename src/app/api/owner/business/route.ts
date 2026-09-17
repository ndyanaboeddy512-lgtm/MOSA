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

    if (requestedBizId && auth.user.role === Role.SUPER_ADMIN) {
      business = await prisma.business.findUnique({
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

    // Calculate operational intelligence
    const [healthReport, reminders] = await Promise.all([
      calculateAndPersistBusinessHealth(business.id),
      syncAndGetBusinessReminders(business.id),
    ]);

    const confirmationStatus = checkConfirmationStatus(business);

    return NextResponse.json({
      success: true,
      business: formatBusinessRecord(business),
      health: healthReport,
      confirmationStatus,
      reminders,
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
    const businessId = body.businessId;
    const action = body.action || body.actionType;
    const { businessId: _b, action: _a, actionType: _at, ...fields } = body;

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
      "subCategory",
      "phone",
      "whatsapp",
      "isOpenNow",
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
              approvalStatus: "APPROVED",
              source: "OWNER_DASHBOARD",
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId,
            action: "OWNER_PROFILE_UPDATED",
            entityType: "BUSINESS",
            entityId: businessId,
            metadata: JSON.stringify({ changedFields }),
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
    revalidatePath("/admin");

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
      message: "Business information successfully updated and published",
      business: formatBusinessRecord(updatedBusiness),
      health: updatedHealth,
    });
  } catch (error) {
    console.error("[Owner Business PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update business profile" }, { status: 500 });
  }
}
