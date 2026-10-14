import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSimulatedMtnSms, parseMtnMoMoSms } from "@/lib/payments/momo-sms";
import { confirmPaymentAndActivateBusiness, verifyWebhookSignature } from "@/lib/payments/engine";

export async function POST(req: NextRequest) {
  try {
    // 1. Guard access: Admin role or development environment
    const isDev = process.env.NODE_ENV !== "production";
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser && ["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(currentUser.role);

    if (!isAdmin && !isDev) {
      return NextResponse.json(
        { success: false, error: "Access denied. Simulator is restricted to authorized administrators in test mode." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      simulationType = "SUCCESS", // "SUCCESS", "UNDERPAYMENT", "INVALID_REFERENCE", "DUPLICATE", "UNMATCHED_SMS"
      paymentReference: userRef,
      amount: userAmount,
      senderPhone = "+250788123456",
      senderName = "JEAN TEST OWNER",
      transactionId: userTxId,
      language = "rw",
    } = body;

    // 2. Fetch MTN_MOMO provider config to retrieve the genuine configured HMAC secret
    const providerConfig = await prisma.paymentProviderConfig.findUnique({
      where: { provider: "MTN_MOMO" },
    });

    const secret = providerConfig?.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET || "mosa_momo_secret_key_rwanda_2026";

    // 3. Resolve target payment reference
    let targetPayment: any = null;
    let paymentRef = userRef;

    if (paymentRef) {
      targetPayment = await prisma.registrationPayment.findUnique({
        where: { paymentReference: paymentRef },
        include: { business: true },
      });
    } else if (simulationType !== "INVALID_REFERENCE") {
      // Find the most recent pending registration payment
      targetPayment = await prisma.registrationPayment.findFirst({
        where: { status: "PENDING", provider: "MTN_MOMO" },
        orderBy: { createdAt: "desc" },
        include: { business: true },
      });

      if (targetPayment) {
        paymentRef = targetPayment.paymentReference;
      }
    }

    const txId = userTxId || `MOMO-TXN-${Date.now()}`;
    const expectedFee = targetPayment?.feeAmount || 5000;

    // Determine simulation amount based on type
    let effectiveAmount = expectedFee;
    if (simulationType === "UNDERPAYMENT") {
      effectiveAmount = userAmount !== undefined ? Number(userAmount) : 500; // Underpayment
    } else if (userAmount !== undefined) {
      effectiveAmount = Number(userAmount);
    }

    // Determine reference in SMS
    let refInSms: string | undefined = paymentRef;
    if (simulationType === "INVALID_REFERENCE") {
      refInSms = `MOSA-REG-99999999-FAKE00`;
    } else if (simulationType === "UNMATCHED_SMS") {
      refInSms = undefined; // No reference in SMS!
    }

    // 4. Generate realistic MTN MoMo SMS text (simulating what the phone receives)
    const { rawSms } = generateSimulatedMtnSms({
      amount: effectiveAmount,
      paymentReference: refInSms,
      senderPhone,
      senderName,
      transactionId: txId,
      language: language as "rw" | "en",
    });

    // 5. Parse the SMS using the Android Bridge parser
    const parsed = parseMtnMoMoSms(rawSms);

    // 6. Build the payload that the future Android phone would post to /api/payments/webhook
    const bridgePayload = {
      provider: "MTN_MOMO",
      paymentReference: parsed.paymentReference || refInSms,
      providerTransactionRef: parsed.providerTransactionRef || txId,
      amount: parsed.amount || effectiveAmount,
      currency: parsed.currency || "RWF",
      phoneNumber: parsed.senderPhone || senderPhone,
      rawSms,
      bridgeDeviceId: "mosa-simulator-test-rig",
      simulation: true,
      simulationType,
      timestamp: new Date().toISOString(),
    };

    const rawPayloadString = JSON.stringify(bridgePayload);

    // 7. Compute authentic HMAC-SHA256 signature
    const hmacSignature = crypto
      .createHmac("sha256", secret)
      .update(rawPayloadString)
      .digest("hex");

    // 8. Execute verification and processing via core engine
    const isSignatureValid = verifyWebhookSignature(rawPayloadString, hmacSignature, secret);

    let confirmationResult: any = null;
    let confirmationError: string | null = null;

    try {
      if (simulationType === "DUPLICATE") {
        // If testing duplicate, ensure transactionId already exists on a previous payment
        if (!targetPayment) {
          throw new Error("No target payment found to test duplicate simulation.");
        }

        // First confirm once
        await confirmPaymentAndActivateBusiness({
          paymentReference: targetPayment.paymentReference,
          providerTransactionRef: txId,
          provider: "MTN_MOMO",
          amountPaid: effectiveAmount,
          rawPayload: rawPayloadString,
          verifiedBy: "SIMULATOR_INITIAL_CONFIRMATION",
        });

        // Now attempt duplicate replay with same external txn ref on another simulated check
        confirmationResult = await confirmPaymentAndActivateBusiness({
          paymentReference: targetPayment.paymentReference,
          providerTransactionRef: txId,
          provider: "MTN_MOMO",
          amountPaid: effectiveAmount,
          rawPayload: rawPayloadString,
          verifiedBy: "SIMULATOR_DUPLICATE_REPLAY",
        });
      } else {
        if (!bridgePayload.paymentReference) {
          // Unmatched SMS with no reference
          confirmationError = "SMS did not contain a valid MOSA Payment Reference. Logged to Unmatched Queue.";
          await prisma.auditLog.create({
            data: {
              action: "PAYMENT_UNMATCHED_SMS_INGESTED",
              entityType: "RegistrationPayment",
              entityId: txId,
              metadata: JSON.stringify({
                rawSms,
                amount: effectiveAmount,
                senderPhone,
                parsed,
              }),
            },
          }).catch(() => null);
        } else {
          confirmationResult = await confirmPaymentAndActivateBusiness({
            paymentReference: bridgePayload.paymentReference,
            providerTransactionRef: bridgePayload.providerTransactionRef,
            provider: "MTN_MOMO",
            amountPaid: effectiveAmount,
            rawPayload: rawPayloadString,
            verifiedBy: "SIMULATOR_MTN_BRIDGE",
          });
        }
      }
    } catch (err: any) {
      confirmationError = err.message || "Confirmation failed";
    }

    // Refresh payment and business state for response
    const updatedPayment = bridgePayload.paymentReference
      ? await prisma.registrationPayment.findUnique({
          where: { paymentReference: bridgePayload.paymentReference },
          include: { receipt: true, business: true },
        })
      : null;

    return NextResponse.json({
      success: !confirmationError,
      simulationType,
      simulatedSms: rawSms,
      parsedSms: parsed,
      bridgePayload,
      hmacSignature,
      isSignatureValid,
      confirmationResult,
      confirmationError,
      paymentStatus: updatedPayment?.status || (confirmationError ? "FAILED/UNMATCHED" : "PENDING"),
      businessStatus: updatedPayment?.business?.status || "UNKNOWN",
      receipt: updatedPayment?.receipt || null,
      notes: "Development simulation only. Reused existing payment engine, HMAC signatures, and database models.",
    });
  } catch (error: any) {
    console.error("[PAYMENT_SIMULATOR_ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Simulator execution error." },
      { status: 500 }
    );
  }
}
