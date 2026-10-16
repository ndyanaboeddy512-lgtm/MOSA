import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const devices = await prisma.paymentBridgeDevice.findMany({
    where: { status: "PENDING_PAIRING" },
    select: { id: true, name: true, deviceId: true, pairingCode: true, pairingExpiresAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("Pending pairing challenges:", JSON.stringify(devices, null, 2));
  await prisma.$disconnect();
}

main();
