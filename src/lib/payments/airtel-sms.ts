/**
 * Airtel Money & eKash Rwanda SMS Parser & Simulator Utility
 * 
 * Accurately parses incoming telecom SMS notifications for:
 * 1. Direct Airtel Money Rwanda transfers (P2P, Cash-In, Merchant Till)
 * 2. eKash Cross-Network interoperable transfers (e.g., MTN MoMo to Airtel Money)
 * In both Kinyarwanda and English formats.
 * 
 * Safety & Isolation:
 * - Completely isolated from MTN MoMo parsing logic (momo-sms.ts).
 * - Enforces zero-trust financial settlement validation.
 * - An incoming SMS or HMAC signature alone is NEVER treated as proof of settlement.
 */

export interface ParsedAirtelSms {
  isValid: boolean;
  isEkash: boolean;
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

export interface SettlementValidationParams {
  parsedSms: ParsedAirtelSms;
  expectedReference?: string;
  expectedAmount?: number;
  expectedCurrency?: string;
  existingTransactionIds?: string[] | Set<string>;
  senderAddress?: string;
}

export interface SettlementValidationResult {
  isSettlementValid: boolean;
  rejectionCode?:
    | "MALFORMED_SMS"
    | "UNTRUSTED_SENDER"
    | "UNMATCHED_REFERENCE"
    | "UNDERPAYMENT_DETECTED"
    | "INVALID_CURRENCY"
    | "DUPLICATE_TRANSACTION_ID"
    | "MISSING_EXPECTED_PAYMENT";
  rejectionReason?: string;
  settlementDetails?: {
    paymentReference: string;
    providerTransactionRef: string;
    amountPaid: number;
    currency: string;
    senderPhone?: string;
    isEkash: boolean;
  };
}

/**
 * Validates whether the SMS originating address belongs to official Airtel Rwanda or eKash gateways.
 * Drops personal, marketing, or untrusted SMS.
 */
export function isAirtelSender(originatingAddress?: string | null): boolean {
  if (!originatingAddress || typeof originatingAddress !== "string") return false;
  const clean = originatingAddress.trim().toUpperCase();

  // Official alphanumeric sender IDs and shortcodes in Rwanda
  const allowed = [
    "AIRTELMONEY",
    "AIRTEL-MONEY",
    "AIRTEL",
    "AIRTELRWANDA",
    "182",
    "EKASH",
    "RNDPS",
  ];

  return allowed.includes(clean) || clean.endsWith("182");
}

/**
 * Parses raw SMS text received from Airtel Rwanda or eKash.
 */
export function parseAirtelMoneySms(smsText: string): ParsedAirtelSms {
  if (!smsText || typeof smsText !== "string") {
    return { isValid: false, isEkash: false, rawText: "", parseError: "Empty or invalid SMS text" };
  }

  const text = smsText.trim();
  const isEkash = /^eKash[:\s]/i.test(text) || /binyuze kuri MTN|via MTN/i.test(text);

  const result: ParsedAirtelSms = {
    isValid: false,
    isEkash,
    currency: "RWF",
    rawText: text,
  };

  try {
    // 1. Extract Amount & Currency
    // Matches formats:
    // - "5,000 RWF", "5000 RWF", "5000.00 RWF", "5,000.00 RWF", "5000FRW", "5000 Rwf"
    // - "amafaranga 5,000 RWF"
    const amountMatch = text.match(/(?:amafaranga\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:RWF|FRW|Rwf)/i);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    // 2. Extract Sender Phone & Optional Name
    // Matches:
    // - "yavuye kuri 250733123456 (JEAN BAPTISTE)"
    // - "kuri JEAN BAPTISTE (250733123456)"
    // - "from 250733123456 (JEAN BAPTISTE)"
    // - "from JEAN BAPTISTE (250733123456)"
    // - "yavuye kuri 0733123456"
    const senderPattern1 = /(?:yavuye kuri|from)\s+([0-9\+]+)(?:\s*\(([^)]+)\))?/i;
    const senderPattern2 = /(?:yavuye kuri|from|kuri)\s+([A-Za-z\s]+)\s*\(([0-9\+]+)\)/i;

    const match1 = text.match(senderPattern1);
    const match2 = text.match(senderPattern2);

    if (match1) {
      result.senderPhone = match1[1].trim();
      if (match1[2]) {
        result.senderName = match1[2].trim();
      }
    } else if (match2) {
      result.senderName = match2[1].trim();
      result.senderPhone = match2[2].trim();
    }

    // 3. Extract MOSA Payment Reference (Registration or Renewal)
    // Matches:
    // - "Impamvu: MOSA-REG-20261026-ABC12"
    // - "Ref: MOSA-REG-..."
    // - "Reference: MOSA-REG-..."
    // - "Reason: MOSA-REN-..."
    // - Standalone: "MOSA-REG-..." or "MOSA-REN-..."
    const refMatch = text.match(/(?:(?:Ref(?:erence)?|Impamvu|Reason)[:\s]+)?(MOSA-(?:REG|REN)-[A-Z0-9\-]+)/i);
    if (refMatch) {
      result.paymentReference = refMatch[1].replace(/[\.,;:!]+$/, "").toUpperCase().trim();
    }

    // 4. Extract Provider Transaction Reference / ID
    // Matches:
    // - "Txn ID: AM261026.1234.A12345"
    // - "Nimero y'icyemezo: AM..."
    // - "Id y'igikorwa: AM..."
    // - "Transaction ID: AM..."
    // - "TxId: AM..."
    // - "Financial Transaction Id: AM..."
    const txIdMatch = text.match(
      /(?:Txn\s*ID|Transaction\s*ID|Nimero\s*y['']icyemezo|Id\s*y['']igikorwa|TxId|Financial\s*Transaction\s*Id)[:\s]+([0-9A-Za-z\.\-_]+)/i
    );
    if (txIdMatch) {
      result.providerTransactionRef = txIdMatch[1].replace(/[\.,;:!]+$/, "").trim();
    }

    // 5. Extract Account Balance (if present)
    // Matches:
    // - "Amafaranga asigaye ni: 125,000 RWF"
    // - "New balance: 125,000 RWF"
    // - "Balance yawe nshya ni 125,000 RWF"
    // - "Balance: 125,000 RWF"
    const balanceMatch = text.match(
      /(?:Amafaranga asigaye ni|Balance yawe nshya ni|Your new balance(?:\s*is)?|New balance|Balance)[:\s]+(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*RWF/i
    );
    if (balanceMatch) {
      result.balance = parseFloat(balanceMatch[1].replace(/,/g, ""));
    }

    // Strict Syntax Validity:
    // Must possess valid amount > 0, currency, and provider transaction identifier
    if (result.amount && result.amount > 0 && result.providerTransactionRef) {
      result.isValid = true;
    } else {
      result.parseError = "SMS does not contain required amount or provider transaction ID.";
    }

    return result;
  } catch (err: any) {
    return {
      isValid: false,
      isEkash,
      rawText: text,
      parseError: err.message || "Failed to parse Airtel SMS.",
    };
  }
}

/**
 * Validates the full financial settlement conditions for an incoming Airtel Money transaction.
 * 
 * CORE SETTLEMENT RULE:
 * An SMS arrival or bridge HMAC alone is NEVER treated as proof of settlement.
 * It must fulfill:
 * 1. Syntax validity
 * 2. Whitelisted telecom sender
 * 3. Exact matching of a pending MOSA reference
 * 4. Amount >= expected registration/renewal fee
 * 5. Currency must be RWF
 * 6. Transaction ID must not be previously consumed
 */
export function validateAirtelSettlementRule({
  parsedSms,
  expectedReference,
  expectedAmount = 5000,
  expectedCurrency = "RWF",
  existingTransactionIds,
  senderAddress,
}: SettlementValidationParams): SettlementValidationResult {
  // 1. Syntax validation
  if (!parsedSms.isValid || !parsedSms.amount || !parsedSms.providerTransactionRef) {
    return {
      isSettlementValid: false,
      rejectionCode: "MALFORMED_SMS",
      rejectionReason: parsedSms.parseError || "SMS payload is malformed or missing transaction details.",
    };
  }

  // 2. Sender origin verification
  if (senderAddress && !isAirtelSender(senderAddress)) {
    return {
      isSettlementValid: false,
      rejectionCode: "UNTRUSTED_SENDER",
      rejectionReason: `SMS sender "${senderAddress}" is not an authorized Airtel/eKash telecom origin.`,
    };
  }

  // 3. Expected payment binding
  if (!expectedReference) {
    return {
      isSettlementValid: false,
      rejectionCode: "MISSING_EXPECTED_PAYMENT",
      rejectionReason: "No expected payment reference provided for settlement reconciliation.",
    };
  }

  if (!parsedSms.paymentReference || parsedSms.paymentReference !== expectedReference.trim().toUpperCase()) {
    return {
      isSettlementValid: false,
      rejectionCode: "UNMATCHED_REFERENCE",
      rejectionReason: `Transaction reference "${parsedSms.paymentReference || "NONE"}" does not match expected pending payment "${expectedReference}".`,
    };
  }

  // 4. Currency check
  if (parsedSms.currency !== expectedCurrency) {
    return {
      isSettlementValid: false,
      rejectionCode: "INVALID_CURRENCY",
      rejectionReason: `Currency "${parsedSms.currency}" does not match required "${expectedCurrency}".`,
    };
  }

  // 5. Underpayment check
  if (parsedSms.amount < expectedAmount) {
    return {
      isSettlementValid: false,
      rejectionCode: "UNDERPAYMENT_DETECTED",
      rejectionReason: `Underpayment: Received ${parsedSms.amount} ${parsedSms.currency}, but required fee is ${expectedAmount} ${expectedCurrency}.`,
    };
  }

  // 6. Duplicate transaction check
  const txId = parsedSms.providerTransactionRef;
  const isDuplicate = existingTransactionIds instanceof Set
    ? existingTransactionIds.has(txId)
    : Array.isArray(existingTransactionIds)
    ? existingTransactionIds.includes(txId)
    : false;

  if (isDuplicate) {
    return {
      isSettlementValid: false,
      rejectionCode: "DUPLICATE_TRANSACTION_ID",
      rejectionReason: `Telecom transaction ID "${txId}" was already consumed in a prior settlement. Replay rejected.`,
    };
  }

  // All criteria satisfied: Verified Settlement
  return {
    isSettlementValid: true,
    settlementDetails: {
      paymentReference: parsedSms.paymentReference,
      providerTransactionRef: parsedSms.providerTransactionRef,
      amountPaid: parsedSms.amount,
      currency: parsedSms.currency || "RWF",
      senderPhone: parsedSms.senderPhone,
      isEkash: parsedSms.isEkash,
    },
  };
}

/**
 * Generates synthetic, clearly labeled Airtel Money & eKash SMS notifications
 * for development, unit testing, and offline simulator fixtures.
 */
export function generateSimulatedAirtelSms({
  amount,
  paymentReference,
  senderPhone = "+250733123456",
  senderName = "JEAN TEST OWNER",
  transactionId,
  isEkash = false,
  language = "rw",
}: {
  amount: number;
  paymentReference?: string;
  senderPhone?: string;
  senderName?: string;
  transactionId?: string;
  isEkash?: boolean;
  language?: "rw" | "en";
}): { rawSms: string; transactionId: string } {
  const formattedAmount = Number(amount).toLocaleString();
  const txId = transactionId || (isEkash ? `EK${Date.now().toString().slice(-8)}` : `AM${Date.now().toString().slice(-8)}`);
  const refPart = paymentReference ? ` Impamvu: ${paymentReference}.` : "";
  const refPartEn = paymentReference ? ` Ref: ${paymentReference}.` : "";

  let rawSms = "";
  if (isEkash) {
    if (language === "rw") {
      rawSms = `eKash: Mwakiriye ${formattedAmount} RWF yavuye kuri ${senderPhone} (${senderName}) binyuze kuri MTN MoMo. Txn ID: ${txId}.${refPart} Amafaranga asigaye ni 125,000 RWF.`;
    } else {
      rawSms = `eKash: You have received ${formattedAmount} RWF from ${senderPhone} (${senderName}) via MTN MoMo. Txn ID: ${txId}.${refPartEn} New balance: 125,000 RWF.`;
    }
  } else {
    if (language === "rw") {
      rawSms = `Mwakiriye ${formattedAmount} RWF yavuye kuri ${senderPhone} (${senderName}). Txn ID: ${txId}.${refPart} Amafaranga asigaye ni 125,000 RWF.`;
    } else {
      rawSms = `You have received ${formattedAmount} RWF from ${senderPhone} (${senderName}) on your Airtel Money account. Txn ID: ${txId}.${refPartEn} Your new balance is: 125,000 RWF.`;
    }
  }

  return { rawSms, transactionId: txId };
}
