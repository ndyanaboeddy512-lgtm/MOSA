import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * POST /api/owner/offers
 * Publishes or schedules a special neighborhood discount or promo.
 */
export async function POST(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const { businessId, title, titleRw, discount, description, descriptionRw, validUntil } = body;

    if (!businessId || !title || !discount) {
      return NextResponse.json({ error: "businessId, title and discount are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    const untilDate = validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const actorId = auth.user.id;

    const offer = await prisma.$transaction(async (tx) => {
      const o = await tx.offer.create({
        data: {
          businessId,
          title: title.trim(),
          titleRw: titleRw?.trim() || title.trim(),
          description: description?.trim() || null,
          descriptionRw: descriptionRw?.trim() || null,
          discount: discount.trim(),
          validUntil: untilDate,
          status: "ACTIVE",
        },
      });

      await tx.businessChangeHistory.create({
        data: {
          businessId,
          actorId,
          action: "OFFER_CREATED",
          fieldChanged: "offer",
          previousValue: null,
          newValue: `${o.discount} - ${o.title}`,
          approvalStatus: "APPROVED",
          source: "OWNER_DASHBOARD",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "OFFER_CREATED",
          entityType: "OFFER",
          entityId: o.id,
          metadata: JSON.stringify({ businessId, discount: o.discount, title: o.title }),
        },
      });

      return o;
    });

    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");

    return NextResponse.json({ success: true, offer });
  } catch (error) {
    console.error("[Owner Offer POST Error]:", error);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}

/**
 * DELETE /api/owner/offers
 * Deactivates or removes an active offer.
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get("offerId");
    const businessId = searchParams.get("businessId");

    if (!offerId || !businessId) {
      return NextResponse.json({ error: "offerId and businessId are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    const actorId = auth.user.id;

    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id: offerId },
        data: { status: "EXPIRED" },
      });

      await tx.businessChangeHistory.create({
        data: {
          businessId,
          actorId,
          action: "OFFER_EXPIRED",
          fieldChanged: "status",
          previousValue: "ACTIVE",
          newValue: "EXPIRED",
          approvalStatus: "APPROVED",
          source: "OWNER_DASHBOARD",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "OFFER_DELETED",
          entityType: "OFFER",
          entityId: offerId,
        },
      });
    });

    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Owner Offer DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete offer" }, { status: 500 });
  }
}
