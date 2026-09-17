import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { sendBusinessSMS } from "@/lib/sms";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let businessId = searchParams.get("businessId");

    if (!businessId) {
      const biz = await prisma.business.findFirst({
        where: auth.user.role === Role.SUPER_ADMIN ? {} : { ownerId: auth.user.id },
        select: { id: true },
      });
      if (!biz) {
        return NextResponse.json({ error: "No business found for this account" }, { status: 404 });
      }
      businessId = biz.id;
    }

    // Verify ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    // Fetch historical monthly reports directly from Neon PostgreSQL
    const reports = await prisma.monthlyFinancialReport.findMany({
      where: { businessId },
      orderBy: { monthYear: "desc" },
    });

    return NextResponse.json({
      success: true,
      businessId,
      reports,
    });
  } catch (error) {
    console.error("[Owner Reports GET error]:", error);
    return NextResponse.json({ error: "Failed to fetch monthly reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const { businessId, monthYear = new Date().toISOString().substring(0, 7), sendSms = false, language = "rw" } = body;

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    // Verify ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true, phone: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    // Recalculate aggregates from purchases & expenses
    const purchases = await prisma.businessPurchase.findMany({
      where: { businessId, monthYear },
    });

    const expenses = await prisma.businessExpense.findMany({
      where: { businessId, monthYear },
    });

    const totalCost = purchases.reduce((acc, p) => acc + p.totalCost, 0);
    const expectedRevenue = purchases.reduce((acc, p) => acc + p.expectedRevenue, 0);
    const expectedGrossProfit = expectedRevenue - totalCost;
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    const report = await prisma.monthlyFinancialReport.upsert({
      where: {
        businessId_monthYear: {
          businessId,
          monthYear,
        },
      },
      update: {
        totalCost,
        expectedRevenue,
        expectedGrossProfit,
        totalExpenses,
        purchaseCount: purchases.length,
      },
      create: {
        businessId,
        monthYear,
        totalCost,
        expectedRevenue,
        expectedGrossProfit,
        totalExpenses,
        purchaseCount: purchases.length,
      },
    });

    let smsResult = null;
    if (sendSms) {
      const recipientPhone = business.phone || auth.user.phone;
      if (recipientPhone) {
        smsResult = await sendBusinessSMS({
          businessId,
          recipientPhone,
          templateId: "MONTHLY_SUMMARY",
          language: language as any,
          variables: {
            monthYear,
            totalPurchases: report.purchaseCount,
            totalCost: report.totalCost,
            expectedRevenue: report.expectedRevenue,
            expectedProfit: report.expectedGrossProfit,
          },
        });

        await prisma.monthlyFinancialReport.update({
          where: { id: report.id },
          data: {
            smsAlertSent: true,
            smsAlertSentAt: new Date(),
            smsStatus: smsResult.status,
          },
        });
      }
    }

    await logAuditEvent({
      actorId: auth.user.id,
      action: "MONTHLY_REPORT_GENERATED",
      entityType: "MONTHLY_FINANCIAL_REPORT",
      entityId: report.id,
      metadata: {
        businessId,
        monthYear,
        totalCost,
        expectedRevenue,
        expectedGrossProfit,
        smsStatus: smsResult?.status || "NOT_REQUESTED",
      },
    });

    return NextResponse.json({
      success: true,
      report,
      smsResult,
    });
  } catch (error) {
    console.error("[Owner Reports POST error]:", error);
    return NextResponse.json({ error: "Failed to generate monthly report" }, { status: 500 });
  }
}
