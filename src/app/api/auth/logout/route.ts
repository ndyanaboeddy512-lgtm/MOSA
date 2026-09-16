import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const token = cookieStore.get("mosa_session")?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    }).catch(() => {});
  }

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
