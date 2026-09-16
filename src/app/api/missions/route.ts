import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { store } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
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

    if (missions.length > 0) {
      return NextResponse.json({
        success: true,
        count: missions.length,
        source: "database",
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
    }
  } catch (error) {
    console.warn("[Missions DB Fallback]:", error);
  }

  // Graceful fallback to initial seeds
  const fallbackMissions = store.getMissions();
  return NextResponse.json({
    success: true,
    count: fallbackMissions.length,
    source: "seed_cache",
    missions: fallbackMissions,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { missionId, isCompleted = true } = body;

    if (!missionId) {
      return NextResponse.json({ error: "Missing missionId" }, { status: 400 });
    }

    let pointsAwarded = 50;
    const currentUser = await getCurrentUser();

    try {
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
      });

      if (mission) {
        pointsAwarded = mission.pointsReward;
        await prisma.mission.update({
          where: { id: missionId },
          data: { isCompleted },
        });

        // Award points and badges to user if logged in
        if (currentUser) {
          const userBadges = Array.isArray(currentUser.badges) ? [...currentUser.badges] : [];
          if (mission.badgeReward && !userBadges.includes(mission.badgeReward)) {
            userBadges.push(mission.badgeReward);
          }

          await prisma.user.update({
            where: { id: currentUser.id },
            data: {
              points: { increment: pointsAwarded },
              badges: userBadges,
            },
          });

          await logAuditEvent({
            actorId: currentUser.id,
            action: "MISSION_COMPLETED",
            entityType: "MISSION",
            entityId: missionId,
            metadata: {
              pointsEarned: pointsAwarded,
              badgeEarned: mission.badgeReward,
              title: mission.title,
            },
          });
        }
      }
    } catch (dbError) {
      console.warn("[Mission Update DB Warning]:", dbError);
    }

    // Keep store synchronized
    store.completeMission(missionId);

    return NextResponse.json({
      success: true,
      missionId,
      pointsEarned: pointsAwarded,
    });
  } catch (error) {
    console.error("[Mission POST Error]:", error);
    return NextResponse.json({ error: "Failed to update mission" }, { status: 500 });
  }
}
