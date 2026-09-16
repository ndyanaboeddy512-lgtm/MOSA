const PROD_URL = "https://mosa-one.vercel.app";

async function verifyEndpoint(name, url, checkFn) {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      console.error(`❌ [${name}] HTTP ${res.status}: ${res.statusText}`);
      return false;
    }

    if (checkFn) {
      const checkResult = checkFn(data);
      if (!checkResult.pass) {
        console.error(`❌ [${name}] Check failed: ${checkResult.reason}`);
        return false;
      }
    }

    console.log(`✅ [${name}] HTTP ${res.status} OK`);
    return true;
  } catch (err) {
    console.error(`❌ [${name}] Network/Fetch Error:`, err.message);
    return false;
  }
}

async function run() {
  console.log(`\n=== MOSA PRODUCTION LIVE VERIFICATION (${PROD_URL}) ===\n`);

  let allPass = true;

  // 1. Homepage
  allPass = (await verifyEndpoint("Homepage (/) ", `${PROD_URL}/`, (html) => ({
    pass: typeof html === "string" && html.includes("MOSA"),
    reason: "Homepage HTML does not contain 'MOSA'",
  }))) && allPass;

  // 2. Geographic Hierarchy Sectors API
  allPass = (await verifyEndpoint("Geo Sectors API (/api/geo?level=sectors)", `${PROD_URL}/api/geo?level=sectors`, (json) => {
    const hasKacyiru = json.sectors?.some((s) => s.name === "Kacyiru");
    const hasNyamirambo = json.sectors?.some((s) => s.name === "Nyamirambo");
    return {
      pass: json.success && hasKacyiru && hasNyamirambo,
      reason: `Expected Kacyiru and Nyamirambo in sectors, found: ${json.sectors?.map((s) => s.name).join(", ")}`,
    };
  })) && allPass;

  // 3. Kacyiru Businesses with estimated prices & demo dataStatus
  allPass = (await verifyEndpoint("Kacyiru Businesses API (/api/businesses?sector=Kacyiru)", `${PROD_URL}/api/businesses?sector=Kacyiru`, (json) => {
    const bizCount = json.businesses?.length || 0;
    const hasDemoRecord = json.businesses?.some((b) => b.dataStatus === "DEMO");
    const hasMinagri = json.businesses?.some((b) => b.name?.includes("MINAGRI") || b.addressNote?.includes("MINAGRI") || b.addressNote?.includes("KG 569"));
    return {
      pass: json.success && bizCount >= 6 && hasDemoRecord && hasMinagri,
      reason: `Count: ${bizCount}, hasDemo: ${hasDemoRecord}, hasMinagri: ${hasMinagri}`,
    };
  })) && allPass;

  // 4. Nyamirambo Businesses preserved
  allPass = (await verifyEndpoint("Nyamirambo Businesses API (/api/businesses?sector=Nyamirambo)", `${PROD_URL}/api/businesses?sector=Nyamirambo`, (json) => {
    const bizCount = json.businesses?.length || 0;
    return {
      pass: json.success && bizCount >= 6,
      reason: `Expected >= 6 businesses in Nyamirambo, got ${bizCount}`,
    };
  })) && allPass;

  // 5. Geo Agents Assignment API
  allPass = (await verifyEndpoint("Agent Assignments API (/api/geo/agents)", `${PROD_URL}/api/geo/agents`, (json) => {
    const hasAssignments = json.assignments && json.assignments.length >= 2;
    const hasAlice = json.assignments?.some((a) => a.user?.name?.includes("Alice"));
    return {
      pass: json.success && hasAssignments && hasAlice,
      reason: `Assignments: ${json.assignments?.length}, hasAlice: ${hasAlice}`,
    };
  })) && allPass;

  // 6. Explore Page
  allPass = (await verifyEndpoint("Explore Page (/explore)", `${PROD_URL}/explore`, (html) => ({
    pass: typeof html === "string" && html.length > 500,
    reason: "Explore page returned empty HTML",
  }))) && allPass;

  // 7. Demand Signals API
  allPass = (await verifyEndpoint("Demand Signals API (/api/demand)", `${PROD_URL}/api/demand`, (json) => ({
    pass: json.success && json.demands?.length > 0,
    reason: `Expected demands list, got count: ${json.demands?.length}`,
  }))) && allPass;

  // 8. Community Missions API
  allPass = (await verifyEndpoint("Community Missions API (/api/missions)", `${PROD_URL}/api/missions`, (json) => ({
    pass: json.success && json.missions?.length > 0,
    reason: `Expected missions list, got count: ${json.missions?.length}`,
  }))) && allPass;

  console.log("\n------------------------------------------------");
  if (allPass) {
    console.log("🎉 ALL LIVE PRODUCTION VERIFICATIONS PASSED!");
  } else {
    console.log("⚠️ SOME PRODUCTION VERIFICATIONS FAILED.");
  }
  console.log("------------------------------------------------\n");
}

run();
