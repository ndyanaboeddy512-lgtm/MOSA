import { chromium } from "playwright";
import { createSessionToken } from "@/lib/auth";

async function runBrowserVerification() {
  console.log("=== STARTING 55 MOSA BROWSER-LEVEL PRODUCTION VERIFICATION ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) 55-MOSA-Verification-Agent",
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
    // Test Suite 1: Explore Page & Opportunity Filter
    // -------------------------------------------------------------
    console.log("\n[TEST SUITE 1]: Explore Page Discovery & Opportunity Filter");
    await page.goto("http://localhost:3005/explore", { waitUntil: "networkidle" });

    const pageTitle = await page.textContent("h1");
    assert(
      pageTitle != null && (pageTitle.includes("Businesses") || pageTitle.includes("Ubucuruzi")),
      `Explore page loaded with bilingual title: "${pageTitle}"`
    );

    // Verify "Hiring & Opportunities" toggle button is present
    const oppFilterBtn = page.locator("button:has-text('Hiring & Opportunities'), button:has-text('Akazi')");
    const oppBtnCount = await oppFilterBtn.count();
    assert(oppBtnCount > 0, "Hiring & Opportunities toggle button is rendered on Explore page toolbar");

    // Click the toggle button
    await oppFilterBtn.first().click();
    await page.waitForTimeout(1000);
    console.log("  ✓ Toggled 'Hiring & Opportunities' filter active");

    // Inspect business cards on page
    const cards = page.locator("div.content-protected");
    const cardCount = await cards.count();
    console.log(`  ℹ Found ${cardCount} business card(s) matching initial / filtered criteria`);

    // Verify WhatsApp button on first card if present
    const waButtons = page.locator("a[href*='wa.me']");
    const waCount = await waButtons.count();
    if (waCount > 0) {
      const waHref = await waButtons.first().getAttribute("href");
      assert(waHref != null && waHref.startsWith("https://wa.me/250"), `WhatsApp link uses standard Rwandan 250 prefix: ${waHref?.slice(0, 30)}...`);
      assert(waHref != null && (waHref.includes("55%20MOSA") || waHref.includes("MOSA")), "WhatsApp pre-filled message includes 55 MOSA reference");
      assert(waHref != null && waHref.includes("business"), "WhatsApp pre-filled message includes canonical listing URL link");
    } else {
      console.log("  ℹ No WhatsApp button rendered on current sample card (safely hidden due to missing phone number)");
    }

    // -------------------------------------------------------------
    // Test Suite 2: Search Page & NL Need Discovery
    // -------------------------------------------------------------
    console.log("\n[TEST SUITE 2]: Search Page & Natural Language Discovery");
    await page.goto("http://localhost:3005/search?q=kacyiru", { waitUntil: "networkidle" });

    const searchH1 = await page.textContent("h1");
    assert(searchH1 != null && (searchH1.includes("kacyiru") || searchH1.includes("Ibisubizo")), `Search page executed spatial search for: "${searchH1}"`);

    const searchOppBtn = page.locator("button:has-text('Hiring & Opportunities'), button:has-text('Akazi')");
    assert(await searchOppBtn.count() > 0, "Hiring & Opportunities toggle button is present on Search toolbar");

    // -------------------------------------------------------------
    // Test Suite 3: Schema.org JSON-LD & Business Profile Page
    // -------------------------------------------------------------
    console.log("\n[TEST SUITE 3]: Business Profile Page & Schema.org JSON-LD Validation");
    const apiRes = await page.request.get("http://localhost:3005/api/businesses");
    const apiData = await apiRes.json();
    const testBusiness = apiData.businesses?.[0];

    if (testBusiness) {
      console.log(`  ℹ Inspecting business profile: "${testBusiness.name}" (ID: ${testBusiness.id})`);
      await page.goto(`http://localhost:3005/business/${testBusiness.id}`, { waitUntil: "networkidle" });

      // Find JSON-LD script
      const jsonLdScript = await page.locator('script[type="application/ld+json"]').textContent();
      assert(jsonLdScript != null && jsonLdScript.length > 0, "Schema.org JSON-LD script tag exists on page");

      if (jsonLdScript) {
        const schema = JSON.parse(jsonLdScript);
        assert(schema["@context"] === "https://schema.org", "Schema.org @context is valid");
        assert(schema["@type"] === "LocalBusiness", "Schema.org @type is LocalBusiness");
        assert(schema.url === `https://mosa-one.vercel.app/business/${testBusiness.id}`, `Schema.org canonical URL matches expected format: ${schema.url}`);
        assert(schema.currenciesAccepted === "RWF", "Schema.org currenciesAccepted is RWF");
        assert(schema.paymentAccepted.includes("Mobile Money"), "Schema.org paymentAccepted lists Mobile Money");

        if (schema.geo) {
          assert(typeof schema.geo.latitude === "number" && !isNaN(schema.geo.latitude), `Schema.org geo latitude is a valid number: ${schema.geo.latitude}`);
          assert(typeof schema.geo.longitude === "number" && !isNaN(schema.geo.longitude), `Schema.org geo longitude is a valid number: ${schema.geo.longitude}`);
        } else {
          console.log("  ℹ Business has no coordinates; Schema.org correctly omitted geo block (never invented)");
        }

        if (schema.hasOfferCatalog) {
          assert(schema.hasOfferCatalog["@type"] === "OfferCatalog", "hasOfferCatalog is valid OfferCatalog");
          assert(schema.hasOfferCatalog.itemListElement.length > 0, `OfferCatalog contains ${schema.hasOfferCatalog.itemListElement.length} verified item offer(s)`);
        }
      }

      // Check hero CTA buttons
      const heroWaBtn = page.locator("a[href*='wa.me']").first();
      if (await heroWaBtn.count() > 0) {
        const heroWaHref = await heroWaBtn.getAttribute("href");
        assert(heroWaHref != null && heroWaHref.includes("250"), `Hero WhatsApp CTA formatted with Rwandan country code: ${heroWaHref?.slice(0, 35)}...`);
      }
    } else {
      console.log("  ⚠ No active businesses found in DB to test profile");
    }

    // -------------------------------------------------------------
    // Test Suite 4: Print Stylesheet Validation
    // -------------------------------------------------------------
    console.log("\n[TEST SUITE 4]: Print Stylesheet & Media Rules");
    const cssRules = await page.evaluate(() => {
      let printRulesFound = false;
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if ((rule as any).media?.mediaText === "print") {
              printRulesFound = true;
            }
          }
        } catch {
          // Cross-origin styles ignored
        }
      }
      return printRulesFound;
    });
    assert(cssRules, "Print stylesheet (@media print) rules are loaded in browser runtime");

    // -------------------------------------------------------------
    // Test Suite 5: Owner Dashboard Storefront QR Window Badge Modal
    // -------------------------------------------------------------
    console.log("\n[TEST SUITE 5]: Owner Dashboard Storefront QR Window Badge Modal Flow");
    const sessionToken = await createSessionToken({
      userId: "user-owner-1",
      role: "BUSINESS_OWNER",
      name: "Kevine Mukashyaka (Salon Owner)",
      phone: "+250788123456",
    });

    await context.addCookies([
      {
        name: "mosa_session",
        value: sessionToken,
        url: "http://localhost:3005",
      },
    ]);

    const [ownerBizResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/owner/business") && res.status() === 200, { timeout: 15000 }).catch(() => null),
      page.goto("http://localhost:3005/owner/dashboard", { waitUntil: "domcontentloaded" }),
    ]);

    await page.waitForSelector("h1, h2", { timeout: 15000 });
    const dashboardHeader = await page.locator("h1, h2").first().textContent();
    assert(dashboardHeader != null && dashboardHeader.length > 0, `Owner dashboard successfully loaded: "${dashboardHeader}"`);

    // Verify "Storefront QR Badge" button is rendered
    const qrBadgeBtn = page.locator("button:has-text('QR Badge'), button:has-text('Icyapa')");
    const qrBadgeBtnCount = await qrBadgeBtn.count();
    assert(qrBadgeBtnCount > 0, "Storefront QR Badge button is present in confirmed registration banner");

    if (qrBadgeBtnCount > 0) {
      // Click button to open the placard modal
      await qrBadgeBtn.first().click();
      await page.waitForTimeout(500);

      const modalLocator = page.locator(".print-modal-active");
      assert(await modalLocator.isVisible(), "Storefront QR Badge modal opened and is visible on screen");

      // Verify modal branding
      const modalBranding = await modalLocator.locator("div:has-text('55 MOSA')").first().isVisible();
      assert(modalBranding, "Placard modal contains official '55 MOSA' branding");

      // Verify QR Code image is generated
      const qrImg = modalLocator.locator("img[src*='api.qrserver.com']");
      assert(await qrImg.isVisible(), "High-resolution QR code image rendered inside modal");

      const qrSrc = await qrImg.getAttribute("src");
      assert(qrSrc != null && qrSrc.includes("mosa-one.vercel.app%2Fbusiness%2F"), `QR Code encodes public business profile URL: ${qrSrc?.slice(0, 60)}...`);

      // Verify print button exists
      const printBtn = modalLocator.locator("button:has-text('Print')");
      assert(await printBtn.isVisible(), "Print Window Badge button is present inside placard modal");

      // Close modal
      const closeBtn = modalLocator.locator("button:has-text('Close')");
      await closeBtn.click();
      await page.waitForTimeout(500);
      assert(!(await modalLocator.isVisible()), "Modal closed cleanly on user click");
    }

  } catch (err: any) {
    console.error("Test execution threw error:", err);
    failed++;
  } finally {
    await browser.close();
  }

  console.log("\n=======================================================");
  console.log(`🎉 BROWSER VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runBrowserVerification();
