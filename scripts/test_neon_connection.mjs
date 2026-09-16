import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== NEON POSTGRESQL DIRECT VERIFICATION ===");

  // 1. Test Raw Connection & Table Inspection
  console.log("\n1. Querying PostgreSQL information_schema in Neon...");
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log("✅ Neon Tables Found:", tables.map((t) => t.table_name));

  // Verify Record Counts from Seed
  const [usersCount, bizCount, prodCount, demandCount, missionCount, auditCount] = await Promise.all([
    prisma.user.count(),
    prisma.business.count(),
    prisma.product.count(),
    prisma.communityDemand.count(),
    prisma.mission.count(),
    prisma.auditLog.count(),
  ]);
  console.log("✅ Seeded Live Neon Record Counts:", {
    users: usersCount,
    businesses: bizCount,
    products: prodCount,
    demands: demandCount,
    missions: missionCount,
    auditLogs: auditCount,
  });

  // 2. Test CRUD Persistence on User model
  console.log("\n2. Testing Real Database CRUD Persistence...");
  const testPhone = "+250788999000";
  
  // Cleanup any old test record
  await prisma.user.deleteMany({ where: { phone: testPhone } }).catch(() => {});

  // CREATE
  const createdUser = await prisma.user.create({
    data: {
      phone: testPhone,
      name: "Neon Test Resident",
      role: "CUSTOMER",
      community: "Nyamirambo Biryogo",
      points: 100,
      badges: ["Neon Verified"],
      referralCode: "MOSA-TEST-000",
      language: "rw",
    },
  });
  console.log("✅ CREATE Succeeded. ID:", createdUser.id, "Name:", createdUser.name);

  // READ
  const readUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  if (!readUser || readUser.name !== "Neon Test Resident") {
    throw new Error("READ failed or data mismatch in Neon database");
  }
  console.log("✅ READ Succeeded from Neon:", readUser.name, readUser.phone);

  // UPDATE
  const updatedUser = await prisma.user.update({
    where: { id: createdUser.id },
    data: { points: 150, language: "en" },
  });
  if (updatedUser.points !== 150 || updatedUser.language !== "en") {
    throw new Error("UPDATE failed in Neon database");
  }
  console.log("✅ UPDATE Succeeded in Neon. New Points:", updatedUser.points, "Lang:", updatedUser.language);

  // DELETE
  await prisma.user.delete({
    where: { id: createdUser.id },
  });
  const verifyDeleted = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  if (verifyDeleted) {
    throw new Error("DELETE failed: record still exists in Neon");
  }
  console.log("✅ DELETE Succeeded in Neon (record successfully cleaned up)");

  console.log("\n🎉 NEON POSTGRESQL CRUD & SCHEMA TEST COMPLETED 100% SUCCESSFULLY!\n");
}

main()
  .catch((e) => {
    console.error("❌ Neon Test Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
