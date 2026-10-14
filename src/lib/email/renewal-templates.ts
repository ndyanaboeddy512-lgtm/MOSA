/**
 * Transactional Email Templates for MOSA Annual Renewals & Lifecycle Notices
 */

export interface RenewalEmailData {
  businessName: string;
  ownerName: string;
  expiresAt: Date;
  gracePeriodEndsAt?: Date;
  renewalFee: number;
  currency: string;
  portalUrl: string;
  receiptNumber?: string;
}

export function renderRenewalEmail(
  stage: "REMINDER_30D" | "WARNING_14D" | "URGENT_7D" | "EXPIRED_0D" | "OVERDUE_GRACE" | "SUSPENDED" | "RENEWAL_CONFIRMED",
  data: RenewalEmailData
): { subject: string; html: string; text: string } {
  const { businessName, ownerName, expiresAt, gracePeriodEndsAt, renewalFee, currency, portalUrl, receiptNumber } = data;
  const formattedExpiry = new Date(expiresAt).toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" });
  const formattedGrace = gracePeriodEndsAt ? new Date(gracePeriodEndsAt).toLocaleDateString("en-RW", { year: "numeric", month: "long", day: "numeric" }) : "";
  const feeFormatted = `${renewalFee.toLocaleString()} ${currency}`;

  let subject = "";
  let badgeText = "";
  let badgeColor = "#059669"; // emerald
  let headline = "";
  let bodyParagraph = "";
  let urgencyNotice = "";

  switch (stage) {
    case "REMINDER_30D":
      subject = `[MOSA] Annual Registration Renewal Notice: ${businessName} (Due in 30 Days)`;
      badgeText = "30-DAY RENEWAL NOTICE";
      badgeColor = "#2563EB"; // blue
      headline = "Your MOSA Annual Registration Renewal is Coming Up";
      bodyParagraph = `This is a friendly reminder that the annual registration for <strong>${businessName}</strong> is scheduled to expire on <strong>${formattedExpiry}</strong>.`;
      urgencyNotice = `Renewing your registration ensures uninterrupted public discovery across Rwanda, verified partner badging, and customer inquiries on MOSA.`;
      break;

    case "WARNING_14D":
      subject = `[Action Required] 14 Days Remaining: Annual Registration for ${businessName}`;
      badgeText = "14 DAYS REMAINING";
      badgeColor = "#D97706"; // amber
      headline = "Important: Annual Renewal Due in 2 Weeks";
      bodyParagraph = `Your business <strong>${businessName}</strong> has 14 days remaining on its active registration period, which ends on <strong>${formattedExpiry}</strong>.`;
      urgencyNotice = `Please complete your annual renewal payment of <strong>${feeFormatted}</strong> to avoid entering the grace period.`;
      break;

    case "URGENT_7D":
      subject = `[URGENT] 7 Days Until Expiry: Renew Registration for ${businessName}`;
      badgeText = "URGENT: 7 DAYS LEFT";
      badgeColor = "#DC2626"; // red
      headline = "Urgent: Final Week to Renew Registration";
      bodyParagraph = `The active registration for <strong>${businessName}</strong> expires in 7 days on <strong>${formattedExpiry}</strong>.`;
      urgencyNotice = `To prevent public visibility interruption or account suspension, please renew your registration today.`;
      break;

    case "EXPIRED_0D":
    case "OVERDUE_GRACE":
      subject = `[OVERDUE] Registration Expired — Grace Period Active for ${businessName}`;
      badgeText = "GRACE PERIOD ACTIVE";
      badgeColor = "#DC2626"; // red
      headline = "Registration Expired — 7-Day Grace Period in Effect";
      bodyParagraph = `The annual registration for <strong>${businessName}</strong> expired on <strong>${formattedExpiry}</strong>. Your listing has entered a temporary 7-day grace period ending on <strong>${formattedGrace}</strong>.`;
      urgencyNotice = `Your public visibility remains active during this grace period. If renewal is not completed before <strong>${formattedGrace}</strong>, public visibility and profile updates will be automatically suspended.`;
      break;

    case "SUSPENDED":
      subject = `[SUSPENDED] Public Visibility Paused: ${businessName}`;
      badgeText = "REGISTRATION SUSPENDED";
      badgeColor = "#4B5563"; // gray
      headline = "Public Listing Paused due to Non-Renewal";
      bodyParagraph = `The grace period for <strong>${businessName}</strong> concluded without a confirmed renewal payment. In accordance with MOSA platform policy, public directory discovery and profile updates have been paused.`;
      urgencyNotice = `<strong>Your business information and receipts are safe and preserved.</strong> You can restore full active visibility at any time by completing your renewal in the Partner Portal.`;
      break;

    case "RENEWAL_CONFIRMED":
      subject = `[Confirmed] Annual Renewal Successful: ${businessName} (Receipt: ${receiptNumber || "Issued"})`;
      badgeText = "RENEWAL CONFIRMED";
      badgeColor = "#059669"; // emerald
      headline = "Your Registration has been Successfully Renewed!";
      bodyParagraph = `We have confirmed your annual renewal payment of <strong>${feeFormatted}</strong> for <strong>${businessName}</strong>. Your listing is 100% active and discoverable.`;
      urgencyNotice = `New Expiry Date: <strong>${formattedExpiry}</strong>. Official Receipt Number: <strong>${receiptNumber || "Available in Portal"}</strong>.`;
      break;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px 16px; color: #1E293B;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="padding: 24px 32px; background: linear-gradient(135deg, #064E3B 0%, #065F46 100%);">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 22px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">MOSA</span>
        <span style="display: inline-block; padding: 4px 12px; background-color: rgba(255, 255, 255, 0.15); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase;">Rwanda Business Registry</span>
      </div>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 4px 12px; background-color: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}30; border-radius: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 16px;">
        ${badgeText}
      </div>

      <h1 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0; line-height: 1.3;">
        ${headline}
      </h1>

      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        Hello ${ownerName || "Business Owner"},
      </p>

      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
        ${bodyParagraph}
      </p>

      <div style="padding: 16px 20px; background-color: #F8FAFC; border-left: 4px solid ${badgeColor}; border-radius: 8px; margin-bottom: 24px;">
        <p style="font-size: 13px; color: #1E293B; line-height: 1.5; margin: 0;">
          ${urgencyNotice}
        </p>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${portalUrl}" style="display: inline-block; padding: 14px 32px; background-color: #059669; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
          ${stage === "RENEWAL_CONFIRMED" ? "View Official Receipt" : "Renew Registration Now"}
        </a>
      </div>

      <p style="font-size: 12px; color: #94A3B8; line-height: 1.5; margin: 0; text-align: center;">
        Accepted payment methods: MTN Mobile Money, Airtel Money, and Bank Transfer.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
      <p style="font-size: 11px; color: #94A3B8; margin: 0 0 6px 0;">
        MOSA Network Rwanda • Kigali, Rwanda
      </p>
      <p style="font-size: 10px; color: #CBD5E1; margin: 0;">
        This automated notification was generated by the MOSA Registry & Payment Engine.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
MOSA Network — ${headline}

Hello ${ownerName || "Business Owner"},

${bodyParagraph.replace(/<[^>]*>/g, "")}

${urgencyNotice.replace(/<[^>]*>/g, "")}

Action URL: ${portalUrl}

Renewal Fee: ${feeFormatted}
Payment methods: MTN Mobile Money, Airtel Money, Bank Transfer.

MOSA Network Rwanda
  `.trim();

  return { subject, html, text };
}
