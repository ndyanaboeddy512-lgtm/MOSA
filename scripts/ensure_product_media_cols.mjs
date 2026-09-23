import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking and creating Product media columns in Neon PostgreSQL...");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
  `);
  console.log("✓ mediaUrl column ready");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "mediaType" TEXT DEFAULT 'IMAGE';
  `);
  console.log("✓ mediaType column ready");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "mediaCaption" TEXT;
  `);
  console.log("✓ mediaCaption column ready");

  const sample = await prisma.product.findFirst({
    select: {
      id: true,
      name: true,
      mediaUrl: true,
      mediaType: true,
      mediaCaption: true,
    },
  });
  console.log("✓ Verified query on Product table:", sample);

  await prisma.$disconnect();
  console.log("Neon PostgreSQL Product schema migration successfully verified!");
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
