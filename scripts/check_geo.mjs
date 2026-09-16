import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const comms = await prisma.community.findMany();
  console.log("Existing communities:", comms);
  const bizs = await prisma.business.findMany({
    select: { id: true, name: true, cell: true, sector: true, district: true, communityId: true }
  });
  console.log("Existing businesses locations:", bizs);
  await prisma.$disconnect();
}

main().catch(console.error);
