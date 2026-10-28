import crypto from "crypto";
import { prisma } from "../prisma";
import { calculateEffectiveFee, confirmFreeRegistrationWithWaiver } from "./promotions-engine";

export const DEFAULT_REGISTRATION_FEE = 5000;
export const DEFAULT_CURRENCY = "RWF";

export interface InitiatePaymentParams {
  businessId: string;
  payerUserId: string;
  provider: "MTN_MOMO" | "AIRTEL_MONEY" | "BANK_TRANSFER" | "ADMIN_WAIVER" | "FREE_PROMOTION";
  phoneNumber?: string;
}

export interface WebhookPaymentConfirmationParams {
  paymentReference: string;
  providerTransactionRef: string;
  provider: string;
  amountPaid?: number;
  currency?: string;
  rawPayload?: string;
  verifiedBy?: string;
}

/**
 * Ensures a default 5,000 RWF Registration Fee Configuration exists.
 */
export async function getActiveFeeConfig() {
  let config = await prisma.registrationFeeConfig.findFirst({
    where: { isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!config) {
    config = await prisma.registrationFeeConfig.create({
      data: {
        amount: DEFAULT_REGISTRATION_FEE,
        currency: DEFAULT_CURRENCY,
        isActive: true,
        reason: "Standard Rwanda Registration Fee (Auto-seeded default)",
      },
    });
  }

  return config;
}

/**
 * Ensures default payment providers (MTN MoMo, Airtel Money, Bank Transfer) exist in database.
 */
export async function getPaymentProviders(onlyEnabled = true) {
  const defaultProviders = [
    {
      provider: "AIRTEL_MONEY",
      name: "Airtel Money",
      isEnabled: true,
      accountNumber: "0729974065",
      accountName: "MOSA Network (Rwanda) Ltd",
      instructions: "From Airtel: Dial *182*1*1*0729974065*AMOUNT# and enter reference. From MTN (eKash): Dial *182*1*2*0729974065*AMOUNT#.",
      instructionsRw: "Kuri Airtel: Kanda *182*1*1*0729974065*AMOUNT# ushyiremo reference. Kuri MTN (eKash): Kanda *182*1*2*0729974065*AMOUNT#.",
      webhookSecret: process.env.AIRTEL_MONEY_WEBHOOK_SECRET || "mosa_airtel_secret_key_rwanda_2026",
    },
    {
      provider: "MTN_MOMO",
      name: "MTN Mobile Money",
      isEnabled: true,
      accountNumber: "0788123456",
      accountName: "MOSA Network (Rwanda) Ltd",
      instructions: "Dial *182*8*1*0788123456# or use MoMo Pay Merchant Code. Enter your Payment Reference in the reason field.",
      instructionsRw: "Kanda *182*8*1*0788123456# cyangwa ukoreshe MoMo Pay Code. Shyiramo Payment Reference.",
      webhookSecret: process.env.MTN_MOMO_WEBHOOK_SECRET || "mosa_momo_secret_key_rwanda_2026",
    },
    {
      provider: "BANK_TRANSFER",
      name: "Bank of Kigali / I&M Bank Transfer",
      isEnabled: true,
      accountNumber: "00040-06912345-67 (BK) / 1000-45678-90 (I&M)",
      accountName: "MOSA Network (Rwanda) Ltd",
      instructions: "Transfer to Bank of Kigali Account 00040-06912345-67. Put your MOSA Payment Reference in transfer narration.",
      instructionsRw: "Ohereza kuri Konti ya Bank of Kigali 00040-06912345-67. Shyiramo Payment Reference muri transfer narration.",
      webhookSecret: process.env.BANK_WEBHOOK_SECRET || "mosa_bank_secret_key_rwanda_2026",
    },
  ];

  for (const def of defaultProviders) {
    const existing = await prisma.paymentProviderConfig.findUnique({
      where: { provider: def.provider },
    });
    if (!existing) {
      await prisma.paymentProviderConfig.create({
        data: def,
      });
    } else if (def.provider === "AIRTEL_MONEY" && (existing.accountNumber === "0733123456" || !existing.accountNumber)) {
      await prisma.paymentProviderConfig.update({
        where: { provider: "AIRTEL_MONEY" },
        data: {
          accountNumber: "0729974065",
          instructions: def.instructions,
          instructionsRw: def.instructionsRw,
        },
      });
    }
  }

  let providers = await prisma.paymentProviderConfig.findMany({
    where: onlyEnabled ? { isEnabled: true } : undefined,
  });

  // Prioritize primary enabled providers: Airtel Money first, MTN second, Bank Transfer third
  const PROVIDER_ORDER: Record<string, number> = {
    AIRTEL_MONEY: 1,
    MTN_MOMO: 2,
    BANK_TRANSFER: 3,
  };
  providers.sort((a, b) => (PROVIDER_ORDER[a.provider] || 99) - (PROVIDER_ORDER[b.provider] || 99));

  return providers;
}

/**
 * Cryptographic HMAC verification for provider webhooks.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(computed, "hex"));
  } catch {
    // If signature encoding differs or length mismatch
    try {
      const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      return signature.trim().toLowerCase() === computed.trim().toLowerCase();
    } catch {
      return false;
    }
  }
}

/**
 * Initiates a new registration payment with snapshot fee and unique reference.
 */
export async function initiateRegistrationPayment({
  businessId,
  payerUserId,
  provider,
  phoneNumber,
}: InitiatePaymentParams) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      owner: true,
      registrationPayments: {
        where: { status: "CONFIRMED" },
        include: { receipt: true },
      },
    },
  });

  if (!business) {
    throw new Error(`Business with ID ${businessId} not found.`);
  }

  // If business already has confirmed payment, return existing
  if (business.registrationPayments.length > 0) {
    const existingConfirmed = business.registrationPayments[0];
    return {
      isAlreadyPaid: true,
      payment: existingConfirmed,
      receipt: existingConfirmed.receipt,
      message: "Business registration is already paid and activated.",
    };
  }

  const feeResult = await calculateEffectiveFee({
    businessId,
    category: business.category || business.categoryDisplay || undefined,
    feeType: "REGISTRATION",
  });

  // If effective fee is 0 RWF (via 0 RWF tariff or 100% promo waiver), immediately confirm waiver and issue receipt
  if (feeResult.isFree) {
    const waiverResult = await confirmFreeRegistrationWithWaiver({
      businessId,
      payerUserId,
      promotionId: feeResult.promotion?.id,
      reason: feeResult.promotion?.reason,
    });

    return {
      isAlreadyPaid: false,
      isFree: true,
      payment: waiverResult.payment,
      receipt: waiverResult.receipt,
      feeAmount: 0,
      baseFeeAmount: feeResult.baseFee,
      discountApplied: feeResult.discount,
      currency: feeResult.currency,
      paymentReference: waiverResult.payment.paymentReference,
      receiptNumber: waiverResult.receiptNumber,
      promotion: feeResult.promotion,
      message: waiverResult.message,
    };
  }

  const providerConfigs = await getPaymentProviders(true);
  const providerConfig = providerConfigs.find((p) => p.provider === provider);

  if (!providerConfig) {
    throw new Error(`Payment provider ${provider} is not currently enabled.`);
  }

  // Generate unique human-readable payment reference: MOSA-REG-YYYYMMDD-XXXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  const paymentReference = `MOSA-REG-${dateStr}-${randomSuffix}`;

  const payment = await prisma.registrationPayment.create({
    data: {
      businessId,
      payerUserId,
      feeConfigId: feeResult.feeConfig.id,
      feeAmount: feeResult.effectiveFee,
      discountApplied: feeResult.discount,
      promotionId: feeResult.promotion?.id || null,
      currency: feeResult.currency,
      provider,
      phoneNumber: phoneNumber || null,
      paymentReference,
      status: "PENDING",
    },
  });

  return {
    isAlreadyPaid: false,
    isFree: false,
    payment,
    feeAmount: feeResult.effectiveFee,
    baseFeeAmount: feeResult.baseFee,
    discountApplied: feeResult.discount,
    promotion: feeResult.promotion,
    currency: feeResult.currency,
    paymentReference,
    providerConfig: {
      name: providerConfig.name,
      accountNumber: providerConfig.accountNumber,
      accountName: providerConfig.accountName,
      instructions: providerConfig.instructions,
      instructionsRw: providerConfig.instructionsRw,
    },
  };
}

