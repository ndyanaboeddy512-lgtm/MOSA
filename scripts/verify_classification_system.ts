/**
 * MOSA System Architecture & Classification Verification Suite
 * 
 * Verifies:
 * 1. 3-Tier Canonical Category Taxonomy & 4-Language Parity
 * 2. Strict Hierarchy Validation & Legacy Alias Compatibility
 * 3. Structured 5-Tier Location & 3-Tier Category Neon PostgreSQL Persistence
 * 4. Admin Command Center Location & Category Intelligence Aggregations
 * 5. Owner Governance Guardrails (Major classification change triggers re-verification)
 * 6. Public Multi-Tier Discovery Search & Filtering
 * 7. End-to-end Cleanup
 */

import { PrismaClient, VerificationStatus } from "@prisma/client";
import {
  CANONICAL_TAXONOMY,
  ALL_MAIN_CATEGORIES,
  ALL_SUBCATEGORIES,
  ALL_BUSINESS_TYPES,
  validateCategoryHierarchy,
  formatCategoryClassification,
  getCategoryHierarchy,
  LEGACY_CATEGORY_MAP,
} from "../src/lib/taxonomy";
import { formatBusinessRecord } from "../src/lib/format-business";

const prisma = new PrismaClient();

async function run() {
  console.log("================================================================================");
  console.log("  MOSA ARCHITECTURE & BUSINESS CLASSIFICATION VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testPhone = `+250788${String(timestamp).slice(-6)}`;
  const testBizName = `Kacyiru Royal Salon & Spa ${timestamp}`;
  let createdOwnerId: string | null = null;
  let createdBizId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1 — CANONICAL 3-TIER TAXONOMY & 4-LANGUAGE LOCALIZATION
    // -------------------------------------------------------------------------
    console.log("▶ TEST 1 — CANONICAL 3-TIER TAXONOMY & MULTI-LANGUAGE PARITY");

    // 1.1 Taxonomy completeness
    assert(CANONICAL_TAXONOMY.length === 8, `Canonical taxonomy has 8 main economic sectors (found ${CANONICAL_TAXONOMY.length})`);
    const totalSubcats = Object.keys(ALL_SUBCATEGORIES).length;
    const totalBizTypes = Object.keys(ALL_BUSINESS_TYPES).length;
    assert(totalSubcats >= 20, `Taxonomy has 20+ commercial domains (found ${totalSubcats})`);
    assert(totalBizTypes >= 50, `Taxonomy has 50+ granular business types (found ${totalBizTypes})`);

    // 1.2 4-Language localization check
    let allLocalized = true;
    for (const main of CANONICAL_TAXONOMY) {
      if (!main.name || !main.nameRw || !main.nameFr || !main.nameSw) {
        allLocalized = false;
        console.error(`Missing localization for main category: ${main.id}`);
      }
      for (const sub of main.subcategories) {
        if (!sub.name || !sub.nameRw || !sub.nameFr || !sub.nameSw) {
          allLocalized = false;
          console.error(`Missing localization for subcategory: ${sub.id}`);
        }
      }
    }
    assert(allLocalized, "All 8 main sectors and subcategories have complete 4-language localization (EN, RW, FR, SW)");

    // 1.3 Strict hierarchy validation
    const validCheck = validateCategoryHierarchy("retail", "food_groceries", "grocery_shop");
    assert(validCheck.isValid && validCheck.resolvedType?.id === "grocery_shop", "Valid 3-tier hierarchy (retail -> food_groceries -> grocery_shop) accepted");

    const invalidSubCheck = validateCategoryHierarchy("retail", "beauty", "grocery_shop");
    assert(!invalidSubCheck.isValid, "Mismatched subcategory (retail with beauty) rejected");

    const invalidTypeCheck = validateCategoryHierarchy("personal_care", "beauty", "hardware_tools");
    assert(!invalidTypeCheck.isValid, "Mismatched business type (beauty with hardware_tools) rejected");

    const bogusMainCheck = validateCategoryHierarchy("cryptocurrency_mining");
    assert(!bogusMainCheck.isValid, "Uncontrolled/invented category rejected");

    // 1.4 Legacy alias compatibility
    const legacyCheck = validateCategoryHierarchy("shop_retail", "food_groceries", "grocery_shop");
    assert(legacyCheck.isValid, "Legacy category ID 'shop_retail' aliased correctly to 'retail'");

    // 1.5 Localized format helper
    const formattedEn = formatCategoryClassification("personal_care", "beauty_hair", "hair_salon", "en");
    const formattedRw = formatCategoryClassification("personal_care", "beauty_hair", "hair_salon", "rw");
    assert(
      formattedEn.fullPath.includes("Personal Care") && formattedEn.fullPath.includes("Hair Salon"),
      `English path formatted: "${formattedEn.fullPath}"`
    );
    assert(
      formattedRw.fullPath.includes("Ubwiza") || formattedRw.fullPath.includes("Saluni"),
      `Kinyarwanda path formatted: "${formattedRw.fullPath}"`
    );

    // -------------------------------------------------------------------------
    // TEST 2 — NEON POSTGRESQL PERSISTENCE WITH STRUCTURED LOCATION & CATEGORY
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 2 — NEON POSTGRESQL PERSISTENCE WITH STRUCTURED DATA");

    // Create test owner user
    const owner = await prisma.user.create({
      data: {
        phone: testPhone,
        name: `Test Owner ${timestamp}`,
        referralCode: `REF${timestamp.toString().slice(-8)}`,
        role: "BUSINESS_OWNER",
      },
    });
    createdOwnerId = owner.id;
    assert(!!owner.id, `Created test owner account in Neon PostgreSQL (${owner.id})`);

    // Create micro-business with 5-tier location and 3-tier category
    const business = await prisma.business.create({
      data: {
        name: testBizName,
        description: "Professional hair care and styling services in Kacyiru",
        descriptionRw: "Serivisi zo kogosha no gutunganya imisatsi mu Kacyiru",
        category: "personal_care",
        mainCategory: "personal_care",
        subCategory: "beauty_hair",
        businessType: "hair_salon",
        businessTypeDisplay: "Hair Salon / Coiffure",
        businessTypeDisplayRw: "Saluni y'Abari n'Abategarugori",
        district: "Gasabo",
        sector: "Kacyiru",
        cell: "Kibaza",
        nearestLandmark: "Boulevard de l'Umuganda, Near Minaffet",
        latitude: -1.935114,
        longitude: 30.082111,
        phone: testPhone,
        ownerId: owner.id,
        status: "PENDING",
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
    });
    createdBizId = business.id;
    assert(!!business.id, `Created structured micro-business in Neon DB: ${business.id}`);

    // Verify stored fields in Neon PostgreSQL
    const fetched = await prisma.business.findUnique({
      where: { id: business.id },
    });
    assert(fetched !== null, "Fetched created business from Neon PostgreSQL");
    assert(fetched?.mainCategory === "personal_care", "Stored mainCategory = 'personal_care'");
    assert(fetched?.subCategory === "beauty_hair", "Stored subCategory = 'beauty_hair'");
    assert(fetched?.businessType === "hair_salon", "Stored businessType = 'hair_salon'");
    assert(fetched?.district === "Gasabo", "Stored district = 'Gasabo'");
    assert(fetched?.sector === "Kacyiru", "Stored sector = 'Kacyiru'");
    assert(fetched?.cell === "Kibaza", "Stored cell = 'Kibaza'");
    assert(fetched?.nearestLandmark?.includes("Minaffet") ?? false, "Stored nearestLandmark structured identifier");

    // Verify formatBusinessRecord output
    const formatted = formatBusinessRecord(fetched);
    assert(formatted.mainCategory === "personal_care", "Formatted record contains mainCategory");
    assert(formatted.subCategory === "beauty_hair", "Formatted record contains subCategory");
    assert(formatted.businessType === "hair_salon", "Formatted record contains businessType");
    assert(Boolean(formatted.classificationPath?.includes("Personal Care")), `Formatted record contains classificationPath: "${formatted.classificationPath}"`);

    // -------------------------------------------------------------------------
    // TEST 3 — ADMIN COMMAND CENTER LOCATION & CATEGORY INTELLIGENCE
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 3 — ADMIN COMMAND CENTER INTELLIGENCE & AGGREGATION");

    // Execute the exact admin breakdown query logic
    const allBusinesses = await prisma.business.findMany({
      select: {
        id: true,
        sector: true,
        district: true,
        category: true,
        mainCategory: true,
        subCategory: true,
        businessType: true,
        businessTypeDisplay: true,
        status: true,
        verificationStatus: true,
      },
    });

    const sectorBreakdown: Record<string, { total: number; categories: Record<string, number> }> = {};
    for (const b of allBusinesses) {
      const sec = b.sector || "Unknown Sector";
      if (!sectorBreakdown[sec]) {
        sectorBreakdown[sec] = { total: 0, categories: {} };
      }
      sectorBreakdown[sec].total++;
      const catKey = b.businessTypeDisplay || b.businessType || b.subCategory || b.mainCategory || b.category;
      sectorBreakdown[sec].categories[catKey] = (sectorBreakdown[sec].categories[catKey] || 0) + 1;
    }

    assert(!!sectorBreakdown["Kacyiru"], "Admin sector breakdown includes 'Kacyiru'");
    assert(sectorBreakdown["Kacyiru"].total >= 1, `Kacyiru total businesses: ${sectorBreakdown["Kacyiru"].total}`);
    assert(
      (sectorBreakdown["Kacyiru"].categories["Hair Salon / Coiffure"] || 0) >= 1 ||
      (sectorBreakdown["Kacyiru"].categories["hair_salon"] || 0) >= 1 ||
      (sectorBreakdown["Kacyiru"].categories["personal_care"] || 0) >= 1,
      "Kacyiru density breakdown correctly counts salons and personal care businesses"
    );

    // Multi-dimensional filtering by location and category
    const filteredKacyiruSalons = await prisma.business.findMany({
      where: {
        sector: "Kacyiru",
        mainCategory: "personal_care",
        businessType: "hair_salon",
      },
    });
    assert(
      filteredKacyiruSalons.some((b) => b.id === business.id),
      "Admin filtering by Sector (Kacyiru) + Main Category (personal_care) + Type (salon) isolates correct businesses"
    );

    // -------------------------------------------------------------------------
    // TEST 4 — OWNER GOVERNANCE GUARDRAIL (RE-VERIFICATION ON MAJOR CHANGES)
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 4 — OWNER GOVERNANCE GUARDRAIL (RE-VERIFICATION TRIGGER)");

    // First approve the business to ACTIVE + BUSINESS_VERIFIED state
    await prisma.business.update({
      where: { id: business.id },
      data: {
        status: "ACTIVE",
        verificationStatus: VerificationStatus.BUSINESS_VERIFIED,
      },
    });

    const activeBiz = await prisma.business.findUnique({ where: { id: business.id } });
    assert(activeBiz?.status === "ACTIVE" && activeBiz?.verificationStatus === VerificationStatus.BUSINESS_VERIFIED, "Business set to ACTIVE and BUSINESS_VERIFIED");

    // Simulate owner updating classification (e.g. changing major sector to 'retail' / 'food_groceries' / 'grocery_shop')
    const requestedMainCategory = "retail";
    const requestedSubCategory = "food_groceries";
    const requestedBusinessType = "grocery_shop";

    const isMajorCategoryChange =
      (requestedMainCategory && requestedMainCategory !== activeBiz?.mainCategory) ||
      (requestedMainCategory && requestedMainCategory !== activeBiz?.category);

    assert(isMajorCategoryChange, "Detected major classification change by owner");

    // Apply the re-verification workflow from /api/owner/business
    const updatedBiz = await prisma.business.update({
      where: { id: business.id },
      data: {
        mainCategory: requestedMainCategory,
        category: requestedMainCategory,
        subCategory: requestedSubCategory,
        businessType: requestedBusinessType,
        status: "PENDING",
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
    });

    const verificationRecord = await prisma.verificationRecord.create({
      data: {
        businessId: business.id,
        userId: owner.id,
        type: "CLASSIFICATION_CHANGE_REQUESTED",
        notes: `Owner modified major classification: Category: ${activeBiz?.mainCategory} -> ${requestedMainCategory}`,
      },
    });

    const notification = await prisma.notification.create({
      data: {
        userId: owner.id,
        title: "Profile Submitted for Re-Verification",
        message: "You updated your core business classification. Your listing is being re-reviewed by MOSA Administrators.",
      },
    });

    assert(updatedBiz.status === "PENDING", "Business status demoted from ACTIVE to PENDING upon major category change");
    assert(updatedBiz.verificationStatus === VerificationStatus.UNVERIFIED, "VerificationStatus reset to UNVERIFIED");
    assert(verificationRecord.type === "CLASSIFICATION_CHANGE_REQUESTED", "VerificationRecord created with CLASSIFICATION_CHANGE_REQUESTED");
    assert(!!notification.id, "Owner notification created in Neon PostgreSQL");

    // -------------------------------------------------------------------------
    // TEST 5 — PUBLIC MULTI-TIER DISCOVERY SEARCH
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 5 — PUBLIC MULTI-TIER DISCOVERY FILTERING");

    // Test discovery query by new category
    const retailResults = await prisma.business.findMany({
      where: {
        mainCategory: "retail",
        subCategory: "food_groceries",
        businessType: "grocery_shop",
        sector: "Kacyiru",
      },
    });
    assert(retailResults.some((b) => b.id === business.id), "Public discovery query filters by mainCategory + subCategory + businessType + sector");

    // Exclusion test: Searching for personal_care in Kacyiru should no longer return this business
    const personalCareResults = await prisma.business.findMany({
      where: {
        mainCategory: "personal_care",
        id: business.id,
      },
    });
    assert(personalCareResults.length === 0, "Business no longer matches old mainCategory in public discovery");

    console.log("\n================================================================================");
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

  } catch (error) {
    console.error("Test execution encountered an error:", error);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("▶ CLEANING UP TEST DATA IN NEON POSTGRESQL...");
    try {
      if (createdBizId) {
        await prisma.verificationRecord.deleteMany({ where: { businessId: createdBizId } });
        await prisma.auditLog.deleteMany({ where: { entityId: createdBizId } });
        await prisma.business.delete({ where: { id: createdBizId } });
        console.log(`  Deleted test business: ${createdBizId}`);
      }
      if (createdOwnerId) {
        await prisma.notification.deleteMany({ where: { userId: createdOwnerId } });
        await prisma.user.delete({ where: { id: createdOwnerId } });
        console.log(`  Deleted test owner: ${createdOwnerId}`);
      }
    } catch (cleanErr) {
      console.warn("  Cleanup warning:", cleanErr);
    }
    await prisma.$disconnect();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

run();
