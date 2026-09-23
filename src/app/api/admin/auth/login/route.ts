import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = (body.email || body.phone || body.identifier || "").trim().toLowerCase();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Administrator email/phone and password are required" },
        { status: 400 }
      );
    }

    // Find administrator by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid administrator credentials" }, { status: 401 });
    }

    // Role check: Only administrative roles permitted in Command Center
    const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Access Denied: Administrative clearance required" },
        { status: 403 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your administrator account has been suspended" },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Administrator password is not initialized" },
        { status: 400 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid administrator credentials" }, { status: 401 });
    }

    // Check if initial forced password change is required
    if (user.mustChangePassword) {
      return NextResponse.json({
        success: true,
        mustChangePassword: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }

    // Authenticated flow: create session
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

    await setSessionCookie(token);

    await logAuditEvent({
      actorId: user.id,
      action: "ADMIN_LOGIN_SUCCESS",
      entityType: "USER",
      entityId: user.id,
      metadata: { role: user.role, email: user.email },
    });

    return NextResponse.json({
      success: true,
      mustChangePassword: false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Admin Auth Login Error]:", error);
    return NextResponse.json({ error: "Authentication system error" }, { status: 500 });
  }
}
