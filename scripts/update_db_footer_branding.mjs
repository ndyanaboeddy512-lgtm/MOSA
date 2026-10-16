import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking current PlatformSettings in DB...");
  const current = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  console.log("Current DB row:", current);

  if (current) {
    const updated = await prisma.platformSettings.update({
      where: { id: "default" },
      data: {
        tagline: "Independent Business Discovery Platform",
        shortDescription: "Global Community Commerce Discovery Network",
        copyrightText: "© 2026 MOSA Network. All rights reserved.",
      },
    });
    console.log("Updated DB row:", updated);
  }
}

main()
  .catch((err) => {
    console.error("DB update error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
