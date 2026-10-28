import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { simulateSandboxCustomerAction } from "@/lib/payments/push-gateway";

export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV !== "production";
    const demoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH === "true" || process.env.ENABLE_PAYMENT_SIMULATOR === "true";
    const currentUser = await getCurrentUser();
    const isAdminOrOwner = currentUser && ["SUPER_ADMIN", "COMMUNITY_ADMIN", "BUSINESS_OWNER"].includes(currentUser.role);

    if (!isDev && !demoEnabled && !isAdminOrOwner) {
      return NextResponse.json(
        { success: false, error: "Access denied. Action simulator is restricted." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { paymentReference, action } = body;

    if (!paymentReference || !action) {
      return NextResponse.json(
        { success: false, error: "paymentReference and action (APPROVE, REJECT, TIMEOUT) are required." },
        { status: 400 }
      );
    }

    if (!["APPROVE", "REJECT", "TIMEOUT"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Supported: APPROVE, REJECT, TIMEOUT." },
        { status: 400 }
      );
    }

    const result = await simulateSandboxCustomerAction({
      paymentReference,
      action: action as any,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("[PAYMENTS_SIMULATE_ACTION_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to simulate payment action." },
      { status: 500 }
    );
  }
}
