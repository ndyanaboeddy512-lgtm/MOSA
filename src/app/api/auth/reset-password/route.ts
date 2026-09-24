import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyOtpCode, validatePasswordStrength } from "@/lib/auth";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, email, phone, identifier, otp, newPassword, confirmPassword } = body;

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

    let user: any = null;
    let resetMethod = "EMAIL_CODE";

    // Method 1: Token-based reset (Email Link)
    if (token && typeof token === "string") {
      resetMethod = "EMAIL_TOKEN";
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
    // Method 2: OTP-based reset (Email Verification Code)
    else if (otp) {
      resetMethod = "EMAIL_CODE";
      const rawId = (email || identifier || phone || "").trim();
      if (!rawId) {
        return NextResponse.json(
          { error: "Registered email address is required alongside verification code." },
          { status: 400 }
        );
      }

      let isValidOtp = false;
      const cleanEmail = rawId.toLowerCase();

      // Check OTP against email
      isValidOtp = await verifyOtpCode(cleanEmail, otp.trim());

      // If rawId is phone, also check against normalized phone
      if (!isValidOtp && !rawId.includes("@")) {
        const norm = normalizeRwandaPhone(rawId);
        const targetPhone = norm.isValid && norm.e164 ? norm.e164 : rawId;
        isValidOtp = await verifyOtpCode(targetPhone, otp.trim());
      }

      if (!isValidOtp) {
        return NextResponse.json(
          { error: "Invalid or expired verification code." },
          { status: 400 }
        );
      }

      // Find user by email or phone
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanEmail },
            { phone: rawId },
          ],
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User account matching this identifier could not be located." },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "A valid email reset token or verification code is required." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt - NEVER STORE PLAINTEXT
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
            resetMethod,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
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
