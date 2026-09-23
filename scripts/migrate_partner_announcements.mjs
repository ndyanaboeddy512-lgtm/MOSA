import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Applying Partner Announcements migration to Neon PostgreSQL...");

  // 1. Create PartnerAnnouncement table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PartnerAnnouncement" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "titleRw" TEXT,
      "message" TEXT NOT NULL,
      "messageRw" TEXT,
      "targetType" TEXT NOT NULL DEFAULT 'ALL',
      "targetCategory" TEXT,
      "targetDistrict" TEXT,
      "targetBusinessIds" TEXT,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "scheduledAt" TIMESTAMP(3),
      "sentAt" TIMESTAMP(3),
      "totalRecipients" INTEGER NOT NULL DEFAULT 0,
      "authorId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PartnerAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
  console.log("✓ PartnerAnnouncement table created/verified");

  // Create indexes on PartnerAnnouncement
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PartnerAnnouncement_status_idx" ON "PartnerAnnouncement"("status");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PartnerAnnouncement_targetType_idx" ON "PartnerAnnouncement"("targetType");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PartnerAnnouncement_createdAt_idx" ON "PartnerAnnouncement"("createdAt");
  `);
  console.log("✓ PartnerAnnouncement indexes created/verified");

  // 2. Add columns to Notification table
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'SYSTEM';
  `);
  console.log("✓ Notification.type column created/verified");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "announcementId" TEXT;
  `);
  console.log("✓ Notification.announcementId column created/verified");

  // Add foreign key constraint if not exists
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Notification_announcementId_fkey'
      ) THEN
        ALTER TABLE "Notification" 
        ADD CONSTRAINT "Notification_announcementId_fkey" 
        FOREIGN KEY ("announcementId") REFERENCES "PartnerAnnouncement"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  console.log("✓ Notification foreign key constraint created/verified");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Notification_announcementId_idx" ON "Notification"("announcementId");
  `);
  console.log("✓ Notification.announcementId index created/verified");

  await prisma.$disconnect();
  console.log("Neon PostgreSQL Partner Announcements migration successfully completed!");
}

main().catch(async (e) => {
  console.error("Migration error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
