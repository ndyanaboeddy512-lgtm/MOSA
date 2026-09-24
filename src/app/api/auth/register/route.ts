import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, setSessionCookie, validatePasswordStrength, createAndSaveOtp } from "@/lib/auth";
import { normalizeRwandaPhone } from "@/lib/sms/normalize";
import { sendVerificationEmail, isValidEmail, isEmailConfigured } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, email, password, name, role = "BUSINESS_OWNER", language = "rw", community = "Kigali" } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "A valid name is required" }, { status: 400 });
    }

    let cleanEmail: string | null = null;
    if (email && typeof email === "string" && email.trim() !== "") {
      cleanEmail = email.trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return NextResponse.json({ error: "Please provide a valid email address format" }, { status: 400 });
      }

      const existingEmail = await prisma.user.findFirst({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "A user with this email address is already registered. Please sign in." },
          { status: 409 }
        );
      }
    }

    const norm = normalizeRwandaPhone(phone);
    if (!norm.isValid || !norm.e164) {
      return NextResponse.json({ error: norm.error || "A valid Rwandan phone number is required" }, { status: 400 });
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      return NextResponse.json({ error: pwdCheck.error }, { status: 400 });
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: norm.e164 },
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: "A user with this phone number is already registered. Please sign in." },
        { status: 409 }
      );
    }

    const targetRole: Role = (role === "BUSINESS_OWNER" || role === "CUSTOMER") ? role : Role.CUSTOMER;
    const passwordHash = await hashPassword(password);
    const referralCode = `MOSA-${norm.e164.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

    const user = await prisma.user.create({
      data: {
        phone: norm.e164,
        email: cleanEmail,
        name: name.trim(),
        passwordHash,
        role: targetRole,
        language: ["rw", "en", "fr", "sw"].includes(language) ? language : "rw",
        referralCode,
        status: "ACTIVE",
        community: community || "Kigali",
      },
    });

    // If email is configured and Resend is available, dispatch welcome account confirmation code
    if (cleanEmail && isEmailConfigured()) {
      try {
        const code = await createAndSaveOtp(cleanEmail);
        sendVerificationEmail({
          to: cleanEmail,
          code,
          purpose: "ACCOUNT_VERIFICATION",
          language: user.language,
          recipientName: user.name,
        }).catch((err) => {
          console.warn("[Register Email Send Warning]:", err?.message || err);
        });
      } catch (err: any) {
        console.warn("[Register OTP Generation Warning]:", err?.message || err);
      }
    }

    const token = await createSessionToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
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

    await setSessionCookie(token, true);

    await logAuditEvent({
      actorId: user.id,
      action: "USER_REGISTERED",
      entityType: "USER",
      entityId: user.id,
      metadata: { role: user.role, phone: norm.e164, email: cleanEmail },
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
  } catch (error) {
    console.error("[Register API Error]:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
