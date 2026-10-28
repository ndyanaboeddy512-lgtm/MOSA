/**
 * Automated Unit Tests for Airtel Money & eKash SMS Parsing and Settlement Validation
 * 
 * Uses clearly labeled SYNTHETIC FIXTURES (SIMULATED DATA).
 * Never treats SMS arrival or bridge HMAC alone as proof of settlement.
 * Validates strict isolation so MTN MoMo remains 100% untouched.
 */

import assert from "node:assert";
import test, { describe, it } from "node:test";
import {
  isAirtelSender,
  parseAirtelMoneySms,
  validateAirtelSettlementRule,
  generateSimulatedAirtelSms,
} from "./airtel-sms";
import { parseMtnMoMoSms } from "./momo-sms";

// =========================================================================
// SYNTHETIC TEST FIXTURES (CLEARLY LABELED SIMULATED DATA)
// =========================================================================

export const SYNTHETIC_FIXTURES = {
  // 1. Direct Airtel Money Kinyarwanda P2P
  AIRTEL_P2P_RW: {
    label: "[SIMULATED FIXTURE] Direct Airtel Rwanda P2P Transfer (Kinyarwanda)",
    sender: "AirtelMoney",
    rawText: "Mwakiriye 5,000 RWF yavuye kuri 250733123456 (JEAN BAPTISTE). Txn ID: AM261026.1234.SIM01. Impamvu: MOSA-REG-20261026-ABC12. Amafaranga asigaye ni 125,000 RWF.",
    expected: {
      isEkash: false,
      amount: 5000,
      currency: "RWF",
      senderPhone: "250733123456",
      senderName: "JEAN BAPTISTE",
      providerTransactionRef: "AM261026.1234.SIM01",
      paymentReference: "MOSA-REG-20261026-ABC12",
      balance: 125000,
    },
  },

  // 2. Direct Airtel Money English P2P
  AIRTEL_P2P_EN: {
    label: "[SIMULATED FIXTURE] Direct Airtel Rwanda P2P Transfer (English)",
    sender: "AirtelMoney",
    rawText: "You have received 5,000 RWF from 250733123456 (JEAN BAPTISTE) on your Airtel Money account. Txn ID: AM261026.1234.SIM02. Ref: MOSA-REG-20261026-ABC12. Your new balance is: 125,000 RWF.",
    expected: {
      isEkash: false,
      amount: 5000,
      currency: "RWF",
      senderPhone: "250733123456",
      senderName: "JEAN BAPTISTE",
      providerTransactionRef: "AM261026.1234.SIM02",
      paymentReference: "MOSA-REG-20261026-ABC12",
      balance: 125000,
    },
  },

  // 3. Airtel Merchant / Till Kinyarwanda
  AIRTEL_TILL_RW: {
    label: "[SIMULATED FIXTURE] Airtel Merchant Till Payment (Kinyarwanda)",
    sender: "AirtelMoney",
    rawText: "Mwakiriye amafaranga 5,000 RWF kuri Konti yawe ya Bucuruzi yavuye kuri 250733987654 (UWASE ALINE). Nimero y'icyemezo: AM261026.5432.C98765. Impamvu: MOSA-REG-20261026-ABC12. Balance: 135,000 RWF.",
    expected: {
      isEkash: false,
      amount: 5000,
      currency: "RWF",
      senderPhone: "250733987654",
      senderName: "UWASE ALINE",
      providerTransactionRef: "AM261026.5432.C98765",
      paymentReference: "MOSA-REG-20261026-ABC12",
      balance: 135000,
    },
  },

  // 4. eKash Interoperability (MTN MoMo to Airtel Money) Kinyarwanda
  EKASH_RW: {
    label: "[SIMULATED FIXTURE] eKash Cross-Network (MTN MoMo to Airtel Money - Kinyarwanda)",
    sender: "AirtelMoney",
    rawText: "eKash: Mwakiriye 5,000 RWF yavuye kuri 250788123456 (MUGABO ERIC) binyuze kuri MTN MoMo. Txn ID: EK261026.SIM03. Impamvu: MOSA-REG-20261026-ABC12. Amafaranga asigaye ni 130,000 RWF.",
    expected: {
      isEkash: true,
      amount: 5000,
      currency: "RWF",
      senderPhone: "250788123456",
      senderName: "MUGABO ERIC",
      providerTransactionRef: "EK261026.SIM03",
      paymentReference: "MOSA-REG-20261026-ABC12",
      balance: 130000,
    },
  },

  // 5. eKash Interoperability (MTN MoMo to Airtel Money) English
  EKASH_EN: {
    label: "[SIMULATED FIXTURE] eKash Cross-Network (MTN MoMo to Airtel Money - English)",
    sender: "AirtelMoney",
    rawText: "eKash: You have received 5,000 RWF from 250788123456 (MUGABO ERIC) via MTN MoMo. Txn ID: EK261026.SIM04. Ref: MOSA-REN-20261026-XYZ99. New balance: 130,000 RWF.",
    expected: {
      isEkash: true,
      amount: 5000,
      currency: "RWF",
      senderPhone: "250788123456",
      senderName: "MUGABO ERIC",
      providerTransactionRef: "EK261026.SIM04",
      paymentReference: "MOSA-REN-20261026-XYZ99",
      balance: 130000,
    },
  },

  // 6. Annual Renewal Reference Format
  AIRTEL_RENEWAL: {
    label: "[SIMULATED FIXTURE] Airtel Annual Renewal Reference (MOSA-REN-...)",
    sender: "AirtelMoney",
    rawText: "Mwakiriye 5,000 RWF yavuye kuri 250733555666 (HABIMANA PAUL). Id y'igikorwa: AM261026.9999.R0001. Reason: MOSA-REN-20261026-REN01. Amafaranga asigaye ni: 140,000 RWF.",
    expected: {
      isEkash: false,
      amount: 5000,
      currency: "RWF",
      senderPhone: "250733555666",
      senderName: "HABIMANA PAUL",
      providerTransactionRef: "AM261026.9999.R0001",
      paymentReference: "MOSA-REN-20261026-REN01",
      balance: 140000,
    },
  },

  // 7. Malformed / Fraudulent Underpayment
  UNDERPAYMENT_ATTEMPT: {
    label: "[SIMULATED FIXTURE] Underpayment Attempt (100 RWF instead of 5,000 RWF)",
    sender: "AirtelMoney",
    rawText: "Mwakiriye 100 RWF yavuye kuri 250733111222 (TEST USER). Txn ID: AM261026.UNDER01. Impamvu: MOSA-REG-20261026-ABC12. Amafaranga asigaye ni 100 RWF.",
    expectedAmount: 100,
  },
};

