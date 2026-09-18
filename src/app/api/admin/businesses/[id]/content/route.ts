import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * GET /api/admin/businesses/[id]/content
 * On-demand drill-down endpoint: returns complete, unfiltered business content
 * (all media, videos, photos, products, services, reviews, and reports)
 * for administrative investigation and moderation without cluttering the main dashboard.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { id } = await params;

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        media: { orderBy: { createdAt: "desc" } },
        products: { orderBy: { createdAt: "desc" } },
        reviews: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, phone: true } } } },
        reports: { orderBy: { createdAt: "desc" } },
        updates: { orderBy: { createdAt: "desc" } },
        opportunities: { orderBy: { createdAt: "desc" }, include: { inquiries: { take: 10 } } },
        changeHistory: { take: 20, orderBy: { createdAt: "desc" } },
        verifications: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      business,
      stats: {
        totalPhotos: business.media.filter((m) => m.mediaType === "IMAGE").length,
        totalVideos: business.media.filter((m) => m.mediaType === "VIDEO").length,
        totalProducts: business.products.filter((p) => !p.isService).length,
        totalServices: business.products.filter((p) => p.isService).length,
        totalUpdates: business.updates.length,
        totalOpportunities: business.opportunities.length,
        totalReports: business.reports.length,
        openReports: business.reports.filter((r) => r.status === "OPEN").length,
      },
    });
  } catch (error) {
    console.error("[Admin Business Content GET Error]:", error);
    return NextResponse.json({ error: "Failed to load business content" }, { status: 500 });
  }
}
