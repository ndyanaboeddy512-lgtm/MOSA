import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    // Generic safe response to prevent user enumeration
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "COMMUNITY_ADMIN" && user.role !== "MODERATOR")) {
      return NextResponse.json({
        success: true,
        message: "If that email belongs to an administrator, a password reset link has been dispatched.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: expiresAt,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      action: "ADMIN_PASSWORD_RESET_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      metadata: { email },
    });

    // In production, send email; in development/audit logs, log securely
    console.log(`[Password Reset]: Token generated for ${email}: ${resetToken}`);

    return NextResponse.json({
      success: true,
      message: "If that email belongs to an administrator, a password reset link has been dispatched.",
      devToken: process.env.NODE_ENV !== "production" ? resetToken : undefined,
    });
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    return NextResponse.json({ error: "Failed to process password reset" }, { status: 500 });
  }
}
