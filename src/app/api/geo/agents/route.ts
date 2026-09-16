import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectorId = searchParams.get("sectorId");
  const cellId = searchParams.get("cellId");
  const userId = searchParams.get("userId");

  try {
    const where: any = { status: "ACTIVE" };
    if (sectorId) where.sectorId = sectorId;
    if (cellId) where.cellId = cellId;
    if (userId) where.userId = userId;

    const assignments = await prisma.agentAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            points: true,
            badges: true,
          },
        },
        sectorRel: true,
        cellRel: true,
      },
      orderBy: { assignedAt: "desc" },
    });

    return NextResponse.json({ success: true, count: assignments.length, assignments });
  } catch (error) {
    console.error("[Agent Assignment API] Error loading assignments:", error);
    return NextResponse.json({ error: "Failed to load agent assignments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.COMMUNITY_ADMIN)) {
      return NextResponse.json({ error: "Only admins can assign agent jurisdictions" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, sectorId, cellId, status = "ACTIVE" } = body;

    if (!userId || !sectorId) {
      return NextResponse.json({ error: "userId and sectorId are required" }, { status: 400 });
    }

    const assignment = await prisma.agentAssignment.create({
      data: {
        userId,
        sectorId,
        cellId: cellId || null,
        status,
      },
      include: {
        user: true,
        sectorRel: true,
        cellRel: true,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      action: "ASSIGN_AGENT_JURISDICTION",
      entityType: "AGENT_ASSIGNMENT",
      entityId: assignment.id,
      metadata: { targetUserId: userId, sectorId, cellId, status },
    });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    console.error("[Agent Assignment API] Error creating assignment:", error);
    return NextResponse.json({ error: "Failed to assign agent" }, { status: 500 });
  }
}
