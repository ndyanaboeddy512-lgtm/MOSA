import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { simulateSandboxCustomerAction } from "@/lib/payments/push-gateway";

export async function POST(req: NextRequest) {
  try {
    const isProd = process.env.NODE_ENV === "production";
    // A deliberately configured, server-only staging flag must explicitly permit simulation in production-like builds.
    // Public environment variables (e.g., NEXT_PUBLIC_*) must NEVER permit production simulation.
    const stagingSimulatorPermitted = process.env.ALLOW_STAGING_PAYMENT_SIMULATION === "true";

    if (isProd && !stagingSimulatorPermitted) {
      return NextResponse.json(
        { success: false, error: "Payment simulation is strictly forbidden in production." },
        { status: 403 }
      );
    }

    // Only SUPER_ADMIN may simulate sandbox payment actions.
    // BUSINESS_OWNER, CUSTOMER, COMMUNITY_AGENT, and anonymous users are strictly denied.
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Access denied. Only Super Administrators can execute sandbox payment simulation." },
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
      { status: 400 }
    );
  }
}
