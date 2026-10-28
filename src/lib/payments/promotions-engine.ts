import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getActiveFeeConfig } from "@/lib/payments/engine";

export interface CreatePromotionParams {
  name: string;
  code?: string;
  description?: string;
  reason: string;
  promotionType: "FREE_WAIVER" | "PERCENTAGE" | "FIXED_DISCOUNT" | "EXACT_PRICE";
  discountValue: number;
  appliesTo?: "REGISTRATION" | "ANNUAL_RENEWAL" | "BOTH";
  targetScope?: "ALL" | "CATEGORY" | "BUSINESS";
  targetCategory?: string;
  targetBusinessIds?: string[];
  status?: "ACTIVE" | "PAUSED" | "SCHEDULED";
  startDate?: Date | string;
  endDate?: Date | string | null;
  maxUsageCount?: number | null;
  adminId: string;
}

export interface UpdatePromotionParams {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  reason: string;
  promotionType?: "FREE_WAIVER" | "PERCENTAGE" | "FIXED_DISCOUNT" | "EXACT_PRICE";
  discountValue?: number;
  appliesTo?: "REGISTRATION" | "ANNUAL_RENEWAL" | "BOTH";
  targetScope?: "ALL" | "CATEGORY" | "BUSINESS";
  targetCategory?: string;
  targetBusinessIds?: string[];
  status?: "ACTIVE" | "PAUSED" | "SCHEDULED" | "ARCHIVED";
  startDate?: Date | string;
  endDate?: Date | string | null;
  maxUsageCount?: number | null;
  adminId: string;
}

export interface CalculateFeeResult {
  baseFee: number;
  effectiveFee: number;
  discount: number;
  isFree: boolean;
  currency: string;
  promotion: {
    id: string;
    name: string;
    code?: string | null;
    promotionType: string;
    discountValue: number;
    reason: string;
    appliesTo: string;
    targetScope: string;
  } | null;
  feeConfig: {
    id: string;
    amount: number;
    renewalAmount: number;
    gracePeriodDays: number;
    reminderSchedule: string;
    currency: string;
  };
}

/**
 * Calculates the exact effective fee for a business, accounting for baseline tariffs and active promotions.
 */
