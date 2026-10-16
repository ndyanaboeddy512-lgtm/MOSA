import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runAdditiveMigration() {
  console.log("=== EXECUTING ADDITIVE MIGRATION: PaymentBridgeDevice ===");

  try {
    // 1. Create BridgeDeviceStatus enum if not exists
    console.log("1. Creating BridgeDeviceStatus enum if not exists...");
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "BridgeDeviceStatus" AS ENUM ('PENDING_PAIRING', 'ACTIVE', 'SUSPENDED', 'REVOKED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✅ Enum BridgeDeviceStatus created or already exists.");

    // 2. Create PaymentBridgeDevice table
    console.log("2. Creating PaymentBridgeDevice table if not exists...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PaymentBridgeDevice" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "deviceId" TEXT NOT NULL,
        "deviceToken" TEXT NOT NULL,
        "hmacSecret" TEXT NOT NULL,
        "simPhoneNumber" TEXT,
        "carrier" TEXT NOT NULL DEFAULT 'MTN Rwanda',
        "status" "BridgeDeviceStatus" NOT NULL DEFAULT 'PENDING_PAIRING',
        "pairingCode" TEXT,
        "pairingExpiresAt" TIMESTAMP(3),
        "appVersion" TEXT,
        "batteryLevel" INTEGER,
        "isCharging" BOOLEAN NOT NULL DEFAULT false,
        "networkType" TEXT,
        "lastHeartbeatAt" TIMESTAMP(3),
        "lastSyncAt" TIMESTAMP(3),
        "enrolledAt" TIMESTAMP(3),
        "enrolledById" TEXT,
        "revokedAt" TIMESTAMP(3),
        "revokedById" TEXT,
        "revokedReason" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "PaymentBridgeDevice_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PaymentBridgeDevice_deviceId_key" UNIQUE ("deviceId"),
        CONSTRAINT "PaymentBridgeDevice_deviceToken_key" UNIQUE ("deviceToken"),
        CONSTRAINT "PaymentBridgeDevice_pairingCode_key" UNIQUE ("pairingCode")
      );
    `);
    console.log("✅ Table PaymentBridgeDevice created or already exists.");

    // 3. Add foreign key constraints safely
    console.log("3. Ensuring Foreign Key constraints...");
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'PaymentBridgeDevice_enrolledById_fkey'
        ) THEN
          ALTER TABLE "PaymentBridgeDevice"
          ADD CONSTRAINT "PaymentBridgeDevice_enrolledById_fkey"
          FOREIGN KEY ("enrolledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'PaymentBridgeDevice_revokedById_fkey'
        ) THEN
          ALTER TABLE "PaymentBridgeDevice"
          ADD CONSTRAINT "PaymentBridgeDevice_revokedById_fkey"
          FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    console.log("✅ Foreign Key constraints verified.");

    // 4. Create Indexes
    console.log("4. Creating Indexes...");
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentBridgeDevice_status_idx" ON "PaymentBridgeDevice"("status");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentBridgeDevice_deviceId_idx" ON "PaymentBridgeDevice"("deviceId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentBridgeDevice_pairingCode_idx" ON "PaymentBridgeDevice"("pairingCode");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PaymentBridgeDevice_enrolledById_idx" ON "PaymentBridgeDevice"("enrolledById");`);
    console.log("✅ Indexes verified.");

    // 5. Test table via Prisma Client
    console.log("5. Testing query via Prisma Client...");
    const deviceCount = await prisma.paymentBridgeDevice.count();
    console.log(`✅ Table is live in Neon! Total existing bridge devices: ${deviceCount}`);

    console.log("\n🎉 ADDITIVE MIGRATION COMPLETED SAFELY WITHOUT DROPPING ANY TABLES!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAdditiveMigration();
