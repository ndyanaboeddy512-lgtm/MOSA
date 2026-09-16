import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * GET /api/owner/history
 * Returns the audit trail and change history for a business.
 */
export async function GET(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  let businessId = searchParams.get("businessId");

  try {
    if (!businessId) {
      const owned = await prisma.business.findFirst({
        where: { ownerId: auth.user.id },
        select: { id: true },
      });
      if (owned) {
        businessId = owned.id;
      } else {
        return NextResponse.json({ error: "No business associated with owner" }, { status: 404 });
      }
    } else {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { ownerId: true },
      });

      if (!business || (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN)) {
        return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
      }
    }

    const history = await prisma.businessChangeHistory.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, name: true, role: true } },
        product: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      history: history.map((h) => ({
        id: h.id,
        businessId: h.businessId,
        productId: h.productId,
        productName: h.product?.name,
        actorId: h.actorId,
        actorName: h.actor?.name || "System Automated Rule",
        action: h.action,
        fieldChanged: h.fieldChanged,
        previousValue: h.previousValue,
        newValue: h.newValue,
        approvalStatus: h.approvalStatus,
        source: h.source,
        metadata: h.metadata,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Owner History GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch change history" }, { status: 500 });
  }
}
