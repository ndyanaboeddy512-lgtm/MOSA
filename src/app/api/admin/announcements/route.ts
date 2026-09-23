import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

/**
 * Resolves distinct business owner user IDs based on announcement targeting criteria.
 */
async function resolveTargetOwnerUserIds(
  targetType: string,
  targetCategory?: string | null,
  targetDistrict?: string | null,
  targetBusinessIds?: string | null
): Promise<string[]> {
  const ownerSet = new Set<string>();

  if (targetType === "ALL") {
    // 1. All owners of registered businesses
    const businesses = await prisma.business.findMany({
      where: { ownerId: { not: null } },
      select: { ownerId: true },
    });
    for (const b of businesses) {
      if (b.ownerId) ownerSet.add(b.ownerId);
    }

    // 2. All users with BUSINESS_OWNER role
    const ownerUsers = await prisma.user.findMany({
      where: { role: Role.BUSINESS_OWNER, status: "ACTIVE" },
      select: { id: true },
    });
    for (const u of ownerUsers) {
      ownerSet.add(u.id);
    }
  } else if (targetType === "CATEGORY" && targetCategory) {
    const businesses = await prisma.business.findMany({
      where: {
        OR: [
          { category: targetCategory },
          { mainCategory: targetCategory },
        ],
        ownerId: { not: null },
      },
      select: { ownerId: true },
    });
    for (const b of businesses) {
      if (b.ownerId) ownerSet.add(b.ownerId);
    }
  } else if (targetType === "LOCATION" && targetDistrict) {
    const businesses = await prisma.business.findMany({
      where: {
        district: { equals: targetDistrict, mode: "insensitive" },
        ownerId: { not: null },
      },
      select: { ownerId: true },
    });
    for (const b of businesses) {
      if (b.ownerId) ownerSet.add(b.ownerId);
    }
  } else if (targetType === "SELECTED_BUSINESSES" && targetBusinessIds) {
    let ids: string[] = [];
    try {
      ids = typeof targetBusinessIds === "string" ? JSON.parse(targetBusinessIds) : targetBusinessIds;
    } catch {
      ids = targetBusinessIds.split(",").map((s) => s.trim()).filter(Boolean);
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const businesses = await prisma.business.findMany({
        where: {
          id: { in: ids },
          ownerId: { not: null },
        },
        select: { ownerId: true },
      });
      for (const b of businesses) {
        if (b.ownerId) ownerSet.add(b.ownerId);
      }
    }
  }

  return Array.from(ownerSet);
}

/**
 * Automatically dispatches scheduled announcements that are due.
 */
export async function dispatchScheduledAnnouncements(): Promise<number> {
  try {
    const dueAnnouncements = await prisma.partnerAnnouncement.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() },
      },
    });

    let count = 0;
    for (const ann of dueAnnouncements) {
      const ownerIds = await resolveTargetOwnerUserIds(
        ann.targetType,
        ann.targetCategory,
        ann.targetDistrict,
        ann.targetBusinessIds
      );

      if (ownerIds.length > 0) {
        await prisma.notification.createMany({
          data: ownerIds.map((userId) => ({
            userId,
            title: ann.title,
            message: ann.message,
            type: "ANNOUNCEMENT",
            announcementId: ann.id,
            isRead: false,
          })),
        });
      }

      await prisma.partnerAnnouncement.update({
        where: { id: ann.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          totalRecipients: ownerIds.length,
        },
      });

      await logAuditEvent({
        action: "ANNOUNCEMENT_AUTO_DISPATCHED",
        entityType: "PARTNER_ANNOUNCEMENT",
        entityId: ann.id,
        metadata: {
          title: ann.title,
          targetType: ann.targetType,
          totalRecipients: ownerIds.length,
          scheduledAt: ann.scheduledAt,
        },
      });

      count++;
    }

    return count;
  } catch (error) {
    console.error("[Auto-dispatch Announcements Error]:", error);
    return 0;
  }
}

