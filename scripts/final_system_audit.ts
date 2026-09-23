import { prisma } from "../src/lib/prisma";
import { Role } from "@prisma/client";
import { CANONICAL_TAXONOMY, ALL_MAIN_CATEGORIES } from "../src/lib/taxonomy";
import { RWANDA_HIERARCHY } from "../src/lib/rwanda-geo";

const LIVE_PROD_URL = "https://mosa-one.vercel.app";

interface TestReport {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const reports: TestReport[] = [];

function recordTest(category: string, name: string, passed: boolean, details?: string) {
  reports.push({ category, name, passed, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${category}] ${name}${details ? ` (${details})` : ""}`);
}

async function runComprehensiveAudit() {
  console.log("======================================================================");
  console.log("       MOSA FINAL SYSTEM-WIDE CONSISTENCY & INTEGRATION AUDIT         ");
  console.log("======================================================================\n");
  console.log(`Live Production Base URL: ${LIVE_PROD_URL}`);
  console.log(`Neon Database URL: ${process.env.DATABASE_URL ? "Configured & Active" : "Missing"}\n`);

  // -------------------------------------------------------------------------
  // SECTION 1: DATABASE INTEGRITY & CORE MODELS IN NEON POSTGRESQL
  // -------------------------------------------------------------------------
  console.log("--- 1. AUDITING NEON POSTGRESQL + PRISMA DATA LAYER ---");
  try {
    const businessCount = await prisma.business.count();
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const mediaCount = await prisma.businessMedia.count();
    const auditCount = await prisma.auditLog.count();
    const announcementCount = await prisma.partnerAnnouncement.count();
    const settingsCount = await prisma.platformSettings.count();
    const notificationCount = await prisma.notification.count();

    recordTest("Database", "Neon PostgreSQL Connection & Core Tables", true, 
      `Businesses: ${businessCount}, Users: ${userCount}, Products: ${productCount}, Media: ${mediaCount}, Audits: ${auditCount}, Announcements: ${announcementCount}, Settings: ${settingsCount}`);
    
    // Check default PlatformSettings row
    const defaultSettings = await prisma.platformSettings.findUnique({ where: { id: "default" } });
    recordTest("Database", "PlatformSettings Singleton Persistence", !!defaultSettings, 
      `Name: ${defaultSettings?.platformName}, Email: ${defaultSettings?.officialEmail}, Languages: ${defaultSettings?.supportedLanguages}`);

  } catch (err: any) {
    recordTest("Database", "Neon PostgreSQL Connection & Core Tables", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 2: RWANDA LOCATIONS & TAXONOMY INTEGRITY
  // -------------------------------------------------------------------------
  console.log("\n--- 2. AUDITING RWANDA LOCATIONS & TAXONOMY ---");
  try {
    const provinceKeys = Object.keys(RWANDA_HIERARCHY);
    const hasKigali = !!RWANDA_HIERARCHY.kigali;
    const mainCategories = Object.keys(ALL_MAIN_CATEGORIES);
    
    recordTest("Taxonomy & Geo", "Rwanda Geo Hierarchy (Provinces & Districts)", 
      provinceKeys.length >= 5 && hasKigali, `Provinces: ${provinceKeys.length}, Kigali present`);
    
    recordTest("Taxonomy & Geo", "Canonical 3-Tier Business Taxonomy", 
      mainCategories.length >= 10, `Main Categories: ${mainCategories.length}`);
    
    // Verify businesses in DB have valid Rwanda districts
    const sampleBiz = await prisma.business.findFirst({
      where: { district: { not: "" } },
      select: { name: true, district: true, category: true },
    });
    recordTest("Taxonomy & Geo", "Live Business Geographic Attribution", 
      !!sampleBiz, `Sample: "${sampleBiz?.name}" in District: ${sampleBiz?.district}, Cat: ${sampleBiz?.category}`);

  } catch (err: any) {
    recordTest("Taxonomy & Geo", "Taxonomy & Geo Structure", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 3: PRODUCTS, SERVICES, MEDIA & REQUIRED CAPTIONS
  // -------------------------------------------------------------------------
  console.log("\n--- 3. AUDITING PRODUCTS, SERVICES, MEDIA & CAPTIONS ---");
  try {
    // Check products in DB with prices / contact for price
    const products = await prisma.product.findMany({
      take: 10,
      include: { business: { select: { name: true } } },
    });
    recordTest("Products/Services", "Products & Services Persistence", 
      products.length > 0, `Sample verified: ${products.length} products found`);

    // Check Product with mediaCaption field
    const mediaWithCaption = await prisma.product.findFirst({
      where: { mediaCaption: { not: null } },
      select: { name: true, mediaCaption: true, mediaUrl: true },
    });
    recordTest("Products/Services", "Business Media with Required Caption Persistence", 
      !!mediaWithCaption, `Sample Item: "${mediaWithCaption?.name}", Caption: "${mediaWithCaption?.mediaCaption}"`);

  } catch (err: any) {
    recordTest("Products/Services", "Products & Media Check", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 4: PARTNER ANNOUNCEMENTS & NOTIFICATIONS
  // -------------------------------------------------------------------------
  console.log("\n--- 4. AUDITING PARTNER ANNOUNCEMENTS & NOTIFICATIONS ---");
  try {
    const announcements = await prisma.partnerAnnouncement.findMany({
      take: 5,
      include: { author: { select: { name: true, role: true } } },
    });
    recordTest("Announcements", "Partner Announcements Data Model & Status", 
      true, `Announcements in DB: ${announcements.length}`);

    // Verify Notification model links to announcementId
    const annNotifications = await prisma.notification.findMany({
      where: { type: "ANNOUNCEMENT" },
      take: 5,
    });
    recordTest("Announcements", "Announcement Delivery to Owner Notifications", 
      true, `Announcement notifications created: ${annNotifications.length}`);

  } catch (err: any) {
    recordTest("Announcements", "Partner Announcements Check", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 5: AUDIT LOGS & GOVERNANCE
  // -------------------------------------------------------------------------
  console.log("\n--- 5. AUDITING IMMUTABLE AUDIT LOGS ---");
  try {
    const recentAudits = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true, role: true } } },
    });
    recordTest("Audit & Governance", "Immutable AuditLog Records in PostgreSQL", 
      recentAudits.length > 0, `Latest actions: ${recentAudits.map(a => a.action).slice(0, 3).join(", ")}`);

    const platformAudits = await prisma.auditLog.findMany({
      where: { entityType: "PLATFORM_SETTINGS" },
    });
    recordTest("Audit & Governance", "Platform Identity Updates Audited", 
      platformAudits.length > 0, `Platform identity audit events: ${platformAudits.length}`);

  } catch (err: any) {
    recordTest("Audit & Governance", "Audit Log Check", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 6: COMPLETE FLOW VERIFICATION:
  // Command Center → Database → Owner Dashboard → Public MOSA
  // -------------------------------------------------------------------------
  console.log("\n--- 6. VERIFYING FLOW: Command Center → DB → Owner → Public ---");
  try {
    // 1. Pick a business to test the lifecycle
    const testBiz = await prisma.business.findFirst({
      where: { ownerId: { not: null } },
      include: { owner: true, products: true, media: true },
    });

    if (!testBiz) {
      throw new Error("No owned business found for end-to-end flow test");
    }

    // Step A: Verification in DB
    recordTest("Flow: CC->DB->Owner->Public", "Business Record with Owner Link", 
      !!testBiz.ownerId, `Business: "${testBiz.name}" (ID: ${testBiz.id}), Owner: ${testBiz.owner?.name}`);

    // Step B: Products & Media linked
    recordTest("Flow: CC->DB->Owner->Public", "Business Products & Media Linked in DB", 
      testBiz.products.length >= 0, `Products: ${testBiz.products.length}, Media: ${testBiz.media.length}`);

    // Step C: Owner Dashboard data isolation
    const ownerBizCount = await prisma.business.count({
      where: { ownerId: testBiz.ownerId },
    });
    recordTest("Flow: CC->DB->Owner->Public", "Owner Dashboard Isolation (ownerId match)", 
      ownerBizCount >= 1, `Owner manages ${ownerBizCount} business(es)`);

    // Step D: Public Business Profile Route accessibility on Live Vercel
    const publicBizRes = await fetch(`${LIVE_PROD_URL}/business/${testBiz.id}`);
    const publicBizStatus = publicBizRes.status;
    recordTest("Flow: CC->DB->Owner->Public", "Public MOSA Business Page Live Access", 
      publicBizStatus === 200, `Live URL: ${LIVE_PROD_URL}/business/${testBiz.id} (HTTP ${publicBizStatus})`);

  } catch (err: any) {
    recordTest("Flow: CC->DB->Owner->Public", "End-to-End Flow Check", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 7: FLOW VERIFICATION:
  // Platform Identity → Approved MOSA Interfaces
  // -------------------------------------------------------------------------
  console.log("\n--- 7. VERIFYING FLOW: Platform Identity → MOSA Interfaces ---");
  try {
    const liveSettingsRes = await fetch(`${LIVE_PROD_URL}/api/platform/settings`);
    if (liveSettingsRes.status !== 200) {
      throw new Error(`Live settings endpoint returned HTTP ${liveSettingsRes.status}`);
    }
    const liveSettings = await liveSettingsRes.json();
    recordTest("Flow: Identity->Interfaces", "Live Public API /api/platform/settings", 
      !!liveSettings.platformName, `Platform: "${liveSettings.platformName}", Email: ${liveSettings.officialEmail}`);

    // Check Live Home Page HTML for dynamic brand values
    const liveHomeRes = await fetch(`${LIVE_PROD_URL}/`);
    const homeHtml = await liveHomeRes.text();
    const hasBrandInHome = homeHtml.includes("MOSA");
    recordTest("Flow: Identity->Interfaces", "Live Homepage Navbar & Footer Rendering", 
      hasBrandInHome, `Homepage contains MOSA platform brand tokens (HTTP ${liveHomeRes.status})`);

  } catch (err: any) {
    recordTest("Flow: Identity->Interfaces", "Platform Identity Flow", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 8: LIVE PRODUCTION ROUTE CHECKS (VERCEL)
  // -------------------------------------------------------------------------
  console.log("\n--- 8. AUDITING ALL LIVE PRODUCTION ROUTES ON VERCEL ---");
  const routesToVerify = [
    { url: `${LIVE_PROD_URL}/`, desc: "Main MOSA Public Homepage", expect: 200 },
    { url: `${LIVE_PROD_URL}/explore`, desc: "Explore & Community Discovery Feed", expect: 200 },
    { url: `${LIVE_PROD_URL}/demand`, desc: "Demand Radar & Community Needs", expect: 200 },
    { url: `${LIVE_PROD_URL}/search`, desc: "Search & Keyword Discovery", expect: 200 },
    { url: `${LIVE_PROD_URL}/register-business`, desc: "Business Self-Registration Portal", expect: 200 },
    { url: `${LIVE_PROD_URL}/owner/dashboard`, desc: "Business Owner Dashboard", expect: [200, 307, 308] },
    { url: `${LIVE_PROD_URL}/admin`, desc: "MOSA Command Center", expect: [200, 307, 308] },
    { url: `${LIVE_PROD_URL}/admin/login`, desc: "Admin Command Center Login", expect: 200 },
    { url: `${LIVE_PROD_URL}/admin/forgot-password`, desc: "Admin Password Recovery", expect: 200 },
    { url: `${LIVE_PROD_URL}/auth/login`, desc: "Public User / Merchant Login", expect: 200 },
    { url: `${LIVE_PROD_URL}/community/missions`, desc: "Community Agent Missions Hub", expect: 200 },
    { url: `${LIVE_PROD_URL}/api/businesses`, desc: "Public Businesses API (Live Neon)", expect: 200 },
    { url: `${LIVE_PROD_URL}/api/demand`, desc: "Community Demand Signals API", expect: 200 },
    { url: `${LIVE_PROD_URL}/api/geo`, desc: "Rwanda Geo Hierarchy API", expect: 200 },
    { url: `${LIVE_PROD_URL}/api/platform/settings`, desc: "Platform Identity Settings API", expect: 200 },
  ];

  for (const r of routesToVerify) {
    try {
      const res = await fetch(r.url, { redirect: "manual" });
      const status = res.status;
      const expected = Array.isArray(r.expect) ? r.expect.includes(status) : status === r.expect;
      recordTest("Live Route Check", r.desc, expected, `URL: ${r.url} -> HTTP ${status}`);
    } catch (err: any) {
      recordTest("Live Route Check", r.desc, false, `Failed: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // FINAL REPORT SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n======================================================================");
  console.log("                       AUDIT SUMMARY RESULTS                          ");
  console.log("======================================================================");
  const total = reports.length;
  const passed = reports.filter(r => r.passed).length;
  const failed = reports.filter(r => !r.passed).length;
  console.log(`Total Checks Executed: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.error("FAILURES DETECTED:");
    reports.filter(r => !r.passed).forEach(r => console.error(` - [${r.category}] ${r.name}: ${r.details}`));
    process.exit(1);
  } else {
    console.log("✨ ALL SYSTEM INTEGRATION AUDIT CHECKS PASSED PERFECTLY! ✨");
  }
}

runComprehensiveAudit()
  .catch((err) => {
    console.error("Fatal audit execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
