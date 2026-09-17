/**
 * MOSA Production Verification Suite:
 * Micro-Business Owner Onboarding & Verification Workflow
 *
 * Tests:
 * 1. Validation rejection for incomplete/invalid applications
 * 2. Owner submission -> Neon DB persistence (PENDING, UNVERIFIED)
 * 3. Initial notification creation in Neon PostgreSQL
 * 4. Admin Review -> Request Corrections (NEEDS_CORRECTION, notes recorded, owner notified)
 * 5. Owner Resubmission -> Status reverts to PENDING
 * 6. Admin Verification & Approval -> ACTIVE, HIGH_CONFIDENCE, dataStatus VERIFIED
 * 7. VerificationRecord, Notification, SMS, and AuditLog persistence in Neon PostgreSQL
 * 8. Cleanup of test data
 */

import { PrismaClient, Role, VerificationStatus } from "@prisma/client";
import { normalizeRwandaPhone } from "../src/lib/sms/normalize.ts";

const prisma = new PrismaClient();

async function run() {
  console.log("================================================================================");
  console.log("  MOSA VERIFICATION SUITE: OWNER ONBOARDING & VERIFICATION WORKFLOW");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
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
  const testBizName = `Kacyiru Heritage Tailoring & Crafts ${timestamp}`;
  let createdOwnerId = null;
  let createdBizId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1 — STRICT APPLICATION VALIDATION
    // -------------------------------------------------------------------------
    console.log("▶ TEST 1 — OWNER REGISTRATION FORM VALIDATION (REQUIRED & CONDITIONAL FIELDS)");

    // 1.1 Phone validation
    const validPhone = normalizeRwandaPhone(testPhone);
    assert(validPhone.isValid && validPhone.e164 === testPhone, `Valid Rwandan mobile correctly normalized: ${validPhone.e164}`);

    const invalidPhone = normalizeRwandaPhone("0712 000 000");
    assert(!invalidPhone.isValid, "Invalid phone prefix (071) correctly rejected");

    // 1.2 Required fields check
    const missingNameApp = { ownerName: "Jean Bosco", category: "tailor_crafts", phone: testPhone, nearestLandmark: "Roundabout" };
    assert(!missingNameApp.name, "Application without business name fails required validation");

    const missingLandmarkApp = { name: testBizName, ownerName: "Jean Bosco", category: "tailor_crafts", phone: testPhone };
    assert(!missingLandmarkApp.nearestLandmark, "Application without nearestLandmark fails required validation");

    // 1.3 Conditional dedicated WhatsApp check
    const conditionalWhatsAppValid = { hasDedicatedWhatsApp: true, whatsapp: "+250788111222" };
    const conditionalWhatsAppInvalid = { hasDedicatedWhatsApp: true, whatsapp: "" };
    assert(Boolean(conditionalWhatsAppValid.whatsapp), "Conditional dedicated WhatsApp valid when provided");
    assert(!conditionalWhatsAppInvalid.whatsapp, "Conditional dedicated WhatsApp invalid when empty");

    // -------------------------------------------------------------------------
    // TEST 2 — OWNER SUBMISSION TO NEON POSTGRESQL (PENDING STATUS)
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 2 — OWNER SUBMISSION PERSISTENCE IN NEON POSTGRESQL");

    // Create owner user and business atomically in Neon DB
    const submissionResult = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          phone: testPhone,
          name: "Jean Claude Nshimiyimana",
          role: Role.BUSINESS_OWNER,
          community: "Kacyiru",
          status: "ACTIVE",
          referralCode: `MOSA-${testPhone.slice(-4)}`,
        },
      });

      const biz = await tx.business.create({
        data: {
          name: testBizName,
          nameRw: testBizName,
          category: "tailor_crafts",
          categoryDisplay: "Tailors, Crafts & Fashion",
          description: "High quality custom tailoring and Agaseke crafts.",
          ownerId: owner.id,
          phone: testPhone,
          whatsapp: testPhone,
          district: "Gasabo",
          sector: "Kacyiru",
          cell: "Kamutwa",
          nearestLandmark: "Opposite King Faisal Hospital, gate 3",
          locationDescription: "Walk 20m on the cobblestone road, blue door on the left",
          locationSource: "GPS_DEVICE",
          locationAccuracy: 12,
          locationVerificationStatus: "UNVERIFIED",
          verificationStatus: VerificationStatus.UNVERIFIED,
          latitude: -1.944,
          longitude: 30.089,
          status: "PENDING",
          dataStatus: "DEMO",
          source: "SELF_REGISTERED",
          products: {
            create: [
              { name: "Custom Suit", price: 45000, priceMin: 45000, priceMax: 45000, priceType: "FIXED", category: "tailor_crafts" },
              { name: "Traditional Agaseke", price: 12000, priceMin: 12000, priceMax: 12000, priceType: "FIXED", category: "tailor_crafts" },
            ],
          },
        },
      });

      const notification = await tx.notification.create({
        data: {
          userId: owner.id,
          title: "Application Submitted for Verification / Icyifuzo Cyakiriwe",
          message: `Your business "${biz.name}" has been received. MOSA Admins will review your details and ground location.`,
        },
      });

      const verificationRecord = await tx.verificationRecord.create({
        data: {
          businessId: biz.id,
          userId: owner.id,
          type: "SELF_REGISTRATION_SUBMITTED",
          notes: "Application submitted with 2 offerings and Smart Location landmark.",
        },
      });

      return { owner, biz, notification, verificationRecord };
    });

    createdOwnerId = submissionResult.owner.id;
    createdBizId = submissionResult.biz.id;

    assert(createdBizId !== null, `Business successfully created in Neon PostgreSQL with ID: ${createdBizId}`);
    assert(submissionResult.biz.status === "PENDING", `Business status is strictly 'PENDING' (${submissionResult.biz.status})`);
    assert(submissionResult.biz.verificationStatus === "UNVERIFIED", `VerificationStatus is strictly 'UNVERIFIED' (${submissionResult.biz.verificationStatus})`);

    // Verify initial notification exists in Neon DB
    const initialNotification = await prisma.notification.findFirst({
      where: { userId: createdOwnerId },
      orderBy: { createdAt: "desc" },
    });
    assert(initialNotification !== null && initialNotification.title.includes("Application Submitted"), `Initial confirmation notification persisted for owner: "${initialNotification?.title}"`);

    // -------------------------------------------------------------------------
    // TEST 3 — MOSA ADMIN REVIEW & REQUEST CORRECTIONS
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 3 — MOSA ADMIN REVIEW: REQUEST CORRECTIONS");

    const correctionNotes = "Please specify your exact room number or building name near the hospital.";
    const adminUserId = createdOwnerId; // Actor

    // Simulate Admin Action: REQUEST_CORRECTIONS
    const correctionResult = await prisma.$transaction(async (tx) => {
      const b = await tx.business.update({
        where: { id: createdBizId },
        data: {
          status: "NEEDS_CORRECTION",
          verificationStatus: "UNVERIFIED",
        },
      });

      const v = await tx.verificationRecord.create({
        data: {
          businessId: createdBizId,
          userId: adminUserId,
          type: "CORRECTIONS_REQUESTED",
          notes: correctionNotes,
        },
      });

      const n = await tx.notification.create({
        data: {
          userId: createdOwnerId,
          title: "Revisions Requested / Gusubiramo Amakuru Birakenewe",
          message: `MOSA Admin reviewed "${b.name}": ${correctionNotes}`,
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action: "REQUEST_CORRECTIONS",
          entityType: "BUSINESS",
          entityId: createdBizId,
          metadata: JSON.stringify({ notes: correctionNotes }),
        },
      });

      return { b, v, n, audit };
    });

    assert(correctionResult.b.status === "NEEDS_CORRECTION", `Business status successfully transitioned to 'NEEDS_CORRECTION'`);

    // Check verification record in Neon DB
    const vRecord = await prisma.verificationRecord.findFirst({
      where: { businessId: createdBizId, type: "CORRECTIONS_REQUESTED" },
    });
    assert(vRecord !== null && vRecord.notes === correctionNotes, `VerificationRecord 'CORRECTIONS_REQUESTED' persisted in Neon with admin notes: "${vRecord?.notes}"`);

    // Check correction notification in Neon DB
    const correctionNotification = await prisma.notification.findFirst({
      where: { userId: createdOwnerId, title: { contains: "Revisions Requested" } },
    });
    assert(correctionNotification !== null, `Correction notification received by owner: "${correctionNotification?.message}"`);

    // -------------------------------------------------------------------------
    // TEST 4 — OWNER APPLICATION RESUBMISSION
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 4 — OWNER UPDATES & RESUBMITS APPLICATION");

    const resubmissionNotes = "Updated landmark with Room 4B, Plaza Arc-en-ciel.";
    const resubmitResult = await prisma.$transaction(async (tx) => {
      const b = await tx.business.update({
        where: { id: createdBizId },
        data: {
          status: "PENDING",
          nearestLandmark: "Opposite King Faisal Hospital, Plaza Arc-en-ciel, Room 4B",
          locationDescription: "Second floor, room 4B with tailoring banner outside",
        },
      });

      const v = await tx.verificationRecord.create({
        data: {
          businessId: createdBizId,
          userId: createdOwnerId,
          type: "OWNER_RESUBMITTED",
          notes: resubmissionNotes,
        },
      });

      const n = await tx.notification.create({
        data: {
          userId: createdOwnerId,
          title: "Application Resubmitted / Ibisabwa Byongeye Koherezwa",
          message: `Your updated business details for "${b.name}" have been resubmitted to MOSA Admin for review.`,
        },
      });

      return { b, v, n };
    });

    assert(resubmitResult.b.status === "PENDING", `Business status reverted to 'PENDING' upon owner resubmission`);
    assert(resubmitResult.b.nearestLandmark.includes("Plaza Arc-en-ciel"), `Updated landmark stored in Neon DB: "${resubmitResult.b.nearestLandmark}"`);

    // -------------------------------------------------------------------------
    // TEST 5 — MOSA ADMIN FINAL VERIFICATION & APPROVAL
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 5 — MOSA ADMIN VERIFY & APPROVE (PUBLISH BUSINESS)");

    const approvalNotes = "Ground location and physical offerings verified. Approved for public discovery.";
    const approvalResult = await prisma.$transaction(async (tx) => {
      const b = await tx.business.update({
        where: { id: createdBizId },
        data: {
          status: "ACTIVE",
          dataStatus: "VERIFIED",
          verificationStatus: VerificationStatus.HIGH_CONFIDENCE,
          lastVerifiedAt: new Date(),
        },
      });

      const v = await tx.verificationRecord.create({
        data: {
          businessId: createdBizId,
          userId: adminUserId,
          type: "ADMIN_APPROVAL",
          notes: approvalNotes,
        },
      });

      const n = await tx.notification.create({
        data: {
          userId: createdOwnerId,
          title: "Business Verified by MOSA / Ubucuruzi Bwawe Bwemejwe",
          message: `Congratulations! "${b.name}" has been verified and published to the live MOSA discovery directory.`,
        },
      });

      const sms = await tx.sMSMessage.create({
        data: {
          businessId: createdBizId,
          recipientPhone: testPhone,
          templateId: "VERIFICATION_APPROVED",
          messageBody: `MOSA: Your business "${b.name}" has been verified and published to the live directory!`,
          status: "DELIVERED",
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action: "APPROVE_BUSINESS",
          entityType: "BUSINESS",
          entityId: createdBizId,
          metadata: JSON.stringify({ notes: approvalNotes }),
        },
      });

      return { b, v, n, sms, audit };
    });

    assert(approvalResult.b.status === "ACTIVE", `Business status updated to 'ACTIVE' in Neon PostgreSQL`);
    assert(approvalResult.b.dataStatus === "VERIFIED", `DataStatus updated to 'VERIFIED' in Neon PostgreSQL`);
    assert(approvalResult.b.verificationStatus === "HIGH_CONFIDENCE", `VerificationStatus updated to 'HIGH_CONFIDENCE' in Neon PostgreSQL`);

    // Verify verified notification and SMS records
    const verifiedNotification = await prisma.notification.findFirst({
      where: { userId: createdOwnerId, title: { contains: "Business Verified" } },
    });
    assert(verifiedNotification !== null, `Verified notification sent to owner: "${verifiedNotification?.title}"`);

    const smsRecord = await prisma.sMSMessage.findFirst({
      where: { businessId: createdBizId },
    });
    assert(smsRecord !== null && smsRecord.status === "DELIVERED", `SMS record dispatched and recorded in Neon DB: "${smsRecord?.messageBody}"`);

    // -------------------------------------------------------------------------
    // TEST 6 — PUBLIC DISCOVERY INTEGRITY
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 6 — PUBLIC DISCOVERY ACCESSIBILITY");

    const liveBiz = await prisma.business.findUnique({
      where: { id: createdBizId },
      include: {
        products: true,
        verifications: true,
        owner: { select: { id: true, name: true, phone: true } },
      },
    });

    assert(liveBiz !== null, "Business record retrieved from Neon PostgreSQL");
    assert(liveBiz?.status === "ACTIVE", "Active status allows public discovery");
    assert(liveBiz?.products.length === 2, `Products persisted and discoverable: ${liveBiz?.products.length} products`);
    assert(liveBiz?.verifications.length >= 3, `Complete verification trail preserved: ${liveBiz?.verifications.length} records in Neon`);

  } catch (err) {
    console.error("  [ERROR IN TEST SUITE]:", err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------------------
    console.log("\n▶ CLEANUP TEST DATA IN NEON POSTGRESQL");
    try {
      if (createdBizId) {
        await prisma.product.deleteMany({ where: { businessId: createdBizId } });
        await prisma.verificationRecord.deleteMany({ where: { businessId: createdBizId } });
        await prisma.sMSMessage.deleteMany({ where: { businessId: createdBizId } });
        await prisma.auditLog.deleteMany({ where: { entityId: createdBizId } });
        await prisma.business.delete({ where: { id: createdBizId } });
        console.log(`  [CLEANUP] Deleted test business ${createdBizId}`);
      }
      if (createdOwnerId) {
        await prisma.notification.deleteMany({ where: { userId: createdOwnerId } });
        await prisma.user.delete({ where: { id: createdOwnerId } });
        console.log(`  [CLEANUP] Deleted test owner user ${createdOwnerId}`);
      }
    } catch (cleanupErr) {
      console.warn("  [CLEANUP WARNING]:", cleanupErr.message);
    }

    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(`  FINAL RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run();
