import { prisma } from "@/lib/prisma";
import { POST as simulateActionPost } from "@/app/api/payments/simulate-action/route";
import { POST as initiatePaymentPost } from "@/app/api/payments/initiate/route";
import { GET as statusPaymentGet } from "@/app/api/payments/status/route";
import { GET as bridgeDevicesGet, POST as bridgeDevicesPost } from "@/app/api/admin/payments/bridge/devices/route";
import { simulateSandboxCustomerAction, checkAndReconcilePaymentStatus } from "@/lib/payments/push-gateway";
import { checkPaymentRateLimit } from "@/lib/payments/rate-limiter";
import { recordDeviceHeartbeat } from "@/lib/payments/bridge-devices";
import {
  getCanonicalServerUrl,
  getApprovedDomains,
  getDomainMigrationState,
  validateCustomDomainSyntax,
  isDomainAuthorized,
  submitCustomDomain,
  verifyCustomDomain,
  activateCustomDomain,
  rollbackCustomDomain,
} from "@/lib/domain-config";
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
  // -------------------------------------------------------------
  // TEST 9: Command Center Bridge Authorization & Secret Redaction
  // -------------------------------------------------------------
  console.log("\n--- TEST 9: Command Center Bridge Server-Side Authorization & Redaction ---");
  // 9A: Anonymous call to GET bridge devices must fail with 403
  const anonBridgeGetReq = new NextRequest("http://localhost:3000/api/admin/payments/bridge/devices");
  const anonBridgeGetRes = await bridgeDevicesGet(anonBridgeGetReq);
  if (anonBridgeGetRes.status !== 403) {
    throw new Error(`TEST 9A FAILED: Anonymous call to bridge devices GET did not return 403! Got: ${anonBridgeGetRes.status}`);
  }
  console.log("✓ Test 9A Passed: Anonymous caller to bridge devices GET strictly received HTTP 403.");

  // 9B: BUSINESS_OWNER call to GET bridge devices must fail with 403
  const ownerToken = await createSessionToken({
    userId: ownerA.id,
    phone: ownerA.phone,
    role: ownerA.role,
    name: ownerA.name,
  });
  const ownerBridgeGetReq = new NextRequest("http://localhost:3000/api/admin/payments/bridge/devices", {
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      cookie: `mosa_session=${ownerToken}`,
    },
  });
  const ownerBridgeGetRes = await bridgeDevicesGet(ownerBridgeGetReq);
  if (ownerBridgeGetRes.status !== 403) {
    throw new Error(`TEST 9B FAILED: BUSINESS_OWNER call to bridge devices GET did not return 403! Got: ${ownerBridgeGetRes.status}`);
  }
  console.log("✓ Test 9B Passed: BUSINESS_OWNER call to bridge devices GET strictly received HTTP 403.");

  // 9C: BUSINESS_OWNER call to POST (CREATE_PAIRING) must fail with 403
  const ownerBridgePostReq = new NextRequest("http://localhost:3000/api/admin/payments/bridge/devices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
      cookie: `mosa_session=${ownerToken}`,
    },
    body: JSON.stringify({ action: "CREATE_PAIRING", name: "Malicious Terminal" }),
  });
  const ownerBridgePostRes = await bridgeDevicesPost(ownerBridgePostReq);
  if (ownerBridgePostRes.status !== 403) {
    throw new Error(`TEST 9C FAILED: BUSINESS_OWNER call to bridge devices POST did not return 403! Got: ${ownerBridgePostRes.status}`);
  }
  console.log("✓ Test 9C Passed: BUSINESS_OWNER call to bridge devices POST strictly received HTTP 403.");

  // 9D: SUPER_ADMIN call succeeds and redacts sensitive HMAC secrets from listing
  const adminToken = await createSessionToken({
    userId: superAdminUser.id,
    phone: superAdminUser.phone,
    role: superAdminUser.role,
    name: superAdminUser.name,
  });
  const adminBridgeGetReq = new NextRequest("http://localhost:3000/api/admin/payments/bridge/devices", {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      cookie: `mosa_session=${adminToken}`,
    },
  });
  const adminBridgeGetRes = await bridgeDevicesGet(adminBridgeGetReq);
  if (adminBridgeGetRes.status !== 200) {
    throw new Error(`TEST 9D FAILED: SUPER_ADMIN call to bridge devices GET failed! Got: ${adminBridgeGetRes.status}`);
  }
  const adminBridgeData = await adminBridgeGetRes.json();
  for (const dev of adminBridgeData.devices) {
    if ((dev as any).hmacSecret !== undefined || (dev as any).deviceToken !== undefined) {
      throw new Error(`TEST 9D FAILED: Bridge devices listing leaked sensitive credentials! dev: ${JSON.stringify(dev)}`);
    }
  }
  console.log("✓ Test 9D Passed: SUPER_ADMIN authorized and sensitive deviceToken/hmacSecret strictly redacted from listing.");

  // -------------------------------------------------------------
  // TEST 10: Heartbeat Configuration Integrity & Zero Secret Leak
  // -------------------------------------------------------------
  console.log("\n--- TEST 10: Heartbeat Configuration Integrity & Zero Secret Leak ---");
  const tempDeviceId = `bridge_test_${Date.now()}`;
  const tempDeviceToken = `token_test_${Date.now()}`;
  const tempHmacSecret = `hmac_secret_test_${Date.now()}`;
  const tempDevice = await prisma.paymentBridgeDevice.create({
    data: {
      name: "Temporary Heartbeat Test Phone",
      deviceId: tempDeviceId,
      deviceToken: tempDeviceToken,
      hmacSecret: tempHmacSecret,
      carrier: "MTN Rwanda",
      status: "ACTIVE",
    },
  });

  const hbResult = await recordDeviceHeartbeat({
    deviceId: tempDeviceId,
    deviceToken: tempDeviceToken,
    batteryLevel: 95,
    isCharging: true,
    networkType: "WIFI",
    appVersion: "1.1.0",
    pendingSyncCount: 2,
  });

  if (!hbResult.success || !hbResult.isDeviceActive) {
    throw new Error("TEST 10 FAILED: Heartbeat failed for active device!");
  }
  const hbConfig = (hbResult as any).configuration;
  if (!hbConfig) {
    throw new Error("TEST 10 FAILED: Heartbeat did not return dynamic configuration!");
  }
  if ((hbConfig as any).hmacSecret !== undefined || (hbConfig as any).deviceToken !== undefined) {
    throw new Error("TEST 10 FAILED: Heartbeat leaked hmacSecret or deviceToken!");
  }
  if (!hbConfig.serverUrl.startsWith("https://")) {
    throw new Error(`TEST 10 FAILED: Heartbeat serverUrl is not secure HTTPS! Got: ${hbConfig.serverUrl}`);
  }
  console.log("✓ Test 10 Passed: Heartbeat dynamically delivered HTTPS serverUrl and safely excluded HMAC secrets.");

  // -------------------------------------------------------------
  // TEST 11: Custom Domain Submission & Untrusted Domain Blocking
  // -------------------------------------------------------------
  console.log("\n--- TEST 11: Custom Domain Submission & Untrusted Domain Blocking ---");
  // 11A: Insecure HTTP domain must be rejected
  const insecureHttpRes = validateCustomDomainSyntax("http://insecure.mosa.rw");
  if (insecureHttpRes.isValid) {
    throw new Error("TEST 11A FAILED: Insecure HTTP domain was accepted!");
  }
  console.log("✓ Test 11A Passed: Plain HTTP custom domain strictly rejected.");

  // 11B: Broad arbitrary vercel subdomain must be rejected
  const arbitraryVercelRes = validateCustomDomainSyntax("https://attacker.vercel.app");
  if (arbitraryVercelRes.isValid) {
    throw new Error("TEST 11B FAILED: Arbitrary *.vercel.app domain was accepted!");
  }
  console.log("✓ Test 11B Passed: Arbitrary *.vercel.app domain strictly rejected.");

  // 11C: BUSINESS_OWNER blocked from SUBMIT_CUSTOM_DOMAIN via API (HTTP 403)
  const ownerDomainPostReq = new NextRequest("http://localhost:3000/api/admin/payments/bridge/devices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
      cookie: `mosa_session=${ownerToken}`,
    },
    body: JSON.stringify({ action: "SUBMIT_CUSTOM_DOMAIN", customDomain: "https://mosa.rw" }),
  });
  const ownerDomainPostRes = await bridgeDevicesPost(ownerDomainPostReq);
  if (ownerDomainPostRes.status !== 403) {
    throw new Error(`TEST 11C FAILED: Non-admin SUBMIT_CUSTOM_DOMAIN did not return 403! Got: ${ownerDomainPostRes.status}`);
  }
  console.log("✓ Test 11C Passed: Non-admin SUBMIT_CUSTOM_DOMAIN strictly received HTTP 403.");

  // 11D: SUPER_ADMIN submits valid domain https://mosa.rw and receives verification token
  const submitRes = await submitCustomDomain({
    customDomain: "https://mosa.rw",
    actorId: superAdminUser.id,
    actorName: superAdminUser.name,
  });
  if (!submitRes.success || !submitRes.verificationToken.startsWith("mosa_verify_")) {
    throw new Error("TEST 11D FAILED: submitCustomDomain did not produce valid verification token!");
  }
  console.log("✓ Test 11D Passed: Valid domain https://mosa.rw generated verification token.");

  // -------------------------------------------------------------
  // TEST 12: Custom Domain Verification & Strict Activation Invariant
  // -------------------------------------------------------------
  console.log("\n--- TEST 12: Custom Domain Verification & Strict Activation Invariant ---");
  // 12A: Attempting to activate an unverified domain must throw/fail
  try {
    await activateCustomDomain({ actorId: superAdminUser.id, actorName: superAdminUser.name });
    throw new Error("TEST 12A FAILED: Unverified domain was activated!");
  } catch (err: any) {
    if (!err.message.includes("Cannot activate unverified custom domain")) {
      throw err;
    }
  }
  console.log("✓ Test 12A Passed: Activation of unverified custom domain was strictly rejected.");

  // 12B: Verify domain using controlled simulation probe
  const verifyRes = await verifyCustomDomain({
    actorId: superAdminUser.id,
    actorName: superAdminUser.name,
    simulateSuccess: true,
  });
  if (!verifyRes.success || !verifyRes.verified) {
    throw new Error("TEST 12B FAILED: verifyCustomDomain failed!");
  }
  console.log("✓ Test 12B Passed: Domain verification check succeeded.");

  // 12C: Activate verified domain
  const activateRes = await activateCustomDomain({
    actorId: superAdminUser.id,
    actorName: superAdminUser.name,
  });
  if (!activateRes.success || activateRes.newCanonicalUrl !== "https://mosa.rw") {
    throw new Error("TEST 12C FAILED: activateCustomDomain failed!");
  }
  const currentCanonical = await getCanonicalServerUrl();
  if (currentCanonical !== "https://mosa.rw") {
    throw new Error(`TEST 12C FAILED: Canonical URL is not https://mosa.rw! Got: ${currentCanonical}`);
  }
  const approvedList = await getApprovedDomains();
  if (!approvedList.includes("mosa.rw")) {
    throw new Error("TEST 12C FAILED: mosa.rw not added to approved domains!");
  }
  console.log("✓ Test 12C Passed: Custom domain https://mosa.rw is now active canonical endpoint.");

  // -------------------------------------------------------------
  // TEST 13: Terminal Migration via Heartbeat & Zero Credential Leakage
  // -------------------------------------------------------------
  console.log("\n--- TEST 13: Terminal Migration via Heartbeat & Zero Credential Leakage ---");
  const hbMigration = await recordDeviceHeartbeat({
    deviceId: tempDeviceId,
    deviceToken: tempDeviceToken,
    batteryLevel: 90,
    isCharging: false,
    networkType: "CELLULAR",
    appVersion: "1.1.0",
    pendingSyncCount: 0,
  });
  if (!hbMigration.success || !hbMigration.isDeviceActive) {
    throw new Error("TEST 13 FAILED: Heartbeat after migration failed!");
  }
  const hbMigratedConfig = (hbMigration as any).configuration;
  if (hbMigratedConfig.serverUrl !== "https://mosa.rw") {
    throw new Error(`TEST 13 FAILED: Terminal heartbeat did not receive migrated canonical URL! Got: ${hbMigratedConfig.serverUrl}`);
  }
  if (!hbMigratedConfig.approvedDomains.includes("mosa.rw")) {
    throw new Error("TEST 13 FAILED: Terminal heartbeat did not receive approved domains list!");
  }
  if ((hbMigratedConfig as any).hmacSecret !== undefined || (hbMigratedConfig as any).deviceToken !== undefined) {
    throw new Error("TEST 13 FAILED: Heartbeat leaked sensitive credentials!");
  }
  console.log("✓ Test 13 Passed: Terminal seamlessly received new canonical endpoint https://mosa.rw and approved domains with zero credential leakage.");

  // -------------------------------------------------------------
  // TEST 14: Safe Rollback Execution & Terminal Reconnection
  // -------------------------------------------------------------
  console.log("\n--- TEST 14: Safe Rollback Execution & Terminal Reconnection ---");
  const rollbackRes = await rollbackCustomDomain({
    actorId: superAdminUser.id,
    actorName: superAdminUser.name,
    reason: "Integration test rollback verification",
  });
  if (!rollbackRes.success) {
    throw new Error("TEST 14 FAILED: rollbackCustomDomain failed!");
  }
  const restoredCanonical = await getCanonicalServerUrl();
  if (restoredCanonical !== "https://mosa-one.vercel.app") {
    throw new Error(`TEST 14 FAILED: Rollback did not restore https://mosa-one.vercel.app! Got: ${restoredCanonical}`);
  }
  const hbRollback = await recordDeviceHeartbeat({
    deviceId: tempDeviceId,
    deviceToken: tempDeviceToken,
    batteryLevel: 88,
    isCharging: false,
    networkType: "WIFI",
    appVersion: "1.1.0",
    pendingSyncCount: 0,
  });
  const hbRollbackConfig = (hbRollback as any).configuration;
  if (hbRollbackConfig.serverUrl !== "https://mosa-one.vercel.app") {
    throw new Error(`TEST 14 FAILED: Post-rollback heartbeat did not return restored serverUrl! Got: ${hbRollbackConfig.serverUrl}`);
  }
  console.log("✓ Test 14 Passed: Safe rollback restored canonical URL to https://mosa-one.vercel.app and terminal reconnected.");

  // Cleanup temp device
  await prisma.paymentBridgeDevice.delete({ where: { id: tempDevice.id } });

  // Cleanup test records
  await prisma.registrationPayment.deleteMany({
    where: { paymentReference: { in: [simPaymentRef, realPaymentRef] } },
  });
  await prisma.business.delete({ where: { id: testBizA.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [ownerA.id, ownerB.id, customerUser.id, agentUser.id, superAdminUser.id] } },
  });

  console.log("\n=================================================================");
  console.log("ALL 14 CRITICAL SECURITY & REGRESSION TESTS PASSED SUCCESSFULLY!");
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
