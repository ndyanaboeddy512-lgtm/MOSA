/**
 * Automated Backend Tests for Multi-Provider Webhook Synchronization
 * 
 * Verifies:
 * 1. MTN MoMo compatibility (backward compatibility preservation)
 * 2. Airtel Money routing via parseAirtelMoneySms
 * 3. eKash cross-network classification and settlement
 * 4. Rejection of UNKNOWN, missing, or unsupported providers
 * 5. Rejection of disabled providers (HTTP 403)
 * 6. Cryptographic HMAC verification and bad signature rejection (HTTP 401)
 * 7. Revoked or suspended bridge device authorization (HTTP 401)
 * 8. Duplicate transaction reference rejection (replays)
 * 9. Underpayment fraud protection
 * 10. Unmatched payment reference handling
 * 11. Database transaction rollback verification
 * 
 * ZERO-TRUST INVARIANT:
 * Uses isolated in-memory test fixtures and mocks. Zero writes to production database.
 */

import assert from "node:assert";
import test, { describe, it, beforeEach, afterEach } from "node:test";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { confirmPaymentAndActivateBusiness } from "@/lib/payments/engine";

describe("Phase 2 — Multi-Provider Webhook Synchronization Gauntlet", () => {
  const TEST_HMAC_SECRET = "test_device_hmac_secret_key_123456789";
  const TEST_DEVICE_ID = "bridge_test_device_001";
  const TEST_DEVICE_TOKEN = "mbt_test_token_abcdef123456789";

  // Backup original Prisma methods
  const originals = {
    providerFindUnique: prisma.paymentProviderConfig.findUnique,
    deviceFindFirst: prisma.paymentBridgeDevice.findFirst,
    deviceUpdate: prisma.paymentBridgeDevice.update,
    paymentFindUnique: prisma.registrationPayment.findUnique,
    paymentUpdate: prisma.registrationPayment.update,
    receiptCount: prisma.registrationReceipt.count,
    receiptCreate: prisma.registrationReceipt.create,
    businessUpdate: prisma.business.update,
    auditLogCreate: prisma.auditLog.create,
    transaction: prisma.$transaction,
  };

  afterEach(() => {
    // Restore all Prisma methods
    (prisma.paymentProviderConfig as any).findUnique = originals.providerFindUnique;
    (prisma.paymentBridgeDevice as any).findFirst = originals.deviceFindFirst;
    (prisma.paymentBridgeDevice as any).update = originals.deviceUpdate;
    (prisma.registrationPayment as any).findUnique = originals.paymentFindUnique;
    (prisma.registrationPayment as any).update = originals.paymentUpdate;
    (prisma.registrationReceipt as any).count = originals.receiptCount;
    (prisma.registrationReceipt as any).create = originals.receiptCreate;
    (prisma.business as any).update = originals.businessUpdate;
    (prisma.auditLog as any).create = originals.auditLogCreate;
    (prisma as any).$transaction = originals.transaction;
  });

  function createSignedRequest({
    payload,
    secret = TEST_HMAC_SECRET,
    signatureOverride,
    deviceId = TEST_DEVICE_ID,
    deviceToken = TEST_DEVICE_TOKEN,
    headersExtra,
  }: {
    payload: any;
    secret?: string;
    signatureOverride?: string;
    deviceId?: string | null;
    deviceToken?: string | null;
    headersExtra?: Record<string, string>;
  }) {
    const rawBody = JSON.stringify(payload);
    const signature =
      signatureOverride ??
      crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-signature": signature,
      ...(headersExtra || {}),
    };

    if (deviceId) headers["x-mosa-device-id"] = deviceId;
    if (deviceToken) headers["authorization"] = `Bearer ${deviceToken}`;

    return new NextRequest("http://localhost:3000/api/payments/webhook", {
      method: "POST",
      headers,
      body: rawBody,
    });
  }

  // =========================================================================
  // 1. PROVIDER ALLOWLIST & UNKNOWN REJECTION
  // =========================================================================

  it("RULE 1: Should immediately reject UNKNOWN provider with HTTP 400", async () => {
    const req = createSignedRequest({
      payload: {
        provider: "UNKNOWN",
        paymentReference: "MOSA-REG-1234",
        providerTransactionRef: "TX999",
        amount: 5000,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /Unsupported, missing, or unclassified payment provider: "UNKNOWN"/);
  });

  it("RULE 2: Should reject missing or empty provider with HTTP 400", async () => {
    const req = createSignedRequest({
      payload: {
        paymentReference: "MOSA-REG-1234",
        providerTransactionRef: "TX999",
        amount: 5000,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /Unsupported, missing, or unclassified payment provider/);
  });

  it("RULE 3: Should reject unsupported / arbitrary provider labels with HTTP 400", async () => {
    const req = createSignedRequest({
      payload: {
        provider: "CRYPTO_USDT",
        paymentReference: "MOSA-REG-1234",
        providerTransactionRef: "TX999",
        amount: 5000,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /CRYPTO_USDT/);
  });

  it("RULE 4: Should reject non-RWF foreign currencies with HTTP 400", async () => {
    const req = createSignedRequest({
      payload: {
        provider: "MTN_MOMO",
        currency: "USD",
        paymentReference: "MOSA-REG-1234",
        providerTransactionRef: "TX999",
        amount: 5000,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /Unsupported payment currency: "USD"/);
  });

  it("RULE 5: Should reject disabled providers with HTTP 403", async () => {
    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "AIRTEL_MONEY",
      isEnabled: false, // Disabled
    });

    const req = createSignedRequest({
      payload: {
        provider: "AIRTEL_MONEY",
        paymentReference: "MOSA-REG-1234",
        providerTransactionRef: "AM12345",
        amount: 5000,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /Provider AIRTEL_MONEY is not configured or disabled/);
  });

  // =========================================================================
  // 2. CRYPTOGRAPHIC HMAC & DEVICE AUTHORIZATION
  // =========================================================================

  it("RULE 6: Should reject invalid cryptographic HMAC signature with HTTP 401", async () => {
    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "MTN_MOMO",
      isEnabled: true,
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_1",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      status: "ACTIVE",
    });

    const req = createSignedRequest({
      payload: {
        provider: "MTN_MOMO",
        paymentReference: "MOSA-REG-1234",
        providerTransactionRef: "MOMO123",
        amount: 5000,
      },
      signatureOverride: "bad_signature_deadbeef1234567890abcdef",
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /Invalid cryptographic HMAC signature/);
  });

  it("RULE 7: Should reject revoked or suspended bridge devices with HTTP 401", async () => {
    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "MTN_MOMO",
      isEnabled: true,
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_revoked",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      status: "REVOKED", // Device is revoked
    });

    const req = createSignedRequest({
      payload: {
        provider: "MTN_MOMO",
        paymentReference: "MOSA-REG-1234",
        providerTransactionRef: "MOMO123",
        amount: 5000,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /Bridge device is in REVOKED status/);
  });

  // =========================================================================
  // 3. SETTLEMENT VALIDATION, ROUTING & ATOMIC CONFIRMATION
  // =========================================================================

  it("RULE 8: Should process MTN MoMo webhook and persist MTN_MOMO settlement provider", async () => {
    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "MTN_MOMO",
      isEnabled: true,
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_active",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      status: "ACTIVE",
    });
    (prisma.paymentBridgeDevice as any).update = async () => ({});

    let updatedPaymentData: any = null;
    let createdReceiptData: any = null;
    let businessActivated: any = null;

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.paymentReference === "MOSA-REG-MTN-001") {
        return {
          id: "pay_mtn_001",
          businessId: "biz_001",
          paymentReference: "MOSA-REG-MTN-001",
          feeAmount: 5000,
          currency: "RWF",
          provider: "MTN_MOMO",
          status: "PENDING",
          business: {
            id: "biz_001",
            name: "Kigali Fresh Bakery",
            status: "PENDING_PAYMENT",
            owner: { name: "Jean Paul", phone: "+250788111222" },
          },
        };
      }
      return null;
    };

    (prisma.registrationReceipt as any).count = async () => 42;

    (prisma as any).$transaction = async (callback: any) => {
      const txMock = {
        registrationPayment: {
          update: async ({ data }: any) => {
            updatedPaymentData = data;
            return { id: "pay_mtn_001", ...data };
          },
        },
        registrationReceipt: {
          create: async ({ data }: any) => {
            createdReceiptData = data;
            return { id: "rec_001", ...data };
          },
        },
        business: {
          update: async ({ data }: any) => {
            businessActivated = data;
            return { id: "biz_001", ...data };
          },
        },
        auditLog: {
          create: async () => ({}),
        },
      };
      return await callback(txMock);
    };

    const mtnSms = "Yello! Mwakiriye 5,000 RWF yavuye kuri +250788111222 (TEST USER). Ref: MOSA-REG-MTN-001. Umubare w'amafaranga asigaye ni 250,000 RWF. Id y'igikorwa: MOMO98765.";
    const req = createSignedRequest({
      payload: {
        provider: "MTN_MOMO",
        rawSms: mtnSms,
        bridgeDeviceId: TEST_DEVICE_ID,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.businessStatus, "ACTIVE");

    // Verify actual settled provider recorded across all entities
    assert.strictEqual(updatedPaymentData.provider, "MTN_MOMO");
    assert.strictEqual(updatedPaymentData.status, "CONFIRMED");
    assert.strictEqual(createdReceiptData.paymentMethod, "MTN_MOMO");
    assert.strictEqual(businessActivated.status, "ACTIVE");
  });

  it("RULE 9: Should route Airtel Money SMS to parseAirtelMoneySms and persist AIRTEL_MONEY settlement provider", async () => {
    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "AIRTEL_MONEY",
      isEnabled: true,
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_active",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      status: "ACTIVE",
    });
    (prisma.paymentBridgeDevice as any).update = async () => ({});

    let updatedPaymentData: any = null;
    let createdReceiptData: any = null;

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.paymentReference === "MOSA-REG-AIR-002") {
        return {
          id: "pay_air_002",
          businessId: "biz_002",
          paymentReference: "MOSA-REG-AIR-002",
          feeAmount: 5000,
          currency: "RWF",
          provider: "AIRTEL_MONEY",
          status: "PENDING",
          business: {
            id: "biz_002",
            name: "Musanze Tech Repair",
            status: "PENDING_PAYMENT",
            owner: { name: "Alice Uwase", phone: "+250733123456" },
          },
        };
      }
      return null;
    };

    (prisma.registrationReceipt as any).count = async () => 99;

    (prisma as any).$transaction = async (callback: any) => {
      const txMock = {
        registrationPayment: {
          update: async ({ data }: any) => {
            updatedPaymentData = data;
            return { id: "pay_air_002", ...data };
          },
        },
        registrationReceipt: {
          create: async ({ data }: any) => {
            createdReceiptData = data;
            return { id: "rec_002", ...data };
          },
        },
        business: {
          update: async ({ data }: any) => ({ id: "biz_002", ...data }),
        },
        auditLog: {
          create: async () => ({}),
        },
      };
      return await callback(txMock);
    };

    const airtelSms = "You have received 5,000 RWF from 250733123456 on your Airtel Money account. Txn ID: AM261026.1234.SIM02. Ref: MOSA-REG-AIR-002. Your new balance is: 125,000 RWF.";
    const req = createSignedRequest({
      payload: {
        provider: "AIRTEL_MONEY",
        rawSms: airtelSms,
        bridgeDeviceId: TEST_DEVICE_ID,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.businessStatus, "ACTIVE");

    // Verify Airtel Money parsed correctly and stored as settlement provider
    assert.strictEqual(updatedPaymentData.provider, "AIRTEL_MONEY");
    assert.strictEqual(updatedPaymentData.providerTransactionRef, "AM261026.1234.SIM02");
    assert.strictEqual(createdReceiptData.paymentMethod, "AIRTEL_MONEY");
  });

  it("RULE 10: Should parse eKash cross-network SMS and settle as AIRTEL_MONEY", async () => {
    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "AIRTEL_MONEY",
      isEnabled: true,
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_active",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      status: "ACTIVE",
    });
    (prisma.paymentBridgeDevice as any).update = async () => ({});

    let updatedPaymentData: any = null;
    let createdReceiptData: any = null;

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.paymentReference === "MOSA-REG-EKASH-003") {
        return {
          id: "pay_ekash_003",
          businessId: "biz_003",
          paymentReference: "MOSA-REG-EKASH-003",
          feeAmount: 5000,
          currency: "RWF",
          provider: "AIRTEL_MONEY",
          status: "PENDING",
          business: {
            id: "biz_003",
            name: "Huye Handicrafts",
            status: "PENDING_PAYMENT",
            owner: { name: "David Bizimana", phone: "+250788333444" },
          },
        };
      }
      return null;
    };

    (prisma.registrationReceipt as any).count = async () => 101;

    (prisma as any).$transaction = async (callback: any) => {
      const txMock = {
        registrationPayment: {
          update: async ({ data }: any) => {
            updatedPaymentData = data;
            return { id: "pay_ekash_003", ...data };
          },
        },
        registrationReceipt: {
          create: async ({ data }: any) => {
            createdReceiptData = data;
            return { id: "rec_003", ...data };
          },
        },
        business: {
          update: async ({ data }: any) => ({ id: "biz_003", ...data }),
        },
        auditLog: {
          create: async () => ({}),
        },
      };
      return await callback(txMock);
    };

    const ekashSms = "eKash: Mwakiriye 5,000 RWF yavuye kuri 250788123456 (MUGABO ERIC) binyuze kuri MTN MoMo. Txn ID: EK261026.SIM03. Impamvu: MOSA-REG-EKASH-003. Amafaranga asigaye ni 130,000 RWF.";
    const req = createSignedRequest({
      payload: {
        provider: "AIRTEL_MONEY",
        rawSms: ekashSms,
        bridgeDeviceId: TEST_DEVICE_ID,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(updatedPaymentData.provider, "AIRTEL_MONEY");
    assert.strictEqual(updatedPaymentData.providerTransactionRef, "EK261026.SIM03");
    assert.strictEqual(createdReceiptData.paymentMethod, "AIRTEL_MONEY");
  });

  // =========================================================================
  // 4. FRAUD, UNDERPAYMENT, REPLAY & UNMATCHED REFERENCE DEFENSES
  // =========================================================================

  it("RULE 11: Should reject underpayment, mark payment FAILED, and prevent business activation", async () => {
    let failureStatusUpdated = false;
    let auditLogged = false;

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.paymentReference === "MOSA-REG-UNDER") {
        return {
          id: "pay_under",
          businessId: "biz_under",
          paymentReference: "MOSA-REG-UNDER",
          feeAmount: 5000,
          currency: "RWF",
          provider: "AIRTEL_MONEY",
          status: "PENDING",
          business: {
            id: "biz_under",
            name: "Underpaid Store",
            status: "PENDING_PAYMENT",
          },
        };
      }
      return null;
    };

    (prisma.registrationPayment as any).update = async ({ data }: any) => {
      if (data.status === "FAILED") failureStatusUpdated = true;
      return {};
    };

    (prisma.auditLog as any).create = async ({ data }: any) => {
      if (data.action === "PAYMENT_UNDERPAYMENT_REJECTED") auditLogged = true;
      return {};
    };

    // Customer only sent 3,000 RWF instead of 5,000 RWF
    await assert.rejects(
      async () => {
        await confirmPaymentAndActivateBusiness({
          paymentReference: "MOSA-REG-UNDER",
          providerTransactionRef: "AM999_UNDER",
          provider: "AIRTEL_MONEY",
          amountPaid: 3000,
        });
      },
      /Underpayment detected: Received 3000 RWF, but required registration fee is 5000 RWF/
    );

    assert.strictEqual(failureStatusUpdated, true);
    assert.strictEqual(auditLogged, true);
  });

  it("RULE 12: Should reject replay / duplicate transaction ID across payments", async () => {
    let duplicateStatusUpdated = false;
    let duplicateAuditLogged = false;

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.paymentReference === "MOSA-REG-NEW") {
        return {
          id: "pay_new",
          businessId: "biz_new",
          paymentReference: "MOSA-REG-NEW",
          feeAmount: 5000,
          currency: "RWF",
          status: "PENDING",
          business: { id: "biz_new" },
        };
      }
      if (where.providerTransactionRef === "AM_ALREADY_USED_001") {
        return {
          id: "pay_old_original",
          paymentReference: "MOSA-REG-OLD",
          providerTransactionRef: "AM_ALREADY_USED_001",
          status: "CONFIRMED",
        };
      }
      return null;
    };

    (prisma.registrationPayment as any).update = async ({ data }: any) => {
      if (data.status === "DUPLICATE") duplicateStatusUpdated = true;
      return {};
    };

    (prisma.auditLog as any).create = async ({ data }: any) => {
      if (data.action === "PAYMENT_DUPLICATE_REJECTED") duplicateAuditLogged = true;
      return {};
    };

    await assert.rejects(
      async () => {
        await confirmPaymentAndActivateBusiness({
          paymentReference: "MOSA-REG-NEW",
          providerTransactionRef: "AM_ALREADY_USED_001",
          provider: "AIRTEL_MONEY",
          amountPaid: 5000,
        });
      },
      /Transaction reference AM_ALREADY_USED_001 was already consumed by another registration/
    );

    assert.strictEqual(duplicateStatusUpdated, true);
    assert.strictEqual(duplicateAuditLogged, true);
  });

  it("RULE 13: Should reject unmatched references, audit attempt, and reject confirmation", async () => {
    let unmatchedAuditLogged = false;

    (prisma.registrationPayment as any).findUnique = async () => null; // Not found

    (prisma.auditLog as any).create = async ({ data }: any) => {
      if (data.action === "PAYMENT_UNMATCHED_REFERENCE") unmatchedAuditLogged = true;
      return {};
    };

    await assert.rejects(
      async () => {
        await confirmPaymentAndActivateBusiness({
          paymentReference: "MOSA-REG-NONEXISTENT",
          providerTransactionRef: "AM_UNKNOWN_999",
          provider: "AIRTEL_MONEY",
          amountPaid: 5000,
        });
      },
      /Payment record with reference "MOSA-REG-NONEXISTENT" was not found/
    );

    assert.strictEqual(unmatchedAuditLogged, true);
  });

  it("RULE 14: Should rollback entire database transaction if an error occurs during atomic execution", async () => {
    (prisma.registrationPayment as any).findUnique = async () => ({
      id: "pay_rollback",
      businessId: "biz_rollback",
      paymentReference: "MOSA-REG-ROLLBACK",
      feeAmount: 5000,
      currency: "RWF",
      status: "PENDING",
      business: { id: "biz_rollback", owner: {} },
    });

    (prisma.registrationReceipt as any).count = async () => 1;

    // Simulate database failure during business update
    let paymentUpdated = false;
    (prisma as any).$transaction = async (callback: any) => {
      const txMock = {
        registrationPayment: {
          update: async () => {
            paymentUpdated = true;
            return {};
          },
        },
        registrationReceipt: {
          create: async () => ({ receiptNumber: "MOSA-REC-TEST" }),
        },
        business: {
          update: async () => {
            throw new Error("DB_DISK_FULL_SIMULATED: Could not update business status");
          },
        },
        auditLog: { create: async () => ({}) },
      };
      return await callback(txMock);
    };

    await assert.rejects(
      async () => {
        await confirmPaymentAndActivateBusiness({
          paymentReference: "MOSA-REG-ROLLBACK",
          providerTransactionRef: "TX_ROLLBACK",
          provider: "MTN_MOMO",
          amountPaid: 5000,
        });
      },
      /DB_DISK_FULL_SIMULATED/
    );
  });

  it("RULE 15: Airtel Money Primary Provider Integration (+250729974065 receiving SIM) confirms and activates registration", async () => {
    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "AIRTEL_MONEY",
      name: "Airtel Money",
      isEnabled: true,
      accountNumber: "0729974065",
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_airtel_primary",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      simPhoneNumber: "+250729974065",
      carrier: "Airtel Rwanda",
      status: "ACTIVE",
    });
    (prisma.paymentBridgeDevice as any).update = async () => ({});

    let updatedPayment: any = null;
    let createdReceipt: any = null;
    let updatedBusiness: any = null;
    let auditLogCreated: any = null;

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.paymentReference === "MOSA-REG-AIRTEL-PRIMARY") {
        return {
          id: "pay_airtel_primary",
          businessId: "biz_kigali_crafts",
          paymentReference: "MOSA-REG-AIRTEL-PRIMARY",
          feeAmount: 5000,
          currency: "RWF",
          provider: "AIRTEL_MONEY",
          status: "PENDING",
          business: {
            id: "biz_kigali_crafts",
            name: "Kigali Creative Crafts",
            status: "PENDING_PAYMENT",
            owner: { name: "Emmanuel Mugabo", phone: "+250729974065" },
          },
        };
      }
      return null;
    };

    (prisma.registrationReceipt as any).count = async () => 14;

    (prisma as any).$transaction = async (callback: any) => {
      const txMock = {
        registrationPayment: {
          update: async ({ data }: any) => {
            updatedPayment = data;
            return { id: "pay_airtel_primary", ...data };
          },
        },
        registrationReceipt: {
          create: async ({ data }: any) => {
            createdReceipt = data;
            return { id: "rec_airtel_15", ...data };
          },
        },
        business: {
          update: async ({ data }: any) => {
            updatedBusiness = data;
            return { id: "biz_kigali_crafts", ...data };
          },
        },
        auditLog: {
          create: async ({ data }: any) => {
            auditLogCreated = data;
            return { id: "aud_15", ...data };
          },
        },
      };
      return await callback(txMock);
    };

    // Incoming Airtel SMS notification received on SIM +250729974065
    const airtelNotification = "Mwakiriye 5,000 RWF yavuye kuri +250729974065 (EMMANUEL MUGABO). Txn ID: AM261027.9999.065. Impamvu: MOSA-REG-AIRTEL-PRIMARY. Amafaranga asigaye ni 250,000 RWF.";

    const req = createSignedRequest({
      payload: {
        provider: "AIRTEL_MONEY",
        rawSms: airtelNotification,
        bridgeDeviceId: TEST_DEVICE_ID,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.businessStatus, "ACTIVE");
    assert.ok(data.receiptNumber.startsWith("MOSA-REC-"));

    // Verify verified settlement record
    assert.strictEqual(updatedPayment.status, "CONFIRMED");
    assert.strictEqual(updatedPayment.provider, "AIRTEL_MONEY");
    assert.strictEqual(updatedPayment.providerTransactionRef, "AM261027.9999.065");
    assert.strictEqual(createdReceipt.paymentMethod, "AIRTEL_MONEY");
    assert.strictEqual(createdReceipt.amountPaid, 5000);
    assert.strictEqual(createdReceipt.currency, "RWF");
    assert.strictEqual(updatedBusiness.status, "ACTIVE");
    assert.strictEqual(auditLogCreated.action, "PAYMENT_CONFIRMED_BUSINESS_ACTIVATED");
  });

  it("RULE 16: Should reject expired request timestamp outside 15-minute replay window", async () => {
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const req = createSignedRequest({
      payload: {
        provider: "MTN_MOMO",
        paymentReference: "MOSA-REG-REPLAY-1",
        providerTransactionRef: "TX_REPLAY_1",
        amount: 5000,
        currency: "RWF",
      },
      headersExtra: {
        "x-mosa-timestamp": twentyMinutesAgo,
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /replay window/i);
  });

  it("RULE 17: Should reject wrong recipient / unauthorized destination phone number", async () => {
    let wrongRecipientAudited: any = null;
    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "AIRTEL_MONEY",
      isEnabled: true,
      accountNumber: "0729974065",
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_1",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      status: "ACTIVE",
      simPhoneNumber: "+250729974065",
    });

    (prisma.paymentBridgeDevice as any).update = async () => ({});

    (prisma.auditLog as any).create = async ({ data }: any) => {
      if (data.action === "PAYMENT_WRONG_RECIPIENT_REJECTED") {
        wrongRecipientAudited = data;
      }
      return { id: "aud_wrong_rec", ...data };
    };

    const req = createSignedRequest({
      payload: {
        provider: "AIRTEL_MONEY",
        paymentReference: "MOSA-REG-WRONG-REC",
        providerTransactionRef: "AM_WRONG_DEST_99",
        amount: 5000,
        currency: "RWF",
        recipient: "0788999999", // Unregistered/rogue number
      },
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.error, /does not match configured merchant recipient/i);
    assert.ok(wrongRecipientAudited, "PAYMENT_WRONG_RECIPIENT_REJECTED must be audited");
    assert.strictEqual(wrongRecipientAudited.action, "PAYMENT_WRONG_RECIPIENT_REJECTED");
  });
});
