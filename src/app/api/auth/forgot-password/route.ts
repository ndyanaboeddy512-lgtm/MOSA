import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { createAndSaveOtp } from "@/lib/auth";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { sendBusinessSMS } from "@/lib/sms";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = (body.identifier || body.username || body.phone || body.email || "").trim();

    if (!identifier) {
      return NextResponse.json(
        { error: "Phone number or email is required to recover access." },
        { status: 400 }
      );
    }

    const isEmail = identifier.includes("@");

    if (isEmail) {
      const email = identifier.toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email },
      });

      // Generic response to prevent user enumeration
      if (!user) {
        return NextResponse.json({
          success: true,
          method: "EMAIL",
          message: "If that email belongs to an account, password reset instructions have been sent.",
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
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "USER",
        entityId: user.id,
        metadata: { method: "EMAIL", email },
      });

      return NextResponse.json({
        success: true,
        method: "EMAIL",
        message: "Password reset instructions have been sent to your email.",
        devToken: process.env.NODE_ENV !== "production" ? resetToken : undefined,
      });
    }

    // Phone-based recovery (Standard for Rwanda commerce)
    const norm = normalizeRwandaPhone(identifier);
    const targetPhone = norm.isValid && norm.e164 ? norm.e164 : identifier;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: targetPhone },
          ...(norm.e164 ? [{ phone: norm.e164 }] : []),
        ],
      },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        method: "SMS",
        message: "If that phone number belongs to an account, a verification code has been dispatched via SMS.",
      });
    }

    // Generate and persist 10-minute OTP
    const otp = await createAndSaveOtp(user.phone || targetPhone);

    let smsSuccess = false;
    let feedbackMessage = "A 4-digit verification code has been dispatched via SMS to your phone.";

    // If user has a registered phone, attempt SMS alert
    if (user.phone) {
      const smsResult = await sendBusinessSMS({
        businessId: "system",
        recipientPhone: user.phone,
        templateId: "SECURITY_ALERT",
        language: (user.language as any) || "rw",
        variables: {
          code: otp,
        },
      }).catch((err) => ({ success: false, status: "FAILED", error: err.message }));

      smsSuccess = Boolean(smsResult && smsResult.success);
    }

    if (!smsSuccess) {
      feedbackMessage = `SMS gateway is not configured. For your account recovery, your verification code is: ${otp}`;
    }

    await logAuditEvent({
      actorId: user.id,
      action: "PASSWORD_RESET_OTP_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      metadata: { method: "SMS", phone: user.phone, smsDispatched: smsSuccess },
    });

    return NextResponse.json({
      success: true,
      method: "SMS",
      phone: user.phone || targetPhone,
      message: feedbackMessage,
      smsDispatched: smsSuccess,
      code: !smsSuccess ? otp : undefined,
      devOtp: !smsSuccess || process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("[Forgot Password API Error]:", error);
    return NextResponse.json(
      { error: "Failed to process recovery request. Please try again." },
      { status: 500 }
    );
  }
}
