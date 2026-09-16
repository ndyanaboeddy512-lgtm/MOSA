import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { Role, VerificationStatus } from "@prisma/client";
import { sendBusinessSMS } from "@/lib/sms";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/claims
 * Initiates an ownership claim for a business.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required to claim business" }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, claimPhone, ownerName, nationalIdOrDoc, verificationNotes } = body;

    if (!businessId || !claimPhone) {
      return NextResponse.json({ error: "businessId and claimPhone are required" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { claims: { where: { status: "APPROVED" } } },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.ownerId && business.ownerId !== user.id) {
      return NextResponse.json(
        { error: "This business is already claimed and actively managed by another verified proprietor." },
        { status: 409 }
      );
    }

    // Check if phone matches the business registered phone
    const normalizedClaimPhone = claimPhone.replace(/\D/g, "");
    const normalizedBizPhone = business.phone.replace(/\D/g, "");
    const isDirectMatch = normalizedClaimPhone.length > 8 && normalizedClaimPhone === normalizedBizPhone;

    // Direct match allows instant verified ownership; otherwise submitted for admin review
    const initialStatus = isDirectMatch ? "APPROVED" : "PENDING";

    const claim = await prisma.businessClaim.create({
      data: {
        businessId,
        userId: user.id,
        claimPhone: claimPhone.trim(),
        ownerName: ownerName?.trim() || user.name,
        nationalIdOrDoc: nationalIdOrDoc?.trim() || null,
        verificationNotes: verificationNotes?.trim() || (isDirectMatch ? "Direct registered phone match" : "Manual verification requested"),
        status: initialStatus,
        reviewedBy: isDirectMatch ? "SYSTEM_AUTO_VERIFIED" : null,
        reviewedAt: isDirectMatch ? new Date() : null,
      },
    });

    if (initialStatus === "APPROVED") {
      // Bind ownership
      await prisma.business.update({
        where: { id: businessId },
        data: {
          ownerId: user.id,
          isClaimed: true,
          claimedAt: new Date(),
          claimPhone: claimPhone.trim(),
          verificationStatus: VerificationStatus.BUSINESS_VERIFIED,
        },
      });

      // Elevate user role to BUSINESS_OWNER if currently customer
      if (user.role === Role.CUSTOMER) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: Role.BUSINESS_OWNER },
        });
      }

      await prisma.businessChangeHistory.create({
        data: {
          businessId,
          actorId: user.id,
          action: "OWNERSHIP_CLAIMED",
          fieldChanged: "ownerId",
          previousValue: null,
          newValue: user.id,
          approvalStatus: "APPROVED",
          source: "CLAIM_SYSTEM",
          metadata: JSON.stringify({ claimant: user.name, phone: claimPhone }),
        },
      });

      // Send SMS confirmation
      await sendBusinessSMS({
        businessId,
        recipientPhone: claimPhone,
        templateId: "PROFILE_CONFIRMATION",
        language: (user.language as any) || "rw",
        variables: { businessName: business.name },
      }).catch(() => {});
    }

    await logAuditEvent({
      actorId: user.id,
      action: "BUSINESS_CLAIM_SUBMITTED",
      entityType: "BUSINESS_CLAIM",
      entityId: claim.id,
      metadata: { businessId, claimPhone, status: initialStatus },
    });

    revalidatePath(`/business/${businessId}`);

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      status: initialStatus,
      message: initialStatus === "APPROVED"
        ? "Ownership verified! You now have full Business Owner Dashboard access."
        : "Your claim has been submitted for Community Agent verification. You will receive an SMS update shortly.",
    });
  } catch (error) {
    console.error("[Claims POST Error]:", error);
    return NextResponse.json({ error: "Failed to submit business claim" }, { status: 500 });
  }
}

/**
 * GET /api/claims
 * Lists claims for user or all pending claims for admins.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  try {
    const isAdmin = auth.user.role === Role.SUPER_ADMIN || auth.user.role === Role.COMMUNITY_ADMIN;

    const where: any = {};
    if (!isAdmin) {
      where.userId = auth.user.id;
    }
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const claims = await prisma.businessClaim.findMany({
      where,
      orderBy: { claimedAt: "desc" },
      include: {
        business: { select: { id: true, name: true, phone: true, cell: true, sector: true } },
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({
      success: true,
      claims: claims.map((c) => ({
        id: c.id,
        businessId: c.businessId,
        businessName: c.business.name,
        businessPhone: c.business.phone,
        businessLocation: `${c.business.cell}, ${c.business.sector}`,
        userId: c.userId,
        claimantName: c.ownerName || c.user.name,
        claimPhone: c.claimPhone,
        status: c.status,
        verificationNotes: c.verificationNotes,
        claimedAt: c.claimedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Claims GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}
