import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { store } from "@/lib/store";
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
    case "INAPPROPRIATE_CONTENT":
      return ReportReason.SPAM;
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

    if (reports.length > 0) {
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
    }
  } catch (error) {
    console.warn("[Reports DB Fallback]:", error);
  }

  const fallback = store.getReports();
  return NextResponse.json({
    success: true,
    count: fallback.length,
    source: "seed_cache",
    reports: fallback,
  });
}

// POST /api/reports - Submit a community moderation report
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessId, reason, details } = body;

    if (!businessId || !details) {
      return NextResponse.json(
        { error: "Missing required fields: businessId and details" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    let userId = currentUser?.id;

    if (!userId) {
      try {
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
      } catch {
        userId = "user-customer-1";
      }
    }

    const reportReason = mapReason(reason);

    let savedReport = null;
    try {
      savedReport = await prisma.report.create({
        data: {
          businessId,
          userId,
          reason: reportReason,
          details,
          status: ReportStatus.OPEN,
        },
      });

      await logAuditEvent({
        actorId: userId,
        action: "REPORT_SUBMITTED",
        entityType: "REPORT",
        entityId: savedReport.id,
        metadata: { businessId, reason: reportReason, details },
      });
    } catch (dbError) {
      console.warn("[Report DB Warning]:", dbError);
    }

    // Keep store synchronized
    const storeRep = store.submitReport({
      businessId,
      businessName: "Business",
      reportedBy: currentUser?.name || "Community Member",
      reason: reportReason as any,
      details,
    });

    return NextResponse.json({
      success: true,
      report: savedReport || storeRep,
    }, { status: 201 });
  } catch (error) {
    console.error("[Report POST Error]:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
