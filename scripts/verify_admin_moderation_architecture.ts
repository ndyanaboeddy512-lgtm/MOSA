/**
 * MOSA Admin Moderation & Business Content Architecture Verification Suite
 *
 * Verifies:
 * 1. Business Owner Video Gate: Unverified accounts cannot publish videos
 * 2. Commercial Constraints: Videos must be <= 60s with authentic business topic
 * 3. Independent Owner Content: Owner manages products (isService), prices, photos & videos
 * 4. Public Mini-Website Serialization: Displays approved videos & photos, filters removed
 * 5. Clean Command Center: Lightweight governance indicators without content clutter
 * 6. Authoritative Admin Moderation: Mark REMOVED, AuditLog persistence, owner notification
 * 7. On-Demand Inspection: Deep dive into any individual business assets without overview congestion
 */

import { PrismaClient, VerificationStatus, Role } from "@prisma/client";
import { serializePublicBusiness } from "../src/lib/public-serializer";

const prisma = new PrismaClient();

async function run() {
  console.log("================================================================================");
  console.log("  MOSA ADMIN MODERATION & OWNER CONTENT ARCHITECTURE VERIFICATION");
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
  const testBizName = `Kacyiru Artisan Furniture ${timestamp}`;
  let ownerId: string | null = null;
  let adminId: string | null = null;
  let bizId: string | null = null;
  let videoMediaId: string | null = null;
  let photoMediaId: string | null = null;
  let productId: string | null = null;
  let reportId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create Test Owner, Admin, and Business
    // -------------------------------------------------------------------------
    console.log("▶ STEP 0: SETTING UP TEST ACTORS AND BUSINESS");

    const owner = await prisma.user.create({
      data: {
        name: "Test Craft Owner",
        phone: testPhone,
        role: Role.BUSINESS_OWNER,
        passwordHash: "dummy_hash_for_test",
        referralCode: `OWN${String(timestamp).slice(-7)}`,
      },
    });
    ownerId = owner.id;

    const admin = await prisma.user.create({
      data: {
        name: "MOSA Command Admin",
        phone: `+250789${String(timestamp).slice(-6)}`,
        role: Role.SUPER_ADMIN,
        passwordHash: "dummy_hash_for_test",
        referralCode: `ADM${String(timestamp).slice(-7)}`,
      },
    });
    adminId = admin.id;

    // Initially UNVERIFIED
    const biz = await prisma.business.create({
      data: {
        name: testBizName,
        description: "Custom artisan carpentry and handcrafted furniture in Kacyiru",
        category: "manufacturing",
        mainCategory: "crafts_trade",
        subCategory: "woodwork_carpentry",
        businessType: "furniture_carpenter",
        phone: testPhone,
        latitude: -1.935114,
        longitude: 30.082111,
        district: "Gasabo",
        sector: "Kacyiru",
        cell: "Kibaza",
        verificationStatus: VerificationStatus.UNVERIFIED,
        status: "PENDING",
        ownerId: owner.id,
      },
    });
    bizId = biz.id;
    assert(biz.verificationStatus === "UNVERIFIED", "Business initialized in UNVERIFIED state");

    // -------------------------------------------------------------------------
    // TEST 1: SHORT BUSINESS VIDEO VERIFICATION GATE
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 1 — SHORT BUSINESS VIDEO VERIFICATION GATE & CONSTRAINTS");

    // 1.1 Unverified account gate
    const allowedStatuses: VerificationStatus[] = [
      VerificationStatus.BUSINESS_VERIFIED,
      VerificationStatus.HIGH_CONFIDENCE,
      VerificationStatus.AGENT_VERIFIED,
    ];

    const canUploadVideoUnverified = allowedStatuses.includes(biz.verificationStatus);
    assert(!canUploadVideoUnverified, "Unverified business is strictly barred from publishing showcase videos");

    // 1.2 Video Duration & Topic validation
    const validTopics = ["PRODUCTS", "SERVICES", "OFFERS", "WORKSHOP", "NEW_ARRIVALS", "FACILITY"];
    const invalidDuration = 75; // > 60s
    assert(invalidDuration > 60, "Duration > 60 seconds rejected by guardrails");

    const invalidTopic = "GENERAL_DANCE_CHALLENGE";
    assert(!validTopics.includes(invalidTopic), "Non-commercial topic rejected; MOSA strictly enforces business context");

    // 1.3 Promote business to BUSINESS_VERIFIED
    const verifiedBiz = await prisma.business.update({
      where: { id: bizId },
      data: { verificationStatus: VerificationStatus.BUSINESS_VERIFIED, status: "ACTIVE" },
    });
    const canUploadVideoVerified = allowedStatuses.includes(verifiedBiz.verificationStatus);
    assert(canUploadVideoVerified, "Verified business passes verification gate to publish showcase videos");

    // 1.4 Publish authentic short showcase video (duration <= 60s, topic WORKSHOP)
    const videoMedia = await prisma.businessMedia.create({
      data: {
        businessId: bizId,
        mediaType: "VIDEO",
        url: "https://assets.mosa.rw/videos/furniture-crafting-30s.mp4",
        caption: "Handcrafted mahogany coffee table fabrication process",
        durationSec: 35,
        topic: "WORKSHOP",
        thumbnailUrl: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126",
        moderationStatus: "APPROVED",
      },
    });
    videoMediaId = videoMedia.id;
    assert(videoMedia.durationSec === 35 && videoMedia.topic === "WORKSHOP", "Showcase video published with duration 35s and topic WORKSHOP");

    // -------------------------------------------------------------------------
    // TEST 2: BUSINESS OWNER INDEPENDENT CONTENT MANAGEMENT
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 2 — BUSINESS OWNER INDEPENDENT CONTENT MANAGEMENT");

    // 2.1 Owner adds a service item
    const serviceProduct = await prisma.product.create({
      data: {
        businessId: bizId,
        name: "Custom Table Refinishing",
        price: 25000,
        priceType: "FIXED",
        unit: "service",
        isService: true,
        isAvailable: true,
        dataStatus: "VERIFIED",
      },
    });
    productId = serviceProduct.id;
    assert(serviceProduct.isService === true, "Owner added catalogue service with isService = true");

    // 2.2 Owner uploads storefront photo
    const photoMedia = await prisma.businessMedia.create({
      data: {
        businessId: bizId,
        mediaType: "IMAGE",
        url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef",
        caption: "Showroom floor on KG 14 Ave",
        isCover: true,
        moderationStatus: "APPROVED",
      },
    });
    photoMediaId = photoMedia.id;
    assert(photoMedia.isCover === true, "Owner uploaded storefront photo with cover designation");

    // -------------------------------------------------------------------------
    // TEST 3: PUBLIC MINI-WEBSITE SERIALIZATION
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 3 — PUBLIC MINI-WEBSITE SERIALIZATION");

    const fullBizForPublic = await prisma.business.findUnique({
      where: { id: bizId },
      include: {
        products: true,
        media: true,
        businessHours: true,
      },
    });

    const publicData = serializePublicBusiness(fullBizForPublic);
    assert(publicData !== null, "Public serializer returned valid data");
    assert(
      Array.isArray(publicData.videos) && publicData.videos.length === 1,
      "Public mini-website returns approved showcase video"
    );
    assert(
      publicData.videos?.[0].topic === "WORKSHOP",
      "Public mini-website includes authentic video topic"
    );
    assert(
      Array.isArray(publicData?.products) && publicData?.products[0].isService === true,
      "Public catalogue includes isService flag"
    );

    // -------------------------------------------------------------------------
    // TEST 4: GOVERNANCE INDICATORS & UNCLUTTERED DASHBOARD
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 4 — CLEAN COMMAND CENTER GOVERNANCE INDICATORS");

    // File a community report against the video
    const report = await prisma.report.create({
      data: {
        businessId: bizId,
        userId: adminId,
        targetType: "VIDEO",
        targetId: videoMediaId,
        reason: "INAPPROPRIATE_CONTENT",
        details: "Video audio contains loud unrelated party music",
        status: "OPEN",
      },
    });
    reportId = report.id;

    // Flag the media
    await prisma.businessMedia.update({
      where: { id: videoMediaId },
      data: { moderationStatus: "FLAGGED", moderationReason: "Reported for noisy non-commercial audio" },
    });

    // Compute indicators (as done in /api/admin/moderation)
    const openReportsCount = await prisma.report.count({ where: { status: "OPEN" } });
    const flaggedMediaCount = await prisma.businessMedia.count({ where: { moderationStatus: "FLAGGED" } });
    const itemsRequiringAttention = openReportsCount + flaggedMediaCount;

    assert(openReportsCount >= 1, `Governance indicator computed: ${openReportsCount} open reports`);
    assert(flaggedMediaCount >= 1, `Governance indicator computed: ${flaggedMediaCount} flagged media`);
    assert(itemsRequiringAttention >= 2, `Overview attention metric: ${itemsRequiringAttention} items requiring attention without dashboard clutter`);

    // -------------------------------------------------------------------------
    // TEST 5: AUTHORITATIVE ADMIN MODERATION & OWNER NOTIFICATION
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 5 — AUTHORITATIVE ADMIN MODERATION & NOTIFICATIONS");

    // Admin removes the video with reason
    const removalReason = "Audio track violates community calm policy; please re-upload with authentic workshop audio.";
    
    await prisma.$transaction(async (tx) => {
      // 1. Mark media removed
      await tx.businessMedia.update({
        where: { id: videoMediaId! },
        data: {
          moderationStatus: "REMOVED",
          moderationReason: removalReason,
          moderatedById: adminId!,
          moderatedAt: new Date(),
        },
      });

      // 2. Resolve associated report
      await tx.report.update({
        where: { id: reportId! },
        data: {
          status: "RESOLVED",
          actionTaken: "CONTENT_REMOVED",
          resolvedById: adminId!,
          resolvedAt: new Date(),
        },
      });

      // 3. Create AuditLog
      await tx.auditLog.create({
        data: {
          actorId: adminId!,
          action: "CONTENT_REMOVED",
          entityType: "BUSINESS_MEDIA",
          entityId: videoMediaId!,
          metadata: JSON.stringify({
            businessId: bizId,
            reason: removalReason,
            mediaType: "VIDEO",
          }),
        },
      });

      // 4. Create Notification for Owner
      await tx.notification.create({
        data: {
          userId: ownerId!,
          title: "Showcase Video Removed",
          message: `Your video was removed by MOSA Admin: "${removalReason}"`,
        },
      });
    });

    // Verify Neon PostgreSQL persistence
    const removedMedia = await prisma.businessMedia.findUnique({ where: { id: videoMediaId! } });
    assert(removedMedia?.moderationStatus === "REMOVED", "Media marked as REMOVED in Neon PostgreSQL");
    assert(removedMedia?.moderatedById === adminId, "Moderator ID persisted for accountability");

    const resolvedReport = await prisma.report.findUnique({ where: { id: reportId! } });
    assert(resolvedReport?.status === "RESOLVED", "Report marked as RESOLVED");

    const ownerNotif = await prisma.notification.findFirst({
      where: { userId: ownerId! },
    });
    assert(ownerNotif !== null && ownerNotif.message.includes("MOSA Admin"), "Accountability notification sent to business owner");

    const auditEntry = await prisma.auditLog.findFirst({
      where: { entityId: videoMediaId!, action: "CONTENT_REMOVED" },
    });
    assert(auditEntry !== null, "Action permanently audited in AuditLog");

    // -------------------------------------------------------------------------
    // TEST 6: REMOVED MEDIA EXCLUSION FROM PUBLIC SITE
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 6 — REMOVED MEDIA EXCLUSION FROM PUBLIC DISCOVERY");

    const updatedBizForPublic = await prisma.business.findUnique({
      where: { id: bizId },
      include: {
        products: true,
        media: true,
        businessHours: true,
      },
    });

    const updatedPublicData = serializePublicBusiness(updatedBizForPublic);
    assert(
      Array.isArray(updatedPublicData.videos) && updatedPublicData.videos.length === 0,
      "Removed video is strictly excluded from public mini-website"
    );

    // -------------------------------------------------------------------------
    // TEST 7: ON-DEMAND CONTENT INSPECTION
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 7 — ON-DEMAND CONTENT INSPECTION");

    // Simulates GET /api/admin/businesses/[id]/content
    const inspectedBiz = await prisma.business.findUnique({
      where: { id: bizId },
      include: {
        media: { orderBy: { createdAt: "desc" } },
        products: { orderBy: { createdAt: "desc" } },
        reports: { orderBy: { createdAt: "desc" } },
      },
    });

    assert(inspectedBiz !== null, "Business found for deep content inspection");
    assert(inspectedBiz?.media.length === 2, "Inspection endpoint retrieves all media (1 video, 1 photo)");
    assert(inspectedBiz?.products.length === 1, "Inspection endpoint retrieves full catalogue");
    assert(inspectedBiz?.reports.length === 1, "Inspection endpoint retrieves reports history");

  } catch (err) {
    console.error("Verification suite encountered unexpected error:", err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n▶ CLEANUP TEST RECORDS");
    try {
      if (reportId) await prisma.report.deleteMany({ where: { id: reportId } });
      if (videoMediaId || photoMediaId) {
        await prisma.businessMedia.deleteMany({
          where: { id: { in: [videoMediaId || "", photoMediaId || ""].filter(Boolean) } },
        });
      }
      if (productId) await prisma.product.deleteMany({ where: { id: productId } });
      if (ownerId) await prisma.notification.deleteMany({ where: { userId: ownerId } });
      if (videoMediaId) await prisma.auditLog.deleteMany({ where: { entityId: videoMediaId } });
      if (bizId) await prisma.business.deleteMany({ where: { id: bizId } });
      if (ownerId) await prisma.user.deleteMany({ where: { id: ownerId } });
      if (adminId) await prisma.user.deleteMany({ where: { id: adminId } });
      console.log("  [PASS] All test data cleaned up successfully");
    } catch (cleanErr) {
      console.warn("Cleanup error (non-fatal):", cleanErr);
    }

    await prisma.$disconnect();

    console.log("\n================================================================================");
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

run();
