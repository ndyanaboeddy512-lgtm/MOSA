import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { calculateAndPersistBusinessHealth } from "@/lib/business-health";

const VALID_VIDEO_TOPICS = [
  "PRODUCTS",
  "SERVICES",
  "OFFERS",
  "WORKSHOP",
  "NEW_ARRIVALS",
  "FACILITY",
];

const VERIFIED_STATUSES = [
  "BUSINESS_VERIFIED",
  "HIGH_CONFIDENCE",
  "AGENT_VERIFIED",
];

/**
 * GET /api/owner/media
 * Returns all media items (photos and short videos) for the owner's business.
 */
export async function GET(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true, verificationStatus: true, status: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    const media = await prisma.businessMedia.findMany({
      where: { businessId },
      orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
    });

    const isVerifiedForVideo = VERIFIED_STATUSES.includes(business.verificationStatus);

    return NextResponse.json({
      success: true,
      media,
      isVerifiedForVideo,
      verificationStatus: business.verificationStatus,
    });
  } catch (error) {
    console.error("[Owner Media GET Error]:", error);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}

/**
 * POST /api/owner/media
 * Publishes a new photo or short showcase video.
 * Enforces verified business status for videos and strict business topic categorization.
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
      url,
      caption,
      mediaType = "IMAGE",
      durationSec,
      thumbnailUrl,
      topic,
      isCover = false,
    } = body;

    if (!businessId || !url) {
      return NextResponse.json({ error: "businessId and url are required" }, { status: 400 });
    }

    const cleanUrl = typeof url === "string" ? url.trim() : "";
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("/")) {
      return NextResponse.json({ error: "Invalid URL scheme. Must be http://, https://, or a valid path." }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true, verificationStatus: true, status: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    // -------------------------------------------------------------------------
    // SHORT VIDEO VERIFICATION & COMMERCE INTEGRITY GATE
    // -------------------------------------------------------------------------
    if (mediaType === "VIDEO") {
      const isVerified = VERIFIED_STATUSES.includes(business.verificationStatus);
      if (!isVerified && auth.user.role !== Role.SUPER_ADMIN) {
        return NextResponse.json(
          {
            error: "Short video publishing requires verified business status. Please complete verification first to unlock video showcases on your mini-website.",
            code: "VERIFICATION_REQUIRED",
          },
          { status: 403 }
        );
      }

      // Ensure duration does not exceed short video limit (60s)
      const duration = Number(durationSec) || 0;
      if (duration > 60) {
        return NextResponse.json(
          { error: "Short business videos must be 60 seconds or less." },
          { status: 400 }
        );
      }

      // Enforce legitimate commercial topic to keep MOSA focused on business
      if (!topic || !VALID_VIDEO_TOPICS.includes(topic)) {
        return NextResponse.json(
          {
            error: `A valid business topic is required for videos: ${VALID_VIDEO_TOPICS.join(", ")}. MOSA showcases authentic commerce and craftsmanship.`,
          },
          { status: 400 }
        );
      }
    }

    const actorId = auth.user.id;

    // Atomically create media item and audit log in Neon PostgreSQL
    const createdMedia = await prisma.$transaction(async (tx) => {
      // If setting as cover, unset any existing cover for this business
      if (isCover) {
        await tx.businessMedia.updateMany({
          where: { businessId, isCover: true },
          data: { isCover: false },
        });
        // Also update coverImage on business
        await tx.business.update({
          where: { id: businessId },
          data: { coverImage: url },
        });
      }

      const m = await tx.businessMedia.create({
        data: {
          businessId,
          url: url.trim(),
          caption: caption?.trim() || null,
          isCover: Boolean(isCover),
          mediaType,
          durationSec: mediaType === "VIDEO" ? (Number(durationSec) || 30) : null,
          thumbnailUrl: thumbnailUrl?.trim() || null,
          topic: mediaType === "VIDEO" ? topic : null,
          moderationStatus: "APPROVED",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: mediaType === "VIDEO" ? "VIDEO_PUBLISHED" : "PHOTO_UPLOADED",
          entityType: "BUSINESS_MEDIA",
          entityId: m.id,
          metadata: JSON.stringify({
            businessId,
            mediaType,
            topic: m.topic,
            url: m.url,
          }),
        },
      });

      return m;
    });

    // Revalidate Public Mini-Website Cache
    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");
    revalidatePath("/admin");

    // Recalculate health score
    calculateAndPersistBusinessHealth(businessId).catch(() => {});

    return NextResponse.json({
      success: true,
      media: createdMedia,
    });
  } catch (error) {
    console.error("[Owner Media POST Error]:", error);
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}

/**
 * DELETE /api/owner/media
 * Removes a photo or video from the business.
 */
export async function DELETE(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get("id");

    if (!mediaId) {
      return NextResponse.json({ error: "Media id is required" }, { status: 400 });
    }

    const media = await prisma.businessMedia.findUnique({
      where: { id: mediaId },
      include: { business: { select: { id: true, ownerId: true } } },
    });

    if (!media) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 });
    }

    if (media.business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    const businessId = media.businessId;

    await prisma.$transaction(async (tx) => {
      await tx.businessMedia.delete({
        where: { id: mediaId },
      });

      await tx.auditLog.create({
        data: {
          actorId: auth.user!.id,
          action: "MEDIA_DELETED",
          entityType: "BUSINESS_MEDIA",
          entityId: mediaId,
          metadata: JSON.stringify({ businessId, mediaType: media.mediaType, url: media.url }),
        },
      });
    });

    revalidatePath(`/business/${businessId}`);
    revalidatePath("/explore");
    revalidatePath("/admin");

    calculateAndPersistBusinessHealth(businessId).catch(() => {});

    return NextResponse.json({ success: true, deletedId: mediaId });
  } catch (error) {
    console.error("[Owner Media DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
