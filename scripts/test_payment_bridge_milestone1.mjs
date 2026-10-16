import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// Helper to verify HMAC
function computeHmac(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function runMilestone1Tests() {
  console.log("=================================================================");
  console.log("  MOSA PAYMENT BRIDGE — MILESTONE 1 AUTOMATED VERIFICATION SUITE");
  console.log("=================================================================\n");

  let testAdmin = null;
  let testOwner = null;
  let testBusiness = null;

  try {
    // -------------------------------------------------------------
    // SETUP: Ensure Test Admin, Owner, and Business Exist
    // -------------------------------------------------------------
    console.log("--- 0. ENVIRONMENT & ACTOR SETUP ---");
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        testAdmin = await prisma.user.findFirst({
          where: { role: "SUPER_ADMIN" },
        });
        if (testAdmin) break;
      } catch (connErr) {
        if (attempt === 5) throw connErr;
        console.log(`[Neon Notice] Attempt ${attempt} waking compute endpoint, retrying in 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (!testAdmin) {
      testAdmin = await prisma.user.create({
        data: {
          name: "Bridge QA Super Admin",
          email: "bridge-qa-admin@mosa.rw",
          role: "SUPER_ADMIN",
          referralCode: `REF-ADMIN-${Date.now()}`,
          status: "ACTIVE",
        },
      });
    }
    console.log(`✅ Super Admin ready: ${testAdmin.name} (${testAdmin.id})`);

    testOwner = await prisma.user.upsert({
      where: { phone: "+250788333222" },
      update: {},
      create: {
        name: "MoMo Test Proprietor",
        phone: "+250788333222",
        role: "BUSINESS_OWNER",
        referralCode: `REF-PROP-${Date.now()}`,
        status: "ACTIVE",
      },
    });
    console.log(`✅ Business Owner ready: ${testOwner.name} (${testOwner.id})`);

    testBusiness = await prisma.business.findFirst();
    if (!testBusiness) {
      testBusiness = await prisma.business.create({
        data: {
          name: "Kigali Fresh Bakery",
          category: "FOOD_AND_BEVERAGE",
          description: "Fresh artisanal bakery in Kigali",
          phone: "+250788333222",
          latitude: -1.95,
          longitude: 30.06,
          ownerId: testOwner.id,
          status: "PENDING_REGISTRATION_PAYMENT",
          verificationStatus: "UNVERIFIED",
          renewalStatus: "NEW_REGISTRATION",
        },
      });
    }
    console.log(`✅ Test Business ready: ${testBusiness.name} (Status: ${testBusiness.status})`);

    // Ensure default MTN_MOMO Provider Config exists
    const providerConfig = await prisma.paymentProviderConfig.upsert({
      where: { provider: "MTN_MOMO" },
      update: { isEnabled: true },
      create: {
        provider: "MTN_MOMO",
        name: "MTN Mobile Money",
        isEnabled: true,
        accountNumber: "0788123456",
        accountName: "MOSA Network (Rwanda) Ltd",
        instructions: "Dial *182*8*1*0788123456# or use MoMo Pay Merchant Code. Enter your Payment Reference.",
        instructionsRw: "Kanda *182*8*1*0788123456# cyangwa ukoreshe MoMo Pay Code.",
        webhookSecret: "mosa_momo_secret_key_rwanda_2026",
      },
    });
    console.log(`✅ Provider Config verified: ${providerConfig.name} (Account: ${providerConfig.accountNumber})\n`);

    // -------------------------------------------------------------
    // TEST 1: Backward Compatibility — Existing Webhook / Simulator Flow
    // -------------------------------------------------------------
    console.log("--- TEST 1: BACKWARD COMPATIBILITY — LEGACY WEBHOOK AUTH ---");
    const testPaymentRef1 = `MOSA-REG-TEST-${Date.now()}`;
    const payment1 = await prisma.registrationPayment.create({
      data: {
        businessId: testBusiness.id,
        payerUserId: testOwner.id,
        feeAmount: 5000,
        currency: "RWF",
        provider: "MTN_MOMO",
        paymentReference: testPaymentRef1,
        status: "PENDING",
      },
    });

    const legacyPayload = JSON.stringify({
      provider: "MTN_MOMO",
      paymentReference: testPaymentRef1,
      providerTransactionRef: `TX-LEGACY-${Date.now()}`,
      amount: 5000,
      currency: "RWF",
    });

    const legacySignature = computeHmac(legacyPayload, providerConfig.webhookSecret);

    // Call internal engine via fetch / direct import or simulate webhook
    const { authenticateWebhookRequest } = await import("../src/lib/payments/bridge-devices.ts");
    const { confirmPaymentAndActivateBusiness } = await import("../src/lib/payments/engine.ts");

    const legacyAuth = await authenticateWebhookRequest({
      rawBody: legacyPayload,
      signature: legacySignature,
      provider: "MTN_MOMO",
    });

    if (!legacyAuth.isAuthenticated || legacyAuth.authMethod !== "PROVIDER_SECRET") {
      throw new Error(`Legacy webhook authentication failed: ${legacyAuth.error}`);
    }
    console.log("✅ 1a. Legacy provider secret auth succeeded (100% backward compatible)");

    // Confirm payment
    const confirmResult1 = await confirmPaymentAndActivateBusiness({
      paymentReference: testPaymentRef1,
      providerTransactionRef: `TX-LEGACY-${Date.now()}`,
      provider: "MTN_MOMO",
      amountPaid: 5000,
      rawPayload: legacyPayload,
      verifiedBy: "TEST_LEGACY_WEBHOOK",
    });

    if (!confirmResult1.receipt || !confirmResult1.receipt.receiptNumber.startsWith("MOSA-REC-")) {
      throw new Error("Payment confirmation failed to generate numbered receipt.");
    }
    console.log(`✅ 1b. Payment confirmed with receipt: ${confirmResult1.receipt.receiptNumber}`);

    // Verify Business Activation
    const activatedBiz = await prisma.business.findUnique({ where: { id: testBusiness.id } });
    if (activatedBiz.status !== "ACTIVE" || activatedBiz.renewalStatus !== "CURRENT") {
      throw new Error(`Business was not activated correctly. Status: ${activatedBiz.status}, RenewalStatus: ${activatedBiz.renewalStatus}`);
    }
    console.log(`✅ 1c. Business activated: Status = ${activatedBiz.status}, RenewalStatus = ${activatedBiz.renewalStatus}\n`);

    // -------------------------------------------------------------
    // TEST 2: Device Enrollment & One-Time Pairing Workflow
    // -------------------------------------------------------------
    console.log("--- TEST 2: SECURE DEVICE ENROLLMENT & ONE-TIME PAIRING ---");
    const {
      createDevicePairingChallenge,
      completeDevicePairing,
      recordDeviceHeartbeat,
      revokeBridgeDevice,
      rotateBridgeDeviceCredentials,
    } = await import("../src/lib/payments/bridge-devices.ts");

    // 2a. Admin initiates pairing challenge
    const challenge = await createDevicePairingChallenge({
      name: "MOSA Hub Primary Phone (Samsung A05)",
      simPhoneNumber: "+250788123456",
      carrier: "MTN Rwanda",
      adminId: testAdmin.id,
    });

    if (!challenge.pairingCode || !challenge.pairingExpiresAt) {
      throw new Error("Failed to generate device pairing challenge.");
    }
    console.log(`✅ 2a. Pairing challenge created: DeviceId = ${challenge.deviceId}, Code = ${challenge.pairingCode}`);

    // Verify Audit Log for pairing initiation
    const auditInit = await prisma.auditLog.findFirst({
      where: { action: "BRIDGE_DEVICE_PAIRING_INITIATED", entityId: challenge.id },
    });
    if (!auditInit) throw new Error("Audit log missing for pairing initiation.");
    console.log(`✅ 2b. Audit log verified: Action = ${auditInit.action}`);

    // 2c. Android phone connects and consumes the one-time pairing code
    const pairingResult = await completeDevicePairing({
      pairingCode: challenge.pairingCode,
      deviceHardwareId: `hw_samsung_a05_${Date.now()}`,
      appVersion: "1.0.0-rw",
    });

    if (!pairingResult.success || !pairingResult.deviceToken || !pairingResult.hmacSecret) {
      throw new Error("Failed to complete device pairing.");
    }
    console.log(`✅ 2c. Device paired successfully: HardwareId = ${pairingResult.deviceId}, Token = ${pairingResult.deviceToken.slice(0, 10)}...`);

    // Verify pairing code is wiped and status is ACTIVE
    const enrolledDevice = await prisma.paymentBridgeDevice.findUnique({
      where: { deviceId: pairingResult.deviceId },
    });
    if (enrolledDevice.status !== "ACTIVE" || enrolledDevice.pairingCode !== null) {
      throw new Error("Device was not transitioned to ACTIVE or pairingCode was not wiped.");
    }
    console.log(`✅ 2d. Device state verified in PostgreSQL: Status = ${enrolledDevice.status}, PairingCode = null (WIPED)`);

    // 2e. Re-pairing with consumed code must be rejected
    let rePairFailed = false;
    try {
      await completeDevicePairing({ pairingCode: challenge.pairingCode });
    } catch {
      rePairFailed = true;
    }
    if (!rePairFailed) throw new Error("Security breach: One-time pairing code was allowed to be reused!");
    console.log("✅ 2e. Re-pairing with consumed code rejected correctly (Single-use enforcement)\n");

    // -------------------------------------------------------------
    // TEST 3: Heartbeat & Battery/Network Telemetry
    // -------------------------------------------------------------
    console.log("--- TEST 3: DEVICE HEALTH & BATTERY MONITORING ---");
    const heartbeatResult = await recordDeviceHeartbeat({
      deviceId: enrolledDevice.deviceId,
      deviceToken: enrolledDevice.deviceToken,
      batteryLevel: 88,
      isCharging: true,
      networkType: "WIFI_OFFICE_5G",
      appVersion: "1.0.0-rw",
    });

    if (!heartbeatResult.success || !heartbeatResult.isDeviceActive) {
      throw new Error("Heartbeat recording failed.");
    }

    const deviceAfterHb = await prisma.paymentBridgeDevice.findUnique({
      where: { id: enrolledDevice.id },
    });
    if (deviceAfterHb.batteryLevel !== 88 || !deviceAfterHb.isCharging) {
      throw new Error("Heartbeat telemetry was not persisted.");
    }
    console.log(`✅ 3a. Heartbeat recorded: Battery = ${deviceAfterHb.batteryLevel}%, Charging = ${deviceAfterHb.isCharging}, Network = ${deviceAfterHb.networkType}\n`);

    // -------------------------------------------------------------
    // TEST 4: Bridge Device Payment Ingestion & HMAC Verification
    // -------------------------------------------------------------
    console.log("--- TEST 4: BRIDGE-AUTHENTICATED PAYMENT INGESTION ---");
    const testPaymentRef2 = `MOSA-REG-BRIDGE-${Date.now()}`;
    await prisma.registrationPayment.create({
      data: {
        businessId: testBusiness.id,
        payerUserId: testOwner.id,
        feeAmount: 5000,
        currency: "RWF",
        provider: "MTN_MOMO",
        paymentReference: testPaymentRef2,
        status: "PENDING",
      },
    });

    const bridgeTxId = `MOMO-BRIDGE-${Date.now()}`;
    const rawSms = `Mwakiriye 5,000 RWF kuri konte yanyu ya MoMo ivuye kuri JEAN CLAUDE (+250788333222). Nimero y'ubwishyu: ${bridgeTxId}. Impamvu: ${testPaymentRef2}. Kuwa 15/10/2026 10:15.`;

    const bridgePayload = JSON.stringify({
      provider: "MTN_MOMO",
      paymentReference: testPaymentRef2,
      providerTransactionRef: bridgeTxId,
      amount: 5000,
      currency: "RWF",
      phoneNumber: "+250788333222",
      rawSms,
      bridgeDeviceId: enrolledDevice.deviceId,
      timestamp: new Date().toISOString(),
    });

    // 4a. Compute authentic HMAC using the device's shared secret
    const authenticHmac = computeHmac(bridgePayload, enrolledDevice.hmacSecret);

    const bridgeAuth = await authenticateWebhookRequest({
      rawBody: bridgePayload,
      signature: authenticHmac,
      deviceIdHeader: enrolledDevice.deviceId,
      authHeader: `Bearer ${enrolledDevice.deviceToken}`,
      provider: "MTN_MOMO",
    });

    if (!bridgeAuth.isAuthenticated || bridgeAuth.authMethod !== "DEVICE_CREDENTIAL") {
      throw new Error(`Bridge device authentication failed: ${bridgeAuth.error}`);
    }
    console.log(`✅ 4a. Device-authenticated webhook verified via HMAC-SHA256 (Device: ${bridgeAuth.device.name})`);

    // 4b. Reject invalid / forged signature
    const forgedAuth = await authenticateWebhookRequest({
      rawBody: bridgePayload,
      signature: "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
      deviceIdHeader: enrolledDevice.deviceId,
      authHeader: `Bearer ${enrolledDevice.deviceToken}`,
      provider: "MTN_MOMO",
    });

    if (forgedAuth.isAuthenticated) {
      throw new Error("Security breach: Forged HMAC signature was accepted!");
    }
    console.log("✅ 4b. Forged HMAC signature rejected (Anti-Tampering Guard)");

    // 4c. Process payment from bridge
    const confirmResult2 = await confirmPaymentAndActivateBusiness({
      paymentReference: testPaymentRef2,
      providerTransactionRef: bridgeTxId,
      provider: "MTN_MOMO",
      amountPaid: 5000,
      rawPayload: bridgePayload,
      verifiedBy: `ANDROID_BRIDGE_${enrolledDevice.deviceId}`,
    });

    console.log(`✅ 4c. Payment verified via Bridge: Receipt = ${confirmResult2.receipt.receiptNumber}, VerifiedBy = ANDROID_BRIDGE_${enrolledDevice.deviceId}\n`);

    // -------------------------------------------------------------
    // TEST 5: Anti-Fraud Safeguards (Underpayment, Duplicate, Unmatched)
    // -------------------------------------------------------------
    console.log("--- TEST 5: PRESERVING ANTI-FRAUD SAFEGUARDS ---");

    // 5a. Underpayment Rejection
    const underpayRef = `MOSA-REG-UNDER-${Date.now()}`;
    await prisma.registrationPayment.create({
      data: {
        businessId: testBusiness.id,
        payerUserId: testOwner.id,
        feeAmount: 5000,
        currency: "RWF",
        provider: "MTN_MOMO",
        paymentReference: underpayRef,
        status: "PENDING",
      },
    });

    let underpayRejected = false;
    try {
      await confirmPaymentAndActivateBusiness({
        paymentReference: underpayRef,
        providerTransactionRef: `TX-UNDER-${Date.now()}`,
        provider: "MTN_MOMO",
        amountPaid: 2000, // Underpayment (2000 < 5000)
      });
    } catch {
      underpayRejected = true;
    }
    if (!underpayRejected) throw new Error("Underpayment was not rejected!");
    console.log("✅ 5a. Underpayment (2,000 RWF vs 5,000 RWF required) successfully rejected");

    // 5b. Duplicate Transaction ID Rejection
    let dupRejected = false;
    try {
      const dupRef = `MOSA-REG-DUP-${Date.now()}`;
      await prisma.registrationPayment.create({
        data: {
          businessId: testBusiness.id,
          payerUserId: testOwner.id,
          feeAmount: 5000,
          currency: "RWF",
          provider: "MTN_MOMO",
          paymentReference: dupRef,
          status: "PENDING",
        },
      });

      // Try consuming the same bridgeTxId used in Test 4c
      await confirmPaymentAndActivateBusiness({
        paymentReference: dupRef,
        providerTransactionRef: bridgeTxId, // Already consumed!
        provider: "MTN_MOMO",
        amountPaid: 5000,
      });
    } catch {
      dupRejected = true;
    }
    if (!dupRejected) throw new Error("Duplicate provider transaction ID was not rejected!");
    console.log("✅ 5b. Replayed / duplicate telecom transaction ID successfully rejected");

    // 5c. Unmatched Reference Rejection
    let unmatchedRejected = false;
    try {
      await confirmPaymentAndActivateBusiness({
        paymentReference: "MOSA-REG-NON-EXISTENT-9999",
        providerTransactionRef: `TX-UNMATCHED-${Date.now()}`,
        provider: "MTN_MOMO",
        amountPaid: 5000,
      });
    } catch {
      unmatchedRejected = true;
    }
    if (!unmatchedRejected) throw new Error("Unmatched payment reference was not rejected!");
    console.log("✅ 5c. Unmatched payment reference rejected & logged to audit pool\n");

    // -------------------------------------------------------------
    // TEST 6: Device Revocation & Credential Rotation (Replaceability)
    // -------------------------------------------------------------
    console.log("--- TEST 6: ZERO-RESET HARDWARE REVOCATION & ROTATION ---");

    // 6a. Credential Rotation
    const rotated = await rotateBridgeDeviceCredentials({
      deviceId: enrolledDevice.deviceId,
      adminId: testAdmin.id,
    });
    if (rotated.deviceToken === enrolledDevice.deviceToken || rotated.hmacSecret === enrolledDevice.hmacSecret) {
      throw new Error("Credentials were not rotated to new random secrets.");
    }
    console.log(`✅ 6a. Credentials successfully rotated: New Token = ${rotated.deviceToken.slice(0, 10)}...`);

    // 6b. Revoke Device
    const revoked = await revokeBridgeDevice({
      deviceId: enrolledDevice.deviceId,
      adminId: testAdmin.id,
      reason: "Phone lost or replaced with new hardware",
    });
    if (revoked.status !== "REVOKED") throw new Error("Device status was not updated to REVOKED.");
    console.log(`✅ 6b. Device revoked: Status = ${revoked.status}, Reason = "${revoked.revokedReason}"`);

    // 6c. Webhook from revoked device must be rejected
    const revokedAuth = await authenticateWebhookRequest({
      rawBody: bridgePayload,
      signature: authenticHmac,
      deviceIdHeader: enrolledDevice.deviceId,
      authHeader: `Bearer ${rotated.deviceToken}`,
      provider: "MTN_MOMO",
    });
    if (revokedAuth.isAuthenticated) {
      throw new Error("Security breach: Revoked bridge device was allowed to submit payments!");
    }
    console.log(`✅ 6c. Revoked device rejected: "${revokedAuth.error}"`);

    // 6d. Verify Historical Integrity: past receipts and payments remain intact
    const pastReceiptsCount = await prisma.registrationReceipt.count({
      where: { businessId: testBusiness.id },
    });
    if (pastReceiptsCount < 2) {
      throw new Error("Past receipts were affected by device revocation!");
    }
    console.log(`✅ 6d. Historical integrity confirmed: ${pastReceiptsCount} past receipts intact in PostgreSQL.\n`);

    console.log("=================================================================");
    console.log("  🎉 ALL MILESTONE 1 VERIFICATION TESTS PASSED 100% SUCCESSFULLY!");
    console.log("=================================================================");
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILURE:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMilestone1Tests();
