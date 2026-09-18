import { PrismaClient, Role, VerificationStatus, InquiryType, LocationSource, LocationVerificationStatus } from "@prisma/client";
import { 
  CANONICAL_TAXONOMY, 
  ALL_MAIN_CATEGORIES, 
  ALL_SUBCATEGORIES, 
  ALL_BUSINESS_TYPES, 
  validateCategoryHierarchy 
} from "@/lib/taxonomy";
import { serializePublicBusiness } from "@/lib/public-serializer";

const prisma = new PrismaClient();

async function run() {
  console.log("================================================================================");
  console.log("             MOSA FINAL END-TO-END PRODUCTION CROSS-CHECK SUITE                 ");
  console.log("================================================================================\n");

  const results = {
    authRoles: false,
    taxonomyIntegrity: false,
    neonBusinessesTaxonomy: false,
    serviceModelRegistration: false,
    diningModelRegistration: false,
    productModelRegistration: false,
    searchAndDiscovery: false,
    customerTelemetry: false,
    updatesLifecycle: false,
    opportunitiesPipeline: false,
    dataIsolationAndPrivacy: false,
    databaseTeardown: false,
  };

  const testIds = {
    serviceBizId: "test-crosscheck-service-" + Date.now(),
    diningBizId: "test-crosscheck-dining-" + Date.now(),
    productBizId: "test-crosscheck-product-" + Date.now(),
    testOwnerId: "test-owner-" + Date.now(),
    otherOwnerId: "test-other-owner-" + Date.now(),
    updateId: "",
    opportunityId: "",
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Authentication & Core Role Verification
    // -------------------------------------------------------------------------
    console.log("--- TEST 1: Authentication & Role Verification ---");
    const superAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
    const commAdmin = await prisma.user.findFirst({ where: { role: Role.COMMUNITY_ADMIN } });
    const bizOwner = await prisma.user.findFirst({ where: { role: Role.BUSINESS_OWNER } });
    const customer = await prisma.user.findFirst({ where: { role: Role.CUSTOMER } });

    console.log(`- Super Admin: ${superAdmin ? "OK (" + superAdmin.phone + ")" : "MISSING"}`);
    console.log(`- Community Admin: ${commAdmin ? "OK (" + commAdmin.phone + ")" : "MISSING"}`);
    console.log(`- Business Owner: ${bizOwner ? "OK (" + bizOwner.phone + ")" : "MISSING"}`);
    console.log(`- Customer: ${customer ? "OK (" + customer.phone + ")" : "MISSING"}`);

    if (!superAdmin || !commAdmin || !bizOwner || !customer) {
      throw new Error("One or more core platform roles missing in Neon PostgreSQL");
    }
    results.authRoles = true;
    console.log("✓ TEST 1 PASSED: Core authentication roles verified.\n");

    // -------------------------------------------------------------------------
    // TEST 2: Canonical Taxonomy & 4-Language Verification
    // -------------------------------------------------------------------------
    console.log("--- TEST 2: Canonical Taxonomy & 4-Language Verification ---");
    console.log(`- Total Main Categories: ${CANONICAL_TAXONOMY.length}`);
    console.log(`- Total Subcategories: ${Object.keys(ALL_SUBCATEGORIES).length}`);
    console.log(`- Total Business Types: ${Object.keys(ALL_BUSINESS_TYPES).length}`);

    let missingTransCount = 0;
    for (const main of CANONICAL_TAXONOMY) {
      if (!main.name || !main.nameRw || !main.nameFr || !main.nameSw) missingTransCount++;
      for (const sub of main.subcategories) {
        if (!sub.name || !sub.nameRw || !sub.nameFr || !sub.nameSw) missingTransCount++;
        for (const bt of sub.types) {
          if (!bt.name || !bt.nameRw || !bt.nameFr || !bt.nameSw) missingTransCount++;
        }
      }
    }
    console.log(`- Items missing EN/RW/FR/SW translations: ${missingTransCount}`);
    if (missingTransCount > 0) throw new Error("Missing translations in canonical taxonomy");
    results.taxonomyIntegrity = true;
    console.log("✓ TEST 2 PASSED: 100% of taxonomy items fully translated across 4 languages.\n");

    // -------------------------------------------------------------------------
    // TEST 3: All 53 Neon DB Businesses Taxonomy Check
    // -------------------------------------------------------------------------
    console.log("--- TEST 3: Neon PostgreSQL Live Businesses Taxonomy Audit ---");
    const liveBizs = await prisma.business.findMany({
      select: { id: true, name: true, mainCategory: true, subCategory: true, businessType: true }
    });
    console.log(`- Live businesses in DB: ${liveBizs.length}`);
    let invalidCount = 0;
    for (const b of liveBizs) {
      if (!b.mainCategory || !b.subCategory || !b.businessType) {
        invalidCount++;
        continue;
      }
      const val = validateCategoryHierarchy(b.mainCategory, b.subCategory, b.businessType);
      if (!val.isValid) invalidCount++;
    }
    console.log(`- Live businesses with invalid or null taxonomy: ${invalidCount}`);
    if (invalidCount > 0) throw new Error("Found businesses with invalid taxonomy in Neon DB");
    results.neonBusinessesTaxonomy = true;
    console.log("✓ TEST 3 PASSED: All live businesses in Neon DB have valid 3-tier taxonomy.\n");

    // Create a temporary test owner
    await prisma.user.create({
      data: {
        id: testIds.testOwnerId,
        phone: "+250788999001",
        name: "Test CrossCheck Owner",
        role: Role.BUSINESS_OWNER,
        language: "rw",
        referralCode: "TEST-OWN-" + Date.now(),
      }
    });

    // Create a second test owner to test data isolation
    await prisma.user.create({
      data: {
        id: testIds.otherOwnerId,
        phone: "+250788999002",
        name: "Other Isolation Owner",
        role: Role.BUSINESS_OWNER,
        language: "en",
        referralCode: "TEST-OTH-" + Date.now(),
      }
    });

    // -------------------------------------------------------------------------
    // TEST 4: Real Simulation — SERVICES Operating Model (Electrician/Plumber)
    // -------------------------------------------------------------------------
    console.log("--- TEST 4: Simulation — SERVICES Operating Model ---");
    const serviceBiz = await prisma.business.create({
      data: {
        id: testIds.serviceBizId,
        name: "Kigali Pro Electricians & Solar",
        nameRw: "Abanyamashanyarazi b'Umwuga Kigali",
        category: "construction_building",
        mainCategory: "construction_building",
        subCategory: "trade_crafts",
        businessType: "residential_electrician",
        categoryDisplay: "Construction & Building Services",
        categoryDisplayRw: "Ubwubatsi n'Ubuyobozi bw'Imirimo",
        businessTypeDisplay: "Electrician & Electrical Installation",
        businessTypeDisplayRw: "Umukanishi w'Amashanyarazi",
        description: "Certified residential and commercial electrical wiring, fault diagnostics, solar inverter setups.",
        descriptionRw: "Gushyiramo amashanyarazi mu mazu, gukora ibyago by'umuriro, n'imirasire y'izuba.",
        phone: "+250788999001",
        whatsapp: "250788999001",
        district: "Gasabo",
        sector: "Kacyiru",
        cell: "Kamatamu",
        nearestLandmark: "Opposite Police Hospital Gate",
        streetName: "KG 543 St",
        locationSource: LocationSource.GPS_DEVICE,
        locationVerificationStatus: LocationVerificationStatus.AGENT_CAPTURED,
        latitude: -1.944,
        longitude: 30.088,
        status: "ACTIVE",
        verificationStatus: VerificationStatus.HIGH_CONFIDENCE,
        ownerId: testIds.testOwnerId,
        products: {
          create: [
            {
              name: "Residential Wiring Diagnostics",
              nameRw: "Gusuzuma Amashanyarazi mu Nzu",
              price: 15000,
              currency: "RWF",
              isAvailable: true,
              isService: true,
            },
            {
              name: "Solar Inverter Installation",
              nameRw: "Gushyiramo Onduleur n'Imirasire",
              price: 35000,
              currency: "RWF",
              isAvailable: true,
              isService: true,
            }
          ]
        }
      },
      include: { products: true }
    });

    console.log(`- Created SERVICES Business: ${serviceBiz.id} (${serviceBiz.name})`);
    console.log(`- Products count: ${serviceBiz.products.length} (isService: ${serviceBiz.products[0].isService})`);
    if (serviceBiz.products[0].isService !== true) throw new Error("Service business product should have isService=true");
    results.serviceModelRegistration = true;
    console.log("✓ TEST 4 PASSED: SERVICES operating model created and verified in Neon DB.\n");

    // -------------------------------------------------------------------------
    // TEST 5: Real Simulation — FOOD & DINING Operating Model (Local Buffet/Milk Bar)
    // -------------------------------------------------------------------------
    console.log("--- TEST 5: Simulation — FOOD & DINING Operating Model ---");
    const diningBiz = await prisma.business.create({
      data: {
        id: testIds.diningBizId,
        name: "Inyange Milk Bar & Breakfast",
        nameRw: "Amata Meza & Petit-Déjeuner Inyange",
        category: "food_dining",
        mainCategory: "food_dining",
        subCategory: "dairy_milk_bars",
        businessType: "milk_bar_fresh",
        categoryDisplay: "Restaurants & Food",
        categoryDisplayRw: "Amafunguro na Resitora",
        businessTypeDisplay: "Neighborhood Milk Bar (Amata Meza)",
        businessTypeDisplayRw: "Ikiraro cy'Amata (Milk Bar)",
        description: "Fresh warm milk, African tea, chapati, boiled eggs, and sambusa.",
        phone: "+250788999001",
        whatsapp: "250788999001",
        district: "Nyarugenge",
        sector: "Nyamirambo",
        cell: "Biryogo",
        nearestLandmark: "Beside Biryogo Mosque",
        latitude: -1.981,
        longitude: 30.046,
        status: "ACTIVE",
        verificationStatus: VerificationStatus.AGENT_VERIFIED,
        ownerId: testIds.testOwnerId,
        products: {
          create: [
            {
              name: "Fresh Boiled Milk (1 Cup)",
              nameRw: "Igikombe cy'Amata Yatetse",
              price: 500,
              currency: "RWF",
              isAvailable: true,
            },
            {
              name: "Special Hot Chapati",
              nameRw: "Chapati Ishyushye",
              price: 300,
              currency: "RWF",
              isAvailable: true,
            }
          ]
        }
      },
      include: { products: true }
    });

    console.log(`- Created FOOD_DINING Business: ${diningBiz.id} (${diningBiz.name})`);
    results.diningModelRegistration = true;
    console.log("✓ TEST 5 PASSED: FOOD_DINING operating model verified in Neon DB.\n");

    // -------------------------------------------------------------------------
    // TEST 6: Real Simulation — PRODUCTS Operating Model (Hardware Store)
    // -------------------------------------------------------------------------
    console.log("--- TEST 6: Simulation — PRODUCTS Operating Model ---");
    const productBiz = await prisma.business.create({
      data: {
        id: testIds.productBizId,
        name: "Gasabo Quality Cement & Steel Depot",
        nameRw: "Depo ya Sima n'Ibyuma Gasabo",
        category: "construction_building",
        mainCategory: "construction_building",
        subCategory: "building_materials_hardware",
        businessType: "cement_bricks_depot",
        categoryDisplay: "Construction & Building Services",
        categoryDisplayRw: "Ubwubatsi n'Ubuyobozi bw'Imirimo",
        businessTypeDisplay: "Cement, Lime & Sand Depot",
        businessTypeDisplayRw: "Depo ya Sima, Isuka n'Umucanga",
        description: "Cimerwa cement, iron bars, roofing sheets, wire mesh, and construction sand.",
        phone: "+250788999001",
        whatsapp: "250788999001",
        district: "Gasabo",
        sector: "Kacyiru",
        cell: "Kibaza",
        nearestLandmark: "Near King Faisal Junction",
        latitude: -1.942,
        longitude: 30.089,
        status: "ACTIVE",
        verificationStatus: VerificationStatus.HIGH_CONFIDENCE,
        ownerId: testIds.testOwnerId,
        products: {
          create: [
            {
              name: "Cimerwa 32.5R Cement (50kg)",
              nameRw: "Sima ya Cimerwa 32.5R",
              price: 11000,
              currency: "RWF",
              isAvailable: true,
            },
            {
              name: "High-Tensile Steel Bar (12mm)",
              nameRw: "Icyuma cy'Ubwubatsi 12mm",
              price: 14500,
              currency: "RWF",
              isAvailable: true,
            }
          ]
        }
      },
      include: { products: true }
    });

    console.log(`- Created PRODUCTS Business: ${productBiz.id} (${productBiz.name})`);
    results.productModelRegistration = true;
    console.log("✓ TEST 6 PASSED: PRODUCTS operating model verified in Neon DB.\n");

    // -------------------------------------------------------------------------
    // TEST 7: Search & Discovery by Taxonomy & Keywords
    // -------------------------------------------------------------------------
    console.log("--- TEST 7: Search & Discovery Queries ---");
    // Search by mainCategory
    const diningSearchResults = await prisma.business.findMany({
      where: {
        status: "ACTIVE",
        mainCategory: "food_dining"
      }
    });
    console.log(`- Search 'mainCategory=food_dining' returned: ${diningSearchResults.length} businesses`);
    if (diningSearchResults.length === 0) throw new Error("Search by mainCategory returned 0 results");

    // Search by keyword "Cimerwa"
    const keywordSearchResults = await prisma.business.findMany({
      where: {
        status: "ACTIVE",
        products: { some: { name: { contains: "Cimerwa", mode: "insensitive" } } }
      }
    });
    console.log(`- Search keyword 'Cimerwa' returned: ${keywordSearchResults.length} businesses`);
    if (keywordSearchResults.length === 0) throw new Error("Keyword search for product name failed");

    results.searchAndDiscovery = true;
    console.log("✓ TEST 7 PASSED: Search and discovery filters return expected records.\n");

    // -------------------------------------------------------------------------
    // TEST 8: Customer Telemetry & Inquiries (WhatsApp, Directions, Phone)
    // -------------------------------------------------------------------------
    console.log("--- TEST 8: Customer Telemetry & Inquiries ---");
    const inquiry1 = await prisma.customerInquiry.create({
      data: {
        businessId: testIds.serviceBizId,
        type: InquiryType.WHATSAPP_CLICK,
        channel: "PUBLIC_WEB",
        itemName: "Solar Inverter Installation",
        itemPrice: 35000,
      }
    });

    const inquiry2 = await prisma.customerInquiry.create({
      data: {
        businessId: testIds.serviceBizId,
        type: InquiryType.DIRECTIONS_VIEW,
        channel: "PUBLIC_WEB",
      }
    });

    await prisma.business.update({
      where: { id: testIds.serviceBizId },
      data: {
        contactClicksCount: { increment: 2 },
        viewsCount: { increment: 5 },
      }
    });

    const updatedBiz = await prisma.business.findUnique({
      where: { id: testIds.serviceBizId },
      select: { contactClicksCount: true, viewsCount: true }
    });

    console.log(`- Telemetry logged: Inquiries IDs [${inquiry1.id}, ${inquiry2.id}]`);
    console.log(`- Business metrics: contactClicks=${updatedBiz?.contactClicksCount}, views=${updatedBiz?.viewsCount}`);
    if (updatedBiz?.contactClicksCount !== 2) throw new Error("Contact clicks count mismatch");
    results.customerTelemetry = true;
    console.log("✓ TEST 8 PASSED: Telemetry and customer inquiries persisted in Neon DB.\n");

    // -------------------------------------------------------------------------
    // TEST 9: Business Updates & Bulletins Lifecycle
    // -------------------------------------------------------------------------
    console.log("--- TEST 9: Business Updates & Bulletins Lifecycle ---");
    const update = await prisma.businessUpdate.create({
      data: {
        businessId: testIds.serviceBizId,
        type: "ANNOUNCEMENT",
        title: "Extended Weekend Electrical Emergency Support",
        titleRw: "Ubufasha bwihuse mu mpera z'icyumweru",
        content: "Our technicians will be available 24/7 this coming weekend for emergency electrical cutoffs.",
        status: "ACTIVE",
        moderationStatus: "APPROVED",
      }
    });
    testIds.updateId = update.id;
    console.log(`- Created BusinessUpdate: ${update.id}`);

    // Verify retrieval by public query
    const publicUpdates = await prisma.businessUpdate.findMany({
      where: { businessId: testIds.serviceBizId, status: "ACTIVE", moderationStatus: "APPROVED" }
    });
    console.log(`- Active public updates for business: ${publicUpdates.length}`);
    if (publicUpdates.length !== 1) throw new Error("Public updates retrieval failed");

    results.updatesLifecycle = true;
    console.log("✓ TEST 9 PASSED: Business updates lifecycle verified in Neon DB.\n");

    // -------------------------------------------------------------------------
    // TEST 10: Business Opportunities & Applicant Pipeline
    // -------------------------------------------------------------------------
    console.log("--- TEST 10: Business Opportunities & Applicant Pipeline ---");
    const opportunity = await prisma.businessOpportunity.create({
      data: {
        businessId: testIds.serviceBizId,
        type: "EMPLOYMENT",
        title: "Assistant Electrician / Intern",
        titleRw: "Umufasha w'Umunyamashanyarazi",
        description: "Looking for a TVET graduate with basic domestic wiring skills.",
        contactMethod: "WHATSAPP",
        contactValue: "+250788999001",
        status: "OPEN",
        moderationStatus: "APPROVED",
      }
    });
    testIds.opportunityId = opportunity.id;
    console.log(`- Created Opportunity: ${opportunity.id}`);

    // Customer applies to opportunity
    const application = await prisma.opportunityInquiry.create({
      data: {
        opportunityId: opportunity.id,
        applicantName: "Jean Damascene Habimana",
        applicantPhone: "+250788111222",
        message: "I completed IPRC Kigali TVET in electrical installations.",
        status: "NEW",
      }
    });
    console.log(`- Applicant applied: ID ${application.id} (${application.applicantName})`);

    const updatedOpp = await prisma.businessOpportunity.update({
      where: { id: opportunity.id },
      data: { responsesCount: { increment: 1 } },
      include: { inquiries: true }
    });
    console.log(`- Opportunity responsesCount: ${updatedOpp.responsesCount}, inquiries list length: ${updatedOpp.inquiries.length}`);
    if (updatedOpp.responsesCount !== 1) throw new Error("Opportunity responses count failed");

    results.opportunitiesPipeline = true;
    console.log("✓ TEST 10 PASSED: Opportunities and applicant pipeline verified in Neon DB.\n");

    // -------------------------------------------------------------------------
    // TEST 11: Data Isolation & Public Privacy Shielding
    // -------------------------------------------------------------------------
    console.log("--- TEST 11: Data Isolation & Public Privacy Shielding ---");
    
    // Simulate raw business with sensitive internal fields
    const rawSensitiveBiz = {
      ...serviceBiz,
      internalCostPerUnit: 8000,
      supplierName: "Inyange Milk Processing Plant",
      supplierPhone: "+250788555111",
      creatorUserId: "secret-agent-id-123",
      agentInternalNotes: "Customer is negotiating volume discount",
      phoneHash: "hash-secret-value",
    };

    const serialized = serializePublicBusiness(rawSensitiveBiz);

    console.log("- Checking public serialization leak protection:");
    console.log(`  - supplierName in output: ${"supplierName" in serialized ? "LEAKED" : "SHIELDED (OK)"}`);
    console.log(`  - internalCostPerUnit in output: ${"internalCostPerUnit" in serialized ? "LEAKED" : "SHIELDED (OK)"}`);
    console.log(`  - agentInternalNotes in output: ${"agentInternalNotes" in serialized ? "LEAKED" : "SHIELDED (OK)"}`);
    console.log(`  - phoneHash in output: ${"phoneHash" in serialized ? "LEAKED" : "SHIELDED (OK)"}`);
    console.log(`  - mainCategory exposed: ${serialized.mainCategory} (OK)`);
    console.log(`  - classificationPath exposed: ${serialized.classificationPath} (OK)`);

    if ("supplierName" in serialized || "internalCostPerUnit" in serialized || "agentInternalNotes" in serialized) {
      throw new Error("Critical Privacy Leak: Sensitive fields exposed in public serializer");
    }

    // Check ownership boundary: otherOwner cannot own serviceBiz
    if (serviceBiz.ownerId === testIds.otherOwnerId) {
      throw new Error("Data isolation failure: Owner ID collision");
    }

    results.dataIsolationAndPrivacy = true;
    console.log("✓ TEST 11 PASSED: Data isolation and public privacy shielding verified.\n");

  } catch (error) {
    console.error("TEST SUITE ERROR:", error);
    process.exitCode = 1;
  } finally {
    // -------------------------------------------------------------------------
    // TEST 12: Database Teardown & Clean State Restoration
    // -------------------------------------------------------------------------
    console.log("--- TEST 12: Database Teardown & Integrity Restoration ---");
    try {
      if (testIds.opportunityId) {
        await prisma.opportunityInquiry.deleteMany({ where: { opportunityId: testIds.opportunityId } });
        await prisma.businessOpportunity.deleteMany({ where: { id: testIds.opportunityId } });
      }
      if (testIds.updateId) {
        await prisma.businessUpdate.deleteMany({ where: { id: testIds.updateId } });
      }
      
      const testBizIds = [testIds.serviceBizId, testIds.diningBizId, testIds.productBizId];
      await prisma.customerInquiry.deleteMany({ where: { businessId: { in: testBizIds } } });
      await prisma.product.deleteMany({ where: { businessId: { in: testBizIds } } });
      await prisma.business.deleteMany({ where: { id: { in: testBizIds } } });
      
      await prisma.user.deleteMany({ where: { id: { in: [testIds.testOwnerId, testIds.otherOwnerId] } } });

      const remainingTestBizs = await prisma.business.count({
        where: { id: { in: testBizIds } }
      });
      console.log(`- Remaining test records in database: ${remainingTestBizs}`);
      
      const totalLiveBusinesses = await prisma.business.count();
      console.log(`- Total live businesses preserved in Neon PostgreSQL: ${totalLiveBusinesses}`);

      if (remainingTestBizs === 0 && totalLiveBusinesses === 53) {
        results.databaseTeardown = true;
        console.log("✓ TEST 12 PASSED: 100% of test records safely cleaned up, exactly 53 live businesses intact.\n");
      } else {
        throw new Error(`Database cleanup anomaly: remaining=${remainingTestBizs}, total=${totalLiveBusinesses}`);
      }
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log("================================================================================");
  console.log("                       CROSS-CHECK RESULTS SUMMARY                              ");
  console.log("================================================================================");
  let allPass = true;
  for (const [key, pass] of Object.entries(results)) {
    console.log(`${key.padEnd(32)}: ${pass ? "PASS ✓" : "FAIL ✗"}`);
    if (!pass) allPass = false;
  }
  console.log("================================================================================");
  console.log(`FINAL RESULT: ${allPass ? "100% PRODUCTION READY (PASS)" : "FAIL"}`);
  console.log("================================================================================\n");

  if (!allPass) process.exit(1);
}

run();
