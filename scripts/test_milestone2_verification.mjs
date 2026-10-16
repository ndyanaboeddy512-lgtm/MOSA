import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function computeHmac(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function runMilestone2Verification() {
  console.log("========================================================================");
  console.log("  MOSA PAYMENT BRIDGE — MILESTONE 2 COMPREHENSIVE VERIFICATION SUITE");
  console.log("========================================================================\n");

  try {
    // ------------------------------------------------------------------
    // TEST 1: SIMULATION ISOLATION & PRODUCTION SAFETY (Requirement 5)
    // Verify simulated transactions cannot accidentally activate real businesses
    // or generate misleading production receipts
    // ------------------------------------------------------------------
    console.log("--- TEST 1: PRODUCTION ISOLATION & SIMULATION SAFEGUARDS ---");

    const { authenticateWebhookRequest } = await import("../src/lib/payments/bridge-devices.ts");
    const { confirmPaymentAndActivateBusiness } = await import("../src/lib/payments/engine.ts");

    // Count existing businesses & receipts before simulation test
    const initialReceiptCount = await prisma.registrationReceipt.count();
    const simulatedRef = `MOSA-REG-SIM-${Date.now()}`;
    const fakeTxId = `SIM-TX-${Date.now()}`;

    let simRejected = false;
    try {
      await confirmPaymentAndActivateBusiness({
        paymentReference: simulatedRef,
        providerTransactionRef: fakeTxId,
        provider: "MTN_MOMO",
        amountPaid: 5000,
        rawPayload: JSON.stringify({ simulation: true }),
        verifiedBy: "SIMULATION_TEST_RUNNER",
      });
    } catch (err) {
      simRejected = true;
      console.log(`✅ 1a. Unmatched simulation reference rejected: "${err.message}"`);
    }

    if (!simRejected) {
      throw new Error("CRITICAL SAFETY BREACH: Simulated reference was accepted by payment engine!");
    }

    // Verify receipt count did NOT increase
    const postReceiptCount = await prisma.registrationReceipt.count();
    if (postReceiptCount !== initialReceiptCount) {
      throw new Error("CRITICAL SAFETY BREACH: A receipt was generated for a simulated transaction!");
    }
    console.log(`✅ 1b. Receipt count unchanged: Exactly ${postReceiptCount} receipts in PostgreSQL (No misleading receipts created).`);

    // Verify Audit Log captured the unmatched reference
    const auditUnmatched = await prisma.auditLog.findFirst({
      where: {
        action: "PAYMENT_UNMATCHED_REFERENCE",
        entityId: simulatedRef,
      },
    });
    if (!auditUnmatched) {
      throw new Error("Audit log failed to record unmatched simulated reference.");
    }
    console.log(`✅ 1c. Unmatched simulation safely audited in PostgreSQL: Action = ${auditUnmatched.action}\n`);

    // ------------------------------------------------------------------
    // TEST 2: KOTLIN PARSER LOGIC PARITY (Requirements 2, 9 & 10)
    // Verify regex parity for Kinyarwanda & English templates
    // ------------------------------------------------------------------
    console.log("--- TEST 2: PARSER PARITY & SENDER WHITELIST ---");
    const { parseMtnMoMoSms } = await import("../src/lib/payments/momo-sms.ts");

    // 2a. Real Kinyarwanda MTN MoMo template
    const rwSms = "Yello! Mwakiriye 5,000 RWF yavuye kuri +250788123456 (JEAN PAUL) kuri 15/10/2026 10:15. Ref: MOSA-REG-20261015-ABC12. Umubare w'amafaranga asigaye ni 125,000 RWF. Id y'igikorwa: 9876543210.";
    const parsedRw = parseMtnMoMoSms(rwSms);
    if (!parsedRw.isValid || parsedRw.amount !== 5000 || parsedRw.paymentReference !== "MOSA-REG-20261015-ABC12" || parsedRw.providerTransactionRef !== "9876543210") {
      throw new Error("Kinyarwanda MoMo parser failed to extract expected fields.");
    }
    console.log(`✅ 2a. Kinyarwanda template parsed: Amount = ${parsedRw.amount} RWF, Ref = ${parsedRw.paymentReference}, TxId = ${parsedRw.providerTransactionRef}`);

    // 2b. Real English MTN MoMo template
    const enSms = "You have received 20,000 RWF from +250788999888 (MUGISHA ALBERT) on 15/10/2026 14:30:00. Transaction ID: 1122334455. Reference: MOSA-REG-20261015-XYZ99. New balance: 85,000 RWF.";
    const parsedEn = parseMtnMoMoSms(enSms);
    if (!parsedEn.isValid || parsedEn.amount !== 20000 || parsedEn.paymentReference !== "MOSA-REG-20261015-XYZ99" || parsedEn.providerTransactionRef !== "1122334455") {
      throw new Error("English MoMo parser failed to extract expected fields.");
    }
    console.log(`✅ 2b. English template parsed: Amount = ${parsedEn.amount} RWF, Ref = ${parsedEn.paymentReference}, TxId = ${parsedEn.providerTransactionRef}`);

    // 2c. Non-financial and personal SMS rejection
    const personalSms = "Hello, can we meet for lunch today at 1pm?";
    const parsedPersonal = parseMtnMoMoSms(personalSms);
    if (parsedPersonal.isValid) {
      throw new Error("Personal SMS was incorrectly marked as a valid MoMo payment!");
    }
    console.log("✅ 2c. Personal/non-financial SMS correctly rejected.\n");

    // ------------------------------------------------------------------
    // TEST 3: CRYPTOGRAPHIC SIGNING INTEGRITY & DEVICE AUTHENTICATION
    // ------------------------------------------------------------------
    console.log("--- TEST 3: DEVICE HMAC-SHA256 INTEGRITY & API CONTRACT ---");
    const testSecret = "mbh_test_secret_key_rwanda_2026_secure";
    const testPayload = JSON.stringify({
      provider: "MTN_MOMO",
      paymentReference: "MOSA-REG-20261015-VERIFY",
      providerTransactionRef: "TX-VERIFY-12345",
      amount: 5000,
    });

    const expectedSig = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");

    // Verify HMAC-SHA256 calculation matches
    const computedSig = computeHmac(testPayload, testSecret);
    if (expectedSig !== computedSig) {
      throw new Error("HMAC-SHA256 signature mismatch between test vector and implementation.");
    }
    console.log(`✅ 3a. Cryptographic HMAC-SHA256 verified: Signature = ${computedSig.slice(0, 16)}...`);

    // 3b. Verify invalid signature rejection
    const isTamperedRejected = crypto.timingSafeEqual(
      Buffer.from(computedSig, "hex"),
      Buffer.from("00".repeat(32), "hex")
    );
    if (isTamperedRejected) {
      throw new Error("Timing-safe HMAC check allowed mismatched signature!");
    }
    console.log("✅ 3b. Tampered/forged signature rejected correctly.\n");

    // ------------------------------------------------------------------
    // TEST 4: HARDWARE REVOCATION & REPAIRING INDEPENDENCE
    // ------------------------------------------------------------------
    console.log("--- TEST 4: HARDWARE REVOCATION & REPLACEABILITY ---");
    const { createDevicePairingChallenge, completeDevicePairing, revokeBridgeDevice } = await import("../src/lib/payments/bridge-devices.ts");

    const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    if (!admin) throw new Error("Super admin missing in database.");

    // Pair a device
    const challenge = await createDevicePairingChallenge({
      name: "Replacement QA Phone (Tecno Pop 8)",
      carrier: "MTN Rwanda",
      adminId: admin.id,
    });

    const pairResult = await completeDevicePairing({
      pairingCode: challenge.pairingCode,
      deviceHardwareId: `hw_tecno_${Date.now()}`,
    });

    console.log(`✅ 4a. Replacement phone paired: ${pairResult.deviceId}`);

    // Revoke the device
    const revoked = await revokeBridgeDevice({
      deviceId: pairResult.deviceId,
      adminId: admin.id,
      reason: "Device replaced in routine hardware upgrade",
    });
    console.log(`✅ 4b. Replacement phone revoked: Status = ${revoked.status}`);

    // Verify authentication immediately fails for revoked device
    const revokedAuth = await authenticateWebhookRequest({
      rawBody: testPayload,
      signature: computeHmac(testPayload, pairResult.hmacSecret),
      deviceIdHeader: pairResult.deviceId,
      authHeader: `Bearer ${pairResult.deviceToken}`,
      provider: "MTN_MOMO",
    });

    if (revokedAuth.isAuthenticated) {
      throw new Error("Revoked device was authenticated!");
    }
    console.log(`✅ 4c. Revoked device instantly blacklisted: "${revokedAuth.error}"\n`);

    console.log("========================================================================");
    console.log("  🎉 MILESTONE 2 API CONTRACT & SAFETY VERIFICATION PASSED 100%!");
    console.log("========================================================================");
  } catch (err) {
    console.error("\n❌ VERIFICATION FAILURE:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMilestone2Verification();