export async function calculateEffectiveFee({
  businessId,
  category,
  feeType = "REGISTRATION",
}: {
  businessId?: string;
  category?: string;
  feeType?: "REGISTRATION" | "ANNUAL_RENEWAL";
}): Promise<CalculateFeeResult> {
  const feeConfig = await getActiveFeeConfig();

  let businessCategory = category;
  if (businessId && !businessCategory) {
    const biz = await prisma.business.findUnique({
      where: { id: businessId },
      select: { category: true, categoryDisplay: true, mainCategory: true },
    });
    if (biz) {
      businessCategory = biz.category || biz.categoryDisplay || biz.mainCategory || undefined;
    }
  }

  const baseFee =
    feeType === "ANNUAL_RENEWAL"
      ? feeConfig.renewalAmount !== null && feeConfig.renewalAmount !== undefined
        ? feeConfig.renewalAmount
        : feeConfig.amount
      : feeConfig.amount;

  const result: CalculateFeeResult = {
    baseFee,
    effectiveFee: baseFee,
    discount: 0,
    isFree: baseFee === 0,
    currency: feeConfig.currency || "RWF",
    promotion: null,
    feeConfig: {
      id: feeConfig.id,
      amount: feeConfig.amount,
      renewalAmount: feeConfig.renewalAmount ?? feeConfig.amount,
      gracePeriodDays: feeConfig.gracePeriodDays ?? 7,
      reminderSchedule: feeConfig.reminderSchedule ?? "30,14,7,0",
      currency: feeConfig.currency || "RWF",
    },
  };

  // If baseline tariff itself is already 0 RWF, it is free by default
  if (baseFee === 0) {
    result.effectiveFee = 0;
    result.discount = 0;
    result.isFree = true;
    return result;
  }

  // Fetch active promotions matching feeType
  const now = new Date();
  const promotions = await prisma.feePromotion.findMany({
    where: {
      status: "ACTIVE",
      appliesTo: { in: [feeType, "BOTH"] },
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    orderBy: { createdAt: "desc" },
  });

  // Evaluate candidate promotions
  const eligiblePromos = promotions.filter((promo) => {
    // Check usage cap
    if (promo.maxUsageCount !== null && promo.currentUsageCount >= promo.maxUsageCount) {
      return false;
    }

    // Check scope eligibility
    if (promo.targetScope === "ALL") {
      return true;
    }

    if (promo.targetScope === "CATEGORY") {
      if (!promo.targetCategory || !businessCategory) return false;
      const targetCat = promo.targetCategory.trim().toUpperCase();
      const actualCat = businessCategory.trim().toUpperCase();
      return targetCat === actualCat || actualCat.includes(targetCat) || targetCat.includes(actualCat);
    }

    if (promo.targetScope === "BUSINESS") {
      if (!businessId || !promo.targetBusinessIds || promo.targetBusinessIds.length === 0) {
        return false;
      }
      return promo.targetBusinessIds.includes(businessId);
    }

    return false;
  });

  if (eligiblePromos.length === 0) {
    return result;
  }

  // Pick the promotion providing the highest discount for the business
  let bestPromo = eligiblePromos[0];
  let bestDiscount = 0;
  let bestEffectiveFee = baseFee;

  for (const promo of eligiblePromos) {
    let currentDiscount = 0;
    let currentFee = baseFee;

    if (promo.promotionType === "FREE_WAIVER") {
      currentDiscount = baseFee;
      currentFee = 0;
    } else if (promo.promotionType === "PERCENTAGE") {
      const pct = Math.min(100, Math.max(0, promo.discountValue));
      currentDiscount = (baseFee * pct) / 100;
      currentFee = Math.max(0, baseFee - currentDiscount);
    } else if (promo.promotionType === "FIXED_DISCOUNT") {
      currentDiscount = Math.min(baseFee, Math.max(0, promo.discountValue));
      currentFee = Math.max(0, baseFee - currentDiscount);
    } else if (promo.promotionType === "EXACT_PRICE") {
      currentFee = Math.max(0, promo.discountValue);
      currentDiscount = Math.max(0, baseFee - currentFee);
    }

    if (currentDiscount >= bestDiscount) {
      bestDiscount = currentDiscount;
      bestEffectiveFee = currentFee;
      bestPromo = promo;
    }
  }

  result.effectiveFee = Math.round(bestEffectiveFee);
  result.discount = Math.round(bestDiscount);
  result.isFree = result.effectiveFee === 0;
  result.promotion = {
    id: bestPromo.id,
    name: bestPromo.name,
    code: bestPromo.code,
    promotionType: bestPromo.promotionType,
    discountValue: bestPromo.discountValue,
    reason: bestPromo.reason,
    appliesTo: bestPromo.appliesTo,
    targetScope: bestPromo.targetScope,
  };

  return result;
}

/**
 * Creates a new administrator-controlled fee promotion.
 */
export async function createFeePromotion(params: CreatePromotionParams) {
  const {
    name,
    code,
    description,
    reason,
    promotionType,
    discountValue,
    appliesTo = "REGISTRATION",
    targetScope = "ALL",
    targetCategory,
    targetBusinessIds = [],
    status = "ACTIVE",
    startDate = new Date(),
    endDate,
    maxUsageCount,
    adminId,
  } = params;

  if (!name || name.trim().length === 0) {
    throw new Error("Promotion name is required (e.g. 'Youth Entrepreneurship 100% Waiver').");
  }

  if (!reason || reason.trim().length < 6) {
    throw new Error("A valid administrative reason (min 6 characters) is required for audit integrity.");
  }

  if (discountValue < 0) {
    throw new Error("Discount value cannot be negative.");
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, role: true },
  });

  if (!admin || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(admin.role)) {
    throw new Error("Unauthorized. Only SUPER_ADMIN or COMMUNITY_ADMIN can create fee promotions.");
  }

  const promo = await prisma.feePromotion.create({
    data: {
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : null,
      description: description ? description.trim() : null,
      reason: reason.trim(),
      promotionType,
      discountValue: Number(discountValue),
      appliesTo,
      targetScope,
      targetCategory: targetCategory ? targetCategory.trim() : null,
      targetBusinessIds,
      status,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      maxUsageCount: maxUsageCount !== undefined && maxUsageCount !== null ? Number(maxUsageCount) : null,
      createdById: adminId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "FEE_PROMOTION_CREATED",
      entityType: "FeePromotion",
      entityId: promo.id,
      metadata: JSON.stringify({
        name: promo.name,
        promotionType: promo.promotionType,
        discountValue: promo.discountValue,
        appliesTo: promo.appliesTo,
        targetScope: promo.targetScope,
        status: promo.status,
        reason: promo.reason,
      }),
    },
  }).catch(() => null);

  return promo;
}