/**
 * Idempotently confirms payment, generates official numbered receipt,
 * and automatically activates business for discovery without manual intervention.
 * 
 * Separates payment confirmation (RegistrationPayment.status = CONFIRMED)
 * from verification status (Business.verificationStatus remains untouched).
 */
export async function confirmPaymentAndActivateBusiness({
  paymentReference,
  providerTransactionRef,
  provider,
  amountPaid,
  currency,
  rawPayload,
  verifiedBy = "PROVIDER_WEBHOOK",
}: WebhookPaymentConfirmationParams) {
  // Validate currency invariant
  if (currency && currency.trim().toUpperCase() !== "RWF") {
    throw new Error(`Invalid settlement currency "${currency}". Only RWF payments are accepted.`);
  }

  // 1. Locate payment
  const payment = await prisma.registrationPayment.findUnique({
    where: { paymentReference },
    include: {
      business: { include: { owner: true } },
      receipt: true,
    },
  });

  if (!payment) {
    // Audit unmatched transaction if external provider sent unknown reference
    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_UNMATCHED_REFERENCE",
        entityType: "RegistrationPayment",
        entityId: paymentReference,
        metadata: JSON.stringify({
          provider,
          providerTransactionRef,
          amountPaid,
          rawPayload,
        }),
      },
    }).catch(() => null);

    throw new Error(`Payment record with reference "${paymentReference}" was not found.`);
  }

  // 2. Check if already confirmed (Strict Idempotency)
  if (payment.status === "CONFIRMED") {
    return {
      success: true,
      alreadyConfirmed: true,
      payment,
      receipt: payment.receipt,
      businessId: payment.businessId,
      businessStatus: payment.business.status,
    };
  }

  // 3. Check for Underpayment (Fraud / Incomplete Payment Prevention)
  if (amountPaid !== undefined && amountPaid < payment.feeAmount) {
    await prisma.registrationPayment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureReason: `UNDERPAYMENT_DETECTED: Received ${amountPaid} ${payment.currency}, but fee is ${payment.feeAmount} ${payment.currency}`,
        rawCallbackPayload: rawPayload,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_UNDERPAYMENT_REJECTED",
        entityType: "RegistrationPayment",
        entityId: payment.id,
        metadata: JSON.stringify({
          paymentReference,
          amountPaid,
          expectedAmount: payment.feeAmount,
          providerTransactionRef,
        }),
      },
    }).catch(() => null);

    throw new Error(
      `Underpayment detected: Received ${amountPaid} ${payment.currency}, but required registration fee is ${payment.feeAmount} ${payment.currency}.`
    );
  }

  // 3. Prevent duplicate usage of same provider transaction reference across different payments
  if (providerTransactionRef) {
    const existingWithRef = await prisma.registrationPayment.findUnique({
      where: { providerTransactionRef },
    });

    if (existingWithRef && existingWithRef.id !== payment.id) {
      await prisma.registrationPayment.update({
        where: { id: payment.id },
        data: {
          status: "DUPLICATE",
          failureReason: `External transaction ref ${providerTransactionRef} was already consumed by payment ${existingWithRef.paymentReference}`,
          rawCallbackPayload: rawPayload,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "PAYMENT_DUPLICATE_REJECTED",
          entityType: "RegistrationPayment",
          entityId: payment.id,
          metadata: JSON.stringify({
            paymentReference,
            consumedByPaymentId: existingWithRef.id,
            providerTransactionRef,
          }),
        },
      }).catch(() => null);

      throw new Error(
        `Transaction reference ${providerTransactionRef} was already consumed by another registration.`
      );
    }
  }

  // 4. Calculate 12-month validity period
  const isRenewal = payment.paymentType === "ANNUAL_RENEWAL";
  const now = new Date();
  let periodStart = now;
  let periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  if (isRenewal && payment.business.registrationExpiresAt && new Date(payment.business.registrationExpiresAt) > now) {
    periodStart = new Date(payment.business.registrationExpiresAt);
    periodEnd = new Date(periodStart.getTime() + 365 * 24 * 60 * 60 * 1000);
  }

  // 5. Generate unique numbered receipt
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const receiptCount = await prisma.registrationReceipt.count();
  const seqNum = String(receiptCount + 1).padStart(5, "0");
  const receiptNumber = `MOSA-REC-${dateStr}-${seqNum}`;

  // 6. Execute atomic transaction: update payment, create receipt, activate/renew business
  const result = await prisma.$transaction(async (tx) => {
    // Update payment record
    const updatedPayment = await tx.registrationPayment.update({
      where: { id: payment.id },
      data: {
        provider,
        status: "CONFIRMED",
        providerTransactionRef: providerTransactionRef || null,
        periodCoveredStart: periodStart,
        periodCoveredEnd: periodEnd,
        verifiedAt: new Date(),
        verifiedBy,
        rawCallbackPayload: rawPayload || null,
      },
    });

    // Create unique receipt snapshot
    const receipt = await tx.registrationReceipt.create({
      data: {
        receiptNumber,
        paymentId: payment.id,
        businessId: payment.businessId,
        businessName: payment.business.name,
        ownerName: payment.business.owner?.name || "Business Owner",
        ownerPhone: payment.business.phone || payment.business.owner?.phone || "N/A",
        amountPaid: payment.feeAmount,
        currency: payment.currency,
        paymentMethod: provider,
        receiptType: payment.paymentType || (isRenewal ? "ANNUAL_RENEWAL" : "REGISTRATION"),
        periodCoveredStart: periodStart,
        periodCoveredEnd: periodEnd,
        providerTransactionRef: providerTransactionRef || null,
        metadata: JSON.stringify({
          sector: payment.business.sector,
          district: payment.business.district,
          verifiedBy,
          paymentReference: payment.paymentReference,
          periodCoveredStart: periodStart,
          periodCoveredEnd: periodEnd,
          settledProvider: provider,
        }),
      },
    });

    // Automatically transition business to ACTIVE and renewalStatus to CURRENT
    // Calculates and extends 12-month validity
    // For eligible new registrations, activate as BUSINESS_VERIFIED if currently UNVERIFIED
    const shouldVerifyBusiness = !isRenewal && payment.business.verificationStatus === "UNVERIFIED";

    const updatedBusiness = await tx.business.update({
      where: { id: payment.businessId },
      data: {
        status: "ACTIVE",
        renewalStatus: "CURRENT",
        verificationStatus: shouldVerifyBusiness ? "BUSINESS_VERIFIED" : payment.business.verificationStatus,
        registrationConfirmedAt: payment.business.registrationConfirmedAt || now,
        registrationExpiresAt: periodEnd,
        gracePeriodEndsAt: null,
        renewalCount: { increment: isRenewal ? 1 : 0 },
        lastRenewalAt: isRenewal ? now : undefined,
      },
    });

    // Increment promotion usage if applied
    if (payment.promotionId) {
      await tx.feePromotion.update({
        where: { id: payment.promotionId },
        data: { currentUsageCount: { increment: 1 } },
      }).catch(() => null);
    }

    // Create persistent audit log
    await tx.auditLog.create({
      data: {
        action: isRenewal ? "ANNUAL_RENEWAL_CONFIRMED" : "PAYMENT_CONFIRMED_BUSINESS_ACTIVATED",
        entityType: "Business",
        entityId: payment.businessId,
        metadata: JSON.stringify({
          paymentId: payment.id,
          paymentReference: payment.paymentReference,
          receiptNumber: receipt.receiptNumber,
          feeAmount: payment.feeAmount,
          provider,
          paymentType: payment.paymentType,
          providerTransactionRef,
          verifiedBy,
          periodCoveredStart: periodStart,
          periodCoveredEnd: periodEnd,
          businessPreviousStatus: payment.business.status,
          businessNewStatus: "ACTIVE",
        }),
      },
    });

    return {
      payment: updatedPayment,
      receipt,
      business: updatedBusiness,
    };
  }, { timeout: 25000, maxWait: 15000 });

  // 7. Dispatch in-app notification to business owner
  if (payment.business.ownerId) {
    await prisma.notification.create({
      data: {
        userId: payment.business.ownerId,
        title: isRenewal ? "Annual Renewal Confirmed" : "Registration Payment Confirmed",
        message: isRenewal
          ? `Your annual renewal for ${payment.business.name} has been confirmed. Your listing is active until ${periodEnd.toLocaleDateString()}. Receipt: ${result.receipt.receiptNumber}`
          : `Registration payment for ${payment.business.name} is confirmed and your business is now active! Receipt: ${result.receipt.receiptNumber}`,
        type: "SYSTEM",
      },
    }).catch(() => null);
  }

  return {
    success: true,
    alreadyConfirmed: false,
    payment: result.payment,
    receipt: result.receipt,
    businessId: result.business.id,
    businessStatus: result.business.status,
  };
}

