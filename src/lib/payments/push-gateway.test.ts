import { prisma } from "@/lib/prisma";
import {
  normalizeRwandaPhone,
  detectCarrierAndValidate,
  requestMobileMoneyPayment,
  checkAndReconcilePaymentStatus,
  simulateSandboxCustomerAction,
} from "./push-gateway";

let testAdminId: string;
let testOwnerId: string;
let testBusinessId: string;

async function setup() {
  console.log("Setting up Push Gateway test environment...");

  // 1. Create or fetch test admin
  let admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "Test Admin Push",
        email: `push-admin-${Date.now()}@mosa.rw`,
        role: "SUPER_ADMIN",
        passwordHash: "dummy-hash",
        referralCode: `ADM_PUSH_${Date.now()}`,
      },
    });
  }
  testAdminId = admin.id;

  // 2. Create test owner user with unique phone
  const testPhone = `+25078${Math.floor(1000000 + Math.random() * 9000000)}`;
  const owner = await prisma.user.create({
    data: {
      name: "Push Gateway Test Owner",
      email: `push-owner-${Date.now()}@mosa.rw`,
      phone: testPhone,
      role: "BUSINESS_OWNER",
      passwordHash: "dummy-hash",
      referralCode: `OWN_PUSH_${Date.now()}`,
    },
  });
  testOwnerId = owner.id;

  // 3. Create test business
  const biz = await prisma.business.create({
    data: {
      name: `Push Test Business ${Date.now()}`,
      description: "Business for testing UrubutoPay-style mobile money push checkout",
      category: "retail_shops",
      categoryDisplay: "Retail Shops",
      ownerId: testOwnerId,
      phone: testPhone,
      status: "PENDING",
      renewalStatus: "CURRENT",
      latitude: -1.981,
      longitude: 30.046,
    },
  });
  testBusinessId = biz.id;

  console.log("✓ Push Gateway test environment ready.");
}