// =========================================================================
// TEST SUITES
// =========================================================================

describe("Airtel Money & eKash Offline SMS Parsing and Settlement Rules", () => {
  // SUITE 1: Direct Airtel Money Parsing
  describe("1. Direct Airtel Money Formats", () => {
    it("should accurately parse Kinyarwanda P2P transfer", () => {
      const parsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.AIRTEL_P2P_RW.rawText);
      assert.strictEqual(parsed.isValid, true);
      assert.strictEqual(parsed.isEkash, false);
      assert.strictEqual(parsed.amount, 5000);
      assert.strictEqual(parsed.currency, "RWF");
      assert.strictEqual(parsed.providerTransactionRef, "AM261026.1234.SIM01");
      assert.strictEqual(parsed.paymentReference, "MOSA-REG-20261026-ABC12");
      assert.strictEqual(parsed.senderPhone, "250733123456");
      assert.strictEqual(parsed.senderName, "JEAN BAPTISTE");
      assert.strictEqual(parsed.balance, 125000);
    });

    it("should accurately parse English P2P transfer", () => {
      const parsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.AIRTEL_P2P_EN.rawText);
      assert.strictEqual(parsed.isValid, true);
      assert.strictEqual(parsed.isEkash, false);
      assert.strictEqual(parsed.amount, 5000);
      assert.strictEqual(parsed.currency, "RWF");
      assert.strictEqual(parsed.providerTransactionRef, "AM261026.1234.SIM02");
      assert.strictEqual(parsed.paymentReference, "MOSA-REG-20261026-ABC12");
      assert.strictEqual(parsed.senderPhone, "250733123456");
      assert.strictEqual(parsed.senderName, "JEAN BAPTISTE");
      assert.strictEqual(parsed.balance, 125000);
    });

    it("should accurately parse Airtel Merchant Till payment", () => {
      const parsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.AIRTEL_TILL_RW.rawText);
      assert.strictEqual(parsed.isValid, true);
      assert.strictEqual(parsed.isEkash, false);
      assert.strictEqual(parsed.amount, 5000);
      assert.strictEqual(parsed.currency, "RWF");
      assert.strictEqual(parsed.providerTransactionRef, "AM261026.5432.C98765");
      assert.strictEqual(parsed.paymentReference, "MOSA-REG-20261026-ABC12");
      assert.strictEqual(parsed.senderPhone, "250733987654");
      assert.strictEqual(parsed.senderName, "UWASE ALINE");
      assert.strictEqual(parsed.balance, 135000);
    });

    it("should parse annual renewal references (MOSA-REN-...)", () => {
      const parsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.AIRTEL_RENEWAL.rawText);
      assert.strictEqual(parsed.isValid, true);
      assert.strictEqual(parsed.paymentReference, "MOSA-REN-20261026-REN01");
      assert.strictEqual(parsed.providerTransactionRef, "AM261026.9999.R0001");
      assert.strictEqual(parsed.amount, 5000);
    });
  });

  // SUITE 2: eKash Interoperability Parsing
  describe("2. eKash Interoperability Formats", () => {
    it("should accurately parse eKash Kinyarwanda cross-network notification and flag isEkash = true", () => {
      const parsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.EKASH_RW.rawText);
      assert.strictEqual(parsed.isValid, true);
      assert.strictEqual(parsed.isEkash, true);
      assert.strictEqual(parsed.amount, 5000);
      assert.strictEqual(parsed.currency, "RWF");
      assert.strictEqual(parsed.providerTransactionRef, "EK261026.SIM03");
      assert.strictEqual(parsed.paymentReference, "MOSA-REG-20261026-ABC12");
      assert.strictEqual(parsed.senderPhone, "250788123456");
      assert.strictEqual(parsed.senderName, "MUGABO ERIC");
    });

    it("should accurately parse eKash English cross-network notification and flag isEkash = true", () => {
      const parsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.EKASH_EN.rawText);
      assert.strictEqual(parsed.isValid, true);
      assert.strictEqual(parsed.isEkash, true);
      assert.strictEqual(parsed.amount, 5000);
      assert.strictEqual(parsed.currency, "RWF");
      assert.strictEqual(parsed.providerTransactionRef, "EK261026.SIM04");
      assert.strictEqual(parsed.paymentReference, "MOSA-REN-20261026-XYZ99");
      assert.strictEqual(parsed.senderPhone, "250788123456");
      assert.strictEqual(parsed.senderName, "MUGABO ERIC");
    });
  });

  // SUITE 3: Telecom Sender Whitelist
  describe("3. Telecom Sender Whitelist Verification", () => {
    it("should approve valid Airtel and eKash telecom sender origins", () => {
      assert.strictEqual(isAirtelSender("AirtelMoney"), true);
      assert.strictEqual(isAirtelSender("AIRTELMONEY"), true);
      assert.strictEqual(isAirtelSender("airtelmoney"), true);
      assert.strictEqual(isAirtelSender("Airtel-Money"), true);
      assert.strictEqual(isAirtelSender("Airtel"), true);
      assert.strictEqual(isAirtelSender("AirtelRwanda"), true);
      assert.strictEqual(isAirtelSender("182"), true);
      assert.strictEqual(isAirtelSender("eKash"), true);
      assert.strictEqual(isAirtelSender("RNDPS"), true);
    });

    it("should reject non-telecom, personal, spoofed, or unknown senders", () => {
      assert.strictEqual(isAirtelSender("+250788123456"), false);
      assert.strictEqual(isAirtelSender("0733123456"), false);
      assert.strictEqual(isAirtelSender("BANK_OF_KIGALI"), false);
      assert.strictEqual(isAirtelSender("SPAM_PROMO"), false);
      assert.strictEqual(isAirtelSender(""), false);
      assert.strictEqual(isAirtelSender(null), false);
      assert.strictEqual(isAirtelSender(undefined), false);
    });
  });

  // SUITE 4: Malformed Messages Handling
  describe("4. Malformed and Non-Financial Message Rejection", () => {
    it("should reject empty or whitespace text", () => {
      const parsed = parseAirtelMoneySms("");
      assert.strictEqual(parsed.isValid, false);
      assert.strictEqual(parsed.parseError, "Empty or invalid SMS text");
    });

    it("should reject non-financial marketing / personal text", () => {
      const parsed = parseAirtelMoneySms("Bwana/Madamu, koresha *182# ugure interineti ya 4G uyu munsi.");
      assert.strictEqual(parsed.isValid, false);
      assert.ok(parsed.parseError);
    });

    it("should reject SMS missing transaction ID", () => {
      const parsed = parseAirtelMoneySms("Mwakiriye 5,000 RWF yavuye kuri 250733123456. Ref: MOSA-REG-12345.");
      assert.strictEqual(parsed.isValid, false);
      assert.strictEqual(parsed.parseError, "SMS does not contain required amount or provider transaction ID.");
    });

    it("should reject SMS missing payment amount", () => {
      const parsed = parseAirtelMoneySms("Mwakiriye amafaranga yavuye kuri 250733123456. Txn ID: AM12345. Ref: MOSA-REG-12345.");
      assert.strictEqual(parsed.isValid, false);
    });
  });

  // SUITE 5: Zero-Trust Financial Settlement Gauntlet
  describe("5. Zero-Trust Settlement Rules & Security Gauntlet", () => {
    const validParsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.AIRTEL_P2P_RW.rawText);

    it("RULE 1: Approves settlement ONLY when all criteria are satisfied", () => {
      const result = validateAirtelSettlementRule({
        parsedSms: validParsed,
        expectedReference: "MOSA-REG-20261026-ABC12",
        expectedAmount: 5000,
        expectedCurrency: "RWF",
        existingTransactionIds: new Set(["PREVIOUS_TX_01", "PREVIOUS_TX_02"]),
        senderAddress: "AirtelMoney",
      });

      assert.strictEqual(result.isSettlementValid, true);
      assert.ok(result.settlementDetails);
      assert.strictEqual(result.settlementDetails?.amountPaid, 5000);
      assert.strictEqual(result.settlementDetails?.paymentReference, "MOSA-REG-20261026-ABC12");
      assert.strictEqual(result.settlementDetails?.providerTransactionRef, "AM261026.1234.SIM01");
    });

    it("RULE 2: Rejects untrusted sender origin", () => {
      const result = validateAirtelSettlementRule({
        parsedSms: validParsed,
        expectedReference: "MOSA-REG-20261026-ABC12",
        expectedAmount: 5000,
        senderAddress: "+250788000999", // Untrusted personal number
      });

      assert.strictEqual(result.isSettlementValid, false);
      assert.strictEqual(result.rejectionCode, "UNTRUSTED_SENDER");
    });

    it("RULE 3: Rejects unmatched reference (unsolicited payment protection)", () => {
      const result = validateAirtelSettlementRule({
        parsedSms: validParsed,
        expectedReference: "MOSA-REG-DIFFERENT-REF", // Mismatched reference
        expectedAmount: 5000,
        senderAddress: "AirtelMoney",
      });

      assert.strictEqual(result.isSettlementValid, false);
      assert.strictEqual(result.rejectionCode, "UNMATCHED_REFERENCE");
    });

    it("RULE 4: Rejects underpayment (fraud prevention)", () => {
      const underpaidParsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.UNDERPAYMENT_ATTEMPT.rawText);
      const result = validateAirtelSettlementRule({
        parsedSms: underpaidParsed,
        expectedReference: "MOSA-REG-20261026-ABC12",
        expectedAmount: 5000, // Fee is 5,000 RWF, but user only sent 100 RWF
        senderAddress: "AirtelMoney",
      });

      assert.strictEqual(result.isSettlementValid, false);
      assert.strictEqual(result.rejectionCode, "UNDERPAYMENT_DETECTED");
      assert.ok(result.rejectionReason?.includes("Underpayment: Received 100"));
    });

    it("RULE 5: Rejects duplicate transaction ID (replay attack prevention)", () => {
      const result = validateAirtelSettlementRule({
        parsedSms: validParsed,
        expectedReference: "MOSA-REG-20261026-ABC12",
        expectedAmount: 5000,
        // Transaction ID "AM261026.1234.SIM01" was already consumed previously:
        existingTransactionIds: new Set(["AM261026.1234.SIM01"]),
        senderAddress: "AirtelMoney",
      });

      assert.strictEqual(result.isSettlementValid, false);
      assert.strictEqual(result.rejectionCode, "DUPLICATE_TRANSACTION_ID");
      assert.ok(result.rejectionReason?.includes("was already consumed"));
    });
  });

  // SUITE 6: Proof of Settlement Invariant Test
  describe("6. Proof of Settlement Invariant Test", () => {
    it("MUST NEVER approve an SMS alone without expected pending record binding", () => {
      const parsed = parseAirtelMoneySms(SYNTHETIC_FIXTURES.AIRTEL_P2P_RW.rawText);
      // Passing no expected payment reference simulates raw SMS arrival without backend match
      const result = validateAirtelSettlementRule({
        parsedSms: parsed,
        expectedReference: undefined, // No pending payment record
      });

      assert.strictEqual(result.isSettlementValid, false);
      assert.strictEqual(result.rejectionCode, "MISSING_EXPECTED_PAYMENT");
    });
  });

  // SUITE 7: Strict MTN MoMo Isolation Verification
  describe("7. Strict MTN MoMo Isolation Verification", () => {
    it("existing MTN parser (momo-sms.ts) must remain 100% functional and unmodified", () => {
      const mtnSample =
        "Yello! Mwakiriye 5,000 RWF yavuye kuri +250788123456 (JEAN BAPTISTE) kuri 26/10/2026. Ref: MOSA-REG-20261026-ABC12. Umubare w'amafaranga asigaye ni 125,000 RWF. Id y'igikorwa: 10482910482.";
      const mtnParsed = parseMtnMoMoSms(mtnSample);

      assert.strictEqual(mtnParsed.isValid, true);
      assert.strictEqual(mtnParsed.amount, 5000);
      assert.strictEqual(mtnParsed.currency, "RWF");
      assert.strictEqual(mtnParsed.paymentReference, "MOSA-REG-20261026-ABC12");
      assert.strictEqual(mtnParsed.providerTransactionRef, "10482910482");
      assert.strictEqual(mtnParsed.senderPhone, "+250788123456");
      assert.strictEqual(mtnParsed.senderName, "JEAN BAPTISTE");
    });
  });
});
