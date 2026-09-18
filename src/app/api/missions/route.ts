import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get("sector");
    const targetArea = searchParams.get("targetArea");

    const where: any = {};
    if (sector && sector !== "all") {
      where.targetArea = { contains: sector, mode: "insensitive" };
    }
    if (targetArea && targetArea !== "all") {
      where.targetArea = { contains: targetArea, mode: "insensitive" };
    }

    const missions = await prisma.mission.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      count: missions.length,
      source: "postgres",
      missions: missions.map((m) => ({
        id: m.id,
        title: m.title,
        titleRw: m.titleRw,
        description: m.description,
        descriptionRw: m.descriptionRw,
        targetArea: m.targetArea,
        pointsReward: m.pointsReward,
        badgeReward: m.badgeReward || undefined,
        category: m.category,
        isCompleted: m.isCompleted,
      })),
    });
  } catch (error) {
    console.error("[Missions GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch missions from database" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth([Role.COMMUNITY_AGENT, Role.COMMUNITY_ADMIN, Role.SUPER_ADMIN, Role.CUSTOMER]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Authentication required to complete missions" }, { status: auth.status || 401 });
  }

  const currentUser = auth.user;

  try {
    const body = await request.json();
    const { missionId, isCompleted = true } = body;

    if (!missionId) {
      return NextResponse.json({ error: "Missing missionId" }, { status: 400 });
    }

    let pointsAwarded = 50;

    const result = await prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id: missionId },
      });

      if (!mission) {
        throw new Error("Mission not found");
      }

      pointsAwarded = mission.pointsReward;
      await tx.mission.update({
        where: { id: missionId },
        data: { isCompleted },
      });

      const userBadges = Array.isArray(currentUser.badges) ? [...currentUser.badges] : [];
      if (mission.badgeReward && !userBadges.includes(mission.badgeReward)) {
        userBadges.push(mission.badgeReward);
      }

      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          points: { increment: pointsAwarded },
          badges: userBadges,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: currentUser.id,
          action: "MISSION_COMPLETED",
          entityType: "MISSION",
          entityId: missionId,
          metadata: JSON.stringify({
            pointsEarned: pointsAwarded,
            badgeEarned: mission.badgeReward,
            title: mission.title,
          }),
        },
      });

      return { mission, pointsAwarded };
    });

    return NextResponse.json({
      success: true,
      missionId,
      pointsEarned: result.pointsAwarded,
    });
  } catch (error) {
    console.error("[Mission POST Error]:", error);
    return NextResponse.json({ error: "Failed to update mission" }, { status: 500 });
  }
}
