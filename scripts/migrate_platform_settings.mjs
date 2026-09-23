import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Applying PlatformSettings migration to Neon PostgreSQL...");

  // 1. Create PlatformSettings table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformSettings" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
      "platformName" TEXT NOT NULL DEFAULT 'MOSA',
      "platformNameRw" TEXT DEFAULT 'MOSA',
      "tagline" TEXT NOT NULL DEFAULT 'Neighborhood Commerce & Authentic Price Intelligence',
      "taglineRw" TEXT DEFAULT 'Urubuga rw''Ubucuruzi bw''Ibiciro by''Ukuri mu Rwanda',
      "shortDescription" TEXT DEFAULT 'Rwanda''s Community Commerce Discovery Network',
      "shortDescriptionRw" TEXT DEFAULT 'Urusobe rw''Ikoranabuhanga ry''Ubucuruzi n''Ibiciro by''Ukuri mu Rwanda',
      "logoUrl" TEXT,
      "faviconUrl" TEXT,
      "heroBannerUrl" TEXT,
      "officialEmail" TEXT NOT NULL DEFAULT 'contact@mosa.rw',
      "officialPhone" TEXT NOT NULL DEFAULT '+250 788 000 000',
      "officialWhatsapp" TEXT DEFAULT '+250 788 000 000',
      "officialAddress" TEXT NOT NULL DEFAULT 'Kigali, Rwanda • Nyarugenge • Nyamirambo Pilot Hub',
      "officialAddressRw" TEXT DEFAULT 'Kigali, u Rwanda • Nyarugenge • Ihuriro rya Nyamirambo',
      "supportedLanguages" TEXT NOT NULL DEFAULT 'rw,en,fr,sw',
      "operatingHours" TEXT DEFAULT 'Monday - Saturday: 08:00 - 18:00 CAT',
      "operatingHoursRw" TEXT DEFAULT 'Kuwa Mbere - Kuwa Gatandatu: 08:00 - 18:00 CAT',
      "socialLinks" TEXT,
      "brandAssets" TEXT,
      "copyrightText" TEXT DEFAULT 'MOSA Network (Rwanda). Built for sustainable, ethical community discovery.',
      "updatedBy" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ PlatformSettings table created/verified");

  // 2. Ensure the default singleton configuration row exists
  const existing = await prisma.$queryRawUnsafe(`
    SELECT "id" FROM "PlatformSettings" WHERE "id" = 'default' LIMIT 1;
  `);

  if (!existing || existing.length === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PlatformSettings" (
        "id",
        "platformName",
        "platformNameRw",
        "tagline",
        "taglineRw",
        "shortDescription",
        "shortDescriptionRw",
        "officialEmail",
        "officialPhone",
        "officialWhatsapp",
        "officialAddress",
        "officialAddressRw",
        "supportedLanguages",
        "operatingHours",
        "operatingHoursRw",
        "socialLinks",
        "copyrightText",
        "updatedAt",
        "createdAt"
      ) VALUES (
        'default',
        'MOSA',
        'MOSA',
        'Neighborhood Commerce & Authentic Price Intelligence',
        'Urubuga rw''Ubucuruzi bw''Ibiciro by''Ukuri mu Rwanda',
        'Rwanda''s Community Commerce Discovery Network',
        'Urusobe rw''Ikoranabuhanga ry''Ubucuruzi n''Ibiciro by''Ukuri mu Rwanda',
        'contact@mosa.rw',
        '+250 788 000 000',
        '+250 788 000 000',
        'Kigali, Rwanda • Nyarugenge • Nyamirambo Pilot Hub',
        'Kigali, u Rwanda • Nyarugenge • Ihuriro rya Nyamirambo',
        'rw,en,fr,sw',
        'Monday - Saturday: 08:00 - 18:00 CAT',
        'Kuwa Mbere - Kuwa Gatandatu: 08:00 - 18:00 CAT',
        '{"twitter":"","facebook":"","instagram":"","linkedin":"","youtube":""}',
        'MOSA Network (Rwanda). Built for sustainable, ethical community discovery.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ Default PlatformSettings row seeded successfully");
  } else {
    console.log("✓ Default PlatformSettings row already exists");
  }

  console.log("✓ PlatformSettings migration complete.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
