import { prisma } from "../src/lib/prisma";
import { Role } from "@prisma/client";

async function runPlatformIdentityTests() {
  console.log("=== MOSA Platform Identity & Controls Test Suite ===");

  // 1. Verify default PlatformSettings row in Neon PostgreSQL
  console.log("\n[Test 1]: Checking default PlatformSettings in PostgreSQL...");
  const initialSettings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });

  if (!initialSettings) {
    throw new Error("Default PlatformSettings record does not exist in Neon PostgreSQL!");
  }
  console.log("✓ Initial settings verified:", {
    platformName: initialSettings.platformName,
    officialEmail: initialSettings.officialEmail,
    supportedLanguages: initialSettings.supportedLanguages,
  });

  // 2. Test Admin User for RBAC simulation
  console.log("\n[Test 2]: Finding an admin user for audit logging...");
  const adminUser = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (!adminUser) {
    throw new Error("No SUPER_ADMIN user found in database!");
  }
  console.log(`✓ Admin user identified: ${adminUser.name} (${adminUser.id})`);

  // 3. Test Updating Platform Settings in PostgreSQL
  console.log("\n[Test 3]: Simulating Admin Update with Custom Branding & Contacts...");
  const testLogo = "https://assets.mosa.rw/branding/mosa-logo-2026.png";
  const testEmail = "info-center@mosa.rw";
  const testPhone = "+250 788 999 111";

  const updatedSettings = await prisma.platformSettings.update({
    where: { id: "default" },
    data: {
      platformName: "MOSA Rwanda",
      platformNameRw: "MOSA Rwanda",
      tagline: "Rwanda's Trusted Local Commerce Network",
      taglineRw: "Urubuga rw'Icyizere rw'Ubucuruzi bw'Ibiciro by'Ukuri mu Rwanda",
      logoUrl: testLogo,
      officialEmail: testEmail,
      officialPhone: testPhone,
      supportedLanguages: "rw,en,fr",
      updatedBy: `${adminUser.name} (${adminUser.role})`,
    },
  });

  if (
    updatedSettings.platformName !== "MOSA Rwanda" ||
    updatedSettings.officialEmail !== testEmail ||
    updatedSettings.logoUrl !== testLogo
  ) {
    throw new Error("PlatformSettings failed to update accurately in PostgreSQL!");
  }
  console.log("✓ Updated settings persisted:", {
    platformName: updatedSettings.platformName,
    email: updatedSettings.officialEmail,
    phone: updatedSettings.officialPhone,
    logoUrl: updatedSettings.logoUrl,
    languages: updatedSettings.supportedLanguages,
  });

  // 4. Test Audit Logging
  console.log("\n[Test 4]: Creating and verifying AuditLog entry...");
  const auditRecord = await prisma.auditLog.create({
    data: {
      action: "PLATFORM_IDENTITY_UPDATED",
      entityType: "PLATFORM_SETTINGS",
      entityId: "default",
      actorId: adminUser.id,
      metadata: JSON.stringify({
        updatedFields: ["platformName", "logoUrl", "officialEmail", "officialPhone", "supportedLanguages"],
        platformName: "MOSA Rwanda",
        adminName: adminUser.name,
      }),
    },
  });

  const verifiedAudit = await prisma.auditLog.findUnique({
    where: { id: auditRecord.id },
    include: { actor: true },
  });

  if (!verifiedAudit || verifiedAudit.action !== "PLATFORM_IDENTITY_UPDATED") {
    throw new Error("AuditLog verification failed!");
  }
  console.log("✓ AuditLog recorded successfully:", {
    id: verifiedAudit.id,
    action: verifiedAudit.action,
    actor: verifiedAudit.actor?.name,
    createdAt: verifiedAudit.createdAt,
  });

  // 5. Test Resetting Platform Settings to Default
  console.log("\n[Test 5]: Restoring Platform Settings to original MOSA baseline...");
  const resetSettings = await prisma.platformSettings.update({
    where: { id: "default" },
    data: {
      platformName: "MOSA",
      platformNameRw: "MOSA",
      tagline: "Neighborhood Commerce & Authentic Price Intelligence",
      taglineRw: "Urubuga rw'Ubucuruzi bw'Ibiciro by'Ukuri mu Rwanda",
      logoUrl: null,
      officialEmail: "contact@mosa.rw",
      officialPhone: "+250 788 000 000",
      officialWhatsapp: "+250 788 000 000",
      officialAddress: "Kigali, Rwanda • Nyarugenge • Nyamirambo Pilot Hub",
      officialAddressRw: "Kigali, u Rwanda • Nyarugenge • Ihuriro rya Nyamirambo",
      supportedLanguages: "rw,en,fr,sw",
      updatedBy: `${adminUser.name} (SUPER_ADMIN)`,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "PLATFORM_IDENTITY_RESET",
      entityType: "PLATFORM_SETTINGS",
      entityId: "default",
      actorId: adminUser.id,
      metadata: JSON.stringify({
        reason: "Test suite restored default platform identity",
      }),
    },
  });

  console.log("✓ Default baseline restored:", {
    platformName: resetSettings.platformName,
    officialEmail: resetSettings.officialEmail,
    logoUrl: resetSettings.logoUrl,
  });

  console.log("\n=== ALL PLATFORM IDENTITY & CONTROLS TESTS PASSED SUCCESSFULLY! ===");
}

runPlatformIdentityTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
