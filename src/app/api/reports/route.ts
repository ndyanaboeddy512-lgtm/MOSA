import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { ReportReason, ReportStatus } from "@prisma/client";

function mapReason(r?: string): ReportReason {
  switch (r?.toUpperCase()) {
    case "CLOSED_PERMANENTLY":
      return ReportReason.CLOSED_PERMANENTLY;
    case "WRONG_LOCATION":
      return ReportReason.WRONG_LOCATION;
    case "WRONG_PRICE":
    case "INCORRECT_PRICES":
      return ReportReason.WRONG_PRICE;
    case "SPAM":
      return ReportReason.SPAM;
    case "INAPPROPRIATE_CONTENT":
    case "OFFENSIVE_MEDIA":
      return ReportReason.INAPPROPRIATE_CONTENT;
    case "FAKE_BUSINESS":
    default:
      return ReportReason.FAKE_BUSINESS;
  }
}

// GET /api/reports - List moderation reports
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const where: any = {};
    if (statusParam && Object.values(ReportStatus).includes(statusParam as any)) {
      where.status = statusParam as ReportStatus;
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        business: {
          select: { id: true, name: true, cell: true, sector: true },
        },
        user: {
          select: { id: true, name: true, phone: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      count: reports.length,
      source: "database",
      reports: reports.map((r) => ({
        id: r.id,
        businessId: r.businessId,
        businessName: r.business.name,
        reporterName: r.user.name,
        reporterPhone: r.user.phone,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Reports DB Error]:", error);
    return NextResponse.json({ error: "Failed to fetch reports from database" }, { status: 500 });
  }
}

// POST /api/reports - Submit a community moderation report
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, reason, details, targetType = "BUSINESS", targetId } = body;

    if (!businessId || !details) {
      return NextResponse.json(
        { error: "Missing required fields: businessId and details" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    let userId = currentUser?.id;

    if (!userId) {
      const defaultUser = await prisma.user.upsert({
        where: { phone: "+250788999888" },
        update: {},
        create: {
          phone: "+250788999888",
          name: "Community Member",
          role: "CUSTOMER",
          community: "Nyamirambo",
          points: 50,
          badges: ["Community Watch"],
          referralCode: "MOSA-NYA-CW",
        },
      });
      userId = defaultUser.id;
    }

    const reportReason = mapReason(reason);

    const savedReport = await prisma.$transaction(async (tx) => {
      const rep = await tx.report.create({
        data: {
          businessId,
          userId,
          reason: reportReason,
          details,
          targetType,
          targetId: targetId || null,
          status: ReportStatus.OPEN,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "REPORT_SUBMITTED",
          entityType: "REPORT",
          entityId: rep.id,
          metadata: JSON.stringify({ businessId, reason: reportReason, details }),
        },
      });

      return rep;
    });

    return NextResponse.json({
      success: true,
      report: savedReport,
    }, { status: 201 });
  } catch (error) {
    console.error("[Report POST Error]:", error);
    return NextResponse.json({ error: "Failed to submit report in database" }, { status: 500 });
  }
}
