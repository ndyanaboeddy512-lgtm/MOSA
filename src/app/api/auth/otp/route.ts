import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtpCode, createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, identifier, phone, code, role = "CUSTOMER", name } = body;

    const rawId = (email || identifier || phone || "").trim();
    if (!rawId || !code) {
      return NextResponse.json(
        { error: "Email address and verification code are required" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim();
    const cleanEmail = rawId.toLowerCase();

    // Verify code against email identifier
    let isValid = await verifyOtpCode(cleanEmail, cleanCode);
    if (!isValid && !rawId.includes("@")) {
      isValid = await verifyOtpCode(rawId, cleanCode);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    // Locate or upsert user in database
    let user: any = null;

    if (rawId.includes("@")) {
      user = await prisma.user.findFirst({
        where: { email: cleanEmail },
      });

      if (!user) {
        const referralCode = `MOSA-${cleanEmail.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const targetRole: Role = (role === "BUSINESS_OWNER" || role === "CUSTOMER") ? (role as Role) : Role.CUSTOMER;
        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: name || cleanEmail.split("@")[0],
            role: targetRole,
            referralCode,
            language: "rw",
            community: "Kigali",
          },
        });
      }
    } else {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: rawId },
            { referralCode: rawId },
          ],
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Account could not be found for this identifier" },
          { status: 404 }
        );
      }
    }

    // Generate signed JWT token
    const token = await createSessionToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Save session in PostgreSQL
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Set secure HTTP-only session cookie
    await setSessionCookie(token);

    // Record audit event
    await logAuditEvent({
      actorId: user.id,
      action: "USER_AUTHENTICATED_EMAIL_OTP",
      entityType: "USER",
      entityId: user.id,
      metadata: { role: user.role, email: user.email },
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
        points: user.points,
        badges: user.badges,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error("[OTP Verification Error]:", error);
    return NextResponse.json(
      { error: "Authentication verification failed" },
      { status: 500 }
    );
  }
}
