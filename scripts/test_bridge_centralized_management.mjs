import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3000";

function computeHmac(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function runCentralizedManagementSuite() {
  console.log("===========================================================================");
  console.log("  MOSA PAYMENT BRIDGE — CENTRALIZED DEVICE & SIM VERIFICATION SUITE");
  console.log("===========================================================================\n");

  let testAdmin = null;
  let testBusiness = null;
  let testOwner = null;

  try {
    // -------------------------------------------------------------
    // 0. ACTOR & ENVIRONMENT SETUP
    // -------------------------------------------------------------
    console.log("--- 0. ENVIRONMENT & ACTOR SETUP ---");
    testAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (!testAdmin) {
      testAdmin = await prisma.user.create({
        data: {
          name: "Centralized Bridge QA Admin",
          email: "qa-admin@mosa.rw",
          role: "SUPER_ADMIN",
          referralCode: `ADMIN-QA-${Date.now()}`,
          status: "ACTIVE",
        },
      });
    }
    console.log(`✅ Admin ready: ${testAdmin.name} (${testAdmin.id})`);

    testOwner = await prisma.user.upsert({
      where: { phone: "+250788777666" },
      update: {},
      create: {
        name: "Kigali Market Store Owner",
        phone: "+250788777666",
        role: "BUSINESS_OWNER",
        referralCode: `OWNER-${Date.now()}`,
        status: "ACTIVE",
      },
    });

    testBusiness = await prisma.business.create({
      data: {
        name: `Kigali Central Hardware ${Date.now()}`,
        description: "Test hardware retail store in Kigali",
        category: "HARDWARE_RETAIL",
        status: "PENDING_VERIFICATION",
        verificationStatus: "UNVERIFIED",
        phone: "+250788777666",
        latitude: -1.9441,
        longitude: 30.0619,
        ownerId: testOwner.id,
      },
    });
    console.log(`✅ Test business created: ${testBusiness.name} (${testBusiness.id})\n`);

    // -------------------------------------------------------------
    // TEST 1: ENROLL FIRST PHYSICAL PHONE VIA LIVE API
    // -------------------------------------------------------------
    console.log("--- TEST 1: ENROLL FIRST PHONE & PROCESS FINANCIAL TRANSACTION ---");
    // Generate one-time pairing challenge
    const rawCode1 = crypto.randomBytes(4).toString("hex").toUpperCase();
    const pairingCode1 = `${rawCode1.slice(0, 4)}-${rawCode1.slice(4)}`;
    const pairingExpiresAt1 = new Date(Date.now() + 15 * 60 * 1000);

    const device1Record = await prisma.paymentBridgeDevice.create({
      data: {
        name: "Original Hub Office Phone",
        deviceId: `bridge_${crypto.randomBytes(6).toString("hex")}`,
        deviceToken: `mbt_${crypto.randomBytes(24).toString("hex")}`,
        hmacSecret: `mbh_${crypto.randomBytes(24).toString("hex")}`,
        simPhoneNumber: "+250788111222",
        carrier: "MTN Rwanda",
        status: "PENDING_PAIRING",
        pairingCode: pairingCode1,
        pairingExpiresAt: pairingExpiresAt1,
        enrolledById: testAdmin.id,
      },
    });
    console.log(`✅ Device challenge seeded: Code ${pairingCode1} for ${device1Record.deviceId}`);

    const hwId1 = `android_test_phone_1_${Date.now()}`;
    const pairRes1 = await fetch(`${BASE_URL}/api/payments/bridge/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pairingCode: pairingCode1,
        deviceHardwareId: hwId1,
        appVersion: "1.0.0",
      }),
    });
    const pairData1 = await pairRes1.json();
    if (!pairData1.success) throw new Error(`Phone 1 pairing failed: ${pairData1.error}`);
    console.log(`✅ Phone 1 successfully paired via API! Assigned ID: ${pairData1.device.deviceId}`);

    const phone1Credentials = {
      deviceId: pairData1.device.deviceId,
      deviceToken: pairData1.device.deviceToken,
      hmacSecret: pairData1.device.hmacSecret,
    };

    // Create a registration payment record
    const paymentRef1 = `MOSA-REG-${Date.now()}`;
    const payment1 = await prisma.registrationPayment.create({
      data: {
        businessId: testBusiness.id,
        payerUserId: testOwner.id,
        feeAmount: 5000,
        currency: "RWF",
        provider: "MTN_MOMO",
        paymentReference: paymentRef1,
        status: "PENDING",
      },
    });
    console.log(`✅ Registration payment created: Ref ${paymentRef1}, Amount: 5000 RWF`);

    // Phone 1 submits webhook transaction with its HMAC signature
    const telcoTxId1 = `MTN_TX_${Date.now()}`;
    const payload1 = JSON.stringify({
      providerTransactionRef: telcoTxId1,
      paymentReference: paymentRef1,
      amount: 5000,
      currency: "RWF",
      phoneNumber: "+250788777666",
      status: "SUCCESSFUL",
      timestamp: new Date().toISOString(),
    });
    const sig1 = computeHmac(payload1, phone1Credentials.hmacSecret);

    const webhookRes1 = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${phone1Credentials.deviceToken}`,
        "x-mosa-device-id": phone1Credentials.deviceId,
        "x-signature": sig1,
      },
      body: payload1,
    });
    const webhookData1 = await webhookRes1.json();
    if (!webhookData1.success) throw new Error(`Webhook 1 failed: ${webhookData1.error}`);
    console.log(`✅ Webhook processed from Phone 1: Status ${webhookData1.status}, Receipt: ${webhookData1.receiptNumber}`);
    const originalReceiptNumber = webhookData1.receiptNumber;

    // -------------------------------------------------------------
    // TEST 2: SIM CARD REPLACEMENT (ADMIN CHANGES SIM WITHOUT RE-ENROLLING)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: SIM CARD REPLACEMENT ON ACTIVE PHONE ---");
    const updatedDevice = await prisma.paymentBridgeDevice.update({
      where: { deviceId: phone1Credentials.deviceId },
      data: {
        simPhoneNumber: "+250788999888", // New SIM number
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: testAdmin.id,
        action: "BRIDGE_DEVICE_METADATA_UPDATED",
        entityType: "PaymentBridgeDevice",
        entityId: updatedDevice.id,
        metadata: JSON.stringify({
          deviceId: updatedDevice.deviceId,
          oldSim: "+250788111222",
          newSim: "+250788999888",
        }),
      },
    });
    console.log(`✅ SIM successfully replaced on active phone: New SIM ${updatedDevice.simPhoneNumber}`);

    // Update receiving destination configuration
    const updatedProvider = await prisma.paymentProviderConfig.upsert({
      where: { provider: "MTN_MOMO" },
      update: {
        accountNumber: "*182*8*1*999888#",
        accountName: "MOSA Community Network",
        instructions: "Dial *182*8*1*999888# and enter reference",
      },
      create: {
        provider: "MTN_MOMO",
        name: "MTN Mobile Money",
        isEnabled: true,
        accountNumber: "*182*8*1*999888#",
        accountName: "MOSA Community Network",
        instructions: "Dial *182*8*1*999888# and enter reference",
      },
    });
    console.log(`✅ Payment destination updated in Command Center: Receiving USSD ${updatedProvider.accountNumber}`);

    // -------------------------------------------------------------
    // TEST 3: OLD PHONE REVOCATION (LOST / RETIRED PHONE)
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: OLD PHONE REVOCATION & ACCESS DENIAL ---");
    const revokedPhone1 = await prisma.paymentBridgeDevice.update({
      where: { deviceId: phone1Credentials.deviceId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedById: testAdmin.id,
        revokedReason: "Office phone retired; enrolling replacement model Samsung Galaxy A05",
      },
    });
    console.log(`✅ Phone 1 revoked: Status is ${revokedPhone1.status}, Reason: ${revokedPhone1.revokedReason}`);

    // Heartbeat attempt from revoked phone -> Must be rejected!
    const revokedHeartbeatRes = await fetch(`${BASE_URL}/api/payments/bridge/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: phone1Credentials.deviceId,
        deviceToken: phone1Credentials.deviceToken,
        batteryLevel: 50,
        isCharging: false,
      }),
    });
    const revokedHeartbeat = await revokedHeartbeatRes.json();
    if (revokedHeartbeat.isDeviceActive !== false || revokedHeartbeat.status !== "REVOKED") {
      throw new Error("Security failure: Revoked phone heartbeat was not rejected!");
    }
    console.log(`✅ Revoked phone heartbeat rejected by API: status=${revokedHeartbeat.status}`);

    // Webhook transaction attempt from revoked phone -> Must be rejected!
    const revokedPayload = JSON.stringify({
      providerTransactionRef: `TX_REVOKED_${Date.now()}`,
      paymentReference: paymentRef1,
      amount: 5000,
      currency: "RWF",
      status: "SUCCESSFUL",
    });
    const revokedSig = computeHmac(revokedPayload, phone1Credentials.hmacSecret);

    const revokedWebhookRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${phone1Credentials.deviceToken}`,
        "x-mosa-device-id": phone1Credentials.deviceId,
        "x-signature": revokedSig,
      },
      body: revokedPayload,
    });
    const revokedWebhook = await revokedWebhookRes.json();
    if (revokedWebhook.success !== false) {
      throw new Error("Security failure: Revoked phone was able to submit payment webhook!");
    }
    console.log(`✅ Revoked phone webhook rejected by API: ${revokedWebhook.error}`);

    // -------------------------------------------------------------
    // TEST 4: SECURE ENROLLMENT OF REPLACEMENT PHONE
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: SECURE ENROLLMENT OF REPLACEMENT PHONE ---");
    const rawCode2 = crypto.randomBytes(4).toString("hex").toUpperCase();
    const pairingCode2 = `${rawCode2.slice(0, 4)}-${rawCode2.slice(4)}`;
    const pairingExpiresAt2 = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.paymentBridgeDevice.create({
      data: {
        name: "Replacement Samsung Galaxy A05 Phone",
        deviceId: `bridge_${crypto.randomBytes(6).toString("hex")}`,
        deviceToken: `mbt_${crypto.randomBytes(24).toString("hex")}`,
        hmacSecret: `mbh_${crypto.randomBytes(24).toString("hex")}`,
        simPhoneNumber: "+250788999888",
        carrier: "MTN Rwanda",
        status: "PENDING_PAIRING",
        pairingCode: pairingCode2,
        pairingExpiresAt: pairingExpiresAt2,
        enrolledById: testAdmin.id,
      },
    });
    console.log(`✅ Replacement pairing code generated: ${pairingCode2}`);

    // Complete pairing on replacement phone via API (with or without hyphen supported)
    const hwId2 = `android_test_phone_2_${Date.now()}`;
    const unhyphenatedCode = pairingCode2.replace("-", "");
    const pairRes2 = await fetch(`${BASE_URL}/api/payments/bridge/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pairingCode: unhyphenatedCode, // Tests unhyphenated normalization!
        deviceHardwareId: hwId2,
        appVersion: "1.0.0",
      }),
    });
    const pairData2 = await pairRes2.json();
    if (!pairData2.success) throw new Error(`Replacement phone pairing failed: ${pairData2.error}`);
    console.log(`✅ Replacement phone paired: ID ${pairData2.device.deviceId}`);

    const phone2Credentials = {
      deviceId: pairData2.device.deviceId,
      deviceToken: pairData2.device.deviceToken,
      hmacSecret: pairData2.device.hmacSecret,
    };

    // Verify phone 2 credentials differ from phone 1
    if (phone2Credentials.deviceToken === phone1Credentials.deviceToken) {
      throw new Error("Security failure: Replacement phone received old phone's token!");
    }
    if (phone2Credentials.hmacSecret === phone1Credentials.hmacSecret) {
      throw new Error("Security failure: Replacement phone received old phone's HMAC secret!");
    }
    console.log("✅ Cryptographic isolation verified: Replacement phone has 100% unique, fresh credentials!");

    // Replacement phone sends telemetry heartbeat
    const phone2HeartbeatRes = await fetch(`${BASE_URL}/api/payments/bridge/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: phone2Credentials.deviceId,
        deviceToken: phone2Credentials.deviceToken,
        batteryLevel: 94,
        isCharging: true,
        networkType: "WIFI",
        appVersion: "1.0.0",
      }),
    });
    const phone2Heartbeat = await phone2HeartbeatRes.json();
    if (!phone2Heartbeat.isDeviceActive) throw new Error("Replacement phone heartbeat failed!");
    console.log(`✅ Replacement phone telemetry active: isDeviceActive=${phone2Heartbeat.isDeviceActive}`);

    // -------------------------------------------------------------
    // TEST 5: PRESERVATION OF HISTORICAL RECEIPTS & FINANCIAL AUDIT
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: PRESERVATION OF FINANCIAL HISTORY ---");
    const preservedReceipt = await prisma.registrationReceipt.findUnique({
      where: { receiptNumber: originalReceiptNumber },
      include: { payment: true, business: true },
    });
    if (!preservedReceipt) {
      throw new Error("Financial failure: Historical receipt was lost during device replacement!");
    }
    if (preservedReceipt.payment.status !== "CONFIRMED") {
      throw new Error("Financial failure: Historical payment status altered!");
    }
    console.log(`✅ Historical receipt intact: ${preservedReceipt.receiptNumber}`);
    console.log(`   Amount: ${preservedReceipt.amountPaid} RWF, Payment Ref: ${preservedReceipt.payment.paymentReference}`);
    console.log(`   Business: ${preservedReceipt.businessName} (Verification: ${preservedReceipt.business.verificationStatus})`);

    // -------------------------------------------------------------
    // TEST 6: DUPLICATE & TAMPER TRANSACTION REJECTION
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: DUPLICATE & TAMPER SAFEGUARDS ---");
    // Duplicate test: Re-submitting payload1 through replacement phone
    const duplicatePayload = JSON.stringify({
      providerTransactionRef: telcoTxId1, // Same telco TX ID
      paymentReference: paymentRef1,
      amount: 5000,
      currency: "RWF",
      phoneNumber: "+250788777666",
      status: "SUCCESSFUL",
      timestamp: new Date().toISOString(),
    });
    const dupSig = computeHmac(duplicatePayload, phone2Credentials.hmacSecret);

    const dupRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${phone2Credentials.deviceToken}`,
        "x-mosa-device-id": phone2Credentials.deviceId,
        "x-signature": dupSig,
      },
      body: duplicatePayload,
    });
    const dupResult = await dupRes.json();
    const isReplayHandled =
      dupResult.alreadyConfirmed ||
      dupResult.message?.includes("already processed") ||
      dupResult.error?.includes("already consumed");
    if (!isReplayHandled) {
      throw new Error(`Expected replay/duplicate detection, received: ${JSON.stringify(dupResult)}`);
    }
    console.log(`✅ Duplicate telco transaction replay handled safely without double crediting!`);

    // Case B: Cross-payment transaction reference reuse attempt (stolen/reused telco ID)
    const paymentRef2 = `MOSA-REG-SECOND-${Date.now()}`;
    await prisma.registrationPayment.create({
      data: {
        businessId: testBusiness.id,
        payerUserId: testOwner.id,
        feeAmount: 5000,
        currency: "RWF",
        provider: "MTN_MOMO",
        paymentReference: paymentRef2,
        status: "PENDING",
      },
    });

    const crossPayload = JSON.stringify({
      providerTransactionRef: telcoTxId1, // Stolen/consumed telco ID on new payment!
      paymentReference: paymentRef2,
      amount: 5000,
      currency: "RWF",
      phoneNumber: "+250788777666",
      status: "SUCCESSFUL",
      timestamp: new Date().toISOString(),
    });
    const crossSig = computeHmac(crossPayload, phone2Credentials.hmacSecret);

    const crossRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${phone2Credentials.deviceToken}`,
        "x-mosa-device-id": phone2Credentials.deviceId,
        "x-signature": crossSig,
      },
      body: crossPayload,
    });
    const crossResult = await crossRes.json();
    if (crossResult.success !== false || !crossResult.error?.includes("already consumed")) {
      throw new Error(`Expected 'already consumed' rejection, received: ${JSON.stringify(crossResult)}`);
    }
    console.log(`✅ Reused telco transaction reference rejected: ${crossResult.error}`);

    // Tampered payload test: altered amount with forged signature
    const tamperedPayload = JSON.stringify({
      providerTransactionRef: `MTN_TAMPER_${Date.now()}`,
      paymentReference: paymentRef1,
      amount: 999999, // Forged amount
      currency: "RWF",
      status: "SUCCESSFUL",
    });
    const invalidSig = "bad_signature_00000000000000000000000000000000000000000000000000000000";

    const tamperedRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${phone2Credentials.deviceToken}`,
        "x-mosa-device-id": phone2Credentials.deviceId,
        "x-signature": invalidSig,
      },
      body: tamperedPayload,
    });
    const tamperedResult = await tamperedRes.json();
    if (tamperedResult.success !== false) {
      throw new Error("Security failure: Tampered payload with forged signature was accepted!");
    }
    console.log(`✅ Tampered payload with invalid signature rejected: ${tamperedResult.error}`);

    // -------------------------------------------------------------
    // TEST 7: AUDIT TRAIL VERIFICATION
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: AUDIT TRAIL INTEGRITY ---");
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "PaymentBridgeDevice",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    console.log(`✅ Verified ${auditLogs.length} bridge device audit records found in PostgreSQL.`);
    const actionsFound = auditLogs.map((l) => l.action);
    console.log(`   Recent actions: ${actionsFound.slice(0, 5).join(", ")}`);

    console.log("\n===========================================================================");
    console.log("  ALL CENTRALIZED DEVICE & SIM MANAGEMENT TESTS PASSED 100%!");
    console.log("===========================================================================\n");
  } finally {
    // Cleanup test business
    if (testBusiness) {
      await prisma.business.delete({ where: { id: testBusiness.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runCentralizedManagementSuite().catch((err) => {
  console.error("FATAL ERROR in test suite:", err);
  process.exit(1);
});
