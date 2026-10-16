import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

async function getConnectedClient(maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = new PrismaClient({
      log: ["error"],
    });
    try {
      console.log(`Connecting to Neon (attempt ${attempt}/${maxAttempts})...`);
      await client.$connect();
      const user = await client.user.findFirst();
      console.log("Connected successfully! Found user:", user ? user.name : "None");
      return client;
    } catch (err) {
      console.log(`Attempt ${attempt} failed: ${err.message}`);
      await client.$disconnect().catch(() => {});
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function main() {
  const prisma = await getConnectedClient();

  // Find or create admin
  let admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "MOSA Super Admin",
        email: "admin@mosa.rw",
        role: "SUPER_ADMIN",
        referralCode: `ADMIN-${Date.now()}`,
        status: "ACTIVE",
      },
    });
  }

  // Device parameters
  const name = "Physical MTN Android Terminal";
  const carrier = "MTN Rwanda";
  const deviceId = `bridge_${crypto.randomBytes(6).toString("hex")}`;
  const deviceToken = `mbt_${crypto.randomBytes(24).toString("hex")}`;
  const hmacSecret = `mbh_${crypto.randomBytes(24).toString("hex")}`;

  // 8-character pairing code
  const rawCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const pairingCode = `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;
  
  // Valid for 24 hours so the user has ample time to test
  const pairingExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const device = await prisma.paymentBridgeDevice.create({
    data: {
      name,
      deviceId,
      deviceToken,
      hmacSecret,
      carrier,
      status: "PENDING_PAIRING",
      pairingCode,
      pairingExpiresAt,
      enrolledById: admin.id,
    },
  });

  console.log("\n=======================================================");
  console.log("  MOSA PAYMENT BRIDGE — ENROLLMENT CREDENTIALS");
  console.log("=======================================================");
  console.log(`  Pairing Code:       ${pairingCode}`);
  console.log(`  Assigned Device ID: ${deviceId}`);
  console.log(`  Expires At:         ${pairingExpiresAt.toISOString()}`);
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
