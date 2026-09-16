import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const liveUrl = "https://mosa-one.vercel.app";

async function runLiveVerification() {
  console.log(`=== TESTING LIVE VERCEL DEPLOYMENT: ${liveUrl} ===\n`);
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

  // Helper to obtain session cookie from live Vercel deployment
  async function getLiveSessionCookie(role) {
    const res = await fetch(`${liveUrl}/api/auth/demo-switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error(`Live login failed for ${role}: status ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) throw new Error(`No cookie returned from live Vercel for ${role}`);
    return setCookie.split(";")[0];
  }

  // 1. Live Homepage
  await test("GET live homepage HTML", async () => {
    const res = await fetch(`${liveUrl}/`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    if (!html.includes("MOSA")) throw new Error("Missing MOSA branding in live HTML");
  });

  // 2. Live Database Read from Neon via Vercel
  await test("GET /api/businesses (Live Neon read via Vercel)", async () => {
    const res = await fetch(`${liveUrl}/api/businesses`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.businesses)) throw new Error("Invalid response format");
    console.log(`   Live Neon businesses count: ${data.businesses.length} (source: ${data.source})`);
  });

  // 3. Live Demand Radar
  await test("GET /api/demand (Live Neon demand signals)", async () => {
    const res = await fetch(`${liveUrl}/api/demand`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.demands)) throw new Error("Invalid demand response");
    console.log(`   Live Neon demand signals: ${data.demands.length}`);
  });

  // 4. Live Missions
  await test("GET /api/missions (Live Neon missions)", async () => {
    const res = await fetch(`${liveUrl}/api/missions`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.missions)) throw new Error("Invalid missions response");
    console.log(`   Live Neon community missions: ${data.missions.length}`);
  });

  // 5. Live Authentication & Session Cookie
  let superAdminCookie = "";
  await test("POST /api/auth/demo-switch (Live SUPER_ADMIN authentication & JWT session)", async () => {
    superAdminCookie = await getLiveSessionCookie("SUPER_ADMIN");
    const meRes = await fetch(`${liveUrl}/api/auth/me`, {
      headers: { Cookie: superAdminCookie },
    });
    if (meRes.status !== 200) throw new Error(`Status ${meRes.status}`);
    const meData = await meRes.json();
    if (!meData.authenticated || meData.user.role !== "SUPER_ADMIN") {
      throw new Error(`Session verification failed: ${JSON.stringify(meData)}`);
    }
    console.log(`   Live session verified for: ${meData.user.name} (${meData.user.role})`);
  });

  // 6. Live RBAC Security: Customer access to Admin
  await test("RBAC: Live CUSTOMER forbidden from /api/admin (403)", async () => {
    const customerCookie = await getLiveSessionCookie("CUSTOMER");
    const res = await fetch(`${liveUrl}/api/admin`, {
      headers: { Cookie: customerCookie },
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  // 7. Live Admin Metrics from Neon
  await test("GET /api/admin (Live Admin Console Metrics & Lists)", async () => {
    const res = await fetch(`${liveUrl}/api/admin`, {
      headers: { Cookie: superAdminCookie },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.metrics) throw new Error("Invalid admin response");
    console.log(`   Live Admin Metrics: ${data.metrics.totalBusinesses} businesses, ${data.metrics.verifiedCount} verified, ${data.metrics.totalUsers} users`);
  });

  // 8. Live Database Write: Review Submission to Neon
  let liveReviewId = "";
  await test("POST /api/reviews (Live database write to Neon via Vercel)", async () => {
    const testComment = `Live Vercel verification review ${Date.now()}`;
    const res = await fetch(`${liveUrl}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: superAdminCookie,
      },
      body: JSON.stringify({
        businessId: "biz-1",
        userName: "Diane Uwera",
        rating: 5,
        comment: testComment,
      }),
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Review submission failed");
    liveReviewId = data.review.id;

    // Verify record exists directly in Neon PostgreSQL
    const dbReview = await prisma.review.findUnique({
      where: { id: liveReviewId },
    });
    if (!dbReview || dbReview.comment !== testComment) {
      throw new Error("Review write failed to persist in Neon database!");
    }
    console.log(`   Confirmed in Neon PostgreSQL: Review ID ${liveReviewId}`);
  });

  // 9. Live 4-Language Persistence Test
  console.log("\n--- Testing 4-Language Persistence on Live Vercel ---");
  const languages = [
    { code: "rw", name: "Ikinyarwanda" },
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "sw", name: "Kiswahili" },
  ];

  for (const { code, name } of languages) {
    await test(`Persist "${name}" (${code}) on Live Vercel → Neon PostgreSQL`, async () => {
      const patchRes = await fetch(`${liveUrl}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: superAdminCookie,
        },
        body: JSON.stringify({ language: code }),
      });
      if (patchRes.status !== 200) throw new Error(`PATCH failed: status ${patchRes.status}`);

      // Verify via GET from live Vercel
      const getRes = await fetch(`${liveUrl}/api/auth/me`, {
        headers: { Cookie: superAdminCookie },
      });
      const data = await getRes.json();
      if (data.user.language !== code) throw new Error(`Live site returned ${data.user.language} instead of ${code}`);

      // Verify directly in Neon database
      const dbUser = await prisma.user.findUnique({
        where: { id: data.user.id },
      });
      if (dbUser.language !== code) throw new Error(`Neon database language mismatch: expected ${code}, found ${dbUser.language}`);
    });
  }

  // 10. Live Cross-Session / Cross-Browser Persistence Test
  console.log("\n--- Testing Live Cross-Session Persistence ---");
  await test("Cross-Session: Browser A writes to live Vercel → Neon; Browser B reads it", async () => {
    // Session A creates a community report on live Vercel
    const customerCookie = await getLiveSessionCookie("CUSTOMER");
    const testDetail = `Cross-browser test report ${Date.now()}`;
    const reportRes = await fetch(`${liveUrl}/api/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: customerCookie,
      },
      body: JSON.stringify({
        businessId: "biz-1",
        reason: "WRONG_PRICE",
        details: testDetail,
      }),
    });
    if (reportRes.status !== 201 && reportRes.status !== 200) throw new Error(`Report creation failed: status ${reportRes.status}`);
    const reportData = await reportRes.json();
    const reportId = reportData.report.id;

    // Confirm it exists in Neon
    const dbReport = await prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!dbReport || dbReport.details !== testDetail) {
      throw new Error("Report not found in Neon database!");
    }

    // Session B (Admin) reads it from live Vercel /api/admin
    const adminRes = await fetch(`${liveUrl}/api/admin`, {
      headers: { Cookie: superAdminCookie },
    });
    const adminData = await adminRes.json();
    const foundReport = adminData.reports?.find((r) => r.id === reportId);
    if (!foundReport) {
      throw new Error("Session B failed to read the report created by Session A from live Vercel!");
    }
    console.log(`   Session B retrieved report ${reportId} successfully from live Vercel!`);

    // Clean up test report from Neon
    await prisma.report.delete({ where: { id: reportId } }).catch(() => {});
  });

  // Clean up test review
  if (liveReviewId) {
    await prisma.review.delete({ where: { id: liveReviewId } }).catch(() => {});
  }

  console.log(`\n================================================================`);
  console.log(`LIVE VERCEL & NEON TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) process.exit(1);
}

runLiveVerification()
  .catch((e) => {
    console.error("Live test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
