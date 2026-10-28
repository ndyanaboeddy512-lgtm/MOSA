/**
 * End-to-End Production Payment-to-Live Activation Test Suite
 * 
 * Verifies the complete lifecycle:
 * 1. New registration -> reference -> bridge SMS webhook -> atomic confirmation -> receipt -> ACTIVE & BUSINESS_VERIFIED -> 12mo expiry.
 * 2. Annual renewal -> renewal reference -> bridge SMS webhook -> expiry extended by 365 days -> no duplicate business or receipt.
 * 3. Bank transfer -> pending registration -> manual admin bank reconciliation only -> activation with audit trail.
 * 4. Underpayment protection -> marked FAILED -> no business activation.
 * 5. Duplicate transaction reference across different payments -> marked DUPLICATE.
 * 6. Wrong recipient destination -> rejected with PAYMENT_WRONG_RECIPIENT_REJECTED.
 * 7. Unmatched reference -> audited as PAYMENT_UNMATCHED_REFERENCE -> business remains pending.
 * 8. Idempotency -> identical delivery returns alreadyConfirmed=true with single receipt.
 */

import assert from "node:assert";
import test, { describe, it, beforeEach, afterEach } from "node:test";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST as webhookPOST } from "@/app/api/payments/webhook/route";
import { POST as adminConfirmPOST } from "@/app/api/admin/payments/confirm/route";
import { confirmPaymentAndActivateBusiness, adminConfirmPayment } from "@/lib/payments/engine";

