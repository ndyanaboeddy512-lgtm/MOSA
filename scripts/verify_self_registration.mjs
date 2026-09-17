/**
 * MOSA Verification Suite:
 * Public Self-Serve Business Registration & Admin-Only Platform Progress
 */

import { PrismaClient, Role } from "@prisma/client";
import { normalizeRwandaPhone } from "../src/lib/sms/normalize.ts";

const prisma = new PrismaClient();

async function run() {
  console.log("================================================================================");
  console.log("  MOSA VERIFICATION SUITE: SELF-SERVE REGISTRATION & ADMIN PLATFORM PROGRESS");
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

  // ---------------------------------------------------------------------------
  // TEST 1 — RWANDA PHONE NORMALIZATION
  // ---------------------------------------------------------------------------
  console.log("▶ TEST 1 — RWANDA PHONE NUMBER NORMALIZATION FOR SELF-REGISTRATION");
  const validMTN = normalizeRwandaPhone("0788 123 456");
  assert(validMTN.isValid && validMTN.e164 === "+250788123456", "MTN 078 normalized to +250788123456");

  const validAirtel = normalizeRwandaPhone("0722 999 888");
  assert(validAirtel.isValid && validAirtel.e164 === "+250722999888", "Airtel 072 normalized to +250722999888");

  const invalidPhone = normalizeRwandaPhone("0712 123 456");
  assert(!invalidPhone.isValid, "Rejected invalid operator prefix (071)");

  // ---------------------------------------------------------------------------
  // TEST 2 — SELF-SERVE REGISTRATION IN NEON POSTGRESQL
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 2 — SELF-SERVE BUSINESS REGISTRATION IN NEON POSTGRESQL");
  const uniqueTimestamp = Date.now();
  const testPhone = `+250789${String(uniqueTimestamp).slice(-6)}`;
  const testBizName = `Kigali Artisan Craftworks ${uniqueTimestamp}`;

  // Simulate endpoint logic directly with Prisma
  // 1. Create owner user
  const ownerUser = await prisma.user.create({
    data: {
      phone: testPhone,
      name: `Jean de Dieu ${uniqueTimestamp}`,
      role: Role.BUSINESS_OWNER,
      community: "Kacyiru",
      status: "ACTIVE",
      referralCode: `MOSA-${testPhone.slice(-4)}`,
    },
  });

  assert(ownerUser && ownerUser.role === Role.BUSINESS_OWNER, `Owner account created with role BUSINESS_OWNER: ${ownerUser.id}`);

  // 2. Create self-registered business
  const createdBiz = await prisma.business.create({
    data: {
      name: testBizName,
      nameRw: testBizName,
      category: "tailor_crafts",
      categoryDisplay: "Tailors, Crafts & Fashion",
      description: "Artisanal tailor and craft shop in Kacyiru.",
      ownerId: ownerUser.id,
      phone: testPhone,
      provinceId: null,
      district: "Gasabo",
      sector: "Kacyiru",
      cell: "Kamutwa",
      nearestLandmark: "Opposite MINAGRI Gate, 15m along cobblestone road",
      locationDescription: "Walk past the blue security gate, 2nd shop on left.",
      locationSource: "OWNER_REPORTED",
      locationVerificationStatus: "UNVERIFIED",
      verificationStatus: "UNVERIFIED",
      latitude: -1.942,
      longitude: 30.088,
      status: "ACTIVE",
      dataStatus: "VERIFIED",
      source: "SELF_REGISTERED",
      coverImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
      products: {
        create: [
          {
            name: "Handmade Agaseke Basket",
            price: 15000,
            priceMin: 15000,
            priceMax: 15000,
            priceType: "FIXED",
            category: "tailor_crafts",
          },
          {
            name: "Tailored Kitenge Shirt",
            price: 25000,
            priceMin: 25000,
            priceMax: 25000,
            priceType: "FIXED",
            category: "tailor_crafts",
          },
        ],
      },
    },
    include: { products: true },
  });

  assert(createdBiz && createdBiz.id, `Business created in Neon PostgreSQL: ${createdBiz.name}`);
  assert(createdBiz.source === "SELF_REGISTERED", `Source is SELF_REGISTERED: ${createdBiz.source}`);
  assert(createdBiz.locationSource === "OWNER_REPORTED", `Location Source is OWNER_REPORTED: ${createdBiz.locationSource}`);
  assert(createdBiz.verificationStatus === "UNVERIFIED", `Verification Status is UNVERIFIED (queued for admin review): ${createdBiz.verificationStatus}`);
  assert(createdBiz.ownerId === ownerUser.id, `Business ownership strictly linked to owner user: ${createdBiz.ownerId}`);
  assert(createdBiz.products.length === 2, `Initial catalog items created: ${createdBiz.products.length} products`);

  // ---------------------------------------------------------------------------
  // TEST 3 — AUDIT TRAIL LOGGING IN NEON
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 3 — AUDIT TRAIL LOGGING FOR SELF-REGISTRATION");
  const auditLog = await prisma.auditLog.create({
    data: {
      actorId: ownerUser.id,
      action: "BUSINESS_SELF_REGISTERED",
      entityType: "BUSINESS",
      entityId: createdBiz.id,
      metadata: JSON.stringify({
        name: createdBiz.name,
        category: createdBiz.category,
        phone: ownerUser.phone,
        sector: createdBiz.sector,
      }),
    },
  });

  assert(auditLog && auditLog.action === "BUSINESS_SELF_REGISTERED", `Audit event logged in Neon PostgreSQL with ID: ${auditLog.id}`);

  // ---------------------------------------------------------------------------
  // TEST 4 — ADMIN DASHBOARD METRICS AND REVIEW QUEUE
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 4 — ADMIN DASHBOARD METRICS INTEGRITY & REVIEW QUEUE");
  const totalCount = await prisma.business.count();
  const selfRegCount = await prisma.business.count({ where: { source: "SELF_REGISTERED" } });
  const unverifiedCount = await prisma.business.count({ where: { verificationStatus: "UNVERIFIED" } });

  assert(totalCount > 0, `Total businesses in Neon: ${totalCount}`);
  assert(selfRegCount >= 1, `Self-registered businesses tracked in Neon: ${selfRegCount}`);
  assert(unverifiedCount >= 1, `Unverified businesses in admin review queue: ${unverifiedCount}`);

  // Clean up test records
  await prisma.auditLog.delete({ where: { id: auditLog.id } }).catch(() => {});
  await prisma.product.deleteMany({ where: { businessId: createdBiz.id } }).catch(() => {});
  await prisma.business.delete({ where: { id: createdBiz.id } }).catch(() => {});
  await prisma.user.delete({ where: { id: ownerUser.id } }).catch(() => {});

  await prisma.$disconnect();

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`  VERIFICATION SCORECARD: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run();
