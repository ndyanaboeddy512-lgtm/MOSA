import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { initiateAnnualRenewalPayment } from "@/lib/payments/renewals-engine";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please log in to renew registration." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { businessId, provider = "MTN_MOMO", phoneNumber } = body;

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "businessId is required." },
        { status: 400 }
      );
    }

    const result = await initiateAnnualRenewalPayment({
      businessId,
      payerUserId: user.id,
      provider,
      phoneNumber: phoneNumber || user.phone,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[RENEWAL_INITIATE_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate annual renewal payment." },
      { status: 400 }
    );
  }
}