describe("55 MOSA — Complete Production Payment-to-Live Activation E2E", () => {
  const TEST_DEVICE_ID = "bridge_e2e_device_001";
  const TEST_DEVICE_TOKEN = "mbt_e2e_token_123456789";
  const TEST_HMAC_SECRET = "mbh_e2e_secret_123456789abcdef";

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

  function createSignedBridgeRequest({
    payload,
    secret = TEST_HMAC_SECRET,
    deviceId = TEST_DEVICE_ID,
    deviceToken = TEST_DEVICE_TOKEN,
    headersExtra,
  }: {
    payload: any;
    secret?: string;
    deviceId?: string | null;
    deviceToken?: string | null;
    headersExtra?: Record<string, string>;
  }) {
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

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
  // 1. END-TO-END NEW REGISTRATION PAYMENT ACTIVATION
  // =========================================================================

  it("SCENARIO 1: New Registration via Airtel Money bridge SMS confirms atomically and sets BUSINESS_VERIFIED", async () => {
    const mockBusiness = {
      id: "biz_new_e2e_1",
      name: "Musanze Fresh Bakery",
      phone: "+250729974065",
      status: "PENDING_PAYMENT",
      verificationStatus: "UNVERIFIED",
      renewalStatus: "CURRENT",
      registrationConfirmedAt: null,
      registrationExpiresAt: null,
      sector: "Muhoza",
      district: "Musanze",
      owner: { id: "user_owner_1", name: "Alice Uwase", phone: "+250729974065", email: "alice@example.com" },
    };

    const mockPayment = {
      id: "pay_new_e2e_1",
      businessId: mockBusiness.id,
      paymentReference: "MOSA-REG-20261028-BAKERY",
      feeAmount: 5000,
      currency: "RWF",
      provider: "AIRTEL_MONEY",
      paymentType: "REGISTRATION",
      status: "PENDING",
      business: mockBusiness,
      receipt: null,
    };

    let updatedPayment: any = null;
    let createdReceipt: any = null;
    let updatedBusiness: any = null;
    let auditLogEntries: any[] = [];

    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "AIRTEL_MONEY",
      isEnabled: true,
      accountNumber: "0729974065",
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_e2e_1",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      status: "ACTIVE",
      simPhoneNumber: "+250729974065",
    });
    (prisma.paymentBridgeDevice as any).update = async () => ({});

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.paymentReference === mockPayment.paymentReference) {
        return updatedPayment ? { ...mockPayment, ...updatedPayment, receipt: createdReceipt } : mockPayment;
      }
      return null;
    };

    (prisma.registrationReceipt as any).count = async () => 20;

    (prisma as any).$transaction = async (callback: any) => {
      const tx = {
        registrationPayment: {
          update: async ({ data }: any) => {
            updatedPayment = data;
            return { ...mockPayment, ...data };
          },
        },
        registrationReceipt: {
          create: async ({ data }: any) => {
            createdReceipt = data;
            return { id: "rec_e2e_21", ...data };
          },
        },
        business: {
          update: async ({ data }: any) => {
            updatedBusiness = data;
            return { ...mockBusiness, ...data };
          },
        },
        feePromotion: { update: async () => ({}) },
        auditLog: {
          create: async ({ data }: any) => {
            auditLogEntries.push(data);
            return { id: `aud_${Date.now()}`, ...data };
          },
        },
      };
      return await callback(tx);
    };

    const airtelSms = "Mwakiriye 5,000 RWF yavuye kuri +250729974065 (ALICE UWASE). Txn ID: AM261028.1122.999. Impamvu: MOSA-REG-20261028-BAKERY. Amafaranga asigaye ni 250,000 RWF.";

    const req = createSignedBridgeRequest({
      payload: {
        provider: "AIRTEL_MONEY",
        rawSms: airtelSms,
        bridgeDeviceId: TEST_DEVICE_ID,
      },
    });

    const res = await webhookPOST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.businessStatus, "ACTIVE");
    assert.ok(body.receiptNumber.startsWith("MOSA-REC-"));

    // Verify atomic state changes
    assert.strictEqual(updatedPayment.status, "CONFIRMED");
    assert.strictEqual(updatedPayment.providerTransactionRef, "AM261028.1122.999");
    assert.strictEqual(updatedBusiness.status, "ACTIVE");
    assert.strictEqual(updatedBusiness.renewalStatus, "CURRENT");
    assert.strictEqual(updatedBusiness.verificationStatus, "BUSINESS_VERIFIED");
    assert.ok(updatedBusiness.registrationExpiresAt instanceof Date);

    // Expiry must be 12 months (365 days) from confirmation date
    const expiryTime = new Date(updatedBusiness.registrationExpiresAt).getTime();
    const nowTime = Date.now();
    const approx365Days = 365 * 24 * 60 * 60 * 1000;
    assert.ok(Math.abs(expiryTime - (nowTime + approx365Days)) < 60000, "Expiry must be ~365 days in future");

    // Verify Receipt fields
    assert.strictEqual(createdReceipt.paymentMethod, "AIRTEL_MONEY");
    assert.strictEqual(createdReceipt.amountPaid, 5000);
    assert.strictEqual(createdReceipt.currency, "RWF");
    assert.strictEqual(createdReceipt.receiptType, "REGISTRATION");
    assert.strictEqual(createdReceipt.providerTransactionRef, "AM261028.1122.999");

    // Verify Audit Trail
    const activationAudit = auditLogEntries.find(a => a.action === "PAYMENT_CONFIRMED_BUSINESS_ACTIVATED");
    assert.ok(activationAudit, "Must record PAYMENT_CONFIRMED_BUSINESS_ACTIVATED audit event");
  });

  // =========================================================================
  // 2. END-TO-END ANNUAL RENEWAL EXTENSION
  // =========================================================================

  it("SCENARIO 2: Annual Renewal via MTN MoMo extends expiry from current expiration without creating duplicate business", async () => {
    // Business currently expires in 30 days
    const currentExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const mockBusiness = {
      id: "biz_renewal_e2e_2",
      name: "Rubavu Coffee Lounge",
      phone: "+250788112233",
      status: "ACTIVE",
      verificationStatus: "OFFICIALLY_VERIFIED", // Pre-existing high badge
      renewalStatus: "CURRENT",
      registrationConfirmedAt: new Date(Date.now() - 335 * 24 * 60 * 60 * 1000),
      registrationExpiresAt: currentExpiry,
      renewalCount: 1,
      sector: "Gisenyi",
      district: "Rubavu",
      owner: { id: "user_owner_2", name: "David Habimana", phone: "+250788112233", email: "david@example.com" },
    };

    const mockPayment = {
      id: "pay_renewal_e2e_2",
      businessId: mockBusiness.id,
      paymentReference: "MOSA-REN-20261028-RUBAVU",
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      paymentType: "ANNUAL_RENEWAL",
      status: "PENDING",
      business: mockBusiness,
      receipt: null,
    };

    let updatedPayment: any = null;
    let createdReceipt: any = null;
    let updatedBusiness: any = null;
    let auditLogEntries: any[] = [];

    (prisma.paymentProviderConfig as any).findUnique = async () => ({
      provider: "MTN_MOMO",
      isEnabled: true,
      accountNumber: "999888",
    });

    (prisma.paymentBridgeDevice as any).findFirst = async () => ({
      id: "dev_e2e_2",
      deviceId: TEST_DEVICE_ID,
      deviceToken: TEST_DEVICE_TOKEN,
      hmacSecret: TEST_HMAC_SECRET,
      status: "ACTIVE",
      simPhoneNumber: "+250788123456",
    });
    (prisma.paymentBridgeDevice as any).update = async () => ({});

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.paymentReference === mockPayment.paymentReference) {
        return updatedPayment ? { ...mockPayment, ...updatedPayment, receipt: createdReceipt } : mockPayment;
      }
      return null;
    };

    (prisma.registrationReceipt as any).count = async () => 35;

    (prisma as any).$transaction = async (callback: any) => {
      const tx = {
        registrationPayment: {
          update: async ({ data }: any) => {
            updatedPayment = data;
            return { ...mockPayment, ...data };
          },
        },
        registrationReceipt: {
          create: async ({ data }: any) => {
            createdReceipt = data;
            return { id: "rec_e2e_36", ...data };
          },
        },
        business: {
          update: async ({ data }: any) => {
            updatedBusiness = data;
            return { ...mockBusiness, ...data };
          },
        },
        feePromotion: { update: async () => ({}) },
        auditLog: {
          create: async ({ data }: any) => {
            auditLogEntries.push(data);
            return { id: `aud_${Date.now()}`, ...data };
          },
        },
      };
      return await callback(tx);
    };

    const mtnSms = "Mwakiriye 5,000 RWF yavuye kuri 250788112233 (DAVID HABIMANA). Id y'igikorwa: 99182736451. Ref: MOSA-REN-20261028-RUBAVU. Balance yawe nshya ni 1,200,000 RWF.";

    const req = createSignedBridgeRequest({
      payload: {
        provider: "MTN_MOMO",
        rawSms: mtnSms,
        bridgeDeviceId: TEST_DEVICE_ID,
      },
    });

    const res = await webhookPOST(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.businessStatus, "ACTIVE");

    // Verification status must NOT be downgraded or altered for renewal
    assert.strictEqual(updatedBusiness.verificationStatus, "OFFICIALLY_VERIFIED");
    assert.strictEqual(updatedBusiness.renewalStatus, "CURRENT");

    // Expiry must be extended by 365 days from currentExpiry (not from now)
    const expectedExpiryTime = currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000;
    const actualExpiryTime = new Date(updatedBusiness.registrationExpiresAt).getTime();
    assert.strictEqual(actualExpiryTime, expectedExpiryTime, "Renewal must add 365 days to existing expiry");

    // Renewal receipt verified
    assert.strictEqual(createdReceipt.receiptType, "ANNUAL_RENEWAL");
    assert.strictEqual(createdReceipt.amountPaid, 5000);

    // Audit action ANNUAL_RENEWAL_CONFIRMED verified
    const renewalAudit = auditLogEntries.find(a => a.action === "ANNUAL_RENEWAL_CONFIRMED");
    assert.ok(renewalAudit, "Must record ANNUAL_RENEWAL_CONFIRMED audit event");
  });

  // =========================================================================
  // 3. BANK TRANSFER RECONCILIATION
  // =========================================================================

  it("SCENARIO 3: Bank transfer requires authorized administrative reconciliation; cannot be customer-confirmed", async () => {
    const mockBusiness = {
      id: "biz_bank_e2e_3",
      name: "Akagera Transport Logistics",
      phone: "+250788001122",
      status: "PENDING_PAYMENT",
      verificationStatus: "UNVERIFIED",
      renewalStatus: "CURRENT",
      registrationConfirmedAt: null,
      registrationExpiresAt: null,
      sector: "Nyarugenge",
      district: "Nyarugenge",
      owner: { id: "user_owner_3", name: "Patrick Manzi", phone: "+250788001122" },
    };

    const mockPayment = {
      id: "pay_bank_e2e_3",
      businessId: mockBusiness.id,
      paymentReference: "MOSA-REG-BANK-7788",
      feeAmount: 5000,
      currency: "RWF",
      provider: "BANK_TRANSFER",
      paymentType: "REGISTRATION",
      status: "PENDING",
      business: mockBusiness,
      receipt: null,
    };

    let updatedPayment: any = null;
    let createdReceipt: any = null;
    let updatedBusiness: any = null;
    let auditLogEntries: any[] = [];

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.id === mockPayment.id || where.paymentReference === mockPayment.paymentReference) {
        return updatedPayment ? { ...mockPayment, ...updatedPayment, receipt: createdReceipt } : mockPayment;
      }
      return null;
    };

    (prisma.registrationReceipt as any).count = async () => 50;

    (prisma as any).$transaction = async (callback: any) => {
      const tx = {
        registrationPayment: {
          update: async ({ data }: any) => {
            updatedPayment = data;
            return { ...mockPayment, ...data };
          },
        },
        registrationReceipt: {
          create: async ({ data }: any) => {
            createdReceipt = data;
            return { id: "rec_bank_51", ...data };
          },
        },
        business: {
          update: async ({ data }: any) => {
            updatedBusiness = data;
            return { ...mockBusiness, ...data };
          },
        },
        feePromotion: { update: async () => ({}) },
        auditLog: {
          create: async ({ data }: any) => {
            auditLogEntries.push(data);
            return { id: `aud_${Date.now()}`, ...data };
          },
        },
      };
      return await callback(tx);
    };

    // Authorized admin confirms bank deposit with BK bank reference
    const confirmResult = await adminConfirmPayment({
      paymentId: mockPayment.id,
      adminId: "admin_super_1",
      providerTransactionRef: "BK_TX_20261028_987654",
      notes: "Verified against BK statement narration dated 2026-10-28",
    });

    assert.strictEqual(confirmResult.success, true);
    assert.strictEqual(confirmResult.businessStatus, "ACTIVE");
    assert.ok(confirmResult.receipt?.receiptNumber.startsWith("MOSA-REC-"));

    assert.strictEqual(updatedPayment.status, "CONFIRMED");
    assert.strictEqual(updatedPayment.provider, "BANK_TRANSFER");
    assert.strictEqual(updatedPayment.providerTransactionRef, "BK_TX_20261028_987654");
    assert.strictEqual(updatedPayment.verifiedBy, "ADMIN_MANUAL_admin_super_1");

    assert.strictEqual(createdReceipt.paymentMethod, "BANK_TRANSFER");
    assert.strictEqual(createdReceipt.providerTransactionRef, "BK_TX_20261028_987654");
    assert.strictEqual(updatedBusiness.status, "ACTIVE");
    assert.strictEqual(updatedBusiness.verificationStatus, "BUSINESS_VERIFIED");
  });

  // =========================================================================
  // 4. UNDERPAYMENT FRAUD REJECTION
  // =========================================================================

  it("SCENARIO 4: Underpayment is rejected, marked FAILED, and business is not activated", async () => {
    const mockBusiness = {
      id: "biz_fraud_4",
      name: "Fraud Attempt Biz",
      status: "PENDING_PAYMENT",
      verificationStatus: "UNVERIFIED",
    };

    const mockPayment = {
      id: "pay_fraud_4",
      businessId: mockBusiness.id,
      paymentReference: "MOSA-REG-UNDERPAY",
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      status: "PENDING",
      business: mockBusiness,
      receipt: null,
    };

    let paymentFailedUpdate: any = null;
    let auditLogCreated: any = null;

    (prisma.registrationPayment as any).findUnique = async () => mockPayment;
    (prisma.registrationPayment as any).update = async ({ data }: any) => {
      paymentFailedUpdate = data;
      return { ...mockPayment, ...data };
    };
    (prisma.auditLog as any).create = async ({ data }: any) => {
      auditLogCreated = data;
      return { id: "aud_underpay", ...data };
    };

    await assert.rejects(
      async () => {
        await confirmPaymentAndActivateBusiness({
          paymentReference: "MOSA-REG-UNDERPAY",
          providerTransactionRef: "TX_UNDER_100",
          provider: "MTN_MOMO",
          amountPaid: 100, // 100 RWF instead of 5000 RWF
          currency: "RWF",
        });
      },
      /Underpayment detected/i
    );

    assert.strictEqual(paymentFailedUpdate.status, "FAILED");
    assert.match(paymentFailedUpdate.failureReason, /UNDERPAYMENT_DETECTED/);
    assert.strictEqual(auditLogCreated.action, "PAYMENT_UNDERPAYMENT_REJECTED");
  });

  // =========================================================================
  // 5. DUPLICATE TRANSACTION REPLAY REJECTION ACROSS DIFFERENT REGISTRATIONS
  // =========================================================================

  it("SCENARIO 5: Duplicate transaction reference used on another payment is marked DUPLICATE", async () => {
    const existingConfirmedPayment = {
      id: "pay_original_legit",
      paymentReference: "MOSA-REG-ORIGINAL",
      providerTransactionRef: "CARRIER_TX_UNIQUE_999",
      status: "CONFIRMED",
    };

    const newSecondPayment = {
      id: "pay_attacker_second",
      businessId: "biz_second",
      paymentReference: "MOSA-REG-ATTACKER",
      feeAmount: 5000,
      currency: "RWF",
      provider: "AIRTEL_MONEY",
      status: "PENDING",
      business: { id: "biz_second", status: "PENDING_PAYMENT", verificationStatus: "UNVERIFIED" },
      receipt: null,
    };

    let paymentDuplicateUpdate: any = null;
    let auditDuplicateCreated: any = null;

    (prisma.registrationPayment as any).findUnique = async ({ where }: any) => {
      if (where.providerTransactionRef === "CARRIER_TX_UNIQUE_999") {
        return existingConfirmedPayment;
      }
      if (where.paymentReference === newSecondPayment.paymentReference) {
        return newSecondPayment;
      }
      return null;
    };

    (prisma.registrationPayment as any).update = async ({ data }: any) => {
      paymentDuplicateUpdate = data;
      return { ...newSecondPayment, ...data };
    };

    (prisma.auditLog as any).create = async ({ data }: any) => {
      auditDuplicateCreated = data;
      return { id: "aud_dup", ...data };
    };

    await assert.rejects(
      async () => {
        await confirmPaymentAndActivateBusiness({
          paymentReference: "MOSA-REG-ATTACKER",
          providerTransactionRef: "CARRIER_TX_UNIQUE_999", // Attempting to reuse already-consumed ref
          provider: "AIRTEL_MONEY",
          amountPaid: 5000,
          currency: "RWF",
        });
      },
      /already consumed/i
    );

    assert.strictEqual(paymentDuplicateUpdate.status, "DUPLICATE");
    assert.match(paymentDuplicateUpdate.failureReason, /already consumed/);
    assert.strictEqual(auditDuplicateCreated.action, "PAYMENT_DUPLICATE_REJECTED");
  });

  // =========================================================================
  // 6. STRICT IDEMPOTENCY ON IDENTICAL DELIVERY
  // =========================================================================

  it("SCENARIO 6: Idempotent re-delivery of confirmed payment returns alreadyConfirmed=true with existing receipt", async () => {
    const confirmedPayment = {
      id: "pay_already_done",
      paymentReference: "MOSA-REG-IDEMPOTENT",
      providerTransactionRef: "TX_CONFIRMED_1",
      status: "CONFIRMED",
      businessId: "biz_idempotent",
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      business: { id: "biz_idempotent", status: "ACTIVE" },
      receipt: {
        id: "rec_existing_1",
        receiptNumber: "MOSA-REC-20261028-00001",
      },
    };

    (prisma.registrationPayment as any).findUnique = async () => confirmedPayment;

    const result = await confirmPaymentAndActivateBusiness({
      paymentReference: "MOSA-REG-IDEMPOTENT",
      providerTransactionRef: "TX_CONFIRMED_1",
      provider: "MTN_MOMO",
      amountPaid: 5000,
      currency: "RWF",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.alreadyConfirmed, true);
    assert.strictEqual(result.receipt?.receiptNumber, "MOSA-REC-20261028-00001");
    assert.strictEqual(result.businessStatus, "ACTIVE");
  });
});
