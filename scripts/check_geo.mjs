import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const provinces = await prisma.geographicProvince.count();
  const districts = await prisma.geographicDistrict.count();
  const sectors = await prisma.geographicSector.count();
  const cells = await prisma.geographicCell.count();
  const localAreas = await prisma.localArea.count();
  const businesses = await prisma.business.count();
  const demoBiz = await prisma.business.count({ where: { dataStatus: 'DEMO' } });
  const researchedBiz = await prisma.business.count({ where: { dataStatus: 'RESEARCHED' } });
  const verifiedBiz = await prisma.business.count({ where: { dataStatus: 'VERIFIED' } });
  const products = await prisma.product.count();
  const estimatedProducts = await prisma.product.count({ where: { isEstimated: true } });

  console.log("=== CURRENT DATABASE COUNTS ===");
  console.log({
    provinces,
    districts,
    sectors,
    cells,
    localAreas,
    businesses,
    demoBiz,
    researchedBiz,
    verifiedBiz,
    products,
    estimatedProducts
  });

  const distList = await prisma.geographicDistrict.findMany({ select: { code: true, name: true } });
  console.log("Current Districts in DB:", distList.map(d => `${d.name} (${d.code})`).join(", "));

  await prisma.$disconnect();
}

main().catch(console.error);
