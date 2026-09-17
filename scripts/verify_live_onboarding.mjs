/**
 * Verification of Live Production Deployment on Vercel
 * URL: https://mosa-one.vercel.app
 */

import { PrismaClient } from "@prisma/client";

const BASE_URL = "https://mosa-one.vercel.app";
const prisma = new PrismaClient();

async function runLiveTest() {
  console.log("================================================================================");
  console.log(`  LIVE PRODUCTION VERIFICATION ON VERCEL: ${BASE_URL}`);
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Verify Pages Return 200 OK
  const pages = ["/register-business", "/admin", "/owner/dashboard", "/explore"];
  for (const page of pages) {
    const res = await fetch(`${BASE_URL}${page}`);
    assert(res.status === 200, `Page ${page} returned HTTP 200 OK`);
  }

  // 2. Verify Incomplete Registration Rejection on Live API
  console.log("\n▶ Testing validation rejection on Live API...");
  const invalidRes = await fetch(`${BASE_URL}/api/businesses/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Incomplete Shop",
      // missing phone, category, ownerName, nearestLandmark
    }),
  });
  assert(invalidRes.status === 400, `Incomplete registration rejected with HTTP 400 (Status: ${invalidRes.status})`);
  const invalidData = await invalidRes.json();
  assert(Boolean(invalidData.error), `Error message returned by live server: "${invalidData.error}"`);

  // 3. Verify Complete Registration on Live API -> Neon PostgreSQL
  console.log("\n▶ Testing valid registration on Live API -> Neon PostgreSQL...");
  const ts = Date.now();
  const testPhone = `+250788${String(ts).slice(-6)}`;
  const testBizName = `Live Vercel Test Tailors ${ts}`;

  const validRes = await fetch(`${BASE_URL}/api/businesses/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: testBizName,
      category: "tailor_crafts",
      categoryDisplay: "Tailors, Crafts & Fashion",
      ownerName: "Live Tester",
      phone: testPhone,
      password: "TestPassword123!",
      province: "Kigali City",
      district: "Gasabo",
      sector: "Kacyiru",
      cell: "Kamutwa",
      nearestLandmark: "Opposite King Faisal Hospital Roundabout",
      locationDescription: "Second gate on the right, ground floor",
      latitude: -1.9441,
      longitude: 30.0892,
      locationAccuracy: 10,
      products: [
        { name: "Traditional Agaseke", price: 15000 },
        { name: "Tailored Shirt", price: 20000 },
      ],
    }),
  });

  const validData = await validRes.json();
  assert(validRes.status === 200 || validRes.status === 201, `Live registration endpoint returned HTTP 200/201 (Status: ${validRes.status})`);
  assert(validData.success === true, "Live registration response has success: true");

  let createdBizId = validData.business?.id;
  let createdOwnerId = validData.user?.id;

  // 4. Verify Directly in Neon PostgreSQL Source of Truth
  console.log("\n▶ Verifying record directly in authoritative Neon PostgreSQL...");
  if (createdBizId) {
    const dbBiz = await prisma.business.findUnique({
      where: { id: createdBizId },
      include: {
        products: true,
        verifications: true,
      },
    });

    assert(dbBiz !== null, `Business successfully retrieved from Neon PostgreSQL: ${dbBiz?.name}`);
    assert(dbBiz?.status === "PENDING", `Business status is strictly 'PENDING' in Neon DB (${dbBiz?.status})`);
    assert(dbBiz?.verificationStatus === "UNVERIFIED", `Verification status is 'UNVERIFIED' in Neon DB`);
    assert(dbBiz?.nearestLandmark?.includes("King Faisal Hospital"), `Landmark persisted in Neon DB: "${dbBiz?.nearestLandmark}"`);
    assert(dbBiz?.products.length === 2, `Products persisted in Neon DB: ${dbBiz?.products.length} products`);

    // Verify initial notification in Neon DB
    const dbNotif = await prisma.notification.findFirst({
      where: { userId: createdOwnerId },
      orderBy: { createdAt: "desc" },
    });
    assert(dbNotif !== null, `Initial notification in Neon DB: "${dbNotif?.title}"`);

    // 5. Clean up live test data
    console.log("\n▶ Cleaning up live test records in Neon DB...");
    await prisma.product.deleteMany({ where: { businessId: createdBizId } });
    await prisma.verificationRecord.deleteMany({ where: { businessId: createdBizId } });
    await prisma.auditLog.deleteMany({ where: { entityId: createdBizId } });
    await prisma.notification.deleteMany({ where: { userId: createdOwnerId } });
    await prisma.business.delete({ where: { id: createdBizId } });
    await prisma.user.delete({ where: { id: createdOwnerId } });
    console.log("  [CLEANUP] Live test records cleaned up from Neon DB.");
  }

  await prisma.$disconnect();

  console.log("\n================================================================================");
  console.log(`  LIVE VERCEL VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveTest();
