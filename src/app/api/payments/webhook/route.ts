import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  confirmPaymentAndActivateBusiness,
  getPaymentProviders,
} from "@/lib/payments/engine";
import { parseMtnMoMoSms } from "@/lib/payments/momo-sms";
import { parseAirtelMoneySms } from "@/lib/payments/airtel-sms";
import { authenticateWebhookRequest } from "@/lib/payments/bridge-devices";

export const ALLOWED_WEBHOOK_PROVIDERS = [
  "MTN_MOMO",
  "AIRTEL_MONEY",
  "BANK_TRANSFER",
] as const;

export type AllowedWebhookProvider = (typeof ALLOWED_WEBHOOK_PROVIDERS)[number];

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

    // 1. Strict Provider Allowlist Validation
    // Reject UNKNOWN, missing, or unsupported providers immediately
    const rawProvider = (providerParam || payload.provider || "").trim().toUpperCase();
    if (!rawProvider || !ALLOWED_WEBHOOK_PROVIDERS.includes(rawProvider as AllowedWebhookProvider)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported, missing, or unclassified payment provider: "${rawProvider || "EMPTY"}". Inbound payments labeled UNKNOWN are rejected for manual reconciliation.`,
        },
        { status: 400 }
      );
    }

    const provider = rawProvider as AllowedWebhookProvider;

    // 2. Provider-Aware Evidence Extraction from Raw SMS (if provided by bridge forwarder)
    let parsedSms: any = null;
    const rawSmsText = payload.rawSms || payload.sms || payload.body;
    if (rawSmsText && typeof rawSmsText === "string") {
      if (provider === "AIRTEL_MONEY") {
        parsedSms = parseAirtelMoneySms(rawSmsText);
      } else if (provider === "MTN_MOMO") {
        parsedSms = parseMtnMoMoSms(rawSmsText);
      }
    }

    // Replay protection window check for request timestamp
    const headerTimestamp = req.headers.get("x-mosa-timestamp") || req.headers.get("x-timestamp");
    if (headerTimestamp) {
      const reqTime = new Date(headerTimestamp).getTime();
      if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > 15 * 60 * 1000) {
        return NextResponse.json(
          {
            success: false,
            error: "Request timestamp is expired or outside the valid 15-minute replay window.",
          },
          { status: 400 }
        );
      }
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
      await prisma.auditLog.create({
        data: {
          action: "PAYMENT_UNMATCHED_REFERENCE",
          entityType: "RegistrationPayment",
          entityId: paymentReference || "MISSING_REF",
          metadata: JSON.stringify({
            provider,
            providerTransactionRef,
            amountPaid,
            rawSms: rawSmsText,
          }),
        },
      }).catch(() => null);

      return NextResponse.json(
        {
          success: false,
          error: "Webhook payload missing required paymentReference or providerTransactionRef. Transaction left pending for manual administrative reconciliation.",
          parsedSms: parsedSms || undefined,
        },
        { status: 400 }
      );
    }

    // 3. Currency Validation
    const currency = (payload.currency || parsedSms?.currency || "RWF").trim().toUpperCase();
    if (currency !== "RWF") {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported payment currency: "${currency}". Only RWF payments are accepted for settlement.`,
        },
        { status: 400 }
      );
    }

    // 4. Look up provider config to ensure provider is enabled
    let providerConfig = await prisma.paymentProviderConfig.findUnique({
      where: { provider },
    });

    if (!providerConfig) {
      await getPaymentProviders(false);
      providerConfig = await prisma.paymentProviderConfig.findUnique({
        where: { provider },
      });
    }

    if (!providerConfig || !providerConfig.isEnabled) {
      return NextResponse.json(
        { success: false, error: `Provider ${provider} is not configured or disabled.` },
        { status: 403 }
      );
    }

    // 5. Dual-mode authentication: Enrolled Android Bridge Device credentials OR Provider Webhook Secret
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

    // 5b. Destination / Recipient Validation: Ensure payment destination matches MOSA's configured SIM or till
    const suppliedDestination =
      payload.recipient ||
      payload.destination ||
      payload.accountNumber ||
      payload.merchantNumber ||
      payload.tillNumber;

    if (suppliedDestination && typeof suppliedDestination === "string") {
      const cleanSupplied = suppliedDestination.replace(/[\s\-\+\(\)]/g, "").replace(/^250/, "0");
      const validDestinations = [
        providerConfig.accountNumber,
        authResult.device?.simPhoneNumber,
        provider === "AIRTEL_MONEY" ? "0729974065" : null,
        provider === "MTN_MOMO" ? "999888" : null,
        provider === "MTN_MOMO" ? "0788123456" : null,
      ]
        .filter(Boolean)
        .map((d) => String(d).replace(/[\s\-\+\(\)]/g, "").replace(/^250/, "0"));

      const isMatch = validDestinations.some(
        (v) => v === cleanSupplied || cleanSupplied.includes(v) || v.includes(cleanSupplied)
      );

      if (!isMatch) {
        await prisma.auditLog.create({
          data: {
            action: "PAYMENT_WRONG_RECIPIENT_REJECTED",
            entityType: "RegistrationPayment",
            entityId: paymentReference || "UNKNOWN",
            metadata: JSON.stringify({
              provider,
              suppliedDestination,
              providerTransactionRef,
              amountPaid,
              expectedDestinations: validDestinations,
            }),
          },
        }).catch(() => null);

        return NextResponse.json(
          {
            success: false,
            error: `Payment destination "${suppliedDestination}" does not match configured merchant recipient for ${provider}.`,
          },
          { status: 400 }
        );
      }
    }

    const verifiedBy = authResult.device
      ? `ANDROID_BRIDGE_${authResult.device.deviceId}`
      : payload.bridgeDeviceId
      ? `ANDROID_BRIDGE_${payload.bridgeDeviceId}`
      : `WEBHOOK_${provider}`;

    // 6. Process idempotent confirmation, activation, and receipt generation
    // Actual settled provider is strictly persisted across payment, receipt, and audit log
    const result = await confirmPaymentAndActivateBusiness({
      paymentReference,
      providerTransactionRef: String(providerTransactionRef),
      provider,
      amountPaid,
      currency,
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