/**
 * Updates an existing fee promotion's details, scope, or status.
 */
export async function updateFeePromotion(params: UpdatePromotionParams) {
  const {
    id,
    name,
    code,
    description,
    reason,
    promotionType,
    discountValue,
    appliesTo,
    targetScope,
    targetCategory,
    targetBusinessIds,
    status,
    startDate,
    endDate,
    maxUsageCount,
    adminId,
  } = params;

  const existing = await prisma.feePromotion.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error(`Promotion with ID "${id}" not found.`);
  }

  if (!reason || reason.trim().length < 6) {
    throw new Error("A valid administrative reason (min 6 characters) is required for audit integrity.");
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, role: true },
  });

  if (!admin || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(admin.role)) {
    throw new Error("Unauthorized. Only SUPER_ADMIN or COMMUNITY_ADMIN can edit fee promotions.");
  }

  const updated = await prisma.feePromotion.update({
    where: { id },
    data: {
      name: name !== undefined ? name.trim() : undefined,
      code: code !== undefined ? (code ? code.trim().toUpperCase() : null) : undefined,
      description: description !== undefined ? (description ? description.trim() : null) : undefined,
      reason: reason.trim(),
      promotionType: promotionType !== undefined ? promotionType : undefined,
      discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
      appliesTo: appliesTo !== undefined ? appliesTo : undefined,
      targetScope: targetScope !== undefined ? targetScope : undefined,
      targetCategory: targetCategory !== undefined ? (targetCategory ? targetCategory.trim() : null) : undefined,
      targetBusinessIds: targetBusinessIds !== undefined ? targetBusinessIds : undefined,
      status: status !== undefined ? status : undefined,
      startDate: startDate !== undefined ? new Date(startDate) : undefined,
      endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      maxUsageCount: maxUsageCount !== undefined ? (maxUsageCount !== null ? Number(maxUsageCount) : null) : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "FEE_PROMOTION_UPDATED",
      entityType: "FeePromotion",
      entityId: updated.id,
      metadata: JSON.stringify({
        id: updated.id,
        name: updated.name,
        status: updated.status,
        reason: reason.trim(),
        previousStatus: existing.status,
      }),
    },
  }).catch(() => null);

  return updated;
}

/**
 * Changes promotion status (e.g. Pause, Activate, Archive).
 */
export async function setFeePromotionStatus({
  id,
  status,
  adminId,
  reason,
}: {
  id: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  adminId: string;
  reason: string;
}) {
  return await updateFeePromotion({
    id,
    status,
    adminId,
    reason,
  });
}

/**
 * Lists all fee promotions with usage counts and creator metadata.
 */
