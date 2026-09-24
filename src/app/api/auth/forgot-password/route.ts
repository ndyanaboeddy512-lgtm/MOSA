import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAndSaveOtp } from "@/lib/auth";
import { sendVerificationEmail, isValidEmail, isEmailConfigured } from "@/lib/email";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { logAuditEvent } from "@/lib/audit";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier = (body.identifier || body.username || body.phone || body.email || "").trim();

    if (!rawIdentifier) {
      return NextResponse.json(
        { error: "Registered email address or phone number is required to recover access." },
        { status: 400 }
      );
    }

    // 1. Check if email gateway is configured
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: "Email verification service is not configured (RESEND_API_KEY required). Please contact administrator support.",
        },
        { status: 503 }
      );
    }

    let targetEmail: string | null = null;
    let user: any = null;

    if (rawIdentifier.includes("@")) {
      const cleanEmail = rawIdentifier.toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return NextResponse.json(
          { error: "Please provide a valid email address format." },
          { status: 400 }
        );
      }

      user = await prisma.user.findFirst({
        where: { email: cleanEmail },
      });

      targetEmail = cleanEmail;
    } else {
      // Look up user by phone or referral code
      const norm = normalizeRwandaPhone(rawIdentifier);
      const targetPhone = norm.isValid && norm.e164 ? norm.e164 : rawIdentifier;

      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: targetPhone },
            ...(norm.e164 ? [{ phone: norm.e164 }] : []),
            { referralCode: rawIdentifier },
          ],
        },
      });

      if (user && user.email) {
        targetEmail = user.email.toLowerCase().trim();
      } else if (user && !user.email) {
        return NextResponse.json(
          {
            error: "This account has no registered email address on file. Please contact your MOSA administrator to link an email.",
          },
          { status: 400 }
        );
      }
    }

    // Generic safe response if user not found (anti-enumeration)
    if (!user || !targetEmail) {
      return NextResponse.json({
        success: true,
        method: "EMAIL",
        message: "If that account exists in our system, a 4-digit verification code has been dispatched to its registered email.",
      });
    }

    // 2. Generate and persist 10-minute OTP code (associated with target email)
    const otp = await createAndSaveOtp(targetEmail);
    // Also bind to phone if present so either identifier works on verification submit
    if (user.phone) {
      await createAndSaveOtp(user.phone);
    }

    // 3. Dispatch verification email via Resend
    const emailResult = await sendVerificationEmail({
      to: targetEmail,
      code: otp,
      purpose: "PASSWORD_RESET",
      language: user.language || "rw",
      recipientName: user.name,
      expiresMinutes: 10,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          error: emailResult.error || "Failed to dispatch verification email. Please try again.",
        },
        { status: 502 }
      );
    }

    // 4. Log audit trail (without exposing sensitive code or API keys)
    await logAuditEvent({
      actorId: user.id,
      action: "PASSWORD_RESET_EMAIL_DISPATCHED",
      entityType: "USER",
      entityId: user.id,
      metadata: { method: "EMAIL", maskedRecipient: maskEmail(targetEmail) },
    });

    return NextResponse.json({
      success: true,
      method: "EMAIL",
      email: maskEmail(targetEmail),
      message: `A 4-digit verification code has been dispatched to your registered email address (${maskEmail(targetEmail)}).`,
    });
  } catch (error) {
    console.error("[Forgot Password API Error]:", error);
    return NextResponse.json(
      { error: "Failed to process recovery request. Please try again." },
      { status: 500 }
    );
  }
}
