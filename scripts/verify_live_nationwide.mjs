async function run() {
  const BASE_URL = "https://mosa-one.vercel.app";
  console.log("==================================================================");
  console.log(`🚀 VERIFYING LIVE PRODUCTION DEPLOYMENT AT: ${BASE_URL}`);
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  async function testEndpoint(name, url, validator) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`❌ [${name}] HTTP status ${res.status} from ${url}`);
        failed++;
        return null;
      }
      const contentType = res.headers.get("content-type") || "";
      let data = null;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      const valid = validator ? validator(data) : true;
      if (valid) {
        console.log(`✓ [${name}] Passed`);
        passed++;
      } else {
        console.error(`❌ [${name}] Validation failed`);
        failed++;
      }
      return data;
    } catch (err) {
      console.error(`❌ [${name}] Request error:`, err.message);
      failed++;
      return null;
    }
  }

  // 1. Homepage
  await testEndpoint("Homepage 200 OK", `${BASE_URL}/`, (html) => html.includes("MOSA") || html.includes("<!DOCTYPE html>"));

  // 2. Explore Page
  await testEndpoint("Explore Page 200 OK", `${BASE_URL}/explore`, (html) => html.includes("<!DOCTYPE html>"));

  // 3. Admin Page
  await testEndpoint("Admin Page 200 OK", `${BASE_URL}/admin`, (html) => html.includes("<!DOCTYPE html>"));

  // 4. Full Geographic Hierarchy
  await testEndpoint("Geo Hierarchy Tree", `${BASE_URL}/api/geo`, (data) => {
    return data.success && data.counts && data.counts.provinces === 5 && data.counts.districts === 30;
  });

  // 5. Districts Level Endpoint
  await testEndpoint("Geo Districts List (30 official districts)", `${BASE_URL}/api/geo?level=districts`, (data) => {
    return data.success && data.count === 30 && data.districts.length === 30;
  });

  // 6. Sectors Level Endpoint
  await testEndpoint("Geo Sectors List", `${BASE_URL}/api/geo?level=sectors`, (data) => {
    return data.success && data.sectors && data.sectors.length >= 30;
  });

  // 7. Demo Businesses with Estimated Prices
  await testEndpoint("DEMO Businesses Query", `${BASE_URL}/api/businesses?dataStatus=DEMO`, (data) => {
    return data.success && data.businesses && data.businesses.length >= 20 && data.businesses[0].phone.includes("Demo");
  });

  // 8. Kacyiru Sector Query
  await testEndpoint("Kacyiru Businesses Query", `${BASE_URL}/api/businesses?sector=Kacyiru`, (data) => {
    return data.success && data.businesses && data.businesses.length >= 6;
  });

  // 9. Nyamirambo Sector Query
  await testEndpoint("Nyamirambo Businesses Query", `${BASE_URL}/api/businesses?sector=Nyamirambo`, (data) => {
    return data.success && data.businesses && data.businesses.length >= 8;
  });

  // 10. Musanze District Query
  await testEndpoint("Musanze Businesses Query", `${BASE_URL}/api/businesses?district=Musanze`, (data) => {
    return data.success && data.businesses && data.businesses.length >= 1;
  });

  // 11. Duplicate Detection Check
  await testEndpoint("Duplicate Detection API", `${BASE_URL}/api/businesses?checkDuplicate=true&search=MINAGRI&sector=Kacyiru`, (data) => {
    return data.success && typeof data.isDuplicate === "boolean";
  });

  console.log("\n==================================================================");
  console.log(`LIVE PRODUCTION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
