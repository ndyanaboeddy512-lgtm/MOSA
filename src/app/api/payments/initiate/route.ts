import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateRegistrationPayment } from "@/lib/payments/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, provider, phoneNumber } = body;

    if (!businessId || !provider) {
      return NextResponse.json(
        { success: false, error: "businessId and provider are required." },
        { status: 400 }
      );
    }

    if (!["MTN_MOMO", "AIRTEL_MONEY", "BANK_TRANSFER"].includes(provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment provider specified." },
        { status: 400 }
      );
    }

    // Determine payer user
    let payerUserId: string | null = null;
    const currentUser = await getCurrentUser();
    if (currentUser) {
      payerUserId = currentUser.id;
    }

    if (!payerUserId) {
      // Find business owner
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { ownerId: true },
      });
      if (business?.ownerId) {
        payerUserId = business.ownerId;
      }
    }

    if (!payerUserId) {
      return NextResponse.json(
        { success: false, error: "Unable to identify payer user for this business." },
        { status: 400 }
      );
    }

    const result = await initiateRegistrationPayment({
      businessId,
      payerUserId,
      provider: provider as any,
      phoneNumber,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[PAYMENTS_INITIATE_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate payment." },
      { status: 500 }
    );
  }
}
