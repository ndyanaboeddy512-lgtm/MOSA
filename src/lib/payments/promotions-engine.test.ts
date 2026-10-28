import { prisma } from "@/lib/prisma";
import {
  calculateEffectiveFee,
  createFeePromotion,
  updateFeePromotion,
  setFeePromotionStatus,
  confirmFreeRegistrationWithWaiver,
  getFeePromotions,
} from "./promotions-engine";
import { getActiveFeeConfig, updateRegistrationFeeConfig } from "./engine";

let testAdminId: string;
let testOwnerId: string;
let testBusinessId: string;
let createdPromoIds: string[] = [];

async function setup() {
  console.log("Setting up promotions test environment...");

  // 1. Create or fetch test admin
  let admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "Test Super Admin",
        email: `test-admin-${Date.now()}@mosa.rw`,
        role: "SUPER_ADMIN",
        passwordHash: "dummy-hash",
        referralCode: `ADM${Date.now()}`,
      },
    });
  }
  testAdminId = admin.id;

  const testPhone = `+25078${Math.floor(1000000 + Math.random() * 9000000)}`;

  // 2. Create test owner user
  const owner = await prisma.user.create({
    data: {
      name: "Promotion Test Owner",
      email: `test-owner-${Date.now()}@mosa.rw`,
      phone: testPhone,
      role: "BUSINESS_OWNER",
      passwordHash: "dummy-hash",
      referralCode: `OWN${Date.now()}`,
    },
  });
  testOwnerId = owner.id;

  // 3. Create test business
  const biz = await prisma.business.create({
    data: {
      name: `Promo Test Business ${Date.now()}`,
      description: "Automated test business for promotions engine",
      category: "Agribusiness",
      categoryDisplay: "Agribusiness",
      ownerId: testOwnerId,
      phone: testPhone,
      sector: "Kacyiru",
      district: "Gasabo",
      latitude: -1.95,
      longitude: 30.06,
      status: "PENDING_PAYMENT",
    },
  });
  testBusinessId = biz.id;

  // 4. Ensure active baseline fee is 5,000 RWF and clean up any leftover active promotions
  await prisma.feePromotion.updateMany({
    where: { status: "ACTIVE" },
    data: { status: "ARCHIVED" },
  });

  await updateRegistrationFeeConfig({
    amount: 5000,
    renewalAmount: 5000,
    gracePeriodDays: 7,
    reminderSchedule: "30,14,7,0",
    currency: "RWF",
    reason: "Test Setup: Reset baseline fee to 5,000 RWF",
    adminId: testAdminId,
  });

  console.log("✓ Test setup completed successfully.");
}

async function teardown() {
  console.log("\nCleaning up test artifacts...");
  try {
    // Delete test payments and receipts
    const payments = await prisma.registrationPayment.findMany({
      where: { businessId: testBusinessId },
      select: { id: true },
    });
    for (const p of payments) {
      await prisma.registrationReceipt.deleteMany({ where: { paymentId: p.id } }).catch(() => null);
    }
    await prisma.registrationPayment.deleteMany({ where: { businessId: testBusinessId } }).catch(() => null);

    // Delete created test promotions
    for (const id of createdPromoIds) {
      await prisma.feePromotion.delete({ where: { id } }).catch(() => null);
    }

    // Delete test business and users
    await prisma.business.delete({ where: { id: testBusinessId } }).catch(() => null);
    await prisma.user.delete({ where: { id: testOwnerId } }).catch(() => null);
    console.log("✓ Cleanup completed.");
  } catch (err) {
    console.warn("Teardown warning:", err);
  } finally {
    await prisma.$disconnect();
  }
}

