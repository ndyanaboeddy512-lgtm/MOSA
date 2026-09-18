import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role, BusinessUpdateType } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/owner/updates
 * Lists all updates (announcements, new arrivals, service updates, offers, closures, notices)
 * for the authenticated owner's business.
 */
export async function GET(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    let businessId = requestedBizId;

    if (!businessId || auth.user.role === Role.BUSINESS_OWNER) {
      const biz = await prisma.business.findFirst({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });
      if (!biz) {
        return NextResponse.json({ error: "No business found for this owner" }, { status: 404 });
      }
      businessId = biz.id;
    }

    const updates = await prisma.businessUpdate.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error("[Owner Updates GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch updates" }, { status: 500 });
  }
}

/**
 * POST /api/owner/updates
 * Creates a new business update (Announcement, New Arrival, Service Update, Offer, Temporary Closure, Notice).
 */
export async function POST(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const {
      businessId,
      type = "ANNOUNCEMENT",
      title,
      titleRw,
      content,
      contentRw,
      imageUrl,
      badge,
      validUntil,
      status = "ACTIVE",
    } = body;

    if (!businessId || !title || !content) {
      return NextResponse.json({ error: "businessId, title, and content are required" }, { status: 400 });
    }

    // Verify ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.COMMUNITY_ADMIN)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage updates for this business" }, { status: 403 });
    }

    // Parse validUntil
    const validUntilDate = validUntil ? new Date(validUntil) : null;

    // Validate type enum
    const validTypes = Object.values(BusinessUpdateType);
    const updateType = validTypes.includes(type) ? (type as BusinessUpdateType) : BusinessUpdateType.ANNOUNCEMENT;

    const update = await prisma.$transaction(async (tx) => {
      const created = await tx.businessUpdate.create({
        data: {
          businessId,
          type: updateType,
          title: title.trim(),
          titleRw: titleRw?.trim() || null,
          content: content.trim(),
          contentRw: contentRw?.trim() || null,
          imageUrl: imageUrl || null,
          badge: badge?.trim() || null,
          validUntil: validUntilDate,
          status,
          moderationStatus: "APPROVED",
        },
      });

      await tx.businessChangeHistory.create({
        data: {
          businessId,
          actorId: auth.user!.id,
          action: "BUSINESS_UPDATE_CREATED",
          fieldChanged: "updates",
          previousValue: null,
          newValue: `[${updateType}] ${created.title}`,
          approvalStatus: "APPROVED",
          source: "OWNER_PORTAL",
        },
      });

      return created;
    });

    await logAuditEvent({
      actorId: auth.user.id,
      action: "BUSINESS_UPDATE_CREATED",
      entityType: "BUSINESS_UPDATE",
      entityId: update.id,
      metadata: { businessId, type: update.type, title: update.title },
    });

    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");

    return NextResponse.json({ success: true, update }, { status: 201 });
  } catch (error) {
    console.error("[Owner Updates POST Error]:", error);
    return NextResponse.json({ error: "Failed to create business update" }, { status: 500 });
  }
}

/**
 * PATCH /api/owner/updates
 * Updates an existing business update.
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const { id, businessId, type, title, titleRw, content, contentRw, imageUrl, badge, validUntil, status } = body;

    if (!id || !businessId) {
      return NextResponse.json({ error: "id and businessId are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.COMMUNITY_ADMIN)) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    const existingUpdate = await prisma.businessUpdate.findUnique({
      where: { id },
    });

    if (!existingUpdate || existingUpdate.businessId !== businessId) {
      return NextResponse.json({ error: "Update record not found" }, { status: 404 });
    }

    const updated = await prisma.businessUpdate.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(title !== undefined && { title: title.trim() }),
        ...(titleRw !== undefined && { titleRw: titleRw ? titleRw.trim() : null }),
        ...(content !== undefined && { content: content.trim() }),
        ...(contentRw !== undefined && { contentRw: contentRw ? contentRw.trim() : null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(badge !== undefined && { badge: badge ? badge.trim() : null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(status !== undefined && { status }),
      },
    });

    revalidatePath(`/business/${businessId}`);
    return NextResponse.json({ success: true, update: updated });
  } catch (error) {
    console.error("[Owner Updates PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

/**
 * DELETE /api/owner/updates
 * Deletes or archives an update.
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const businessId = searchParams.get("businessId");

    if (!id || !businessId) {
      return NextResponse.json({ error: "id and businessId query parameters are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.COMMUNITY_ADMIN)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingUpdate = await prisma.businessUpdate.findUnique({
      where: { id },
      select: { id: true, businessId: true },
    });

    if (!existingUpdate || existingUpdate.businessId !== businessId) {
      return NextResponse.json({ error: "Update record not found or does not belong to this business" }, { status: 404 });
    }

    await prisma.businessUpdate.delete({
      where: { id },
    });

    revalidatePath(`/business/${businessId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Owner Updates DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete update" }, { status: 500 });
  }
}
