import { Resend } from "resend";
import { SendVerificationEmailParams, EmailSendResult } from "./types";
import { renderVerificationEmail } from "./templates";

export * from "./types";
export * from "./templates";

/**
 * Standard RFC-5322 compliant email regex check
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim();
  // Basic robust validation: non-whitespace before and after @, valid domain with TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean) && clean.length <= 254;
}

/**
 * Checks whether Resend has been configured in the environment
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "");
}

/**
 * Gets the configured sender address for transactional emails
 */
export function getSenderEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "MOSA Network <onboarding@resend.dev>";
}

/**
 * Dispatches a branded verification code email using Resend.
 * Strictly checks email format, configuration status, and masks sensitive data in logs.
 */
export async function sendVerificationEmail(
  params: SendVerificationEmailParams
): Promise<EmailSendResult> {
  const { to, code, purpose, language = "en", recipientName } = params;

  // 1. Email format validation
  const cleanEmail = (to || "").trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return {
      success: false,
      error: `Invalid email address format: "${to}". Please provide a valid email.`,
      isConfigured: isEmailConfigured(),
    };
  }

  // 2. Resend provider configuration check
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email verification service is not configured. RESEND_API_KEY is required in environment variables.",
      isConfigured: false,
    };
  }

  // 3. Render branded email template
  const { subject, html, text } = renderVerificationEmail(
    code,
    purpose,
    language,
    recipientName
  );

  const from = getSenderEmail();

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from,
      to: cleanEmail,
      subject,
      html,
      text,
    });

    if (error) {
      // Do not expose API key or internal secrets
      return {
        success: false,
        error: error.message || "Failed to dispatch email via Resend.",
        isConfigured: true,
      };
    }

    return {
      success: true,
      messageId: data?.id,
      isConfigured: true,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while contacting the email gateway.",
      isConfigured: true,
    };
  }
}
