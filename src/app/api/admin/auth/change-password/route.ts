import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword, createSessionToken, setSessionCookie, getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Locate administrator either via active session or email
    let user = await getCurrentUser();
    if (!user && email) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.trim().toLowerCase() },
            { phone: email.trim() },
          ],
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Administrator account not found" }, { status: 404 });
    }

    const allowedRoles: Role[] = [Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN, Role.MODERATOR];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!user.passwordHash) {
      return NextResponse.json({ error: "User password hash not configured" }, { status: 400 });
    }

    // Verify current password matches
    const isCurrentMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const newPasswordHash = await hashPassword(newPassword);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        updatedAt: new Date(),
      },
    });

    // Generate authenticated session token
    const token = await createSessionToken({
      userId: updatedUser.id,
      phone: updatedUser.phone,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: {
        userId: updatedUser.id,
        token,
        expiresAt,
      },
    });

    await setSessionCookie(token);

    await logAuditEvent({
      actorId: updatedUser.id,
      action: "ADMIN_PASSWORD_CHANGED",
      entityType: "USER",
      entityId: updatedUser.id,
      metadata: { email: updatedUser.email },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully. Administrative session active.",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("[Admin Change Password Error]:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
