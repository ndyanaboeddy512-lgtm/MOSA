import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  confirmPaymentAndActivateBusiness,
} from "@/lib/payments/engine";
import { parseMtnMoMoSms } from "@/lib/payments/momo-sms";
import { authenticateWebhookRequest } from "@/lib/payments/bridge-devices";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-signature") ||
      req.headers.get("x-provider-signature") ||
      req.headers.get("x-callback-signature") ||
      "";

    const url = new URL(req.url);
    const providerParam = url.searchParams.get("provider")?.toUpperCase() || "";

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const provider = providerParam || payload.provider || "MTN_MOMO";

    // If incoming payload has raw SMS text from Android forwarder, parse it
    let parsedSms: any = null;
    const rawSmsText = payload.rawSms || payload.sms || payload.body;
    if (rawSmsText && typeof rawSmsText === "string") {
      parsedSms = parseMtnMoMoSms(rawSmsText);
    }

    const paymentReference =
      payload.paymentReference ||
      payload.reference ||
      payload.externalReference ||
      parsedSms?.paymentReference;

    const providerTransactionRef =
      payload.providerTransactionRef ||
      payload.transactionId ||
      payload.transId ||
      parsedSms?.providerTransactionRef;

    const amountPaid =
      payload.amount !== undefined && payload.amount !== null
        ? Number(payload.amount)
        : parsedSms?.amount;

    if (!paymentReference || !providerTransactionRef) {
      return NextResponse.json(
        {
          success: false,
          error: "Webhook payload missing required paymentReference or providerTransactionRef.",
          parsedSms: parsedSms || undefined,
        },
        { status: 400 }
      );
    }

    // Look up provider config to ensure provider is enabled
    const providerConfig = await prisma.paymentProviderConfig.findUnique({
      where: { provider },
    });

    if (!providerConfig || !providerConfig.isEnabled) {
      return NextResponse.json(
        { success: false, error: `Provider ${provider} is not configured or disabled.` },
        { status: 403 }
      );
    }

    // Dual-mode authentication: Enrolled Android Bridge Device credentials OR Provider Webhook Secret
    const deviceIdHeader = req.headers.get("x-mosa-device-id") || payload.bridgeDeviceId;
    const authHeader = req.headers.get("authorization");

    const authResult = await authenticateWebhookRequest({
      rawBody,
      signature,
      deviceIdHeader,
      authHeader,
      provider,
    });

    if (!authResult.isAuthenticated) {
      console.warn(
        `[SECURITY WARNING]: Rejected unverified webhook for ${paymentReference} from ${provider}: ${authResult.error}`
      );
      return NextResponse.json(
        { success: false, error: authResult.error || "Invalid cryptographic webhook signature." },
        { status: 401 }
      );
    }

    const verifiedBy = authResult.device
      ? `ANDROID_BRIDGE_${authResult.device.deviceId}`
      : payload.bridgeDeviceId
      ? `ANDROID_BRIDGE_${payload.bridgeDeviceId}`
      : `WEBHOOK_${provider}`;

    // Process idempotent confirmation, activation, and receipt generation
    const result = await confirmPaymentAndActivateBusiness({
      paymentReference,
      providerTransactionRef: String(providerTransactionRef),
      provider,
      amountPaid,
      rawPayload: rawBody,
      verifiedBy,
    });

    return NextResponse.json({
      success: true,
      message: result.alreadyConfirmed
        ? "Payment already processed and business active."
        : "Payment confirmed, receipt generated, and business activated.",
      receiptNumber: result.receipt?.receiptNumber,
      businessStatus: result.businessStatus,
    });
  } catch (error: any) {
    console.error("[PAYMENTS_WEBHOOK_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process webhook." },
      { status: 400 }
    );
  }
}
