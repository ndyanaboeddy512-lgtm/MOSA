import { prisma } from "@/lib/prisma";
import { SMSMessagePayload, SMSSendResult, SMSProvider } from "./types";
import { renderSMSTemplate } from "./templates";
import { normalizeRwandaPhone, maskPhone } from "./normalize";

/**
 * Deduplication cache (5-minute TTL per recipient + template)
 */
const smsDedupCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

function cleanDedupCache(now: number) {
  if (smsDedupCache.size > 1000) {
    for (const [key, timestamp] of smsDedupCache.entries()) {
      if (now - timestamp > DEDUP_WINDOW_MS) {
        smsDedupCache.delete(key);
      }
    }
  }
}

/**
 * Provider Implementation: Africa's Talking (Standard for Rwanda / East Africa)
 */
class AfricasTalkingProvider implements SMSProvider {
  name = "AFRICAS_TALKING";

  get isConfigured(): boolean {
    return Boolean(process.env.AFRICAS_TALKING_API_KEY && process.env.AFRICAS_TALKING_USERNAME);
  }

  async send(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: "Africa's Talking credentials (AFRICAS_TALKING_API_KEY, AFRICAS_TALKING_USERNAME) not configured in environment.",
      };
    }

    try {
      // In production with real keys, calls Africa's Talking endpoint
      const res = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          apiKey: process.env.AFRICAS_TALKING_API_KEY!,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          username: process.env.AFRICAS_TALKING_USERNAME!,
          to: phone,
          message,
        }),
      });

      const data = await res.json();
      const recipient = data?.SMSMessageData?.Recipients?.[0];
      if (recipient && (recipient.status === "Success" || recipient.statusCode === 101)) {
        return { success: true, messageId: recipient.messageId };
      }

      return {
        success: false,
        error: recipient?.status || data?.SMSMessageData?.Message || "SMS dispatch rejected by carrier",
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to reach SMS provider gateway" };
    }
  }
}

/**
 * Fallback Unconfigured Provider (Strict: never claims fake success)
 */
class UnconfiguredProvider implements SMSProvider {
  name = "UNCONFIGURED";
  isConfigured = false;

  async send(): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return {
      success: false,
      error: "SMS Provider is not yet configured. Set AFRICAS_TALKING_API_KEY in environment variables.",
    };
  }
}

const atProvider = new AfricasTalkingProvider();
const unconfiguredProvider = new UnconfiguredProvider();

export function getActiveSMSProvider(): SMSProvider {
  if (atProvider.isConfigured) {
    return atProvider;
  }
  return unconfiguredProvider;
}

/**
 * Core dispatch function.
 * 1. Validates and normalizes Rwanda phone number (+2507XXXXXXXX).
 * 2. Checks deduplication window (5 mins for identical template + recipient).
 * 3. Renders the template in owner's language.
 * 4. Checks provider configuration.
 * 5. Saves record in Neon PostgreSQL SMSMessage table.
 * 6. Strictly reports CONFIGURATION_REQUIRED if provider is unconfigured.
 */
export async function sendBusinessSMS(payload: SMSMessagePayload): Promise<SMSSendResult> {
  const { businessId, recipientPhone, templateId, language = "rw", variables } = payload;

  const messageBody = renderSMSTemplate(templateId, language, variables);

  // 1. Phone Normalization
  const phoneNorm = normalizeRwandaPhone(recipientPhone);
  if (!phoneNorm.isValid || !phoneNorm.e164) {
    return {
      success: false,
      status: "FAILED",
      provider: "NONE",
      messageBody,
      error: phoneNorm.error || `Invalid Rwandan phone number: ${recipientPhone}`,
    };
  }
  const canonicalPhone = phoneNorm.e164;

  // 2. Deduplication Rate Limit
  const now = Date.now();
  cleanDedupCache(now);
  const dedupKey = `${canonicalPhone}:${templateId}`;
  const lastSent = smsDedupCache.get(dedupKey);
  if (lastSent && now - lastSent < DEDUP_WINDOW_MS) {
    const masked = maskPhone(canonicalPhone);
    return {
      success: false,
      status: "FAILED",
      provider: getActiveSMSProvider().name,
      messageBody,
      error: `Duplicate SMS suppressed for ${masked} with template ${templateId}. Window is 5 minutes.`,
    };
  }
  const provider = getActiveSMSProvider();

  let status: "CONFIGURATION_REQUIRED" | "PENDING" | "SENT" | "DELIVERED" | "FAILED" = "CONFIGURATION_REQUIRED";
  let messageId: string | undefined = undefined;
  let errorMessage: string | undefined = undefined;

  if (!provider.isConfigured) {
    status = "CONFIGURATION_REQUIRED";
    errorMessage = "SMS Gateway requires AFRICAS_TALKING_API_KEY configuration in production environment.";
  } else {
    status = "PENDING";
    const result = await provider.send(canonicalPhone, messageBody);
    if (result.success) {
      status = "SENT";
      messageId = result.messageId;
      smsDedupCache.set(dedupKey, now);
    } else {
      status = "FAILED";
      errorMessage = result.error;
    }
  }

  // Persist notification record to Neon PostgreSQL
  let loggedId: string | undefined = undefined;
  try {
    const record = await prisma.sMSMessage.create({
      data: {
        businessId: businessId || null,
        recipientPhone: canonicalPhone,
        templateId,
        language,
        messageBody,
        provider: provider.name,
        status,
        providerMessageId: messageId,
        errorMessage,
        sentAt: status === "SENT" ? new Date() : null,
      },
    });
    loggedId = record.id;
  } catch (dbErr) {
    console.warn(`[SMS DB Logging Warning for ${maskPhone(canonicalPhone)}]:`, dbErr);
  }

  return {
    success: status === "SENT",
    status,
    provider: provider.name,
    messageId,
    messageBody,
    loggedId,
    error: errorMessage,
  };
}
