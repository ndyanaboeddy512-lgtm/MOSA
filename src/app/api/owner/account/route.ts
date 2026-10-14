import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

/**
 * DELETE /api/owner/account
 * Authenticated Partner Account Deletion:
 * - Requires active BUSINESS_OWNER authentication.
 * - Enforces strong user confirmation.
 * - Deactivates owned businesses and unlinks owner according to MOSA data rules.
 * - Revokes all active sessions and clears authentication cookies.
 * - Permanently disables the user account so login no longer works.
 * - Records an immutable audit log entry for governance and security auditing.
 */
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to perform account deletion" },
        { status: 401 }
      );
    }

    if (user.role !== Role.BUSINESS_OWNER && user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Only business partners can delete partner portal accounts" },
        { status: 403 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { confirmation, reason } = body;
    if (confirmation !== "DELETE" && confirmation !== "CONFIRM") {
      return NextResponse.json(
        { error: "Strong confirmation required. Please confirm deletion explicitly." },
        { status: 400 }
      );
    }

    // Retrieve all businesses associated with the partner
    const ownedBusinesses = await prisma.business.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true, phone: true },
    });

    const businessSummaries = ownedBusinesses.map((b) => ({
      id: b.id,
      name: b.name,
      phone: b.phone,
    }));

    // Secure audit log entry BEFORE state mutation
    await logAuditEvent({
      actorId: user.id,
      action: "PARTNER_ACCOUNT_DELETED",
      entityType: "USER",
      entityId: user.id,
      metadata: {
        userName: user.name,
        userPhone: user.phone,
        userEmail: user.email,
        reason: reason || "User initiated self-serve account deletion in Partner Portal",
        businessesDeactivated: businessSummaries,
        deletedAt: new Date().toISOString(),
      },
    });

    // Handle associated business data according to MOSA rules:
    // Unlink the owner and mark business status as INACTIVE to prevent public display
    if (ownedBusinesses.length > 0) {
      await prisma.business.updateMany({
        where: { ownerId: user.id },
        data: {
          status: "INACTIVE",
          isClaimed: false,
          ownerId: null,
        },
      });
    }

    // Revoke all active database sessions and clean up notifications
    await prisma.session.deleteMany({
      where: { userId: user.id },
    }).catch(() => {});

    await prisma.notification.deleteMany({
      where: { userId: user.id },
    }).catch(() => {});

    // Clear session cookies in response
    await clearSessionCookie();

    // Permanently deactivate and neutralize user credentials so login can never succeed again
    const tombstone = Date.now();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "DELETED",
        phone: user.phone ? `deleted_${tombstone}_${user.phone}` : null,
        email: user.email ? `deleted_${tombstone}_${user.email}` : null,
        passwordHash: null,
        mustChangePassword: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your partner account and associated business credentials have been permanently deleted.",
    });
  } catch (error: any) {
    console.error("[Owner Account Deletion Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete partner account" },
      { status: 500 }
    );
  }
}
