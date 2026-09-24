import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAndSaveOtp, comparePassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { sendBusinessSMS } from "@/lib/sms";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, phone, email, password, role = "CUSTOMER", rememberMe = true } = body;

    const rawIdentifier = (username || phone || email || "").trim();
    if (!rawIdentifier) {
      return NextResponse.json(
        { error: "Phone number or email is required" },
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
            where: { phone: rawIdentifier },
          });
        }
      }

      if (!user) {
        return NextResponse.json({ error: "Invalid username, phone number, or password" }, { status: 401 });
      }

      if (user.status !== "ACTIVE") {
        return NextResponse.json({ error: "Your account is inactive or suspended" }, { status: 403 });
      }

      if (!user.passwordHash) {
        return NextResponse.json(
          { error: "Password has not been set for this account yet. Please sign in via SMS code or reset your password." },
          { status: 400 }
        );
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: "Invalid username, phone number, or password" }, { status: 401 });
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

    // Otherwise: SMS OTP flow (phone required)
    const norm = normalizeRwandaPhone(rawIdentifier);
    if (!norm.isValid || !norm.e164) {
      return NextResponse.json(
        { error: norm.error || "A valid Rwandan phone number is required for SMS code login (e.g. 0788123456)" },
        { status: 400 }
      );
    }

    // Generate and persist OTP in database with 10-minute validity
    const otp = await createAndSaveOtp(norm.e164);

    let smsSuccess = false;
    const smsResult = await sendBusinessSMS({
      businessId: "system",
      recipientPhone: norm.e164,
      templateId: "SECURITY_ALERT",
      language: "rw",
      variables: { code: otp },
    }).catch(() => ({ success: false, status: "FAILED" }));

    smsSuccess = Boolean(smsResult && smsResult.success);

    await logAuditEvent({
      action: "OTP_REQUESTED",
      entityType: "AUTH",
      entityId: norm.e164,
      metadata: { requestedRole: role, smsDispatched: smsSuccess },
    });

    return NextResponse.json({
      success: true,
      message: smsSuccess 
        ? "Verification code sent via SMS" 
        : `SMS Gateway is not configured. Your verification code is: ${otp}`,
      smsDispatched: smsSuccess,
      otp: !smsSuccess || process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("[Auth API Error]:", error);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
