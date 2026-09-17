import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PROD_URL = "https://mosa-one.vercel.app";

async function run() {
  const switchRes = await fetch(`${PROD_URL}/api/auth/demo-switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "BUSINESS_OWNER" }),
  });
  const switchData = await switchRes.json();
  console.log("Logged in user:", switchData.user.id, switchData.user.name);

  // Find or assign business to this exact user
  let biz = await prisma.business.findFirst({
    where: { ownerId: switchData.user.id },
  });

  if (!biz) {
    const anyBiz = await prisma.business.findFirst({ where: { status: "ACTIVE" } });
    biz = await prisma.business.update({
      where: { id: anyBiz.id },
      data: { ownerId: switchData.user.id },
    });
    console.log("Assigned biz to user:", biz.id, biz.name);
  } else {
    console.log("Found existing owned biz:", biz.id, biz.name);
  }

  const cookie = switchRes.headers.get("set-cookie")?.split(";")[0];

  // Test finance post
  const finRes = await fetch(`${PROD_URL}/api/owner/finance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      businessId: biz.id,
      action: "RECORD_PURCHASE",
      itemName: `Test Item ${Date.now()}`,
      category: "Test",
      quantity: 10,
      unit: "pcs",
      buyingPrice: 1000,
      sellingPrice: 1500,
      supplier: "Test Supplier",
    }),
  });

  console.log("Finance POST Status:", finRes.status);
  const finData = await finRes.json();
  console.log("Finance POST Response:", finData);

  // Test reports post
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const repRes = await fetch(`${PROD_URL}/api/owner/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      businessId: biz.id,
      monthYear: currentPeriod,
      sendSms: true,
    }),
  });

  console.log("Reports POST Status:", repRes.status);
  const repData = await repRes.json();
  console.log("Reports POST Response:", repData);

  await prisma.$disconnect();
}

run();
