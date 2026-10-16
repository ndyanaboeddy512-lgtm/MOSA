import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const devices = await prisma.paymentBridgeDevice.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      deviceId: true,
      status: true,
      simPhoneNumber: true,
      carrier: true,
      batteryLevel: true,
      isCharging: true,
      networkType: true,
      appVersion: true,
      enrolledAt: true,
      lastHeartbeatAt: true,
    },
  });
  console.log("All Bridge Devices:", JSON.stringify(devices, null, 2));
  await prisma.$disconnect();
}

main();
