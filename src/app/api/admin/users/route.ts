import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COMMUNITY_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");
  const search = searchParams.get("q");

  try {
    const where: any = {};
    if (roleFilter && roleFilter !== "ALL") {
      where.role = roleFilter as Role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        community: true,
        points: true,
        badges: true,
        createdAt: true,
        mustChangePassword: true,
        _count: {
          select: {
            businessesOwned: true,
            captures: true,
            reports: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("[Admin Users GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch platform users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Super Admin privileges required" }, { status: auth.status || 403 });
  }

  try {
    const body = await request.json();
    const { userId, role, status } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role ? { role: role as Role } : {}),
        ...(status ? { status } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await logAuditEvent({
      actorId: auth.user.id,
      action: "ADMIN_UPDATED_USER",
      entityType: "USER",
      entityId: userId,
      metadata: { role, status },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("[Admin Users PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
