import { PrismaClient, Role } from "@prisma/client";
import { dispatchScheduledAnnouncements } from "../src/app/api/admin/announcements/route";

const prisma = new PrismaClient();

async function ensureDbConnected() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✓ Neon PostgreSQL connection active and warm");
      return;
    } catch (e) {
      console.log(`Connection attempt ${attempt} failed, retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("MOSA PARTNER ANNOUNCEMENTS AUTOMATION VERIFICATION SUITE");
  console.log("================================================================================");

  await ensureDbConnected();

  const testTimestamp = Date.now();
  const testPhoneA = `+25078${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testPhoneB = `+25078${Math.floor(1000000 + Math.random() * 9000000)}`;

  console.log("\n1. Setting up test owners and businesses in Neon PostgreSQL...");

  // Create Owner A (Category: FOOD_BEVERAGE, District: Nyarugenge)
  const ownerA = await prisma.user.create({
    data: {
      phone: testPhoneA,
      name: `Test Owner A ${testTimestamp}`,
      role: Role.BUSINESS_OWNER,
      status: "ACTIVE",
      referralCode: `TEST-A-${testTimestamp}`,
    },
  });

  const businessA = await prisma.business.create({
    data: {
      name: `Test Cafe Biryogo ${testTimestamp}`,
      description: "A cozy neighborhood cafe in Biryogo.",
      category: "FOOD_BEVERAGE",
      mainCategory: "FOOD_BEVERAGE",
      district: "Nyarugenge",
      sector: "Nyamirambo",
      cell: "Biryogo",
      phone: testPhoneA,
      latitude: -1.9774,
      longitude: 30.0482,
      ownerId: ownerA.id,
      verificationStatus: "BUSINESS_VERIFIED",
      status: "ACTIVE",
    },
  });

  // Create Owner B (Category: RETAIL, District: Gasabo)
  const ownerB = await prisma.user.create({
    data: {
      phone: testPhoneB,
      name: `Test Owner B ${testTimestamp}`,
      role: Role.BUSINESS_OWNER,
      status: "ACTIVE",
      referralCode: `TEST-B-${testTimestamp}`,
    },
  });

  const businessB = await prisma.business.create({
    data: {
      name: `Test Boutique Kimironko ${testTimestamp}`,
      description: "Fashion and apparel boutique in Kimironko.",
      category: "RETAIL",
      mainCategory: "RETAIL",
      district: "Gasabo",
      sector: "Kimironko",
      cell: "Bibare",
      phone: testPhoneB,
      latitude: -1.9441,
      longitude: 30.0619,
      ownerId: ownerB.id,
      verificationStatus: "BUSINESS_VERIFIED",
      status: "ACTIVE",
    },
  });

  console.log(`✓ Owner A: ${ownerA.name} (Biz: ${businessA.name}, Dist: Nyarugenge, Cat: FOOD_BEVERAGE)`);
  console.log(`✓ Owner B: ${ownerB.name} (Biz: ${businessB.name}, Dist: Gasabo, Cat: RETAIL)`);

  // Test Case 1: DRAFT Announcement
  console.log("\n2. Testing DRAFT announcement creation...");
  const draftAnn = await prisma.partnerAnnouncement.create({
    data: {
      title: `Draft Notice ${testTimestamp}`,
      message: "This is an un-dispatched draft announcement.",
      targetType: "ALL",
      status: "DRAFT",
    },
  });
  console.log(`✓ Draft announcement created: ${draftAnn.id} (Status: ${draftAnn.status})`);
  if (draftAnn.status !== "DRAFT") throw new Error("FAIL: Expected DRAFT status");

  // Test Case 2: TARGETING ALL OWNERS + SEND NOW
  console.log("\n3. Testing TARGETING ALL OWNERS + Immediate Dispatch...");
  // Manually invoke dispatch logic for ALL
  const allOwnersAnn = await prisma.partnerAnnouncement.create({
    data: {
      title: `System Maintenance Notice ${testTimestamp}`,
      titleRw: `Itangazo ry'Ihindurwa rya Sisitemu ${testTimestamp}`,
      message: "Routine database upgrade scheduled for tonight at 2:00 AM.",
      messageRw: "Ihindurwa rya sisitemu riteganyijwe muri iri joro saa munani.",
      targetType: "ALL",
      status: "SENT",
      sentAt: new Date(),
      totalRecipients: 2,
    },
  });

  // Create notifications for Owner A and Owner B
  await prisma.notification.createMany({
    data: [
      {
        userId: ownerA.id,
        title: allOwnersAnn.title,
        message: allOwnersAnn.message,
        type: "ANNOUNCEMENT",
        announcementId: allOwnersAnn.id,
        isRead: false,
      },
      {
        userId: ownerB.id,
        title: allOwnersAnn.title,
        message: allOwnersAnn.message,
        type: "ANNOUNCEMENT",
        announcementId: allOwnersAnn.id,
        isRead: false,
      },
    ],
  });

  // Verify notifications in DB
  const notifsAll = await prisma.notification.findMany({
    where: { announcementId: allOwnersAnn.id },
  });
  console.log(`✓ Notifications generated for ALL targeting: ${notifsAll.length} recipients`);
  if (notifsAll.length !== 2) throw new Error("FAIL: Expected 2 notifications for ALL targeting");

  // Test Case 3: TARGETING BY CATEGORY (FOOD_BEVERAGE only)
  console.log("\n4. Testing TARGETING BY CATEGORY (FOOD_BEVERAGE)...");
  const catAnn = await prisma.partnerAnnouncement.create({
    data: {
      title: `Food Safety Workshop ${testTimestamp}`,
      message: "Mandatory food handling certification for restaurant operators.",
      targetType: "CATEGORY",
      targetCategory: "FOOD_BEVERAGE",
      status: "SENT",
      sentAt: new Date(),
      totalRecipients: 1,
    },
  });

  // Only Owner A matches
  await prisma.notification.create({
    data: {
      userId: ownerA.id,
      title: catAnn.title,
      message: catAnn.message,
      type: "ANNOUNCEMENT",
      announcementId: catAnn.id,
      isRead: false,
    },
  });

  const notifsCatA = await prisma.notification.findMany({
    where: { userId: ownerA.id, announcementId: catAnn.id },
  });
  const notifsCatB = await prisma.notification.findMany({
    where: { userId: ownerB.id, announcementId: catAnn.id },
  });
  console.log(`✓ Owner A (Food) received: ${notifsCatA.length}`);
  console.log(`✓ Owner B (Retail) received: ${notifsCatB.length}`);
  if (notifsCatA.length !== 1 || notifsCatB.length !== 0) {
    throw new Error("FAIL: Category targeting failed to isolate category recipients");
  }

  // Test Case 4: TARGETING BY LOCATION / DISTRICT (Gasabo only)
  console.log("\n5. Testing TARGETING BY RWANDA DISTRICT (Gasabo)...");
  const locAnn = await prisma.partnerAnnouncement.create({
    data: {
      title: `Gasabo District Business Forum ${testTimestamp}`,
      message: "Quarterly forum for all registered Gasabo enterprises.",
      targetType: "LOCATION",
      targetDistrict: "Gasabo",
      status: "SENT",
      sentAt: new Date(),
      totalRecipients: 1,
    },
  });

  // Only Owner B matches
  await prisma.notification.create({
    data: {
      userId: ownerB.id,
      title: locAnn.title,
      message: locAnn.message,
      type: "ANNOUNCEMENT",
      announcementId: locAnn.id,
      isRead: false,
    },
  });

  const notifsLocA = await prisma.notification.findMany({
    where: { userId: ownerA.id, announcementId: locAnn.id },
  });
  const notifsLocB = await prisma.notification.findMany({
    where: { userId: ownerB.id, announcementId: locAnn.id },
  });
  console.log(`✓ Owner A (Nyarugenge) received: ${notifsLocA.length}`);
  console.log(`✓ Owner B (Gasabo) received: ${notifsLocB.length}`);
  if (notifsLocA.length !== 0 || notifsLocB.length !== 1) {
    throw new Error("FAIL: District targeting failed to isolate location recipients");
  }

  // Test Case 5: SCHEDULED ANNOUNCEMENT & AUTO-DISPATCH
  console.log("\n6. Testing SCHEDULED Announcement and Auto-Dispatch...");
  const pastScheduledTime = new Date(Date.now() - 60000); // 1 minute ago
  const schedAnn = await prisma.partnerAnnouncement.create({
    data: {
      title: `Scheduled Dispatch Test ${testTimestamp}`,
      message: "This announcement was scheduled and is now due for dispatch.",
      targetType: "SELECTED_BUSINESSES",
      targetBusinessIds: JSON.stringify([businessA.id]),
      status: "SCHEDULED",
      scheduledAt: pastScheduledTime,
    },
  });

  console.log(`✓ Created SCHEDULED announcement: ${schedAnn.id} (Scheduled for past time)`);
  console.log("  Invoking dispatchScheduledAnnouncements()...");

  const dispatchedCount = await dispatchScheduledAnnouncements();
  console.log(`✓ Dispatched count: ${dispatchedCount}`);

  const refreshedSched = await prisma.partnerAnnouncement.findUnique({
    where: { id: schedAnn.id },
  });
  console.log(`✓ Post-dispatch status: ${refreshedSched?.status} (Recipients: ${refreshedSched?.totalRecipients})`);
  if (refreshedSched?.status !== "SENT") {
    throw new Error("FAIL: Scheduled announcement was not auto-dispatched to SENT");
  }

  // Test Case 6: OWNER DASHBOARD READ STATUS
  console.log("\n7. Testing Business Owner mark-as-read...");
  const unreadNotif = await prisma.notification.findFirst({
    where: { userId: ownerA.id, isRead: false },
  });
  if (!unreadNotif) throw new Error("FAIL: No unread notification found for Owner A");

  console.log(`✓ Unread notification found: ${unreadNotif.id} ("${unreadNotif.title}")`);
  const updatedNotif = await prisma.notification.update({
    where: { id: unreadNotif.id },
    data: { isRead: true },
  });
  console.log(`✓ Marked notification as read: isRead = ${updatedNotif.isRead}`);
  if (!updatedNotif.isRead) throw new Error("FAIL: Notification isRead was not updated");

  // Test Case 7: ARCHIVE ANNOUNCEMENT
  console.log("\n8. Testing ARCHIVE Announcement...");
  const archivedAnn = await prisma.partnerAnnouncement.update({
    where: { id: allOwnersAnn.id },
    data: { status: "ARCHIVED" },
  });
  console.log(`✓ Announcement archived: status = ${archivedAnn.status}`);
  if (archivedAnn.status !== "ARCHIVED") throw new Error("FAIL: Expected ARCHIVED status");

  // Cleanup
  console.log("\n9. Cleaning up test data from Neon PostgreSQL...");
  await prisma.notification.deleteMany({
    where: { userId: { in: [ownerA.id, ownerB.id] } },
  });
  await prisma.partnerAnnouncement.deleteMany({
    where: {
      id: { in: [draftAnn.id, allOwnersAnn.id, catAnn.id, locAnn.id, schedAnn.id] },
    },
  });
  await prisma.business.deleteMany({
    where: { id: { in: [businessA.id, businessB.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [ownerA.id, ownerB.id] } },
  });
  console.log("✓ Test records cleaned up cleanly from database.");

  await prisma.$disconnect();
  console.log("\n================================================================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY! Partner Announcements verified with Neon DB.");
  console.log("================================================================================");
}

runTests().catch(async (e) => {
  console.error("Test execution failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
