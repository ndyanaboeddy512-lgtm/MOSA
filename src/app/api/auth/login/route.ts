import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAndSaveOtp, comparePassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password, role = "CUSTOMER" } = body;

    const norm = normalizeRwandaPhone(phone);
    if (!norm.isValid || !norm.e164) {
      return NextResponse.json(
        { error: norm.error || "A valid Rwandan phone number is required (e.g. 0788123456)" },
        { status: 400 }
      );
    }

    // Direct Password-based authentication flow
    if (password && typeof password === "string") {
      const user = await prisma.user.findUnique({
        where: { phone: norm.e164 },
      });

      if (!user) {
        return NextResponse.json({ error: "Invalid phone number or password" }, { status: 401 });
      }

      if (user.status !== "ACTIVE") {
        return NextResponse.json({ error: "Your account is inactive or suspended" }, { status: 403 });
      }

      if (!user.passwordHash) {
        return NextResponse.json(
          { error: "Password has not been set for this account yet. Please sign in via SMS code." },
          { status: 400 }
        );
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: "Invalid phone number or password" }, { status: 401 });
      }

      const token = await createSessionToken({
        userId: user.id,
        phone: user.phone,
        role: user.role,
        name: user.name,
      });

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      await setSessionCookie(token);

      await logAuditEvent({
        actorId: user.id,
        action: "USER_LOGGED_IN_PASSWORD",
        entityType: "USER",
        entityId: user.id,
        metadata: { role: user.role, phone: norm.e164 },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          language: user.language,
          community: user.community,
          referralCode: user.referralCode,
        },
      });
    }

    // Otherwise: Generate and persist OTP in database with 10-minute validity
    const otp = await createAndSaveOtp(norm.e164);

    await logAuditEvent({
      action: "OTP_REQUESTED",
      entityType: "AUTH",
      entityId: norm.e164,
      metadata: { requestedRole: role },
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent via SMS",
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (error) {
    console.error("[Auth API Error]:", error);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
