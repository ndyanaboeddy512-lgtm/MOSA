import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { VerificationStatus } from "@prisma/client";
import { INITIAL_BUSINESSES } from "@/lib/seed-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        products: true,
        reviews: { orderBy: { createdAt: "desc" } },
        businessHours: true,
        media: true,
        verifications: true,
        claims: true,
      },
    });

    if (!business) {
      const fallback = INITIAL_BUSINESSES.find((b) => b.id === id);
      if (fallback) {
        return NextResponse.json({ success: true, source: "seed-fallback", business: fallback });
      }
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Increment views count asynchronously
    prisma.business
      .update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      })
      .catch(() => {});

    return NextResponse.json({ success: true, source: "postgres", business });
  } catch (error) {
    const fallback = INITIAL_BUSINESSES.find((b) => b.id === id);
    if (fallback) {
      return NextResponse.json({ success: true, source: "fallback", business: fallback });
    }
    return NextResponse.json({ error: "Failed to fetch business" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { action, status, userId, details, contactClick } = body;

    // Contact click tracking
    if (contactClick) {
      await prisma.business.update({
        where: { id },
        data: { contactClicksCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true });
    }

    // Verification update action
    if (action === "VERIFY" && status) {
      const updated = await prisma.business.update({
        where: { id },
        data: {
          verificationStatus: status as VerificationStatus,
        },
      });

      // Create permanent verification record
      if (user) {
        await prisma.verificationRecord.create({
          data: {
            businessId: id,
            userId: user.id,
            type: status,
            notes: details?.notes || "Verification audit executed",
          },
        });

        await logAuditEvent({
          actorId: user.id,
          action: "BUSINESS_VERIFIED",
          entityType: "BUSINESS",
          entityId: id,
          metadata: { newStatus: status, notes: details?.notes },
        });
      }

      return NextResponse.json({ success: true, business: updated });
    }

    // Business claim action by owner
    if (action === "CLAIM") {
      const claimUserId = user?.id || userId;
      if (!claimUserId) {
        return NextResponse.json({ error: "User authentication required to claim business" }, { status: 401 });
      }

      const updated = await prisma.business.update({
        where: { id },
        data: {
          ownerId: claimUserId,
          verificationStatus: VerificationStatus.BUSINESS_VERIFIED,
        },
      });

      await prisma.businessClaim.create({
        data: {
          businessId: id,
          userId: claimUserId,
          claimPhone: user?.phone || "+250788000000",
          status: "APPROVED",
        },
      });

      await logAuditEvent({
        actorId: claimUserId,
        action: "BUSINESS_CLAIMED",
        entityType: "BUSINESS",
        entityId: id,
      });

      return NextResponse.json({ success: true, business: updated });
    }

    return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 });
  } catch (error) {
    console.error("[Business Update Error]:", error);
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
  }
}
