import { prisma } from "@/lib/prisma";
import { POST as simulateActionPost } from "@/app/api/payments/simulate-action/route";
import { POST as initiatePaymentPost } from "@/app/api/payments/initiate/route";
import { GET as statusPaymentGet } from "@/app/api/payments/status/route";
import { simulateSandboxCustomerAction, checkAndReconcilePaymentStatus } from "@/lib/payments/push-gateway";
import { checkPaymentRateLimit } from "@/lib/payments/rate-limiter";
import { NextRequest } from "next/server";

// Mock auth module dynamically for role testing
let mockCurrentUser: any = null;
jest_mock_auth: {
  // We will pass auth via headers or mock auth helper
}

async function runSecurityAuditTests() {
  console.log("=================================================================");
  console.log("55 MOSA — CRITICAL PAYMENT SECURITY & AUTHORIZATION REGRESSION SUITE");
  console.log("=================================================================\n");

  const testSuffix = Date.now().toString().slice(-6);

  // Setup test users
  const ownerA = await prisma.user.create({
    data: {
      phone: `+25078${Math.floor(1000000 + Math.random() * 9000000)}`,
      name: `Owner A ${testSuffix}`,
      role: "BUSINESS_OWNER",
      status: "ACTIVE",
      referralCode: `REF-A-${testSuffix}`,
    },
  });

  const ownerB = await prisma.user.create({
    data: {
      phone: `+25078${Math.floor(1000000 + Math.random() * 9000000)}`,
      name: `Owner B ${testSuffix}`,
      role: "BUSINESS_OWNER",
      status: "ACTIVE",
      referralCode: `REF-B-${testSuffix}`,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      phone: `+25078${Math.floor(1000000 + Math.random() * 9000000)}`,
      name: `Customer ${testSuffix}`,
      role: "CUSTOMER",
      status: "ACTIVE",
      referralCode: `REF-C-${testSuffix}`,
    },
  });

  const agentUser = await prisma.user.create({
    data: {
      phone: `+25078${Math.floor(1000000 + Math.random() * 9000000)}`,
      name: `Agent ${testSuffix}`,
      role: "COMMUNITY_AGENT",
      status: "ACTIVE",
      referralCode: `REF-D-${testSuffix}`,
    },
  });

  const superAdminUser = await prisma.user.create({
    data: {
      phone: `+25078${Math.floor(1000000 + Math.random() * 9000000)}`,
      name: `Super Admin ${testSuffix}`,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      referralCode: `REF-E-${testSuffix}`,
    },
  });

  // Setup test business for Owner A
  const testBizA = await prisma.business.create({
    data: {
      name: `Security Test Business A ${testSuffix}`,
      description: "Test Retail Store in Kigali",
      category: "retail_shops",
      categoryDisplay: "Retail Shops",
      ownerId: ownerA.id,
      phone: ownerA.phone || "+250788123456",
      status: "PENDING",
      renewalStatus: "CURRENT",
      latitude: -1.944,
      longitude: 30.061,
    },
  });

  // Create simulated pending payment for Business A
  const simPaymentRef = `MOSA-REG-SIM-${Date.now()}`;
  const simPayment = await prisma.registrationPayment.create({
    data: {
      businessId: testBizA.id,
      payerUserId: ownerA.id,
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      paymentReference: simPaymentRef,
      providerTransactionRef: `MTN-REQ-${Date.now()}`,
      status: "PENDING",
      rawCallbackPayload: JSON.stringify({ simulated: true }),
    },
  });

  // Create real-carrier-like payment for Business A
  const realPaymentRef = `MOSA-REG-REAL-${Date.now()}`;
  const realPayment = await prisma.registrationPayment.create({
    data: {
      businessId: testBizA.id,
      payerUserId: ownerA.id,
      feeAmount: 5000,
      currency: "RWF",
      provider: "MTN_MOMO",
      paymentReference: realPaymentRef,
      providerTransactionRef: `REAL-CARRIER-UUID-${Date.now()}`,
      status: "PENDING",
      rawCallbackPayload: JSON.stringify({ realDispatched: true }),
    },
  });

  // -------------------------------------------------------------
  // TEST 1: Anonymous Caller Blocked from simulate-action
  // -------------------------------------------------------------
  console.log("--- TEST 1: Anonymous Caller Blocked from simulate-action ---");
  const anonReq = new NextRequest("http://localhost:3000/api/payments/simulate-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentReference: simPaymentRef, action: "APPROVE" }),
  });
  const anonRes = await simulateActionPost(anonReq);
  const anonData = await anonRes.json();
  if (anonRes.status !== 403 || anonData.success !== false) {
    throw new Error(`TEST 1 FAILED: Anonymous user was not denied HTTP 403! Got: ${anonRes.status}`);
  }
  console.log("✓ Test 1 Passed: Anonymous user strictly received HTTP 403 Forbidden.");

  // Helper to create session token for role testing
  const { createSessionToken } = await import("@/lib/auth");

  async function callSimulateActionWithUser(user: any, body: any) {
    const token = await createSessionToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
    });
    const req = new NextRequest("http://localhost:3000/api/payments/simulate-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `mosa_session=${token}`,
      },
      body: JSON.stringify(body),
    });
    return await simulateActionPost(req);
  }

  // -------------------------------------------------------------
  // TEST 2: BUSINESS_OWNER Role Blocked from simulate-action
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: BUSINESS_OWNER Role Blocked from simulate-action ---");
  const ownerRes = await callSimulateActionWithUser(ownerA, {
    paymentReference: simPaymentRef,
    action: "APPROVE",
  });
  const ownerData = await ownerRes.json();
  if (ownerRes.status !== 403 || ownerData.success !== false) {
    throw new Error(`TEST 2 FAILED: BUSINESS_OWNER was not denied HTTP 403! Got: ${ownerRes.status}`);
  }
  console.log("✓ Test 2 Passed: BUSINESS_OWNER strictly received HTTP 403 Forbidden.");

  // -------------------------------------------------------------
  // TEST 3: CUSTOMER and COMMUNITY_AGENT Roles Blocked
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: CUSTOMER & COMMUNITY_AGENT Roles Blocked ---");
  const custRes = await callSimulateActionWithUser(customerUser, {
    paymentReference: simPaymentRef,
    action: "APPROVE",
  });
  if (custRes.status !== 403) {
    throw new Error(`TEST 3 FAILED: CUSTOMER was not denied HTTP 403! Got: ${custRes.status}`);
  }

  const agentRes = await callSimulateActionWithUser(agentUser, {
    paymentReference: simPaymentRef,
    action: "APPROVE",
  });
  if (agentRes.status !== 403) {
    throw new Error(`TEST 3 FAILED: COMMUNITY_AGENT was not denied HTTP 403! Got: ${agentRes.status}`);
  }
  console.log("✓ Test 3 Passed: CUSTOMER and COMMUNITY_AGENT strictly received HTTP 403 Forbidden.");

  // -------------------------------------------------------------
  // TEST 4: Production Mode Simulation Denial (Public Flag Cannot Bypass)
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Production Configuration Simulation Denial ---");
  const prevEnv = process.env.NODE_ENV;
  const prevDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH;
  const prevStaging = process.env.ALLOW_STAGING_PAYMENT_SIMULATION;

  try {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH = "true"; // Client-side public variable
    delete process.env.ALLOW_STAGING_PAYMENT_SIMULATION; // No server-side staging flag

    // Even SUPER_ADMIN must be rejected in strict production without ALLOW_STAGING_PAYMENT_SIMULATION
    const prodRes = await callSimulateActionWithUser(superAdminUser, {
      paymentReference: simPaymentRef,
      action: "APPROVE",
    });
    const prodData = await prodRes.json();
    if (prodRes.status !== 403 || !prodData.error.includes("strictly forbidden in production")) {
      throw new Error(`TEST 4 FAILED: Production check did not reject simulator! Got: ${prodRes.status}`);
    }
    console.log("✓ Test 4 Passed: Production strictly forbids simulation; public demo switch cannot bypass it.");
  } finally {
    (process.env as any).NODE_ENV = prevEnv;
    if (prevDemo) process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH = prevDemo;
    else delete process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH;
    if (prevStaging) process.env.ALLOW_STAGING_PAYMENT_SIMULATION = prevStaging;
  }

  // -------------------------------------------------------------
  // TEST 5: Cannot Simulate Real Carrier or Bank Transfer Payment
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Real Carrier & Bank Transfer Protection ---");
  let realErrorCaught = false;
  try {
    process.env.ALLOW_STAGING_PAYMENT_SIMULATION = "true";
    await simulateSandboxCustomerAction({
      paymentReference: realPaymentRef,
      action: "APPROVE",
    });
  } catch (err: any) {
    realErrorCaught = true;
    if (!err.message.includes("Cannot simulate action on a real carrier payment")) {
      throw new Error(`TEST 5 FAILED: Unexpected error message: ${err.message}`);
    }
  } finally {
    delete process.env.ALLOW_STAGING_PAYMENT_SIMULATION;
  }

  if (!realErrorCaught) {
    throw new Error("TEST 5 FAILED: Simulation was permitted on real carrier payment!");
  }
  console.log("✓ Test 5 Passed: Real carrier payment simulation strictly rejected.");

  // -------------------------------------------------------------
  // TEST 6: Payment Rate Limiter Enforcement
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Payment Endpoint Rate Limiting ---");
  const testIpKey = `test-ip-${Date.now()}`;
  
  // Test rate limit helper: limit 3
  const rl1 = await checkPaymentRateLimit({ key: testIpKey, limit: 3, windowSeconds: 30 });
  const rl2 = await checkPaymentRateLimit({ key: testIpKey, limit: 3, windowSeconds: 30 });
  const rl3 = await checkPaymentRateLimit({ key: testIpKey, limit: 3, windowSeconds: 30 });
  const rl4 = await checkPaymentRateLimit({ key: testIpKey, limit: 3, windowSeconds: 30 });

  if (!rl1.isAllowed || !rl2.isAllowed || !rl3.isAllowed) {
    throw new Error("TEST 6 FAILED: Legitimate requests within limit were rejected!");
  }
  if (rl4.isAllowed || rl4.retryAfterSeconds <= 0) {
    throw new Error("TEST 6 FAILED: Request exceeding limit was not blocked!");
  }
  console.log("✓ Test 6 Passed: Shared rate limiter blocks excess requests with accurate retryAfter header.");

  // -------------------------------------------------------------
  // TEST 7: Cross-Customer Payment Isolation
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Cross-Customer Payment Isolation ---");
  const tokenOwnerB = await createSessionToken({
    userId: ownerB.id,
    phone: ownerB.phone,
    role: ownerB.role,
    name: ownerB.name,
  });

  // Owner B attempting to query Owner A's payment status
  const crossReq = new NextRequest(`http://localhost:3000/api/payments/status?reference=${simPaymentRef}`, {
    method: "GET",
    headers: {
      cookie: `mosa_session=${tokenOwnerB}`,
    },
  });
  const crossRes = await statusPaymentGet(crossReq);
  if (crossRes.status !== 404) {
    throw new Error(`TEST 7 FAILED: Cross-customer payment snooping did not return 404! Got: ${crossRes.status}`);
  }
  console.log("✓ Test 7 Passed: Cross-customer payment snooping strictly returns HTTP 404 Not Found.");

  // Anonymous attempting to query by businessId alone
  const anonBizReq = new NextRequest(`http://localhost:3000/api/payments/status?businessId=${testBizA.id}`, {
    method: "GET",
  });
  const anonBizRes = await statusPaymentGet(anonBizReq);
  if (anonBizRes.status !== 401) {
    throw new Error(`TEST 7B FAILED: Anonymous businessId probing did not return 401! Got: ${anonBizRes.status}`);
  }
  console.log("✓ Test 7B Passed: Anonymous business payment probing without exact reference strictly returns HTTP 401.");

  // -------------------------------------------------------------
  // TEST 8: Provider Status Polling Without Keys Keeps Pending
  // -------------------------------------------------------------
  console.log("\n--- TEST 8: Provider Status Polling Invariant ---");
  const pollStatus = await checkAndReconcilePaymentStatus(simPaymentRef);
  if (pollStatus.isConfirmed || pollStatus.status !== "PENDING") {
    throw new Error("TEST 8 FAILED: Polling prematurely confirmed payment without authoritative settlement!");
  }
  console.log("✓ Test 8 Passed: Provider reconciliation strictly preserves PENDING state when unconfigured.");

  // Cleanup test records
  await prisma.registrationPayment.deleteMany({
    where: { paymentReference: { in: [simPaymentRef, realPaymentRef] } },
  });
  await prisma.business.delete({ where: { id: testBizA.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [ownerA.id, ownerB.id, customerUser.id, agentUser.id, superAdminUser.id] } },
  });

  console.log("\n=================================================================");
  console.log("ALL 8 CRITICAL SECURITY & REGRESSION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================================");
}

runSecurityAuditTests()
  .catch((err) => {
    console.error("\nTEST SUITE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