/**
 * Allows authorized administrators to manually confirm a bank transfer / deposit.
 */
export async function adminConfirmPayment({
  paymentId,
  adminId,
  providerTransactionRef,
  notes,
}: {
  paymentId: string;
  adminId: string;
  providerTransactionRef: string;
  notes?: string;
}) {
  const payment = await prisma.registrationPayment.findUnique({
    where: { id: paymentId },
    include: { business: true },
  });

  if (!payment) {
    throw new Error("Payment record not found.");
  }

  const result = await confirmPaymentAndActivateBusiness({
    paymentReference: payment.paymentReference,
    providerTransactionRef,
    provider: payment.provider,
    rawPayload: JSON.stringify({ notes, confirmedByAdminId: adminId }),
    verifiedBy: `ADMIN_MANUAL_${adminId}`,
  });

  return result;
}

/**
 * Updates the active registration fee configuration with audit trail.
 * Historical payments retain their exact original fee snapshot.
 */
export async function updateRegistrationFeeConfig({
  amount,
  renewalAmount,
  gracePeriodDays = 7,
  reminderSchedule = "30,14,7,0",
  currency = "RWF",
  reason,
  adminId,
}: {
  amount: number;
  renewalAmount?: number;
  gracePeriodDays?: number;
  reminderSchedule?: string;
  currency?: string;
  reason: string;
  adminId: string;
}) {
  if (amount < 0) {
    throw new Error("Registration fee cannot be negative.");
  }
  if (renewalAmount !== undefined && renewalAmount < 0) {
    throw new Error("Renewal fee cannot be negative.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Deactivate existing active fee configurations
    await tx.registrationFeeConfig.updateMany({
      where: { isActive: true },
      data: {
        isActive: false,
        effectiveTo: new Date(),
      },
    });

    // 2. Create new fee configuration
    const newConfig = await tx.registrationFeeConfig.create({
      data: {
        amount,
        renewalAmount: renewalAmount !== undefined ? renewalAmount : amount,
        gracePeriodDays: gracePeriodDays > 0 ? gracePeriodDays : 7,
        reminderSchedule: reminderSchedule || "30,14,7,0",
        currency,
        reason,
        adminId,
        isActive: true,
        effectiveFrom: new Date(),
      },
    });

    // 3. Audit trail
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "REGISTRATION_AND_RENEWAL_FEE_UPDATED",
        entityType: "RegistrationFeeConfig",
        entityId: newConfig.id,
        metadata: JSON.stringify({
          registrationAmount: amount,
          renewalAmount: newConfig.renewalAmount,
          gracePeriodDays: newConfig.gracePeriodDays,
          reminderSchedule: newConfig.reminderSchedule,
          currency,
          reason,
        }),
      },
    });

    return newConfig;
  }, { timeout: 25000, maxWait: 15000 });
}

