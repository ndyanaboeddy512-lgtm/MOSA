/**
 * MTN Rwanda Mobile Money SMS Parser & Simulator Utility
 * 
 * Accurately parses incoming telecom SMS notifications from MTN Rwanda (MTNMOMORW / 182)
 * in both Kinyarwanda and English formats.
 * 
 * Used by:
 * 1. MOSA MTN Payment Bridge Simulator
 * 2. Future MOSA Android Payment Bridge App / Webhook Forwarder
 */

export interface ParsedMtnMoMoSms {
  isValid: boolean;
  amount?: number;
  currency?: string;
  senderPhone?: string;
  senderName?: string;
  paymentReference?: string;
  providerTransactionRef?: string;
  balance?: number;
  rawText: string;
  parseError?: string;
}

export function parseMtnMoMoSms(smsText: string): ParsedMtnMoMoSms {
  if (!smsText || typeof smsText !== "string") {
    return { isValid: false, rawText: "", parseError: "Empty or invalid SMS text" };
  }

  const text = smsText.trim();
  const result: ParsedMtnMoMoSms = {
    isValid: false,
    currency: "RWF",
    rawText: text,
  };

  try {
    // 1. Extract Amount & Currency
    // Matches: "5,000 RWF", "5000 RWF", "5,000RWF", "5000FRW", "5000 Rwf"
    const amountMatch = text.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:RWF|FRW|Rwf)/i);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    // 2. Extract Sender Phone & Name
    // Format: "yavuye kuri 250788123456 (JEAN BAPTISTE)" or "from 250788123456 (JEAN BAPTISTE)"
    const senderMatch = text.match(/(?:yavuye kuri|from)\s+([0-9\+]+)(?:\s*\(([^)]+)\))?/i);
    if (senderMatch) {
      result.senderPhone = senderMatch[1].trim();
      if (senderMatch[2]) {
        result.senderName = senderMatch[2].trim();
      }
    }

    // Matches: "Ref: MOSA-REG-20261013-ABC12", "Ref: MOSA-REN-...", or standalone
    const refMatch = text.match(/(?:Ref(?:erence)?[:\s]+)?(MOSA-(?:REG|REN)-[A-Z0-9\-]+)/i);
    if (refMatch) {
      result.paymentReference = refMatch[1].toUpperCase().trim();
    }

    // 4. Extract Provider Transaction Reference / ID
    // Matches: "Id y'igikorwa: 10482910482", "Transaction ID: 10482910482", "Id: 10482910482", "TxId: ..."
    const txIdMatch = text.match(/(?:Id y'igikorwa|Transaction ID|TxId|Id)[:\s]+([0-9A-Za-z\-_]+)/i);
    if (txIdMatch) {
      result.providerTransactionRef = txIdMatch[1].trim();
    }

    // 5. Extract Balance (if available)
    const balanceMatch = text.match(/(?:asigaye ni|usigaranye ni|New balance:?)\s*(\d{1,3}(?:,\d{3})*|\d+)\s*RWF/i);
    if (balanceMatch) {
      result.balance = parseFloat(balanceMatch[1].replace(/,/g, ""));
    }

    // Validity check: Must have at least an amount and a transaction ID
    if (result.amount && result.amount > 0 && result.providerTransactionRef) {
      result.isValid = true;
    } else {
      result.parseError = "SMS did not contain required amount or provider transaction ID.";
    }

    return result;
  } catch (err: any) {
    return {
      isValid: false,
      rawText: text,
      parseError: err.message || "Failed to parse SMS.",
    };
  }
}

/**
 * Generates realistic MTN Rwanda MoMo SMS notifications for development testing and simulation.
 */
export function generateSimulatedMtnSms({
  amount,
  paymentReference,
  senderPhone = "+250788123456",
  senderName = "JEAN TEST OWNER",
  transactionId,
  language = "rw",
}: {
  amount: number;
  paymentReference?: string;
  senderPhone?: string;
  senderName?: string;
  transactionId?: string;
  language?: "rw" | "en";
}): { rawSms: string; transactionId: string } {
  const formattedAmount = Number(amount).toLocaleString();
  const txId = transactionId || `${Math.floor(10000000000 + Math.random() * 90000000000)}`;
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  const refPart = paymentReference ? ` Ref: ${paymentReference}.` : "";

  let rawSms = "";
  if (language === "rw") {
    rawSms = `Yello! Mwakiriye ${formattedAmount} RWF yavuye kuri ${senderPhone} (${senderName}) kuri ${dateStr}.${refPart} Umubare w'amafaranga asigaye ni 125,000 RWF. Id y'igikorwa: ${txId}.`;
  } else {
    rawSms = `You have received ${formattedAmount} RWF from ${senderPhone} (${senderName}) on ${dateStr}. Transaction ID: ${txId}.${refPart} New balance: 125,000 RWF.`;
  }

  return { rawSms, transactionId: txId };
}
