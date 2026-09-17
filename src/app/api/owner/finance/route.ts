import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

const ESTIMATION_DISCLAIMER = "All calculations represent EXPECTED / ESTIMATED gross margin based on catalog pricing until actual sales are recorded.";

export async function GET(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let businessId = searchParams.get("businessId");
    const monthYear = searchParams.get("monthYear") || new Date().toISOString().substring(0, 7);

    // If no businessId provided, fetch the owner's primary business
    if (!businessId) {
      const biz = await prisma.business.findFirst({
        where: auth.user.role === Role.SUPER_ADMIN ? {} : { ownerId: auth.user.id },
        select: { id: true, name: true, ownerId: true },
      });
      if (!biz) {
        return NextResponse.json({ error: "No business found for this account" }, { status: 404 });
      }
      businessId = biz.id;
    }

    // Verify ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    // Fetch purchases for this month
    const purchases = await prisma.businessPurchase.findMany({
      where: {
        businessId,
        ...(monthYear !== "ALL" ? { monthYear } : {}),
      },
      orderBy: { purchaseDate: "desc" },
    });

    // Fetch expenses for this month
    const expenses = await prisma.businessExpense.findMany({
      where: {
        businessId,
        ...(monthYear !== "ALL" ? { monthYear } : {}),
      },
      orderBy: { expenseDate: "desc" },
    });

    // Compute monthly financial totals
    const totalCost = purchases.reduce((acc, p) => acc + p.totalCost, 0);
    const expectedRevenue = purchases.reduce((acc, p) => acc + p.expectedRevenue, 0);
    const expectedGrossProfit = expectedRevenue - totalCost;
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netExpectedProfit = expectedGrossProfit - totalExpenses;
    const expectedMarginPercent = expectedRevenue > 0 ? (expectedGrossProfit / expectedRevenue) * 100 : 0;

    // Fetch or create persistent monthly report record
    let monthlyReport = null;
    if (monthYear !== "ALL") {
      monthlyReport = await prisma.monthlyFinancialReport.findUnique({
        where: {
          businessId_monthYear: {
            businessId,
            monthYear,
          },
        },
      });

      // Update report with accurate sums if different
      if (
        !monthlyReport ||
        monthlyReport.totalCost !== totalCost ||
        monthlyReport.expectedRevenue !== expectedRevenue ||
        monthlyReport.totalExpenses !== totalExpenses
      ) {
        monthlyReport = await prisma.monthlyFinancialReport.upsert({
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
      }
    }

    return NextResponse.json({
      success: true,
      businessId,
      monthYear,
      purchases,
      expenses,
      monthlyReport,
      summary: {
        purchaseCount: purchases.length,
        totalCost,
        expectedRevenue,
        expectedGrossProfit,
        expectedMarginPercent: Math.round(expectedMarginPercent * 10) / 10,
        totalExpenses,
        netExpectedProfit,
        disclaimer: ESTIMATION_DISCLAIMER,
      },
    });
  } catch (error) {
    console.error("[Owner Finance GET error]:", error);
    return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const actorId = auth.user.id;

  try {
    const body = await request.json();
    const {
      type = "PURCHASE", // PURCHASE or EXPENSE
      businessId,
      // Purchase fields
      itemName,
      quantity = 1,
      unit = "units",
      buyingPriceUnit: rawBuyingPrice,
      buyingPrice,
      sellingPriceUnit: rawSellingPrice,
      sellingPrice,
      supplierName: rawSupplierName,
      supplier,
      supplierContact,
      notes,
      purchaseDate,
      // Expense fields
      category: expenseCategory,
      amount: expenseAmount,
      description: expenseDesc,
      expenseDate,
    } = body;

    const buyingPriceUnit = rawBuyingPrice !== undefined ? rawBuyingPrice : buyingPrice;
    const sellingPriceUnit = rawSellingPrice !== undefined ? rawSellingPrice : sellingPrice;
    const supplierName = rawSupplierName || supplier || null;

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    // Verify ownership
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden: You do not own this business" }, { status: 403 });
    }

    if (type === "EXPENSE") {
      if (!expenseCategory || typeof expenseAmount !== "number" || expenseAmount <= 0) {
        return NextResponse.json({ error: "Valid category and amount are required for expenses" }, { status: 400 });
      }

      const date = expenseDate ? new Date(expenseDate) : new Date();
      const monthYear = date.toISOString().substring(0, 7);

      const expense = await prisma.$transaction(async (tx) => {
        const exp = await tx.businessExpense.create({
          data: {
            businessId,
            category: expenseCategory,
            amount: Number(expenseAmount),
            monthYear,
            description: expenseDesc || null,
            expenseDate: date,
          },
        });

        await tx.monthlyFinancialReport.upsert({
          where: {
            businessId_monthYear: {
              businessId,
              monthYear,
            },
          },
          update: {
            totalExpenses: { increment: exp.amount },
          },
          create: {
            businessId,
            monthYear,
            totalExpenses: exp.amount,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: "EXPENSE_RECORDED",
            entityType: "BUSINESS_EXPENSE",
            entityId: exp.id,
            metadata: JSON.stringify({ businessId, category: exp.category, amount: exp.amount, monthYear }),
          },
        });

        return exp;
      });

      return NextResponse.json({ success: true, type: "EXPENSE", expense }, { status: 201 });
    }

    // Default: PURCHASE
    if (!itemName || typeof buyingPriceUnit !== "number" || typeof sellingPriceUnit !== "number") {
      return NextResponse.json(
        { error: "itemName, buyingPriceUnit, and sellingPriceUnit are required for purchases" },
        { status: 400 }
      );
    }

    const qty = Math.max(0.01, Number(quantity) || 1);
    const buyPrice = Number(buyingPriceUnit);
    const sellPrice = Number(sellingPriceUnit);
    const totalCost = qty * buyPrice;
    const expectedRevenue = qty * sellPrice;
    const expectedGrossProfit = expectedRevenue - totalCost;

    const date = purchaseDate ? new Date(purchaseDate) : new Date();
    const monthYear = date.toISOString().substring(0, 7);

    // Save purchase & update report atomically in Neon PostgreSQL
    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.businessPurchase.create({
        data: {
          businessId,
          itemName: itemName.trim(),
          quantity: qty,
          unit: unit || "units",
          buyingPriceUnit: buyPrice,
          totalCost,
          sellingPriceUnit: sellPrice,
          expectedRevenue,
          expectedGrossProfit,
          supplierName: supplierName?.trim() || null,
          supplierContact: supplierContact?.trim() || null,
          purchaseDate: date,
          monthYear,
          notes: notes?.trim() || null,
        },
      });

      await tx.monthlyFinancialReport.upsert({
        where: {
          businessId_monthYear: {
            businessId,
            monthYear,
          },
        },
        update: {
          totalCost: { increment: totalCost },
          expectedRevenue: { increment: expectedRevenue },
          expectedGrossProfit: { increment: expectedGrossProfit },
          purchaseCount: { increment: 1 },
        },
        create: {
          businessId,
          monthYear,
          totalCost,
          expectedRevenue,
          expectedGrossProfit,
          purchaseCount: 1,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "PURCHASE_RECORDED",
          entityType: "BUSINESS_PURCHASE",
          entityId: p.id,
          metadata: JSON.stringify({
            businessId,
            itemName: p.itemName,
            totalCost,
            expectedRevenue,
            expectedGrossProfit,
            monthYear,
          }),
        },
      });

      return p;
    });

    return NextResponse.json(
      {
        success: true,
        type: "PURCHASE",
        purchase,
        calculations: {
          totalCost,
          expectedRevenue,
          expectedGrossProfit,
          disclaimer: ESTIMATION_DISCLAIMER,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Owner Finance POST error]:", error);
    return NextResponse.json({ error: "Failed to record purchase/expense" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const purchaseId = searchParams.get("purchaseId");
    const expenseId = searchParams.get("expenseId");

    if (purchaseId) {
      const purchase = await prisma.businessPurchase.findUnique({
        where: { id: purchaseId },
        include: { business: { select: { ownerId: true } } },
      });

      if (!purchase) {
        return NextResponse.json({ error: "Purchase record not found" }, { status: 404 });
      }

      if (purchase.business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
        return NextResponse.json({ error: "Forbidden: You do not own this record" }, { status: 403 });
      }

      await prisma.businessPurchase.delete({ where: { id: purchaseId } });

      // Decrement from monthly report
      await prisma.monthlyFinancialReport.updateMany({
        where: { businessId: purchase.businessId, monthYear: purchase.monthYear },
        data: {
          totalCost: { decrement: purchase.totalCost },
          expectedRevenue: { decrement: purchase.expectedRevenue },
          expectedGrossProfit: { decrement: purchase.expectedGrossProfit },
          purchaseCount: { decrement: 1 },
        },
      });

      return NextResponse.json({ success: true, message: "Purchase record deleted" });
    }

    if (expenseId) {
      const expense = await prisma.businessExpense.findUnique({
        where: { id: expenseId },
        include: { business: { select: { ownerId: true } } },
      });

      if (!expense) {
        return NextResponse.json({ error: "Expense record not found" }, { status: 404 });
      }

      if (expense.business.ownerId !== auth.user.id && auth.user.role !== Role.SUPER_ADMIN) {
        return NextResponse.json({ error: "Forbidden: You do not own this record" }, { status: 403 });
      }

      await prisma.businessExpense.delete({ where: { id: expenseId } });

      await prisma.monthlyFinancialReport.updateMany({
        where: { businessId: expense.businessId, monthYear: expense.monthYear },
        data: {
          totalExpenses: { decrement: expense.amount },
        },
      });

      return NextResponse.json({ success: true, message: "Expense record deleted" });
    }

    return NextResponse.json({ error: "purchaseId or expenseId required" }, { status: 400 });
  } catch (error) {
    console.error("[Owner Finance DELETE error]:", error);
    return NextResponse.json({ error: "Failed to delete financial record" }, { status: 500 });
  }
}
