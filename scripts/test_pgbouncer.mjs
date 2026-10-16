import { PrismaClient } from "@prisma/client";

async function test() {
  const base = process.env.DATABASE_URL;
  const url = base.includes("pgbouncer=true") ? base : `${base}&pgbouncer=true`;
  console.log("Testing connection with pgbouncer=true...");
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    const userCount = await prisma.user.count();
    console.log("SUCCESS! User count:", userCount);
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error("FAILED:", e.message);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

test();
