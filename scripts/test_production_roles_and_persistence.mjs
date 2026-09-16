import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:3000";

async function runRbacAndPersistenceTests() {
  console.log("=== COMPREHENSIVE RBAC, PERSISTENCE & MULTILINGUAL TESTING ===\n");
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // Helper to obtain session cookie for any role
  async function getSessionCookieForRole(role) {
    const res = await fetch(`${baseUrl}/api/auth/demo-switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) throw new Error(`No cookie returned for role ${role}`);
    return setCookie.split(";")[0];
  }

  // --- 1. RBAC SECURITY VERIFICATION ---
  console.log("--- 1. RBAC ROUTE & API PERMISSION ENFORCEMENT ---");

  // A. Anonymous / Unauthenticated access to /api/admin
  await test("Unauthenticated access to /api/admin is rejected (401)", async () => {
    const res = await fetch(`${baseUrl}/api/admin`);
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Expected 401/403, got ${res.status}`);
    }
  });

  // B. CUSTOMER role access to /api/admin
  await test("CUSTOMER access to /api/admin is forbidden (403)", async () => {
    const customerCookie = await getSessionCookieForRole("CUSTOMER");
    const res = await fetch(`${baseUrl}/api/admin`, {
      headers: { Cookie: customerCookie },
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden for CUSTOMER, got ${res.status}`);
    }
  });

  // C. BUSINESS_OWNER role access to /api/admin
  await test("BUSINESS_OWNER access to /api/admin is forbidden (403)", async () => {
    const ownerCookie = await getSessionCookieForRole("BUSINESS_OWNER");
    const res = await fetch(`${baseUrl}/api/admin`, {
      headers: { Cookie: ownerCookie },
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden for BUSINESS_OWNER, got ${res.status}`);
    }
  });

  // D. COMMUNITY_AGENT role access to /api/admin
  await test("COMMUNITY_AGENT access to /api/admin is forbidden (403)", async () => {
    const agentCookie = await getSessionCookieForRole("COMMUNITY_AGENT");
    const res = await fetch(`${baseUrl}/api/admin`, {
      headers: { Cookie: agentCookie },
    });
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden for COMMUNITY_AGENT, got ${res.status}`);
    }
  });

  // E. SUPER_ADMIN role access to /api/admin
  let superAdminCookie = "";
  await test("SUPER_ADMIN access to /api/admin is granted (200)", async () => {
    superAdminCookie = await getSessionCookieForRole("SUPER_ADMIN");
    const res = await fetch(`${baseUrl}/api/admin`, {
      headers: { Cookie: superAdminCookie },
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200 for SUPER_ADMIN, got ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) throw new Error("Admin response success is false");
  });

  // F. COMMUNITY_ADMIN role access to /api/admin
  await test("COMMUNITY_ADMIN access to /api/admin is granted (200)", async () => {
    const commAdminCookie = await getSessionCookieForRole("COMMUNITY_ADMIN");
    const res = await fetch(`${baseUrl}/api/admin`, {
      headers: { Cookie: commAdminCookie },
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200 for COMMUNITY_ADMIN, got ${res.status}`);
    }
  });

  // G. MODERATOR role access to /api/admin
  await test("MODERATOR access to /api/admin is granted (200)", async () => {
    const modCookie = await getSessionCookieForRole("MODERATOR");
    const res = await fetch(`${baseUrl}/api/admin`, {
      headers: { Cookie: modCookie },
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200 for MODERATOR, got ${res.status}`);
    }
  });

  // --- 2. MULTILINGUAL PERSISTENCE IN NEON ---
  console.log("\n--- 2. MULTILINGUAL 4-LANGUAGE PERSISTENCE IN NEON ---");
  const languages = ["rw", "en", "fr", "sw"];

  for (const lang of languages) {
    await test(`Persist language preference "${lang}" in Neon via PATCH /api/auth/me`, async () => {
      // 1. Update user language preference
      const patchRes = await fetch(`${baseUrl}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: superAdminCookie,
        },
        body: JSON.stringify({ language: lang }),
      });
      if (patchRes.status !== 200) throw new Error(`PATCH failed: status ${patchRes.status}`);

      // 2. Fetch via GET /api/auth/me to confirm returned preference
      const getRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: superAdminCookie },
      });
      const data = await getRes.json();
      if (data.user.language !== lang) {
        throw new Error(`Expected language ${lang}, got ${data.user.language}`);
      }

      // 3. Confirm directly in Neon PostgreSQL
      const dbUser = await prisma.user.findUnique({
        where: { id: data.user.id },
      });
      if (dbUser.language !== lang) {
        throw new Error(`Neon database language mismatch: expected ${lang}, found ${dbUser.language}`);
      }
    });
  }

  // --- 3. CROSS-SESSION REAL DATABASE PERSISTENCE TEST ---
  console.log("\n--- 3. CROSS-SESSION REAL DATABASE PERSISTENCE ---");

  await test("Session A creates a verified record in Neon; Session B reads it from Neon", async () => {
    // Session A (Agent Emmanuel Hakizimana) creates an OCR capture with items
    const agentCookie = await getSessionCookieForRole("COMMUNITY_AGENT");
    const testMerchant = `CrossSession Merchant ${Date.now().toString().slice(-4)}`;

    const createRes = await fetch(`${baseUrl}/api/capture/ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: agentCookie,
      },
      body: JSON.stringify({
        action: "publish",
        businessId: "biz-1",
        merchantName: testMerchant,
        documentType: "RECEIPT",
        rawText: `${testMerchant}\nChai Karak: 1500 RWF\nChapati Fresh: 500 RWF\nTotal: 2000 RWF`,
        totalAmount: 2000,
        items: [
          { name: "Special Karak Chai", price: 1500, quantity: 1, category: "Beverages", confidence: 0.98 },
          { name: "Flaky Chapati", price: 500, quantity: 2, category: "Snacks", confidence: 0.99 },
        ],
      }),
    });
    if (createRes.status !== 201) throw new Error(`Create failed with status ${createRes.status}`);
    const createData = await createRes.json();
    const captureId = createData.captureId;

    // Direct Neon check
    const neonCapture = await prisma.receiptCapture.findUnique({
      where: { id: captureId },
      include: { items: true },
    });
    if (!neonCapture || neonCapture.merchantDetected !== testMerchant) {
      throw new Error("Record not found in Neon database!");
    }
    if (neonCapture.items.length !== 2) {
      throw new Error(`Expected 2 items in Neon, found ${neonCapture.items.length}`);
    }

    // Session B (Completely unauthenticated client or Customer session)
    // fetches business detail from /api/businesses/biz-1
    const customerCookie = await getSessionCookieForRole("CUSTOMER");
    const readRes = await fetch(`${baseUrl}/api/capture/ocr?businessId=biz-1`, {
      headers: { Cookie: customerCookie },
    });
    const readData = await readRes.json();
    const found = readData.captures?.find((c) => c.id === captureId);
    if (!found) {
      throw new Error("Session B failed to retrieve record created by Session A from Neon!");
    }

    // Clean up test capture and items from Neon
    await prisma.receiptItem.deleteMany({ where: { captureId } });
    await prisma.receiptCapture.delete({ where: { id: captureId } });
  });

  // --- 4. ADMIN AUDIT TRAIL PERSISTENCE TEST ---
  console.log("\n--- 4. ADMIN AUDIT TRAIL IN NEON ---");
  await test("Admin action creates immutable AuditLog entry in Neon PostgreSQL", async () => {
    // 1. Submit a community report
    const reportRes = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: "biz-1",
        reason: "WRONG_PRICE",
        details: "Audit test report for resolution check",
      }),
    });
    const reportData = await reportRes.json();
    const reportId = reportData.report?.id;
    if (!reportId) throw new Error("Report creation failed");

    // 2. Admin resolves the report via PATCH /api/admin
    const patchRes = await fetch(`${baseUrl}/api/admin`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: superAdminCookie,
      },
      body: JSON.stringify({
        action: "RESOLVE_REPORT",
        reportId,
        status: "RESOLVED",
      }),
    });
    if (patchRes.status !== 200) throw new Error(`Admin patch failed: ${patchRes.status}`);

    // 3. Check Neon PostgreSQL AuditLog table for the event
    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        action: "REPORT_RESOLVED",
        entityId: reportId,
      },
      include: { actor: true },
    });

    if (!auditEntry) {
      throw new Error("AuditLog entry not found in Neon database for REPORT_RESOLVED!");
    }
    console.log(`   Neon AuditLog: ID ${auditEntry.id} by ${auditEntry.actor?.name} (${auditEntry.actor?.role})`);

    // Clean up report
    await prisma.report.delete({ where: { id: reportId } }).catch(() => {});
  });

  console.log(`\n======================================================`);
  console.log(`RBAC & PERSISTENCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runRbacAndPersistenceTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
