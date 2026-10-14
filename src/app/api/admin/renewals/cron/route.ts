import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runAutomatedRenewalCheckAndReminders } from "@/lib/payments/renewals-engine";

export async function GET(req: NextRequest) {
  return handleCronExecution(req);
}

export async function POST(req: NextRequest) {
  return handleCronExecution(req);
}

async function handleCronExecution(req: NextRequest) {
  try {
    // 1. Authorize: Admin user OR secret cron bearer token
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    const currentUser = await getCurrentUser();
    const isAdmin = currentUser && ["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role);

    if (!isAdmin && !isCronAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin session or valid Cron Bearer token required." },
        { status: 403 }
      );
    }

    const result = await runAutomatedRenewalCheckAndReminders();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[RENEWAL_CRON_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute renewal lifecycle checks." },
      { status: 500 }
    );
  }
}