export async function getFeePromotions(includeArchived = false) {
  return await prisma.feePromotion.findMany({
    where: includeArchived ? undefined : { status: { not: "ARCHIVED" } },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

/**
 * Confirms a 0 RWF free registration under an authorized promotion or 0 RWF fee tariff.
 * Generates official waiver receipt, activates business for discovery, and increments usage.
 */
export async function confirmFreeRegistrationWithWaiver({
  businessId,
  payerUserId,
  promotionId,
  reason,
  adminId,
}: {
  businessId: string;
  payerUserId: string;
  promotionId?: string;
  reason?: string;
  adminId?: string;
}) {
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
    throw new Error(`Business with ID "${businessId}" not found.`);
  }

  // Idempotency: if already confirmed, return existing receipt
  if (business.registrationPayments.length > 0) {
    const existing = business.registrationPayments[0];
    return {
      success: true,
      isAlreadyPaid: true,
      payment: existing,
      receipt: existing.receipt,
      businessStatus: business.status,
      receiptNumber: existing.receipt?.receiptNumber || null,
      message: "Business registration is already confirmed.",
    };
  }

  const feeConfig = await getActiveFeeConfig();
  let promo = null;
  if (promotionId) {
    promo = await prisma.feePromotion.findUnique({ where: { id: promotionId } });
  }

  const waiverReasonText =
    reason ||
    (promo
      ? `Promotional 100% Fee Waiver: ${promo.name} (${promo.reason})`
      : `Zero-Fee Registration Policy (Tariff: 0 RWF, reason: ${feeConfig.reason || "Free Tier"})`);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 12-Month Coverage

  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  const paymentReference = `MOSA-WAIVE-${dateStr}-${randomSuffix}`;

  const receiptCount = await prisma.registrationReceipt.count();
  const seqNum = String(receiptCount + 1).padStart(5, "0");
  const receiptNumber = `MOSA-REC-${dateStr}-${seqNum}`;

  return await prisma.$transaction(async (tx) => {
    // 1. Create confirmed 0 RWF payment record
    const payment = await tx.registrationPayment.create({
      data: {
        businessId: business.id,
        payerUserId: payerUserId || business.ownerId || "system",
        feeConfigId: feeConfig.id,
        feeAmount: 0,
        discountApplied: feeConfig.amount > 0 ? feeConfig.amount : 0,
        currency: feeConfig.currency || "RWF",
        provider: "ADMIN_WAIVER",
        paymentType: "REGISTRATION",
        periodCoveredStart: now,
        periodCoveredEnd: periodEnd,
        isWaiver: true,
        waiverReason: waiverReasonText,
        waiverAdminId: adminId || promo?.createdById || null,
        promotionId: promo?.id || null,
        paymentReference,
        providerTransactionRef: `FREE-${dateStr}-${randomSuffix}`,
        status: "CONFIRMED",
        verifiedAt: now,
        verifiedBy: promo ? `PROMOTION_${promo.id}` : "FREE_TARIFF_POLICY",
      },
    });

    // 2. Create official 0 RWF numbered receipt
    const receipt = await tx.registrationReceipt.create({
      data: {
        receiptNumber,
        paymentId: payment.id,
        businessId: business.id,
        businessName: business.name,
        ownerName: business.owner?.name || "Business Owner",
        ownerPhone: business.owner?.phone || business.phone,
        amountPaid: 0,
        currency: feeConfig.currency || "RWF",
        paymentMethod: promo ? "PROMOTION_WAIVER" : "ADMIN_WAIVER",
        receiptType: "REGISTRATION",
        periodCoveredStart: now,
        periodCoveredEnd: periodEnd,
      },
    });

    // 3. Atomically activate business for discovery
    await tx.business.update({
      where: { id: business.id },
      data: {
        status: "ACTIVE",
        registrationConfirmedAt: now,
        registrationExpiresAt: periodEnd,
        renewalStatus: "CURRENT",
        isWaiver: true,
        waiverReason: waiverReasonText,
        waiverGrantedAt: now,
        waiverGrantedByAdminId: adminId || promo?.createdById || null,
      },
    });

    // 4. Increment promotion usage if applied
    if (promo) {
      await tx.feePromotion.update({
        where: { id: promo.id },
        data: {
          currentUsageCount: { increment: 1 },
        },
      });
    }

    // 5. Immutable audit log
    await tx.auditLog.create({
      data: {
        actorId: adminId || business.ownerId || null,
        action: promo ? "PAYMENT_CONFIRMED_PROMOTION_WAIVED" : "PAYMENT_CONFIRMED_ZERO_FEE",
        entityType: "RegistrationPayment",
        entityId: payment.id,
        metadata: JSON.stringify({
          businessId: business.id,
          businessName: business.name,
          receiptNumber: receipt.receiptNumber,
          feeAmount: 0,
          promotionId: promo?.id || null,
          promotionName: promo?.name || null,
          reason: waiverReasonText,
        }),
      },
    });

    return {
      success: true,
      isAlreadyPaid: false,
      payment,
      receipt,
      businessStatus: "ACTIVE",
      receiptNumber: receipt.receiptNumber,
      message: promo
        ? `Registration confirmed for free under promotion "${promo.name}". Official receipt issued!`
        : "Registration confirmed for free under standard 0 RWF tariff. Official receipt issued!",
    };
  });
}