/**
 * GET /api/admin/announcements
 * Fetches all announcements, dispatch metrics, and targeting estimates.
 */
export async function GET() {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    // 1. Automatically dispatch any scheduled announcements whose time has passed
    await dispatchScheduledAnnouncements();

    // 2. Fetch all announcements with author metadata
    const announcements = await prisma.partnerAnnouncement.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Compute KPI metrics
    const total = announcements.length;
    const sent = announcements.filter((a) => a.status === "SENT").length;
    const scheduled = announcements.filter((a) => a.status === "SCHEDULED").length;
    const drafts = announcements.filter((a) => a.status === "DRAFT").length;
    const archived = announcements.filter((a) => a.status === "ARCHIVED").length;
    const totalReach = announcements
      .filter((a) => a.status === "SENT")
      .reduce((sum, a) => sum + (a.totalRecipients || 0), 0);

    // 4. Calculate targeting estimates for creation modal
    const [businessesWithOwner, totalOwnerUsers, categoryStats, districtStats] = await Promise.all([
      prisma.business.findMany({
        where: { ownerId: { not: null } },
        select: { ownerId: true, category: true, mainCategory: true, district: true },
      }),
      prisma.user.count({ where: { role: Role.BUSINESS_OWNER, status: "ACTIVE" } }),
      prisma.business.groupBy({
        by: ["category"],
        where: { ownerId: { not: null } },
        _count: { ownerId: true },
      }),
      prisma.business.groupBy({
        by: ["district"],
        where: { ownerId: { not: null } },
        _count: { ownerId: true },
      }),
    ]);

    const uniqueAllOwners = new Set<string>();
    businessesWithOwner.forEach((b) => {
      if (b.ownerId) uniqueAllOwners.add(b.ownerId);
    });

    return NextResponse.json({
      success: true,
      announcements,
      stats: {
        total,
        sent,
        scheduled,
        drafts,
        archived,
        totalReach,
      },
      estimates: {
        allOwnersCount: Math.max(uniqueAllOwners.size, totalOwnerUsers),
        byCategory: Object.fromEntries(categoryStats.map((c) => [c.category, c._count.ownerId])),
        byDistrict: Object.fromEntries(districtStats.map((d) => [d.district, d._count.ownerId])),
      },
    });
  } catch (error) {
    console.error("[Admin Announcements GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

/**
 * POST /api/admin/announcements
 * Creates a new partner announcement (SEND_NOW, SCHEDULE, or DRAFT).
 */
export async function POST(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      titleRw,
      message,
      messageRw,
      targetType = "ALL",
      targetCategory,
      targetDistrict,
      targetBusinessIds,
      action = "DRAFT", // "SEND_NOW" | "SCHEDULE" | "DRAFT"
      scheduledAt,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Announcement title is required" }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Announcement message is required" }, { status: 400 });
    }

    const validTargetTypes = ["ALL", "CATEGORY", "LOCATION", "SELECTED_BUSINESSES"];
    const resolvedTargetType = validTargetTypes.includes(targetType) ? targetType : "ALL";

    let stringifiedBusinessIds: string | null = null;
    if (resolvedTargetType === "SELECTED_BUSINESSES" && targetBusinessIds) {
      stringifiedBusinessIds = typeof targetBusinessIds === "string"
        ? targetBusinessIds
        : JSON.stringify(targetBusinessIds);
    }

    if (action === "SEND_NOW") {
      // 1. Resolve recipients
      const ownerIds = await resolveTargetOwnerUserIds(
        resolvedTargetType,
        targetCategory,
        targetDistrict,
        stringifiedBusinessIds
      );

      // 2. Create announcement as SENT
      const announcement = await prisma.partnerAnnouncement.create({
        data: {
          title: title.trim(),
          titleRw: titleRw?.trim() || null,
          message: message.trim(),
          messageRw: messageRw?.trim() || null,
          targetType: resolvedTargetType,
          targetCategory: targetCategory || null,
          targetDistrict: targetDistrict || null,
          targetBusinessIds: stringifiedBusinessIds,
          status: "SENT",
          sentAt: new Date(),
          totalRecipients: ownerIds.length,
          authorId: auth.user.id,
        },
      });

      // 3. Dispatch persistent notifications to all targeted owners
      if (ownerIds.length > 0) {
        await prisma.notification.createMany({
          data: ownerIds.map((userId) => ({
            userId,
            title: title.trim(),
            message: message.trim(),
            type: "ANNOUNCEMENT",
            announcementId: announcement.id,
            isRead: false,
          })),
        });
      }

      // 4. Record audit event
      await logAuditEvent({
        actorId: auth.user.id,
        action: "ANNOUNCEMENT_SENT",
        entityType: "PARTNER_ANNOUNCEMENT",
        entityId: announcement.id,
        metadata: {
          title: announcement.title,
          targetType: resolvedTargetType,
          targetCategory,
          targetDistrict,
          totalRecipients: ownerIds.length,
        },
      });

      return NextResponse.json({
        success: true,
        announcement,
        message: `Announcement dispatched to ${ownerIds.length} business owner(s) successfully`,
      });
    }

    if (action === "SCHEDULE") {
      if (!scheduledAt) {
        return NextResponse.json({ error: "Scheduled date/time is required" }, { status: 400 });
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json({ error: "Invalid scheduled date format" }, { status: 400 });
      }

      const announcement = await prisma.partnerAnnouncement.create({
        data: {
          title: title.trim(),
          titleRw: titleRw?.trim() || null,
          message: message.trim(),
          messageRw: messageRw?.trim() || null,
          targetType: resolvedTargetType,
          targetCategory: targetCategory || null,
          targetDistrict: targetDistrict || null,
          targetBusinessIds: stringifiedBusinessIds,
          status: "SCHEDULED",
          scheduledAt: scheduledDate,
          authorId: auth.user.id,
        },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "ANNOUNCEMENT_SCHEDULED",
        entityType: "PARTNER_ANNOUNCEMENT",
        entityId: announcement.id,
        metadata: {
          title: announcement.title,
          targetType: resolvedTargetType,
          scheduledAt: scheduledDate.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        announcement,
        message: `Announcement successfully scheduled for ${scheduledDate.toLocaleString()}`,
      });
    }

    // Default: Save as DRAFT
    const announcement = await prisma.partnerAnnouncement.create({
      data: {
        title: title.trim(),
        titleRw: titleRw?.trim() || null,
        message: message.trim(),
        messageRw: messageRw?.trim() || null,
        targetType: resolvedTargetType,
        targetCategory: targetCategory || null,
        targetDistrict: targetDistrict || null,
        targetBusinessIds: stringifiedBusinessIds,
        status: "DRAFT",
        authorId: auth.user.id,
      },
    });

    await logAuditEvent({
      actorId: auth.user.id,
      action: "ANNOUNCEMENT_DRAFTED",
      entityType: "PARTNER_ANNOUNCEMENT",
      entityId: announcement.id,
      metadata: {
        title: announcement.title,
        targetType: resolvedTargetType,
      },
    });

    return NextResponse.json({
      success: true,
      announcement,
      message: "Announcement saved as draft successfully",
    });
  } catch (error) {
    console.error("[Admin Announcements POST Error]:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/announcements
 * Updates an announcement (SEND_NOW, ARCHIVE, or UPDATE content/schedule).
 */
export async function PATCH(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const {
      announcementId,
      action = "UPDATE", // "SEND_NOW" | "ARCHIVE" | "UPDATE"
      title,
      titleRw,
      message,
      messageRw,
      targetType,
      targetCategory,
      targetDistrict,
      targetBusinessIds,
      scheduledAt,
    } = body;

    if (!announcementId) {
      return NextResponse.json({ error: "announcementId is required" }, { status: 400 });
    }

    const existing = await prisma.partnerAnnouncement.findUnique({
      where: { id: announcementId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    // Action 1: SEND_NOW (send an existing draft or scheduled announcement immediately)
    if (action === "SEND_NOW") {
      const ownerIds = await resolveTargetOwnerUserIds(
        existing.targetType,
        existing.targetCategory,
        existing.targetDistrict,
        existing.targetBusinessIds
      );

      const updated = await prisma.partnerAnnouncement.update({
        where: { id: announcementId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          totalRecipients: ownerIds.length,
        },
      });

      if (ownerIds.length > 0) {
        await prisma.notification.createMany({
          data: ownerIds.map((userId) => ({
            userId,
            title: existing.title,
            message: existing.message,
            type: "ANNOUNCEMENT",
            announcementId: existing.id,
            isRead: false,
          })),
        });
      }

      await logAuditEvent({
        actorId: auth.user.id,
        action: "ANNOUNCEMENT_SENT",
        entityType: "PARTNER_ANNOUNCEMENT",
        entityId: existing.id,
        metadata: {
          title: existing.title,
          targetType: existing.targetType,
          totalRecipients: ownerIds.length,
        },
      });

      return NextResponse.json({
        success: true,
        announcement: updated,
        message: `Announcement dispatched to ${ownerIds.length} business owner(s) successfully`,
      });
    }

    // Action 2: ARCHIVE
    if (action === "ARCHIVE") {
      const updated = await prisma.partnerAnnouncement.update({
        where: { id: announcementId },
        data: { status: "ARCHIVED" },
      });

      await logAuditEvent({
        actorId: auth.user.id,
        action: "ANNOUNCEMENT_ARCHIVED",
        entityType: "PARTNER_ANNOUNCEMENT",
        entityId: existing.id,
        metadata: { title: existing.title },
      });

      return NextResponse.json({
        success: true,
        announcement: updated,
        message: "Announcement archived successfully",
      });
    }

    // Action 3: General UPDATE
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (titleRw !== undefined) updateData.titleRw = titleRw?.trim() || null;
    if (message !== undefined) updateData.message = message.trim();
    if (messageRw !== undefined) updateData.messageRw = messageRw?.trim() || null;
    if (targetType !== undefined) updateData.targetType = targetType;
    if (targetCategory !== undefined) updateData.targetCategory = targetCategory;
    if (targetDistrict !== undefined) updateData.targetDistrict = targetDistrict;
    if (targetBusinessIds !== undefined) {
      updateData.targetBusinessIds = typeof targetBusinessIds === "string"
        ? targetBusinessIds
        : JSON.stringify(targetBusinessIds);
    }
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      if (scheduledAt && existing.status === "DRAFT") {
        updateData.status = "SCHEDULED";
      }
    }

    const updated = await prisma.partnerAnnouncement.update({
      where: { id: announcementId },
      data: updateData,
    });

    await logAuditEvent({
      actorId: auth.user.id,
      action: "ANNOUNCEMENT_UPDATED",
      entityType: "PARTNER_ANNOUNCEMENT",
      entityId: existing.id,
      metadata: { changes: Object.keys(updateData) },
    });

    return NextResponse.json({
      success: true,
      announcement: updated,
      message: "Announcement updated successfully",
    });
  } catch (error) {
    console.error("[Admin Announcements PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/announcements
 * Deletes an announcement if in DRAFT or ARCHIVED state.
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const announcementId = searchParams.get("id");

    if (!announcementId) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    const existing = await prisma.partnerAnnouncement.findUnique({
      where: { id: announcementId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    await prisma.partnerAnnouncement.delete({
      where: { id: announcementId },
    });

    await logAuditEvent({
      actorId: auth.user.id,
      action: "ANNOUNCEMENT_DELETED",
      entityType: "PARTNER_ANNOUNCEMENT",
      entityId: announcementId,
      metadata: { title: existing.title, status: existing.status },
    });

    return NextResponse.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("[Admin Announcements DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