async function runPromotionsTests() {
  await setup();

  try {
    console.log("\n--- TEST 1: Baseline Fee Calculation (No Promotions) ---");
    const baseline = await calculateEffectiveFee({
      businessId: testBusinessId,
      feeType: "REGISTRATION",
    });
    if (baseline.effectiveFee !== 5000 || baseline.isFree !== false || baseline.promotion !== null) {
      throw new Error(`Expected baseline fee 5000 RWF, got: ${baseline.effectiveFee}`);
    }
    console.log(`✓ Baseline fee is ${baseline.effectiveFee} RWF, isFree: ${baseline.isFree}`);

    console.log("\n--- TEST 2: Create Global 100% Free Waiver Promotion ---");
    const freeWaiverPromo = await createFeePromotion({
      name: "Global Community Free Waiver Launch 2026",
      code: "LAUNCH2026",
      description: "Platform-wide 100% fee waiver for new Rwandan entrepreneurs",
      reason: "Ministry of Commerce digital economy empowerment drive",
      promotionType: "FREE_WAIVER",
      discountValue: 100,
      appliesTo: "REGISTRATION",
      targetScope: "ALL",
      status: "ACTIVE",
      adminId: testAdminId,
    });
    createdPromoIds.push(freeWaiverPromo.id);
    console.log(`✓ Created promotion "${freeWaiverPromo.name}" (ID: ${freeWaiverPromo.id})`);

    const feeWithFreeWaiver = await calculateEffectiveFee({
      businessId: testBusinessId,
      feeType: "REGISTRATION",
    });
    if (feeWithFreeWaiver.effectiveFee !== 0 || !feeWithFreeWaiver.isFree || feeWithFreeWaiver.discount !== 5000) {
      throw new Error(`Expected 0 RWF free waiver, got: ${feeWithFreeWaiver.effectiveFee}`);
    }
    console.log(`✓ Global free waiver active: Effective fee is 0 RWF (Saved ${feeWithFreeWaiver.discount} RWF)`);

    console.log("\n--- TEST 3: Registration Fee Independence from Renewal Fee ---");
    const renewalFeeCheck = await calculateEffectiveFee({
      businessId: testBusinessId,
      feeType: "ANNUAL_RENEWAL",
    });
    if (renewalFeeCheck.effectiveFee !== 5000) {
      throw new Error(`Expected renewal fee 5000 RWF (unaffected by registration-only promo), got: ${renewalFeeCheck.effectiveFee}`);
    }
    console.log(`✓ Annual renewal fee is independently preserved at ${renewalFeeCheck.effectiveFee} RWF`);

    console.log("\n--- TEST 4: Pause Promotion Lifecycle ---");
    await setFeePromotionStatus({
      id: freeWaiverPromo.id,
      status: "PAUSED",
      adminId: testAdminId,
      reason: "Temporarily pausing for quota review",
    });

    const feeAfterPause = await calculateEffectiveFee({
      businessId: testBusinessId,
      feeType: "REGISTRATION",
    });
    if (feeAfterPause.effectiveFee !== 5000 || feeAfterPause.isFree !== false) {
      throw new Error(`Expected 5000 RWF after pausing promo, got: ${feeAfterPause.effectiveFee}`);
    }
    console.log(`✓ Paused promotion immediately stops applying (Fee reverted to ${feeAfterPause.effectiveFee} RWF)`);

    console.log("\n--- TEST 5: Category-Targeted Percentage Discount (50% Off) ---");
    const categoryPromo = await createFeePromotion({
      name: "Agribusiness Modernization 50% Subsidy",
      reason: "Targeted agricultural technology incentive",
      promotionType: "PERCENTAGE",
      discountValue: 50,
      appliesTo: "REGISTRATION",
      targetScope: "CATEGORY",
      targetCategory: "Agribusiness",
      status: "ACTIVE",
      adminId: testAdminId,
    });
    createdPromoIds.push(categoryPromo.id);

    const agriFee = await calculateEffectiveFee({
      businessId: testBusinessId, // Category is Agribusiness
      feeType: "REGISTRATION",
    });
    if (agriFee.effectiveFee !== 2500 || agriFee.discount !== 2500) {
      throw new Error(`Expected 2500 RWF (50% off 5000), got: ${agriFee.effectiveFee}`);
    }
    console.log(`✓ Category promotion matched: ${agriFee.effectiveFee} RWF (${agriFee.discount} RWF discount)`);

    // Non-matching category
    const nonAgriFee = await calculateEffectiveFee({
      category: "Hair Salon",
      feeType: "REGISTRATION",
    });
    if (nonAgriFee.effectiveFee !== 5000) {
      throw new Error(`Expected 5000 RWF for non-matching category, got: ${nonAgriFee.effectiveFee}`);
    }
    console.log(`✓ Non-matching category correctly excluded from discount (${nonAgriFee.effectiveFee} RWF)`);

    console.log("\n--- TEST 6: Usage Cap Enforcement ---");
    const cappedPromo = await createFeePromotion({
      name: "Early Bird 1st Business Free",
      reason: "Pilot incentive for single business",
      promotionType: "FREE_WAIVER",
      discountValue: 100,
      appliesTo: "REGISTRATION",
      targetScope: "ALL",
      maxUsageCount: 1,
      status: "ACTIVE",
      adminId: testAdminId,
    });
    createdPromoIds.push(cappedPromo.id);

    // Update currentUsageCount to 1 (cap reached)
    await prisma.feePromotion.update({
      where: { id: cappedPromo.id },
      data: { currentUsageCount: 1 },
    });

    const feeAfterCap = await calculateEffectiveFee({
      category: "Hair Salon", // avoids the Agribusiness promo
      feeType: "REGISTRATION",
    });
    if (feeAfterCap.effectiveFee !== 5000) {
      throw new Error(`Expected 5000 RWF after usage cap reached, got: ${feeAfterCap.effectiveFee}`);
    }
    console.log("✓ Usage cap reached: Promotion successfully deactivated for new registrations");

    console.log("\n--- TEST 7: Confirm 0 RWF Free Registration Waiver with Official Receipt ---");
    // Reactivate global free waiver for business activation test
    await setFeePromotionStatus({
      id: freeWaiverPromo.id,
      status: "ACTIVE",
      adminId: testAdminId,
      reason: "Reactivating for waiver confirmation test",
    });

    const waiverConfirmation = await confirmFreeRegistrationWithWaiver({
      businessId: testBusinessId,
      payerUserId: testOwnerId,
      promotionId: freeWaiverPromo.id,
      adminId: testAdminId,
    });

    if (!waiverConfirmation.success) {
      throw new Error("Waiver confirmation failed.");
    }
    if (!waiverConfirmation.receiptNumber?.startsWith("MOSA-REC-")) {
      throw new Error(`Invalid receipt number: ${waiverConfirmation.receiptNumber}`);
    }
    if (waiverConfirmation.payment.feeAmount !== 0 || !waiverConfirmation.payment.isWaiver) {
      throw new Error(`Expected 0 RWF fee waiver payment, got: ${waiverConfirmation.payment.feeAmount}`);
    }

    const activatedBiz = await prisma.business.findUnique({
      where: { id: testBusinessId },
    });
    if (activatedBiz?.status !== "ACTIVE" || activatedBiz?.renewalStatus !== "CURRENT") {
      throw new Error(`Expected business status ACTIVE and renewalStatus CURRENT, got: ${activatedBiz?.status}`);
    }
    console.log(`✓ 0 RWF waiver confirmed: Receipt ${waiverConfirmation.receiptNumber}`);
    console.log(`✓ Business status: ${activatedBiz?.status}, Renewal: ${activatedBiz?.renewalStatus}`);

    console.log("\n--- TEST 8: Strict Idempotency on 0 RWF Waiver ---");
    const idempotentResult = await confirmFreeRegistrationWithWaiver({
      businessId: testBusinessId,
      payerUserId: testOwnerId,
      promotionId: freeWaiverPromo.id,
      adminId: testAdminId,
    });
    if (!idempotentResult.isAlreadyPaid) {
      throw new Error("Expected idempotent result to report isAlreadyPaid: true");
    }
    console.log("✓ Idempotency verified: Re-confirming free waiver returned existing confirmed receipt");

    console.log("\n--- TEST 9: Archive Promotion Lifecycle ---");
    await setFeePromotionStatus({
      id: freeWaiverPromo.id,
      status: "ARCHIVED",
      adminId: testAdminId,
      reason: "Archiving promotion after campaign completion",
    });

    const allPromos = await getFeePromotions(false);
    if (allPromos.some((p) => p.id === freeWaiverPromo.id)) {
      throw new Error("Archived promotion should not appear in active promotions list");
    }
    console.log("✓ Archived promotion permanently excluded from active promotions");

    console.log("\n=======================================================");
    console.log("🎉 ALL PROMOTIONS ENGINE TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("=======================================================");
  } finally {
    await teardown();
  }
}

runPromotionsTests().catch((err) => {
  console.error("❌ TEST RUN FAILED:", err);
  process.exit(1);
});
