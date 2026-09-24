import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAndSaveOtp, comparePassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { sendVerificationEmail, isValidEmail, isEmailConfigured } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, phone, email, password, role = "CUSTOMER", rememberMe = true } = body;

    const rawIdentifier = (email || username || phone || "").trim();
    if (!rawIdentifier) {
      return NextResponse.json(
        { error: "Registered email address or username is required" },
        { status: 400 }
      );
    }

    // Direct Password-based authentication flow
    if (password && typeof password === "string") {
      let user = null;

      if (rawIdentifier.includes("@")) {
        user = await prisma.user.findFirst({
          where: { email: rawIdentifier.toLowerCase() },
        });
      } else {
        const norm = normalizeRwandaPhone(rawIdentifier);
        if (norm.isValid && norm.e164) {
          user = await prisma.user.findUnique({
            where: { phone: norm.e164 },
          });
        } else {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: rawIdentifier },
                { referralCode: rawIdentifier },
              ],
            },
          });
        }
      }

      if (!user) {
        return NextResponse.json({ error: "Invalid username, email, or password" }, { status: 401 });
      }

      if (user.status !== "ACTIVE") {
        return NextResponse.json({ error: "Your account is inactive or suspended" }, { status: 403 });
      }

      if (!user.passwordHash) {
        return NextResponse.json(
          { error: "Password has not been set for this account yet. Please sign in via email verification code or reset your password." },
          { status: 400 }
        );
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: "Invalid username, email, or password" }, { status: 401 });
      }

      const token = await createSessionToken({
        userId: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      const isRemember = rememberMe !== false;
      const sessionDurationMs = isRemember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + sessionDurationMs);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      await setSessionCookie(token, isRemember);

      await logAuditEvent({
        actorId: user.id,
        action: "USER_LOGGED_IN_PASSWORD",
        entityType: "USER",
        entityId: user.id,
        metadata: { role: user.role, identifier: rawIdentifier, rememberMe: isRemember },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          language: user.language,
          community: user.community,
          referralCode: user.referralCode,
        },
      });
    }

    // Otherwise: Email verification code flow (Resend email delivery)
    let targetEmail: string | null = null;
    let existingUser: any = null;

    if (rawIdentifier.includes("@")) {
      const cleanEmail = rawIdentifier.toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address format (e.g. name@domain.com)" },
          { status: 400 }
        );
      }
      targetEmail = cleanEmail;
      existingUser = await prisma.user.findFirst({
        where: { email: cleanEmail },
      });
    } else {
      // Look up user by phone or referral code to locate their registered email
      const norm = normalizeRwandaPhone(rawIdentifier);
      const targetPhone = norm.isValid && norm.e164 ? norm.e164 : rawIdentifier;

      existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: targetPhone },
            ...(norm.e164 ? [{ phone: norm.e164 }] : []),
            { referralCode: rawIdentifier },
          ],
        },
      });

      if (!existingUser || !existingUser.email) {
        return NextResponse.json(
          { error: "A valid registered email address is required to receive verification codes." },
          { status: 400 }
        );
      }
      targetEmail = existingUser.email.toLowerCase().trim();
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: "A valid email address is required for verification." },
        { status: 400 }
      );
    }

    // Check if Resend email service is configured
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: "Email verification service is not configured (RESEND_API_KEY required). Please sign in using your account password.",
        },
        { status: 503 }
      );
    }

    // Generate and persist OTP in database with 10-minute validity
    const otp = await createAndSaveOtp(targetEmail);

    // Send verification email via Resend
    const emailResult = await sendVerificationEmail({
      to: targetEmail,
      code: otp,
      purpose: "ACCOUNT_LOGIN",
      language: existingUser?.language || "rw",
      recipientName: existingUser?.name,
      expiresMinutes: 10,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to dispatch verification email. Please try again." },
        { status: 502 }
      );
    }

    await logAuditEvent({
      action: "EMAIL_OTP_REQUESTED",
      entityType: "AUTH",
      entityId: targetEmail,
      metadata: { requestedRole: role },
    });

    return NextResponse.json({
      success: true,
      message: `A 4-digit verification code has been dispatched to ${targetEmail}.`,
      email: targetEmail,
    });
  } catch (error) {
    console.error("[Auth API Error]:", error);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
