import { prisma } from "@/lib/prisma";
import { sendBusinessSMS } from "@/lib/sms";
import { logAuditEvent } from "@/lib/audit";

export interface ConfirmationStatus {
  needsConfirmation: boolean;
  lastConfirmedAt: string | null;
  confirmationIntervalDays: number;
  daysSinceLastConfirmation: number;
  daysRemaining: number;
}

/**
 * Checks whether a business needs confirmation
 */
export function checkConfirmationStatus(business: {
  lastConfirmedAt: Date | string | null;
  confirmationIntervalDays?: number;
  updatedAt?: Date | string;
}): ConfirmationStatus {
  const interval = business.confirmationIntervalDays || 60;
  const lastConfirmedTime = business.lastConfirmedAt 
    ? new Date(business.lastConfirmedAt).getTime() 
    : (business.updatedAt ? new Date(business.updatedAt).getTime() : 0);

  const daysSince = lastConfirmedTime > 0
    ? Math.floor((Date.now() - lastConfirmedTime) / (1000 * 60 * 60 * 24))
    : interval + 1;

  const daysRemaining = Math.max(0, interval - daysSince);
  const needsConfirmation = daysSince >= interval;

  return {
    needsConfirmation,
    lastConfirmedAt: business.lastConfirmedAt ? new Date(business.lastConfirmedAt).toISOString() : null,
    confirmationIntervalDays: interval,
    daysSinceLastConfirmation: daysSince,
    daysRemaining,
  };
}

/**
 * Executes 1-click confirmation ("YES — Everything is correct")
 */
export async function confirmBusinessInformation(
  businessId: string,
  actorId: string,
  actorRole: string = "BUSINESS_OWNER"
): Promise<{ success: boolean; lastConfirmedAt: string }> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      phone: true,
      confirmationIntervalDays: true,
    },
  });

  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  const now = new Date();

  // 1. Update Neon PostgreSQL
  await prisma.business.update({
    where: { id: businessId },
    data: {
      lastConfirmedAt: now,
    },
  });

  // 2. Create BusinessChangeHistory entry
  await prisma.businessChangeHistory.create({
    data: {
      businessId,
      actorId,
      action: "CONFIRMATION_SUBMITTED",
      fieldChanged: "lastConfirmedAt",
      previousValue: "EXPIRED_OR_UNCONFIRMED",
      newValue: now.toISOString(),
      approvalStatus: "APPROVED",
      source: actorRole === "SUPER_ADMIN" ? "COMMAND_CENTER" : "OWNER_DASHBOARD",
      metadata: JSON.stringify({ confirmationMethod: "ONE_CLICK_VERIFY", confirmedAt: now }),
    },
  });

  // 3. Mark any CONFIRMATION_DUE reminder as resolved
  await prisma.businessReminder.updateMany({
    where: {
      businessId,
      type: "CONFIRMATION_DUE",
      isResolved: false,
    },
    data: {
      isResolved: true,
      resolvedAt: now,
    },
  });

  // 4. Log system audit log
  await logAuditEvent({
    actorId,
    action: "BUSINESS_CONFIRMATION_SUBMITTED",
    entityType: "BUSINESS",
    entityId: businessId,
    metadata: { confirmedAt: now.toISOString() },
  });

  // 5. Trigger SMS Notification
  if (business.phone) {
    await sendBusinessSMS({
      businessId,
      recipientPhone: business.phone,
      templateId: "PROFILE_CONFIRMATION",
      language: "rw",
      variables: {
        businessName: business.name,
      },
    }).catch((err) => console.warn("[SMS Dispatch Warning]:", err));
  }

  return {
    success: true,
    lastConfirmedAt: now.toISOString(),
  };
}
