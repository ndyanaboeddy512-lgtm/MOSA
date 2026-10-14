import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { adminConfirmPayment } from "@/lib/payments/engine";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { paymentId, providerTransactionRef, notes } = body;

    if (!paymentId || !providerTransactionRef) {
      return NextResponse.json(
        { success: false, error: "paymentId and providerTransactionRef are required." },
        { status: 400 }
      );
    }

    const result = await adminConfirmPayment({
      paymentId,
      adminId: currentUser.id,
      providerTransactionRef: String(providerTransactionRef).trim(),
      notes,
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully confirmed and business activated.",
      receiptNumber: result.receipt?.receiptNumber,
      businessStatus: result.businessStatus,
    });
  } catch (error: any) {
    console.error("[ADMIN_PAYMENT_CONFIRM_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to confirm payment." },
      { status: 400 }
    );
  }
}
