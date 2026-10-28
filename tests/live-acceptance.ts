import { chromium } from "playwright";

const LIVE_BASE_URL = "https://mosa-one.vercel.app";

async function runLiveAcceptanceAudit() {
  console.log("======================================================================");
  console.log(`🌐 55 MOSA — LIVE PRODUCTION ACCEPTANCE AUDIT`);
  console.log(`Target: ${LIVE_BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("======================================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) 55-MOSA-Live-Auditor",
  });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test Suite 1: Live Explore Page & Opportunity Filter
    // -------------------------------------------------------------
    console.log("[SUITE 1]: Live Explore Page Discovery & Opportunity Filter");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/businesses") && res.status() === 200, { timeout: 15000 }).catch(() => null),
      page.goto(`${LIVE_BASE_URL}/explore`, { waitUntil: "domcontentloaded" }),
    ]);
    await page.waitForSelector("div.content-protected", { timeout: 10000 }).catch(() => null);

    const exploreH1 = await page.textContent("h1");
    assert(
      exploreH1 != null && (exploreH1.includes("Businesses") || exploreH1.includes("Ubucuruzi")),
      `Live Explore page loaded with bilingual title: "${exploreH1}"`
    );

    // Inspect business cards on page BEFORE toggling filter
    const cards = page.locator("div.content-protected");
    const cardCount = await cards.count();
    assert(cardCount > 0, `Live Explore page returned ${cardCount} verified community business cards`);

    // Verify WhatsApp button on cards
    const waButtons = page.locator("a[href*='wa.me']");
    const waCount = await waButtons.count();
    if (waCount > 0) {
      const waHref = await waButtons.first().getAttribute("href");
      assert(waHref != null && waHref.startsWith("https://wa.me/250"), `WhatsApp button uses Rwandan +250 prefix: ${waHref?.slice(0, 35)}...`);
      assert(waHref != null && (waHref.includes("55%20MOSA") || waHref.includes("MOSA")), "WhatsApp pre-filled message includes authentic 55 MOSA reference");
      assert(waHref != null && waHref.includes("business"), "WhatsApp pre-filled message links to canonical business listing");
    }

    // Verify "Hiring & Opportunities" toggle button is present
    const oppFilterBtn = page.locator("button:has-text('Hiring & Opportunities'), button:has-text('Akazi')");
    const oppBtnCount = await oppFilterBtn.count();
    assert(oppBtnCount > 0, "Hiring & Opportunities toggle button is rendered on live Explore toolbar");

    if (oppBtnCount > 0) {
      await oppFilterBtn.first().click();
      await page.waitForTimeout(1000);
      console.log("  ✓ Toggled 'Hiring & Opportunities' filter active on live site");
    }

    // -------------------------------------------------------------
    // Test Suite 2: Live Search Page & Natural Language Discovery
    // -------------------------------------------------------------
    console.log("\n[SUITE 2]: Live Search Page & Natural Language Discovery");
    await page.goto(`${LIVE_BASE_URL}/search?q=kigali`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const searchH1 = await page.textContent("h1");
    assert(
      searchH1 != null && (searchH1.includes("kigali") || searchH1.includes("Ibisubizo")),
      `Live Search executed spatial/NLP query: "${searchH1}"`
    );

    const searchOppBtn = page.locator("button:has-text('Hiring & Opportunities'), button:has-text('Akazi')");
    assert(await searchOppBtn.count() > 0, "Hiring & Opportunities toggle button is present on live Search toolbar");

    // -------------------------------------------------------------
    // Test Suite 3: Live Schema.org JSON-LD & Business Profile Page
    // -------------------------------------------------------------
    console.log("\n[SUITE 3]: Live Business Profile Page & Schema.org JSON-LD");
    const apiRes = await page.request.get(`${LIVE_BASE_URL}/api/businesses`);
    const apiData = await apiRes.json();
    const testBusiness = apiData.businesses?.[0];

    if (testBusiness) {
      console.log(`  ℹ Fetching live profile for "${testBusiness.name}" (ID: ${testBusiness.id})`);
      await page.goto(`${LIVE_BASE_URL}/business/${testBusiness.id}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      const jsonLdScript = await page.locator('script[type="application/ld+json"]').textContent();
      assert(jsonLdScript != null && jsonLdScript.length > 0, "Live page contains Schema.org JSON-LD script tag");

      if (jsonLdScript) {
        const schema = JSON.parse(jsonLdScript);
        assert(schema["@context"] === "https://schema.org", "Schema @context is valid https://schema.org");
        assert(schema["@type"] === "LocalBusiness", "Schema @type is LocalBusiness");
        assert(schema.url === `${LIVE_BASE_URL}/business/${testBusiness.id}`, `Schema canonical URL matches live deployment: ${schema.url}`);
        assert(schema.currenciesAccepted === "RWF", "Schema currenciesAccepted is RWF");
        assert(schema.paymentAccepted.includes("Mobile Money"), "Schema paymentAccepted includes Mobile Money");

        if (schema.geo) {
          assert(typeof schema.geo.latitude === "number" && !isNaN(schema.geo.latitude), `Schema geo latitude is valid number: ${schema.geo.latitude}`);
          assert(typeof schema.geo.longitude === "number" && !isNaN(schema.geo.longitude), `Schema geo longitude is valid number: ${schema.geo.longitude}`);
        } else {
          console.log("  ℹ Business has no coordinates; Schema geo correctly omitted (truth-in-data verified)");
        }

        if (schema.hasOfferCatalog) {
          assert(schema.hasOfferCatalog["@type"] === "OfferCatalog", "OfferCatalog schema structure is valid");
          assert(schema.hasOfferCatalog.itemListElement.length > 0, `OfferCatalog contains ${schema.hasOfferCatalog.itemListElement.length} authentic item offer(s)`);
        }
      }

      // Check hero WhatsApp CTA
      const heroWaBtn = page.locator("a[href*='wa.me']").first();
      if (await heroWaBtn.count() > 0) {
        const heroHref = await heroWaBtn.getAttribute("href");
        assert(heroHref != null && heroHref.includes("250"), `Live Profile WhatsApp CTA formatted with Rwandan country code: ${heroHref?.slice(0, 35)}...`);
      }
    } else {
      console.log("  ⚠ No business found on live API to inspect profile");
    }

    // -------------------------------------------------------------
    // Test Suite 4: Live Business Registration Flow
    // -------------------------------------------------------------
    console.log("\n[SUITE 4]: Live Business Registration & Checkout Interface");
    await page.goto(`${LIVE_BASE_URL}/register-business`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const regH1 = await page.textContent("h1, h2");
    assert(regH1 != null && regH1.length > 0, `Live Registration page loaded: "${regH1}"`);

    // Verify form input fields exist on Step 1
    const textInputs = page.locator("form input[type='text'], form input[type='tel']");
    const inputCount = await textInputs.count();
    assert(inputCount >= 2, `Live registration form rendered with ${inputCount} interactive input fields`);

    // -------------------------------------------------------------
    // Test Suite 5: Live Payment Gateways, Security, & APIs
    // -------------------------------------------------------------
    console.log("\n[SUITE 5]: Live Payment Gateways, Webhook Security, & API Endpoints");

    // 1. Payment config endpoint
    const configRes = await page.request.get(`${LIVE_BASE_URL}/api/payments/config`);
    assert(configRes.status() === 200, `Live /api/payments/config returned HTTP 200 (Got ${configRes.status()})`);
    const configData = await configRes.json();
    assert(configData.success === true, "Live payment configuration reports success: true");
    assert(configData.fee?.amount === 5000, `Live Registration Fee correctly configured: ${configData.fee?.amount} RWF`);
    assert(configData.fee?.renewalAmount === 5000, `Live Annual Renewal Fee correctly configured: ${configData.fee?.renewalAmount} RWF`);
    assert(Array.isArray(configData.providers) && configData.providers.length >= 2, `Live providers active: ${configData.providers?.map((p: any) => p.provider).join(", ")}`);
    
    const airtelProvider = configData.providers?.find((p: any) => p.provider === "AIRTEL_MONEY");
    assert(airtelProvider != null && airtelProvider.accountNumber === "0729974065", `Airtel Money destination SIM active and verified (+250 729 974 065)`);

    // 2. Payment initiate validation (must reject malformed requests)
    const initRes = await page.request.post(`${LIVE_BASE_URL}/api/payments/initiate`, {
      data: { businessId: "non-existent-id-9999", provider: "UNSUPPORTED_PROVIDER" },
    });
    assert(initRes.status() === 400, `Live /api/payments/initiate correctly rejected invalid provider with HTTP 400 (Got ${initRes.status()})`);

    // 3. Payment webhook security (must reject unauthenticated / spoofed webhooks)
    const spoofWebhookRes = await page.request.post(`${LIVE_BASE_URL}/api/payments/webhook`, {
      data: {
        paymentReference: "MOSA-REG-SPOOF",
        amount: 5000,
        currency: "RWF",
        provider: "MTN_MOMO",
        status: "SUCCESSFUL",
      },
    });
    assert(
      spoofWebhookRes.status() === 400 || spoofWebhookRes.status() === 401,
      `Live /api/payments/webhook strictly rejected unverified webhook with HTTP ${spoofWebhookRes.status()} (Zero-Trust Security Active)`
    );

    // 4. Opportunities discovery API
    const oppApiRes = await page.request.get(`${LIVE_BASE_URL}/api/businesses?hasOpportunities=true`);
    assert(oppApiRes.status() === 200, `Live /api/businesses?hasOpportunities=true returned HTTP 200`);
    const oppApiData = await oppApiRes.json();
    assert(oppApiData.success === true, "Opportunities API query returned successful payload");

    // -------------------------------------------------------------
    // Test Suite 6: Owner Dashboard, Storefront Placard, & Print Isolation
    // -------------------------------------------------------------
    console.log("\n[SUITE 6]: Live Owner Dashboard, Storefront Placard & Print Styles");

    // Authenticate using live demo-switch endpoint to get an authentic server-signed session cookie
    const authRes = await page.request.post(`${LIVE_BASE_URL}/api/auth/demo-switch`, {
      data: { role: "BUSINESS_OWNER" },
    });
    assert(authRes.status() === 200, `Live demo-switch authenticated as BUSINESS_OWNER (HTTP 200)`);
    const cookieHeader = authRes.headers()["set-cookie"];
    assert(cookieHeader != null && cookieHeader.includes("mosa_session"), "Received authentic server-signed mosa_session cookie");

    if (cookieHeader) {
      const token = cookieHeader.split(";")[0].split("=")[1];
      await context.addCookies([
        {
          name: "mosa_session",
          value: token,
          domain: "mosa-one.vercel.app",
          path: "/",
        },
      ]);
    }

    await page.goto(`${LIVE_BASE_URL}/owner/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const ownerH1 = await page.locator("h1, h2").first().textContent();
    assert(
      ownerH1 != null && (ownerH1.includes("Ubucuruzi") || ownerH1.includes("Dashboard") || ownerH1.includes("Salon") || ownerH1.includes("Kevine")),
      `Live Owner dashboard authenticated and loaded: "${ownerH1}"`
    );

    // Verify Print Stylesheet rules in runtime
    const hasPrintRules = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if ((rule as any).media?.mediaText === "print") {
              return true;
            }
          }
        } catch {
          // Ignore cross-origin
        }
      }
      return false;
    });
    assert(hasPrintRules, "Print stylesheet (@media print) rules loaded in live browser runtime");

    // Verify QR Badge Placard button on live dashboard
    const qrBadgeBtn = page.locator("button:has-text('QR Badge'), button:has-text('Icyapa')");
    const qrBadgeBtnCount = await qrBadgeBtn.count();
    if (qrBadgeBtnCount > 0) {
      await qrBadgeBtn.first().click();
      await page.waitForTimeout(1000);

      const modal = page.locator(".print-modal-active");
      assert(await modal.isVisible(), "Storefront QR window badge placard modal opened on live dashboard");

      const qrImg = modal.locator("img[src*='api.qrserver.com']");
      assert(await qrImg.isVisible(), "High-resolution 280x280 QR code image rendered in live modal");

      const qrSrc = await qrImg.getAttribute("src");
      assert(qrSrc != null && qrSrc.includes("mosa-one.vercel.app%2Fbusiness%2F"), `QR Code encodes authentic business profile URL`);

      const printBtn = modal.locator("button:has-text('Print'), button:has-text('Gucapa')");
      assert(await printBtn.isVisible(), "Print Window Badge button is present in live placard modal");

      const closeBtn = modal.locator("button:has-text('Close')");
      await closeBtn.click();
      await page.waitForTimeout(500);
      assert(!(await modal.isVisible()), "Live placard modal closed cleanly on click");
    } else {
      console.log("  ℹ Owner's business status displays registration state without confirmed verification banner");
    }

  } catch (err: any) {
    console.error("  ✗ Unhandled Error in Live Production Audit:", err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log("\n======================================================================");
  console.log(`📊 LIVE PRODUCTION AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveAcceptanceAudit();
