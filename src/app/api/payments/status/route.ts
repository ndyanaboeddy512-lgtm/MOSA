import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkPaymentRateLimit,
  getRateLimitClientIp,
  getRateLimitHeaders,
} from "@/lib/payments/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const clientIp = getRateLimitClientIp(req);

    // 1. IP-Level Rate Limit: Max 60 status checks per 60 seconds
    const ipRateLimit = await checkPaymentRateLimit({
      key: `status:ip:${clientIp}`,
      limit: 60,
      windowSeconds: 60,
    });

    if (!ipRateLimit.isAllowed) {
      return NextResponse.json(
        { success: false, error: "Too many payment status checks from this IP. Please wait a moment." },
        { status: 429, headers: getRateLimitHeaders(ipRateLimit) }
      );
    }

    const url = new URL(req.url);
    const reference = url.searchParams.get("reference")?.trim();
    const businessId = url.searchParams.get("businessId")?.trim();

    if (!reference && !businessId) {
      return NextResponse.json(
        { success: false, error: "Either reference or businessId is required." },
        { status: 400 }
      );
    }

    // 2. Reference-Level Rate Limit: Max 30 status checks per reference per 60 seconds
    if (reference) {
      const refRateLimit = await checkPaymentRateLimit({
        key: `status:ref:${reference}`,
        limit: 30,
        windowSeconds: 60,
      });

      if (!refRateLimit.isAllowed) {
        return NextResponse.json(
          { success: false, error: "Polling too frequently for this payment reference. Please wait." },
          { status: 429, headers: getRateLimitHeaders(refRateLimit) }
        );
      }
    }

    const currentUser = await getCurrentUser(req);

    // 3. Privacy Boundary: Anonymous callers cannot probe status by businessId alone
    if (!reference && businessId && !currentUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to query payment status by business ID." },
        { status: 401 }
      );
    }

    const payment = await prisma.registrationPayment.findFirst({
      where: reference ? { paymentReference: reference } : { businessId: businessId! },
      orderBy: { createdAt: "desc" },
      include: {
        receipt: true,
        business: {
          select: {
            id: true,
            ownerId: true,
            name: true,
            status: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "No payment record found." },
        { status: 404 }
      );
    }

    // 4. Privacy Boundary: Prevent authenticated users from probing or viewing other customers' payments
    if (currentUser) {
      const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
      const isCommunityAdmin = currentUser.role === "COMMUNITY_ADMIN";
      const isOwner = payment.business.ownerId === currentUser.id;
      const isPayer = payment.payerUserId === currentUser.id;

      if (!isSuperAdmin && !isCommunityAdmin && !isOwner && !isPayer) {
        // Return 404 to avoid leaking whether another customer's payment reference exists
        return NextResponse.json(
          { success: false, error: "No payment record found." },
          { status: 404 }
        );
      }
    }

    // 5. Reconcile status if pending
    if (payment.status === "PENDING") {
      const { checkAndReconcilePaymentStatus } = await import("@/lib/payments/push-gateway");
      const reconciled = await checkAndReconcilePaymentStatus(payment.paymentReference);
      if (reconciled.payment) {
        payment.status = reconciled.payment.status;
        payment.failureReason = reconciled.payment.failureReason;
        if (reconciled.receipt) {
          (payment as any).receipt = reconciled.receipt;
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        payment: {
          id: payment.id,
          reference: payment.paymentReference,
          status: payment.status,
          feeAmount: payment.feeAmount,
          currency: payment.currency,
          provider: payment.provider,
          providerTransactionRef: payment.providerTransactionRef,
          verifiedAt: payment.verifiedAt,
          failureReason: payment.failureReason,
          createdAt: payment.createdAt,
        },
        business: {
          id: payment.business.id,
          name: payment.business.name,
          status: payment.business.status,
          verificationStatus: payment.business.verificationStatus,
        },
        receipt: payment.receipt
          ? {
              id: payment.receipt.id,
              receiptNumber: payment.receipt.receiptNumber,
              issuedAt: payment.receipt.issuedAt,
              amountPaid: payment.receipt.amountPaid,
              currency: payment.receipt.currency,
            }
          : null,
        isConfirmed: payment.status === "CONFIRMED",
      },
      { headers: getRateLimitHeaders(ipRateLimit) }
    );
  } catch (error: any) {
    console.error("[PAYMENTS_STATUS_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check payment status." },
      { status: 500 }
    );
  }
}
