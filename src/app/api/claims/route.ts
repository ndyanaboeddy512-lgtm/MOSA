import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth, encryptSensitiveText, decryptSensitiveText, maskNationalId } from "@/lib/auth";
import { Role, VerificationStatus } from "@prisma/client";
import { sendBusinessSMS } from "@/lib/sms";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
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

    // Rate Limiting: Max 3 claims submitted per user in 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.businessClaim.count({
      where: {
        userId: user.id,
        claimedAt: { gt: oneHourAgo },
      },
    });
    if (recentCount >= 3) {
      return NextResponse.json(
        { error: "Rate limit exceeded: You have submitted multiple claims recently. Please await verification." },
        { status: 429 }
      );
    }

    // Validate and normalize Rwanda phone number
    const normPhone = normalizeRwandaPhone(claimPhone);
    if (!normPhone.isValid || !normPhone.e164) {
      return NextResponse.json({ error: normPhone.error || "A valid Rwandan phone number is required" }, { status: 400 });
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

    // Duplicate Check: Prevent multiple pending claims for the same business
    const existingPending = await prisma.businessClaim.findFirst({
      where: {
        businessId,
        status: "PENDING",
      },
    });
    if (existingPending) {
      return NextResponse.json(
        { error: "A verification claim is already pending review for this business." },
        { status: 409 }
      );
    }

    // Validate National ID format and encrypt at rest
    let protectedDoc: string | null = null;
    if (nationalIdOrDoc && typeof nationalIdOrDoc === "string") {
      const cleanDoc = nationalIdOrDoc.trim().replace(/\s/g, "");
      if (cleanDoc.length === 16 && !/^\d{16}$/.test(cleanDoc)) {
        return NextResponse.json(
          { error: "Invalid Rwandan National ID. Must be exactly 16 numeric digits." },
          { status: 400 }
        );
      }
      protectedDoc = encryptSensitiveText(cleanDoc);
    }

    // Check if phone matches the business registered phone
    const normBizPhone = normalizeRwandaPhone(business.phone);
    const isDirectMatch = normBizPhone.isValid && normBizPhone.e164 === normPhone.e164;

    // Direct match allows instant verified ownership; otherwise submitted for admin review
    const initialStatus = isDirectMatch ? "APPROVED" : "PENDING";

    const claim = await prisma.businessClaim.create({
      data: {
        businessId,
        userId: user.id,
        claimPhone: normPhone.e164,
        ownerName: ownerName?.trim() || user.name,
        nationalIdOrDoc: protectedDoc,
        verificationNotes: verificationNotes?.trim() || (isDirectMatch ? "Direct registered phone match" : "Manual verification requested"),
        status: initialStatus,
        reviewedBy: isDirectMatch ? "SYSTEM_AUTO_VERIFIED" : null,
        reviewedAt: isDirectMatch ? new Date() : null,
      },
    });

    if (initialStatus === "APPROVED") {
      await prisma.$transaction([
        prisma.business.update({
          where: { id: businessId },
          data: {
            ownerId: user.id,
            isClaimed: true,
            claimedAt: new Date(),
            claimPhone: normPhone.e164,
            verificationStatus: VerificationStatus.BUSINESS_VERIFIED,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { role: Role.BUSINESS_OWNER },
        }),
        prisma.businessChangeHistory.create({
          data: {
            businessId,
            actorId: user.id,
            action: "OWNERSHIP_CLAIMED",
            fieldChanged: "ownerId",
            previousValue: null,
            newValue: user.id,
            approvalStatus: "APPROVED",
            source: "CLAIM_SYSTEM",
            metadata: JSON.stringify({ claimant: user.name }),
          },
        }),
      ]);

      // Send SMS confirmation
      await sendBusinessSMS({
        businessId,
        recipientPhone: normPhone.e164,
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
        nationalId: isAdmin && c.nationalIdOrDoc ? maskNationalId(decryptSensitiveText(c.nationalIdOrDoc)) : undefined,
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
