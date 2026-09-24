import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail, isValidEmail, isEmailConfigured } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Administrator email address is required" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email address format" }, { status: 400 });
    }

    // Check Resend email service configuration
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: "Email verification service is not configured (RESEND_API_KEY required). Please contact the Lead Administrator.",
        },
        { status: 503 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    // Generic safe response to prevent admin user enumeration
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

    // Send email via Resend (never log secret token to console)
    const emailResult = await sendVerificationEmail({
      to: email,
      code: resetToken.slice(0, 8), // Show safe short token snippet or verification code
      purpose: "ADMIN_PASSWORD_RESET",
      language: user.language || "rw",
      recipientName: user.name,
      expiresMinutes: 60,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to dispatch password recovery email." },
        { status: 502 }
      );
    }

    await logAuditEvent({
      actorId: user.id,
      action: "ADMIN_PASSWORD_RESET_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      metadata: { method: "EMAIL" },
    });

    return NextResponse.json({
      success: true,
      message: "If that email belongs to an administrator, a password reset email has been dispatched.",
    });
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    return NextResponse.json({ error: "Failed to process password reset" }, { status: 500 });
  }
}
