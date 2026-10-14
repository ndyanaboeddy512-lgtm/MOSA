import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");
    const businessId = url.searchParams.get("businessId");

    if (!reference && !businessId) {
      return NextResponse.json(
        { success: false, error: "Either reference or businessId is required." },
        { status: 400 }
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

    return NextResponse.json({
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
      business: payment.business,
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
    });
  } catch (error: any) {
    console.error("[PAYMENTS_STATUS_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check payment status." },
      { status: 500 }
    );
  }
}
