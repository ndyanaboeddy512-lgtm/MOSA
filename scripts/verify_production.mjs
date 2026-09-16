// Automated verification of MOSA endpoints and workflows
async function runTests() {
  const baseUrl = "http://localhost:3000";
  console.log("=== MOSA PRODUCTION SYSTEM VERIFICATION ===\n");

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

  // 1. Home Page
  await test("GET / (Homepage HTML)", async () => {
    const res = await fetch(`${baseUrl}/`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    if (!html.includes("MOSA")) throw new Error("Missing MOSA brand in HTML");
  });

  // 2. Businesses API
  await test("GET /api/businesses (Listings)", async () => {
    const res = await fetch(`${baseUrl}/api/businesses`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.businesses)) throw new Error("Invalid response format");
    if (data.businesses.length === 0) throw new Error("Expected at least 1 business");
    console.log(`   Fetched ${data.businesses.length} businesses (${data.source})`);
  });

  // 3. Demand Radar API
  await test("GET /api/demand (Demand Signals)", async () => {
    const res = await fetch(`${baseUrl}/api/demand`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.demands)) throw new Error("Invalid demand response");
    console.log(`   Fetched ${data.demands.length} community demand signals`);
  });

  // 4. Missions API
  await test("GET /api/missions (Community Missions)", async () => {
    const res = await fetch(`${baseUrl}/api/missions`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.missions)) throw new Error("Invalid missions response");
    console.log(`   Fetched ${data.missions.length} community missions`);
  });

  // 5. OCR Parse API
  await test("POST /api/capture/ocr (Document parsing)", async () => {
    const sampleReceipt = `
      INZIZA MILK BAR NYAMIRAMBO
      Date: 12/09/2026
      Ikivuguto Fresh: 800 RWF
      Amata Yomete: 700 RWF
      Total: 1500 RWF
      Tel: 0788112233
    `;
    const res = await fetch(`${baseUrl}/api/capture/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: sampleReceipt, documentType: "RECEIPT" }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.result) throw new Error("OCR parsing failed");
    if (data.result.items.length === 0) throw new Error("Failed to extract items");
    console.log(`   Extracted ${data.result.items.length} items, Total: ${data.result.totalAmount} RWF`);
  });

  // 6. Demo Role Switch & Session Cookie
  let sessionCookie = "";
  await test("POST /api/auth/demo-switch (SUPER_ADMIN Authentication & JWT Cookie)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/demo-switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "SUPER_ADMIN" }),
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const cookieHeader = res.headers.get("set-cookie");
    if (!cookieHeader || !cookieHeader.includes("mosa_session=")) {
      throw new Error("Missing mosa_session cookie in response");
    }
    sessionCookie = cookieHeader.split(";")[0];
    const data = await res.json();
    if (data.user.role !== "SUPER_ADMIN") throw new Error("Role mismatch in user payload");
    console.log(`   Logged in as: ${data.user.name} (${data.user.role}), Cookie set`);
  });

  // 7. Verify Authenticated User via /api/auth/me
  await test("GET /api/auth/me (Session Check)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.authenticated || data.user.role !== "SUPER_ADMIN") {
      throw new Error("Session verification failed");
    }
    console.log(`   Session valid for: ${data.user.name}`);
  });

  // 8. Admin Overview with Session Cookie
  await test("GET /api/admin (Admin Console Metrics & Lists)", async () => {
    const res = await fetch(`${baseUrl}/api/admin`, {
      headers: { Cookie: sessionCookie },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.metrics) throw new Error("Admin overview failed");
    console.log(`   Admin Metrics: ${data.metrics.totalBusinesses} businesses, ${data.metrics.verifiedCount} verified, ${data.metrics.totalUsers} users`);
  });

  // 9. Community Review Submission
  await test("POST /api/reviews (Verified Resident Review)", async () => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        businessId: "biz-1",
        userName: "Diane Uwera",
        rating: 5,
        comment: "Excellent community service and authentic local craftsmanship.",
      }),
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Review creation failed");
    console.log(`   Created review for business ${data.review.businessId}`);
  });

  // 10. Community Report Submission
  await test("POST /api/reports (Community Issue Report)", async () => {
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        businessId: "biz-1",
        reason: "WRONG_PRICE",
        details: "Prices updated on storefront chalkboard today.",
      }),
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Report creation failed");
    console.log(`   Report submitted with status: ${data.report?.status || "OPEN"}`);
  });

  console.log(`\n===========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
