import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword, confirmPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Reset token and new password are required" }, { status: 400 });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired password reset token" }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      action: "ADMIN_PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: user.id,
      metadata: { email: user.email },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset completed successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
