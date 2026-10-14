import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { grantRegistrationOrRenewalWaiver } from "@/lib/payments/renewals-engine";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required to grant fee waivers." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { businessId, reason, waiverType = "ANNUAL_RENEWAL" } = body;

    if (!businessId || !reason) {
      return NextResponse.json(
        { success: false, error: "businessId and a mandatory descriptive reason are required." },
        { status: 400 }
      );
    }

    const result = await grantRegistrationOrRenewalWaiver({
      businessId,
      adminId: currentUser.id,
      reason: String(reason).trim(),
      waiverType,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ADMIN_WAIVER_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to grant waiver." },
      { status: 400 }
    );
  }
}
