import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getActiveFeeConfig, getPaymentProviders } from "./engine";
import { renderRenewalEmail } from "@/lib/email/renewal-templates";
import { isEmailConfigured, getSenderEmail, isValidEmail } from "@/lib/email";

export const DEFAULT_ANNUAL_RENEWAL_FEE = 5000;
export const DEFAULT_GRACE_PERIOD_DAYS = 7;

export interface CalculateRenewalPeriodResult {
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Calculates official 12-month (365 days) validity period.
 * Preserves remaining validity if renewed before expiry.
 */
export function calculateRenewalPeriod(existingExpiry?: Date | null): CalculateRenewalPeriodResult {
  const now = new Date();
  if (existingExpiry && new Date(existingExpiry) > now) {
    const periodStart = new Date(existingExpiry);
    const periodEnd = new Date(periodStart.getTime() + 365 * 24 * 60 * 60 * 1000);
    return { periodStart, periodEnd };
  }
  const periodStart = now;
  const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  return { periodStart, periodEnd };
}

/**
 * Initiates an annual renewal payment for an existing business.
 */
export async function initiateAnnualRenewalPayment({
  businessId,
  payerUserId,
  provider,
  phoneNumber,
}: {
  businessId: string;
  payerUserId: string;
  provider: "MTN_MOMO" | "AIRTEL_MONEY" | "BANK_TRANSFER";
  phoneNumber?: string;
}) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { owner: true },
  });

  if (!business) {
    throw new Error(`Business with ID ${businessId} was not found.`);
  }

  const feeConfig = await getActiveFeeConfig();
  const renewalFee = (feeConfig as any).renewalAmount || feeConfig.amount || DEFAULT_ANNUAL_RENEWAL_FEE;
  const currency = feeConfig.currency || "RWF";

  const providerConfigs = await getPaymentProviders(true);
  const providerConfig = providerConfigs.find((p) => p.provider === provider);

  if (!providerConfig) {
    throw new Error(`Payment provider ${provider} is not currently enabled.`);
  }

  const { periodStart, periodEnd } = calculateRenewalPeriod(business.registrationExpiresAt);

  // Generate unique renewal reference: MOSA-REN-YYYYMMDD-XXXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  const paymentReference = `MOSA-REN-${dateStr}-${randomSuffix}`;

  const payment = await prisma.registrationPayment.create({
    data: {
      businessId,
      payerUserId,
      feeConfigId: feeConfig.id,
      feeAmount: renewalFee,
      currency,
      provider,
      paymentType: "ANNUAL_RENEWAL",
      periodCoveredStart: periodStart,
      periodCoveredEnd: periodEnd,
      phoneNumber: phoneNumber || null,
      paymentReference,
      status: "PENDING",
    },
  });

  return {
    success: true,
    payment,
    renewalFee,
    currency,
    paymentReference,
    periodCoveredStart: periodStart,
    periodCoveredEnd: periodEnd,
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
 * Grants an official 100% registration or annual renewal fee waiver.
 * Requires an authorized administrator and a mandatory reason for auditability.
 */
export async function grantRegistrationOrRenewalWaiver({
  businessId,
  adminId,
  reason,
  waiverType = "ANNUAL_RENEWAL", // "REGISTRATION" | "ANNUAL_RENEWAL"
}: {
  businessId: string;
  adminId: string;
  reason: string;
  waiverType?: "REGISTRATION" | "ANNUAL_RENEWAL";
}) {
  if (!reason || reason.trim().length < 8) {
    throw new Error("A mandatory descriptive reason (minimum 8 characters) is required to grant an administrative waiver.");
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { owner: true },
  });

  if (!business) {
    throw new Error("Business record not found.");
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
  });

  if (!admin || !["SUPER_ADMIN", "COMMUNITY_ADMIN"].includes(admin.role)) {
    throw new Error("Unauthorized. Only SUPER_ADMIN or COMMUNITY_ADMIN can grant registration/renewal waivers.");
  }

  const { periodStart, periodEnd } = calculateRenewalPeriod(business.registrationExpiresAt);

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  const paymentReference = `MOSA-WAIVE-${dateStr}-${randomSuffix}`;

  const receiptCount = await prisma.registrationReceipt.count();
  const seqNum = String(receiptCount + 1).padStart(5, "0");
  const receiptNumber = `MOSA-REC-${dateStr}-${seqNum}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create confirmed waiver payment record
    const payment = await tx.registrationPayment.create({
      data: {
        businessId: business.id,
        payerUserId: business.ownerId || adminId,
        feeAmount: 0,
        currency: "RWF",
        provider: "ADMIN_WAIVER",
        paymentType: waiverType,
        periodCoveredStart: periodStart,
        periodCoveredEnd: periodEnd,
        isWaiver: true,
        waiverReason: reason.trim(),
        waiverAdminId: adminId,
        paymentReference,
        providerTransactionRef: `WAIVER-${dateStr}-${randomSuffix}`,
        status: "CONFIRMED",
        verifiedAt: new Date(),
        verifiedBy: `ADMIN_WAIVER_${admin.name || admin.id}`,
      },
    });

    // 2. Create official 0 RWF waiver receipt
    const receipt = await tx.registrationReceipt.create({
      data: {
        receiptNumber,
        paymentId: payment.id,
        businessId: business.id,
        businessName: business.name,
        ownerName: business.owner?.name || "Business Owner",
        ownerPhone: business.phone || business.owner?.phone || "N/A",
        amountPaid: 0,
        currency: "RWF",
        paymentMethod: "ADMIN_WAIVER",
        receiptType: "ADMIN_WAIVER",
        periodCoveredStart: periodStart,
        periodCoveredEnd: periodEnd,
        providerTransactionRef: payment.providerTransactionRef,
        metadata: JSON.stringify({
          waiverGrantedBy: admin.name,
          waiverReason: reason.trim(),
          waiverType,
          previousStatus: business.status,
          previousRenewalStatus: (business as any).renewalStatus,
        }),
      },
    });

    // 3. Update business: set ACTIVE, CURRENT, and extend validity by 12 months
    const updatedBusiness = await tx.business.update({
      where: { id: business.id },
      data: {
        status: "ACTIVE",
        renewalStatus: "CURRENT",
        registrationConfirmedAt: business.registrationConfirmedAt || new Date(),
        registrationExpiresAt: periodEnd,
        gracePeriodEndsAt: null,
        renewalCount: { increment: waiverType === "ANNUAL_RENEWAL" ? 1 : 0 },
        lastRenewalAt: new Date(),
        isWaiver: true,
        waiverReason: reason.trim(),
        waiverGrantedByAdminId: adminId,
        waiverGrantedAt: new Date(),
      },
    });

    // 4. Record permanent audit log
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "ADMIN_WAIVER_GRANTED",
        entityType: "Business",
        entityId: business.id,
        metadata: JSON.stringify({
          adminName: admin.name,
          adminRole: admin.role,
          reason: reason.trim(),
          waiverType,
          paymentReference,
          receiptNumber,
          periodCoveredStart: periodStart,
          periodCoveredEnd: periodEnd,
        }),
      },
    });

    return { payment, receipt, business: updatedBusiness };
  }, { timeout: 25000, maxWait: 15000 });

  // 5. In-app notification to business owner
  if (business.ownerId) {
    await prisma.notification.create({
      data: {
        userId: business.ownerId,
        title: "Registration Fee Waiver Granted",
        message: `An administrative waiver has been granted for ${business.name}. Your listing is fully active until ${periodEnd.toLocaleDateString()}. Reason: ${reason}`,
        type: "SYSTEM",
      },
    }).catch(() => null);
  }

  // 6. Email confirmation if owner email available
  const ownerEmail = business.owner?.email || business.email;
  if (ownerEmail && isValidEmail(ownerEmail) && isEmailConfigured()) {
    try {
      const emailContent = renderRenewalEmail("RENEWAL_CONFIRMED", {
        businessName: business.name,
        ownerName: business.owner?.name || "Business Owner",
        expiresAt: periodEnd,
        renewalFee: 0,
        currency: "RWF",
        portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/owner/dashboard`,
        receiptNumber,
      });

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: getSenderEmail(),
        to: ownerEmail.trim().toLowerCase(),
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (err) {
      console.warn("[WAIVER_EMAIL_DISPATCH_WARNING]:", err);
    }
  }

  return {
    success: true,
    message: `Administrative ${waiverType} waiver successfully granted.`,
    receiptNumber: result.receipt.receiptNumber,
    newExpiresAt: periodEnd,
    businessStatus: result.business.status,
    renewalStatus: (result.business as any).renewalStatus,
    receipt: result.receipt,
    business: result.business,
  };
}