/**
 * Updates a payment provider's configuration (account details, instructions, webhook secret).
 */
export async function updatePaymentProviderConfig({
  provider,
  name,
  isEnabled,
  accountNumber,
  accountName,
  instructions,
  instructionsRw,
  webhookSecret,
  adminId,
}: {
  provider: string;
  name: string;
  isEnabled: boolean;
  accountNumber?: string;
  accountName?: string;
  instructions?: string;
  instructionsRw?: string;
  webhookSecret?: string;
  adminId: string;
}) {
  const updated = await prisma.paymentProviderConfig.upsert({
    where: { provider },
    create: {
      provider,
      name,
      isEnabled,
      accountNumber,
      accountName,
      instructions,
      instructionsRw,
      webhookSecret,
      updatedBy: adminId,
    },
    update: {
      name,
      isEnabled,
      accountNumber,
      accountName,
      instructions,
      instructionsRw,
      ...(webhookSecret ? { webhookSecret } : {}),
      updatedBy: adminId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "PAYMENT_PROVIDER_CONFIG_UPDATED",
      entityType: "PaymentProviderConfig",
      entityId: updated.id,
      metadata: JSON.stringify({
        provider,
        isEnabled,
        accountNumber,
      }),
    },
  }).catch(() => null);

  return updated;
}
