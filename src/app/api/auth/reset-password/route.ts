import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyOtpCode, validatePasswordStrength } from "@/lib/auth";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, phone, otp, newPassword, confirmPassword } = body;

    if (!newPassword) {
      return NextResponse.json({ error: "New password is required" }, { status: 400 });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error || "Password does not meet strength requirements" }, { status: 400 });
    }

    let user = null;

    // Method 1: Token-based reset (Email)
    if (token && typeof token === "string") {
      user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { gt: new Date() },
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired password reset token. Please request a new one." },
          { status: 400 }
        );
      }
    } 
    // Method 2: OTP-based reset (Phone)
    else if (phone && otp) {
      const norm = normalizeRwandaPhone(phone);
      const targetPhone = norm.isValid && norm.e164 ? norm.e164 : phone.trim();

      const isValidOtp = await verifyOtpCode(targetPhone, otp.trim());
      if (!isValidOtp) {
        return NextResponse.json(
          { error: "Invalid or expired verification code." },
          { status: 400 }
        );
      }

      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: targetPhone },
            ...(norm.e164 ? [{ phone: norm.e164 }] : []),
          ],
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Account not found for this phone number." },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "A valid reset token or phone verification code is required." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (cost factor 10) - NEVER STORE PLAINTEXT
    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // Update password hash and clear any pending tokens
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      // Revoke any existing active sessions to prevent unauthorized persistence
      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "PASSWORD_RESET_COMPLETED",
          entityType: "USER",
          entityId: user.id,
          metadata: JSON.stringify({
            userId: user.id,
            role: user.role,
            resetMethod: token ? "EMAIL_TOKEN" : "SMS_OTP",
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
      phone: user.phone,
      email: user.email,
    });
  } catch (error) {
    console.error("[Reset Password API Error]:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