/**
 * Automated Scheduled Lifecycle Runner:
 * Checks all business expiry dates, manages grace periods, suspends non-renewed businesses,
 * and delivers staged email & in-app renewal reminders with strict deduplication.
 */
export async function runAutomatedRenewalCheckAndReminders() {
  const now = new Date();
  const feeConfig = await getActiveFeeConfig();
  const gracePeriodDays = (feeConfig as any).gracePeriodDays || DEFAULT_GRACE_PERIOD_DAYS;
  const renewalFee = (feeConfig as any).renewalAmount || feeConfig.amount || DEFAULT_ANNUAL_RENEWAL_FEE;
  const currency = feeConfig.currency || "RWF";
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/owner/dashboard`;

  // Fetch businesses with confirmed registration/expiry dates
  const businesses = await prisma.business.findMany({
    where: {
      registrationExpiresAt: { not: null },
      status: { not: "DELETED" },
    },
    include: {
      owner: true,
      renewalNotificationLogs: true,
    },
  });

  const metrics = {
    totalChecked: businesses.length,
    reminders30d: 0,
    warnings14d: 0,
    urgents7d: 0,
    expiredGraceEntered: 0,
    suspendedCount: 0,
    alreadyUpToDate: 0,
    errors: [] as string[],
  };

  for (const biz of businesses) {
    try {
      const expiresAt = new Date(biz.registrationExpiresAt!);
      const msUntilExpiry = expiresAt.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

      // 1. Calculate grace period window
      let graceEndsAt = biz.gracePeriodEndsAt ? new Date(biz.gracePeriodEndsAt) : null;
      if (!graceEndsAt && daysUntilExpiry <= 0) {
        graceEndsAt = new Date(expiresAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
      }

      // Determine required stage
      let stageToNotify: "REMINDER_30D" | "WARNING_14D" | "URGENT_7D" | "EXPIRED_0D" | "OVERDUE_GRACE" | "SUSPENDED" | null = null;
      let newRenewalStatus = (biz as any).renewalStatus || "CURRENT";
      let newPublicStatus = biz.status;

      if (daysUntilExpiry > 30) {
        newRenewalStatus = "CURRENT";
      } else if (daysUntilExpiry > 14 && daysUntilExpiry <= 30) {
        newRenewalStatus = "DUE_SOON";
        stageToNotify = "REMINDER_30D";
      } else if (daysUntilExpiry > 7 && daysUntilExpiry <= 14) {
        newRenewalStatus = "DUE_SOON";
        stageToNotify = "WARNING_14D";
      } else if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
        newRenewalStatus = "DUE_SOON";
        stageToNotify = "URGENT_7D";
      } else if (daysUntilExpiry <= 0) {
        // Expiry date passed
        if (graceEndsAt && now < graceEndsAt) {
          // Inside Grace Period
          newRenewalStatus = "GRACE_PERIOD";
          stageToNotify = "OVERDUE_GRACE";
        } else {
          // Grace Period Elapsed -> Enforce Suspension!
          newRenewalStatus = "SUSPENDED";
          newPublicStatus = "SUSPENDED"; // Automatically hides from public search!
          stageToNotify = "SUSPENDED";
        }
      }

      // Persist status updates if changed
      const statusChanged = (biz as any).renewalStatus !== newRenewalStatus || biz.status !== newPublicStatus;
      if (statusChanged || (daysUntilExpiry <= 0 && !biz.gracePeriodEndsAt)) {
        await prisma.business.update({
          where: { id: biz.id },
          data: {
            renewalStatus: newRenewalStatus,
            status: newPublicStatus,
            gracePeriodEndsAt: graceEndsAt,
          },
        });

        if (newPublicStatus === "SUSPENDED" && biz.status !== "SUSPENDED") {
          await prisma.auditLog.create({
            data: {
              action: "BUSINESS_AUTOMATICALLY_SUSPENDED_NON_RENEWAL",
              entityType: "Business",
              entityId: biz.id,
              metadata: JSON.stringify({
                expiresAt,
                graceEndsAt,
                daysOverdue: Math.abs(daysUntilExpiry),
                previousStatus: biz.status,
              }),
            },
          }).catch(() => null);
        }
      }

      // Dispatch Notifications if needed
      if (stageToNotify) {
        const ownerEmail = biz.owner?.email || biz.email;
        const ownerPhone = biz.phone || biz.owner?.phone;

        // Check deduplication in RenewalNotificationLog
        const existingLogs = biz.renewalNotificationLogs.filter((l) => l.stage === stageToNotify);

        // In-App Notification
        const hasInApp = existingLogs.some((l) => l.channel === "IN_APP");
        if (!hasInApp && biz.ownerId) {
          let title = "Annual Renewal Notice";
          let message = `Annual registration for ${biz.name} expires on ${expiresAt.toLocaleDateString()}.`;
          if (stageToNotify === "URGENT_7D") {
            title = "URGENT: 7 Days to Renew Registration";
            message = `Your registration expires in 7 days on ${expiresAt.toLocaleDateString()}. Renew now to prevent suspension.`;
          } else if (stageToNotify === "OVERDUE_GRACE") {
            title = "Registration Expired — Grace Period Active";
            message = `Registration for ${biz.name} has expired. Grace period active until ${graceEndsAt?.toLocaleDateString()}. Renew to avoid listing suspension.`;
          } else if (stageToNotify === "SUSPENDED") {
            title = "Listing Suspended: Registration Overdue";
            message = `Public visibility for ${biz.name} has been paused due to expired registration. Renew in Partner Portal to instantly reactivate.`;
          }

          await prisma.notification.create({
            data: {
              userId: biz.ownerId,
              title,
              message,
              type: "SYSTEM",
            },
          }).catch(() => null);

          await prisma.renewalNotificationLog.create({
            data: {
              businessId: biz.id,
              stage: stageToNotify,
              channel: "IN_APP",
              recipient: biz.ownerId,
              status: "SENT",
            },
          }).catch(() => null);
        }

        // Email Notification via Resend
        const hasEmail = existingLogs.some((l) => l.channel === "EMAIL");
        if (!hasEmail && ownerEmail && isValidEmail(ownerEmail) && isEmailConfigured()) {
          try {
            const emailContent = renderRenewalEmail(stageToNotify, {
              businessName: biz.name,
              ownerName: biz.owner?.name || "Business Owner",
              expiresAt,
              gracePeriodEndsAt: graceEndsAt || undefined,
              renewalFee,
              currency,
              portalUrl,
            });

            const resend = new Resend(process.env.RESEND_API_KEY);
            const { error: emailErr } = await resend.emails.send({
              from: getSenderEmail(),
              to: ownerEmail.trim().toLowerCase(),
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
            });

            await prisma.renewalNotificationLog.create({
              data: {
                businessId: biz.id,
                stage: stageToNotify,
                channel: "EMAIL",
                recipient: ownerEmail.trim().toLowerCase(),
                status: emailErr ? "FAILED" : "SENT",
                errorMessage: emailErr?.message || null,
              },
            }).catch(() => null);
          } catch (e: any) {
            console.warn(`[RENEWAL_EMAIL_FAILED for ${biz.id}]:`, e.message);
          }
        }

        // Track stats
        if (stageToNotify === "REMINDER_30D") metrics.reminders30d++;
        else if (stageToNotify === "WARNING_14D") metrics.warnings14d++;
        else if (stageToNotify === "URGENT_7D") metrics.urgents7d++;
        else if (stageToNotify === "OVERDUE_GRACE") metrics.expiredGraceEntered++;
        else if (stageToNotify === "SUSPENDED") metrics.suspendedCount++;
      } else {
        metrics.alreadyUpToDate++;
      }
    } catch (bizErr: any) {
      metrics.errors.push(`Business ${biz.id}: ${bizErr.message}`);
    }
  }

  const summary = {
    checked: metrics.totalChecked,
    dueSoon: metrics.reminders30d + metrics.warnings14d + metrics.urgents7d,
    enteredGracePeriod: metrics.expiredGraceEntered,
    suspended: metrics.suspendedCount,
    notificationsSent: metrics.reminders30d + metrics.warnings14d + metrics.urgents7d + metrics.expiredGraceEntered + metrics.suspendedCount,
    deduplicated: metrics.alreadyUpToDate,
  };

  return {
    success: true,
    timestamp: now.toISOString(),
    metrics,
    summary,
  };
}

/**
 * Returns comprehensive registration and renewal KPIs for Command Center.
 */
export async function getRegistrationAndRenewalKPIs() {
  const [
    totalBusinesses,
    activeBusinesses,
    dueSoonBusinesses,
    expiredBusinesses,
    gracePeriodBusinesses,
    suspendedBusinesses,
    waiverBusinesses,
    allPayments,
    feeConfig,
  ] = await Promise.all([
    prisma.business.count({ where: { status: { not: "DELETED" } } }),
    prisma.business.count({ where: { status: "ACTIVE", renewalStatus: "CURRENT" } }),
    prisma.business.count({ where: { renewalStatus: "DUE_SOON" } }),
    prisma.business.count({ where: { renewalStatus: "EXPIRED" } }),
    prisma.business.count({ where: { renewalStatus: "GRACE_PERIOD" } }),
    prisma.business.count({ where: { renewalStatus: "SUSPENDED" } }),
    prisma.business.count({ where: { isWaiver: true } }),
    prisma.registrationPayment.findMany({
      where: { status: "CONFIRMED" },
      select: { feeAmount: true, paymentType: true, provider: true },
    }),
    getActiveFeeConfig(),
  ]);

  const totalRevenue = allPayments.reduce((acc, p) => acc + (p.feeAmount || 0), 0);
  const renewalsCompleted = allPayments.filter((p) => p.paymentType === "ANNUAL_RENEWAL").length;
  const initialRegistrations = allPayments.filter((p) => p.paymentType === "REGISTRATION").length;
  const outstandingRenewals = dueSoonBusinesses + expiredBusinesses + gracePeriodBusinesses + suspendedBusinesses;

  return {
    totalBusinesses,
    activeRegistrations: activeBusinesses,
    renewalsDueSoon: dueSoonBusinesses,
    expiredRegistrations: expiredBusinesses,
    inGracePeriod: gracePeriodBusinesses,
    suspendedBusinesses,
    waiverBusinesses,
    renewalsCompleted,
    initialRegistrations,
    outstandingRenewals,
    totalRevenue,
    activeRegistrationFee: feeConfig.amount,
    activeRenewalFee: (feeConfig as any).renewalAmount || feeConfig.amount,
    gracePeriodDays: (feeConfig as any).gracePeriodDays || DEFAULT_GRACE_PERIOD_DAYS,
    currency: feeConfig.currency,
  };
}
