import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRegistrationAndRenewalKPIs } from "@/lib/payments/renewals-engine";

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
    const paymentType = url.searchParams.get("paymentType")?.trim() || "ALL";
    const renewalStatus = url.searchParams.get("renewalStatus")?.trim() || "ALL";
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

    if (paymentType !== "ALL") {
      where.paymentType = paymentType;
    }

    if (renewalStatus !== "ALL") {
      where.business = { ...where.business, renewalStatus };
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

    const [totalCount, payments, renewalKPIs] = await Promise.all([
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
              renewalStatus: true,
              registrationConfirmedAt: true,
              registrationExpiresAt: true,
              gracePeriodEndsAt: true,
              isWaiver: true,
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
          receipt: {
            select: {
              id: true,
              receiptNumber: true,
              receiptType: true,
              periodCoveredStart: true,
              periodCoveredEnd: true,
              issuedAt: true,
            },
          },
        },
      }),
      getRegistrationAndRenewalKPIs(),
    ]);

    // Financial KPI summaries
    const [pendingCount, failedCount, duplicateCount] = await Promise.all([
      prisma.registrationPayment.count({ where: { status: "PENDING" } }),
      prisma.registrationPayment.count({ where: { status: "FAILED" } }),
      prisma.registrationPayment.count({ where: { status: "DUPLICATE" } }),
    ]);

    // By provider breakdown
    const [mtnCount, airtelCount, bankCount, waiverCount] = await Promise.all([
      prisma.registrationPayment.count({ where: { provider: "MTN_MOMO", status: "CONFIRMED" } }),
      prisma.registrationPayment.count({ where: { provider: "AIRTEL_MONEY", status: "CONFIRMED" } }),
      prisma.registrationPayment.count({ where: { provider: "BANK_TRANSFER", status: "CONFIRMED" } }),
      prisma.registrationPayment.count({ where: { provider: "ADMIN_WAIVER", status: "CONFIRMED" } }),
    ]);

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue: renewalKPIs.totalRevenue,
        confirmedCount: renewalKPIs.initialRegistrations + renewalKPIs.renewalsCompleted,
        pendingCount,
        failedCount,
        duplicateCount,
        renewalsDueSoon: renewalKPIs.renewalsDueSoon,
        expiredRegistrations: renewalKPIs.expiredRegistrations,
        inGracePeriod: renewalKPIs.inGracePeriod,
        suspendedBusinesses: renewalKPIs.suspendedBusinesses,
        waiverBusinesses: renewalKPIs.waiverBusinesses,
        outstandingRenewals: renewalKPIs.outstandingRenewals,
        activeRegistrations: renewalKPIs.activeRegistrations,
        totalBusinesses: renewalKPIs.totalBusinesses,
        activeRegistrationFee: renewalKPIs.activeRegistrationFee,
        activeRenewalFee: renewalKPIs.activeRenewalFee,
        gracePeriodDays: renewalKPIs.gracePeriodDays,
        currency: renewalKPIs.currency,
        byProvider: {
          MTN_MOMO: mtnCount,
          AIRTEL_MONEY: airtelCount,
          BANK_TRANSFER: bankCount,
          ADMIN_WAIVER: waiverCount,
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
        renewalStatus: (p.business as any)?.renewalStatus || "CURRENT",
        registrationExpiresAt: (p.business as any)?.registrationExpiresAt || null,
        gracePeriodEndsAt: (p.business as any)?.gracePeriodEndsAt || null,
        isWaiver: p.isWaiver,
        waiverReason: p.waiverReason,
        paymentType: p.paymentType || "REGISTRATION",
        periodCoveredStart: p.periodCoveredStart || p.receipt?.periodCoveredStart || null,
        periodCoveredEnd: p.periodCoveredEnd || p.receipt?.periodCoveredEnd || null,
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
        receiptType: p.receipt?.receiptType || p.paymentType || "REGISTRATION",
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
