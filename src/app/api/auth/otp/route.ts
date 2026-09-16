import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtpCode, createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, code, role = "CUSTOMER", name } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone number and verification code are required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();
    const isValid = await verifyOtpCode(cleanPhone, code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    // Upsert persistent user in PostgreSQL
    const referralCode = `MOSA-${cleanPhone.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

    const user = await prisma.user.upsert({
      where: { phone: cleanPhone },
      update: {
        updatedAt: new Date(),
      },
      create: {
        phone: cleanPhone,
        name: name || `Resident ${cleanPhone.slice(-4)}`,
        role: (role as Role) || Role.CUSTOMER,
        referralCode,
        language: "rw",
        community: "Nyamirambo",
      },
    });

    // Generate real signed JWT token
    const token = await createSessionToken({
      userId: user.id,
      phone: user.phone,
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
      action: "USER_AUTHENTICATED",
      entityType: "USER",
      entityId: user.id,
      metadata: { role: user.role, phone: cleanPhone },
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