async function runTests() {
  await setup();

  console.log("\n--- TEST SUITE: Push Gateway & UrubutoPay-Style Mobile Money ---\n");

  // -------------------------------------------------------------
  // Test 1: Phone Normalization
  // -------------------------------------------------------------
  console.log("Test 1: Phone Normalization");
  const t1_mtn = normalizeRwandaPhone("0788123456");
  const t1_airtel = normalizeRwandaPhone("0729974065");
  const t1_formatted = normalizeRwandaPhone("+250 788-123.456");
  const t1_raw = normalizeRwandaPhone("250788123456");
  const t1_invalid = normalizeRwandaPhone("12345");

  if (t1_mtn !== "+250788123456") throw new Error(`Expected +250788123456, got ${t1_mtn}`);
  if (t1_airtel !== "+250729974065") throw new Error(`Expected +250729974065, got ${t1_airtel}`);
  if (t1_formatted !== "+250788123456") throw new Error(`Expected +250788123456, got ${t1_formatted}`);
  if (t1_raw !== "+250788123456") throw new Error(`Expected +250788123456, got ${t1_raw}`);
  if (t1_invalid !== "12345") throw new Error(`Expected invalid input unchanged, got ${t1_invalid}`);
  console.log("✓ Test 1 Passed: Rwandan phone numbers normalized accurately.");

  // -------------------------------------------------------------
  // Test 2: Carrier Detection & Validation
  // -------------------------------------------------------------
  console.log("\nTest 2: Carrier Detection & Validation");
  const c_mtn = detectCarrierAndValidate("0788123456", "MTN_MOMO");
  if (!c_mtn.isValid || c_mtn.detectedCarrier !== "MTN_MOMO" || !c_mtn.matchesSelectedProvider) {
    throw new Error(`MTN MoMo detection failed: ${JSON.stringify(c_mtn)}`);
  }

  const c_airtel = detectCarrierAndValidate("0729974065", "AIRTEL_MONEY");
  if (!c_airtel.isValid || c_airtel.detectedCarrier !== "AIRTEL_MONEY" || !c_airtel.matchesSelectedProvider) {
    throw new Error(`Airtel Money detection failed: ${JSON.stringify(c_airtel)}`);
  }

  const c_mismatch = detectCarrierAndValidate("0788123456", "AIRTEL_MONEY");
  if (!c_mismatch.isValid || c_mismatch.detectedCarrier !== "MTN_MOMO" || c_mismatch.matchesSelectedProvider) {
    throw new Error(`Carrier mismatch detection failed: ${JSON.stringify(c_mismatch)}`);
  }

  const c_invalid = detectCarrierAndValidate("0712345678");
  if (c_invalid.isValid || c_invalid.detectedCarrier !== "UNKNOWN") {
    throw new Error(`Invalid prefix detection failed: ${JSON.stringify(c_invalid)}`);
  }
  console.log("✓ Test 2 Passed: Carrier detection, prefix identification, and cross-channel mismatch correctly identified.");

  // -------------------------------------------------------------
  // Test 3A: Strict Production Protection (Missing Credentials Honestly Reported)
  // -------------------------------------------------------------
  console.log("\nTest 3A: Strict Production Protection (No False Approvals without Keys)");
  process.env.ENABLE_PAYMENT_SIMULATOR = "false";
  (process.env as any).NODE_ENV = "production";

  const refProdCheck = `MOSA-REG-${Date.now()}-PRODCHECK`;
  await prisma.registrationPayment.create({
    data: {
      businessId: testBusinessId,
      payerUserId: testOwnerId,
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      paymentType: "REGISTRATION",
      phoneNumber: "+250788123456",
      paymentReference: refProdCheck,
      status: "PENDING",
    },
  });

  const strictProdResult = await requestMobileMoneyPayment({
    paymentReference: refProdCheck,
    amount: 5000,
    currency: "RWF",
    phoneNumber: "+250788123456",
    provider: "MTN_MOMO",
  });
  if (strictProdResult.success || !strictProdResult.missingRequirements || strictProdResult.missingRequirements.length === 0) {
    throw new Error(`Strict production check failed: did not report missing carrier keys: ${JSON.stringify(strictProdResult)}`);
  }
  console.log(`✓ Test 3A Passed: Production security confirmed — unconfigured carrier keys honestly reported: ${strictProdResult.missingRequirements.join(", ")}`);

  // -------------------------------------------------------------
  // Test 3B: Mobile Money Push Request Dispatch (Simulator / Test Mode)
  // -------------------------------------------------------------
  console.log("\nTest 3B: Mobile Money Push Request Dispatch in Sandbox Simulator");
  process.env.ENABLE_PAYMENT_SIMULATOR = "true";

  const refMtn = `MOSA-REG-${Date.now()}-MTN1`;
  await prisma.registrationPayment.create({
    data: {
      businessId: testBusinessId,
      payerUserId: testOwnerId,
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      paymentType: "REGISTRATION",
      phoneNumber: "+250788123456",
      paymentReference: refMtn,
      status: "PENDING",
    },
  });

  const pushMtn = await requestMobileMoneyPayment({
    paymentReference: refMtn,
    amount: 5000,
    currency: "RWF",
    phoneNumber: "+250788123456",
    provider: "MTN_MOMO",
  });
  if (!pushMtn.success || !pushMtn.promptDispatched) {
    throw new Error(`MTN push dispatch failed: ${JSON.stringify(pushMtn)}`);
  }
  if (!pushMtn.message.includes("PIN") && !pushMtn.message.includes("MTN") && !pushMtn.message.includes("phone")) {
    throw new Error(`MTN push prompt missing approval instructions: ${pushMtn.message}`);
  }

  const refAirtel = `MOSA-REG-${Date.now()}-AIR1`;
  await prisma.registrationPayment.create({
    data: {
      businessId: testBusinessId,
      payerUserId: testOwnerId,
      feeAmount: 5000,
      currency: "RWF",
      provider: "AIRTEL_MONEY",
      paymentType: "REGISTRATION",
      phoneNumber: "+250729974065",
      paymentReference: refAirtel,
      status: "PENDING",
    },
  });

  const pushAirtel = await requestMobileMoneyPayment({
    paymentReference: refAirtel,
    amount: 5000,
    currency: "RWF",
    phoneNumber: "+250729974065",
    provider: "AIRTEL_MONEY",
  });
  if (!pushAirtel.success || !pushAirtel.promptDispatched) {
    throw new Error(`Airtel push dispatch failed: ${JSON.stringify(pushAirtel)}`);
  }
  if (!pushAirtel.message.includes("PIN") && !pushAirtel.message.includes("Airtel") && !pushAirtel.message.includes("phone")) {
    throw new Error(`Airtel push prompt missing approval instructions: ${pushAirtel.message}`);
  }
  console.log("✓ Test 3B Passed: Payment push prompts dispatched with promptDispatched=true and carrier instructions.");

  // -------------------------------------------------------------
  // Test 4: Database Registration Payment Creation & PENDING Status
  // -------------------------------------------------------------
  console.log("\nTest 4: Payment Database Lifecycle - Initial PENDING state");
  const testRef = `MOSA-REG-${Date.now()}-LIFECYCLE`;
  const paymentRecord = await prisma.registrationPayment.create({
    data: {
      businessId: testBusinessId,
      payerUserId: testOwnerId,
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      paymentType: "REGISTRATION",
      phoneNumber: "+250788123456",
      paymentReference: testRef,
      providerTransactionRef: `TEST-TXN-${Date.now()}-LIFECYCLE`,
      status: "PENDING",
    },
  });

  const checkPending = await checkAndReconcilePaymentStatus(testRef);
  if (checkPending.status !== "PENDING" || checkPending.isConfirmed) {
    throw new Error(`Expected PENDING status, got: ${JSON.stringify(checkPending)}`);
  }
  console.log("✓ Test 4 Passed: Status reconciliation accurately identifies active PENDING payments.");

  // -------------------------------------------------------------
  // Test 5: Customer Approval Simulation & Instant Business Activation
  // -------------------------------------------------------------
  console.log("\nTest 5: Customer Approval Simulation (PIN confirmation on phone)");
  const approvalResult: any = await simulateSandboxCustomerAction({
    paymentReference: testRef,
    action: "APPROVE",
  });
  if (!approvalResult.success || !approvalResult.receipt || approvalResult.payment?.status !== "CONFIRMED") {
    throw new Error(`Simulation approval failed: ${JSON.stringify(approvalResult)}`);
  }
  if (!approvalResult.receipt.receiptNumber.startsWith("MOSA-REC-")) {
    throw new Error(`Invalid receipt number: ${approvalResult.receipt.receiptNumber}`);
  }

  // Verify business was activated
  const updatedBiz = await prisma.business.findUnique({
    where: { id: testBusinessId },
  });
  if (updatedBiz?.status !== "ACTIVE") {
    throw new Error(`Business was not activated after approval: status is ${updatedBiz?.status}`);
  }

  // Verify audit log created
  const audit = await prisma.auditLog.findFirst({
    where: { entityId: testBusinessId, action: "PAYMENT_CONFIRMED_BUSINESS_ACTIVATED" },
  });
  if (!audit) {
    throw new Error("Audit log for PAYMENT_CONFIRMED_BUSINESS_ACTIVATED was not recorded.");
  }
  console.log("✓ Test 5 Passed: Customer PIN confirmation successfully confirmed payment, activated business, issued receipt, and logged audit entry.");

  // -------------------------------------------------------------
  // Test 6: Idempotency Protection - Duplicate Approvals
  // -------------------------------------------------------------
  console.log("\nTest 6: Idempotency Protection against Duplicate Settlement");
  const repeatApproval: any = await simulateSandboxCustomerAction({
    paymentReference: testRef,
    action: "APPROVE",
  });
  if (!repeatApproval.success || !repeatApproval.alreadyConfirmed) {
    throw new Error(`Repeat approval should gracefully return confirmed status with alreadyConfirmed: true.`);
  }

  const receiptCount = await prisma.registrationReceipt.count({
    where: { paymentId: paymentRecord.id },
  });
  if (receiptCount !== 1) {
    throw new Error(`Expected exactly 1 receipt for payment, found ${receiptCount}`);
  }
  console.log("✓ Test 6 Passed: Idempotent - subsequent approvals do not duplicate receipts or alter state.");

  // -------------------------------------------------------------
  // Test 7: Customer Rejection Simulation
  // -------------------------------------------------------------
  console.log("\nTest 7: Customer Phone Rejection Simulation");
  const testRefReject = `MOSA-REG-${Date.now()}-REJECT`;
  await prisma.registrationPayment.create({
    data: {
      businessId: testBusinessId,
      payerUserId: testOwnerId,
      feeAmount: 5000,
      currency: "RWF",
      provider: "AIRTEL_MONEY",
      paymentType: "REGISTRATION",
      phoneNumber: "+250729974065",
      paymentReference: testRefReject,
      status: "PENDING",
    },
  });

  const rejectResult = await simulateSandboxCustomerAction({
    paymentReference: testRefReject,
    action: "REJECT",
  });
  if (!rejectResult.success || rejectResult.payment?.status !== "CANCELLED") {
    throw new Error(`Expected CANCELLED status on rejection, got: ${JSON.stringify(rejectResult)}`);
  }
  console.log("✓ Test 7 Passed: Rejected prompt correctly transitions payment to CANCELLED.");

  // -------------------------------------------------------------
  // Test 8: Phone Prompt Timeout / Expiration Simulation
  // -------------------------------------------------------------
  console.log("\nTest 8: Phone Prompt Timeout Simulation (120s Expiry)");
  const testRefTimeout = `MOSA-REG-${Date.now()}-TIMEOUT`;
  await prisma.registrationPayment.create({
    data: {
      businessId: testBusinessId,
      payerUserId: testOwnerId,
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      paymentType: "REGISTRATION",
      phoneNumber: "+250788123456",
      paymentReference: testRefTimeout,
      status: "PENDING",
    },
  });

  const timeoutResult = await simulateSandboxCustomerAction({
    paymentReference: testRefTimeout,
    action: "TIMEOUT",
  });
  if (!timeoutResult.success || timeoutResult.payment?.status !== "EXPIRED") {
    throw new Error(`Expected EXPIRED status on timeout, got: ${JSON.stringify(timeoutResult)}`);
  }
  console.log("✓ Test 8 Passed: Prompt timeout correctly transitions payment to EXPIRED without activation.");

  console.log("\n=======================================================");
  console.log("ALL 8 PUSH GATEWAY & URUBUTOPAY TEST SCENARIOS PASSED!");
  console.log("=======================================================\n");
}

runTests()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Cleanup test records
    try {
      if (testBusinessId) {
        await prisma.registrationReceipt.deleteMany({ where: { businessId: testBusinessId } });
        await prisma.registrationPayment.deleteMany({ where: { businessId: testBusinessId } });
        await prisma.auditLog.deleteMany({ where: { entityId: testBusinessId } });
        await prisma.business.delete({ where: { id: testBusinessId } });
      }
      if (testOwnerId) {
        await prisma.user.delete({ where: { id: testOwnerId } });
      }
    } catch (e) {
      // Non-blocking cleanup
    }
    await prisma.$disconnect();
  });
