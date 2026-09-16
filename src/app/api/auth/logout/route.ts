import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAuditEvent({
      actorId: user.id,
      action: "USER_LOGOUT",
      entityType: "USER",
      entityId: user.id,
    });
  }

  await clearSessionCookie();
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}
