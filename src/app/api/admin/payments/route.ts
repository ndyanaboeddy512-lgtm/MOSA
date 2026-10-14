import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to Command Center payments." },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "ALL";
    const provider = url.searchParams.get("provider")?.trim() || "ALL";
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (provider !== "ALL") {
      where.provider = provider;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { paymentReference: { contains: search, mode: "insensitive" } },
        { providerTransactionRef: { contains: search, mode: "insensitive" } },
        { business: { name: { contains: search, mode: "insensitive" } } },
        { business: { owner: { name: { contains: search, mode: "insensitive" } } } },
        { business: { phone: { contains: search, mode: "insensitive" } } },
        { receipt: { receiptNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [totalCount, payments, allConfirmed] = await Promise.all([
      prisma.registrationPayment.count({ where }),
      prisma.registrationPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              verificationStatus: true,
              sector: true,
              district: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
          receipt: true,
        },
      }),
      // Aggregate confirmed revenue
      prisma.registrationPayment.aggregate({
        where: { status: "CONFIRMED" },
        _sum: { feeAmount: true },
        _count: { id: true },
      }),
    ]);

    // Financial KPI summaries
    const [pendingCount, failedCount, duplicateCount] = await Promise.all([
      prisma.registrationPayment.count({ where: { status: "PENDING" } }),
      prisma.registrationPayment.count({ where: { status: "FAILED" } }),
      prisma.registrationPayment.count({ where: { status: "DUPLICATE" } }),
    ]);

    const totalRevenue = allConfirmed._sum.feeAmount || 0;
    const confirmedCount = allConfirmed._count.id || 0;

    // By provider breakdown
    const mtnCount = await prisma.registrationPayment.count({ where: { provider: "MTN_MOMO", status: "CONFIRMED" } });
    const airtelCount = await prisma.registrationPayment.count({ where: { provider: "AIRTEL_MONEY", status: "CONFIRMED" } });
    const bankCount = await prisma.registrationPayment.count({ where: { provider: "BANK_TRANSFER", status: "CONFIRMED" } });

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue,
        confirmedCount,
        pendingCount,
        failedCount,
        duplicateCount,
        byProvider: {
          MTN_MOMO: mtnCount,
          AIRTEL_MONEY: airtelCount,
          BANK_TRANSFER: bankCount,
        },
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      payments: payments.map((p) => ({
        id: p.id,
        businessId: p.businessId,
        businessName: p.business?.name || "N/A",
        businessStatus: p.business?.status || "UNKNOWN",
        verificationStatus: p.business?.verificationStatus || "UNVERIFIED",
        ownerName: p.business?.owner?.name || "N/A",
        ownerPhone: p.phoneNumber || p.business?.owner?.phone || p.business?.phone || "N/A",
        ownerEmail: p.business?.owner?.email || null,
        feeAmount: p.feeAmount,
        currency: p.currency,
        provider: p.provider,
        paymentReference: p.paymentReference,
        providerTransactionRef: p.providerTransactionRef,
        status: p.status,
        failureReason: p.failureReason,
        verifiedAt: p.verifiedAt,
        verifiedBy: p.verifiedBy,
        receiptId: p.receipt?.id || null,
        receiptNumber: p.receipt?.receiptNumber || null,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[ADMIN_PAYMENTS_LIST_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load payments." },
      { status: 500 }
    );
  }
}
