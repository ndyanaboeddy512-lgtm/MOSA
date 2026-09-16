import { PrismaClient, VerificationStatus, DataStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const nyamiramboSector = await prisma.geographicSector.findFirst({
    where: { name: "Nyamirambo" },
    include: { cells: true, districtRel: { include: { province: true } } },
  });

  if (!nyamiramboSector) {
    console.error("Nyamirambo sector not found");
    return;
  }

  const cellsMap = {};
  for (const c of nyamiramboSector.cells) {
    cellsMap[c.name] = c.id;
  }

  const additionalNyamirambo = [
    {
      id: "biz-5",
      name: "Tapi Rouge Moto & Auto Spares",
      nameRw: "Ibyuma bya Moto n'Imodoka Tapi Rouge",
      category: "mechanic_repair",
      categoryDisplay: "Mechanics & Spares",
      categoryDisplayRw: "Abakanishi & Ibyuma by'Ibinyabiziga",
      description: "Motorcycle maintenance, brake replacement, chain tightening, spark plugs, high grade lubricant oil, and puncture vulcanizing.",
      descriptionRw: "Gusana moto, guhindura amaplake ya feri, amavuta meza ya moteri, no gutera udupece ku mapine yatobotse.",
      phone: "+250788567890",
      whatsapp: "250788567890",
      sector: "Nyamirambo",
      district: "Nyarugenge",
      cell: "Rwezamenyo",
      addressNote: "Behind Tapi Rouge Basketball pitch",
      latitude: -1.9840,
      longitude: 30.0450,
      verificationStatus: VerificationStatus.AGENT_VERIFIED,
      dataStatus: DataStatus.VERIFIED,
      source: "AGENT_FIELD_AUDIT",
      priceRange: "MODERATE",
      coverImage: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=60",
      sectorId: nyamiramboSector.id,
      cellId: cellsMap["Rwezamenyo"],
      districtId: nyamiramboSector.districtId,
      provinceId: nyamiramboSector.districtRel.provinceId,
      products: [
        { name: "Motorcycle Engine Oil (Total 4T 1L)", nameRw: "Amavuta ya Moto (Total 4T Litro 1)", price: 5500, unit: "bottle", isAvailable: true },
        { name: "Brake Pads Replacement + Labor", nameRw: "Gushyiramo Amaplake ya Feri Mashya", price: 3500, unit: "service", isAvailable: true },
      ],
    },
    {
      id: "biz-6",
      name: "Alimentation Générale Tapi Rouge",
      nameRw: "Iduka ry'Ibiribwa Tapi Rouge",
      category: "shop_retail",
      categoryDisplay: "Local Shops & Groceries",
      categoryDisplayRw: "Amaduka & Ibiribwa",
      description: "Neighborhood convenience shop offering quality staples: Kinazi cassava flour, Gorillaz rice, cooking sunflower oil, sugar, and Rwandan tea leaves.",
      descriptionRw: "Iduka ricuruza ibiribwa by'ubwoko bwose: ifu ya Kinazi, umuceri wa Gorillaz, amavuta yo guteka, isukari n'amajyani y'u Rwanda.",
      phone: "+250788678901",
      whatsapp: "250788678901",
      sector: "Nyamirambo",
      district: "Nyarugenge",
      cell: "Rwezamenyo",
      addressNote: "Near Tapi Rouge roundabout",
      latitude: -1.9835,
      longitude: 30.0460,
      verificationStatus: VerificationStatus.HIGH_CONFIDENCE,
      dataStatus: DataStatus.VERIFIED,
      source: "AGENT_FIELD_AUDIT",
      priceRange: "LOW",
      coverImage: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60",
      sectorId: nyamiramboSector.id,
      cellId: cellsMap["Rwezamenyo"],
      districtId: nyamiramboSector.districtId,
      provinceId: nyamiramboSector.districtRel.provinceId,
      products: [
        { name: "Kinazi Premium Cassava Flour (5kg)", nameRw: "Ifu y'Ubatsinda ya Kinazi (Ibiro 5)", price: 4200, unit: "bag", isAvailable: true },
        { name: "Sunflower Cooking Oil (1L)", nameRw: "Amavuta yo Guteka y'Ibihwagari (Litro 1)", price: 2400, unit: "bottle", isAvailable: true },
      ],
    },
    {
      id: "biz-7",
      name: "Biryogo Youth Woodcraft & Art Center",
      nameRw: "Ubukorikori n'Ubuhanzi bw'UrubRubyiruko Biryogo",
      category: "art_culture",
      categoryDisplay: "Art & Culture Centers",
      categoryDisplayRw: "Ubuhanzi & Umuco",
      description: "Handcrafted Imigongo decorative wall pieces, woven Agaseke baskets, hand-carved gorilla figurines, and bespoke coffee tables.",
      descriptionRw: "Bahanga imitako gakondo y'Imigongo, uduseke tw'amahoro twaboshywe n'amaboko, n'ibishushanyo bibajwe mu biti byiza.",
      phone: "+250788789012",
      whatsapp: "250788789012",
      sector: "Nyamirambo",
      district: "Nyarugenge",
      cell: "Biryogo",
      addressNote: "Biryogo Culture Corner, near Green Mosque",
      latitude: -1.9770,
      longitude: 30.0505,
      verificationStatus: VerificationStatus.HIGH_CONFIDENCE,
      dataStatus: DataStatus.VERIFIED,
      source: "AGENT_FIELD_AUDIT",
      priceRange: "MODERATE",
      coverImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
      sectorId: nyamiramboSector.id,
      cellId: cellsMap["Biryogo"],
      districtId: nyamiramboSector.districtId,
      provinceId: nyamiramboSector.districtRel.provinceId,
      products: [
        { name: "Traditional Imigongo Wall Art (Medium)", nameRw: "Umutako w'Imigongo (Uringaniye)", price: 18000, unit: "piece", isAvailable: true },
        { name: "Woven Agaseke Peace Basket", nameRw: "Agaseke k'Amahoro Kaboshywe Neza", price: 7500, unit: "piece", isAvailable: true },
      ],
    },
    {
      id: "biz-8",
      name: "Mumena Stadium Agro-Produce Stall",
      nameRw: "Ibiribwa n'Imboga bya Mumena",
      category: "agriculture_produce",
      categoryDisplay: "Fresh Produce & Farmers",
      categoryDisplayRw: "Umusaruro w'Ubuhinzi & Imboga",
      description: "Fresh farm produce straight from Musanze and Bugesera: tree tomatoes (Ibinyomoro), sweet pineapples, green bananas, and red onions.",
      descriptionRw: "Ibinyomoro bishya, inanasi ziryoshye ziva i Bugesera, ibitoki by'amazi, n'ibitunguru bitukura.",
      phone: "+250788890123",
      whatsapp: "250788890123",
      sector: "Nyamirambo",
      district: "Nyarugenge",
      cell: "Mumena",
      addressNote: "Mumena Stadium Gate 2 Market Strip",
      latitude: -1.9880,
      longitude: 30.0495,
      verificationStatus: VerificationStatus.AGENT_VERIFIED,
      dataStatus: DataStatus.VERIFIED,
      source: "AGENT_FIELD_AUDIT",
      priceRange: "LOW",
      coverImage: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=60",
      sectorId: nyamiramboSector.id,
      cellId: cellsMap["Mumena"],
      districtId: nyamiramboSector.districtId,
      provinceId: nyamiramboSector.districtRel.provinceId,
      products: [
        { name: "Tree Tomatoes / Ibinyomoro (1kg)", nameRw: "Ibinyomoro Byijimye (Ikiro 1)", price: 1500, unit: "kg", isAvailable: true },
        { name: "Cooking Bananas / Matooke (Bunch)", nameRw: "Igitoki cy'Inyamunyo Cyiza", price: 6500, unit: "bunch", isAvailable: true },
      ],
    },
  ];

  for (const b of additionalNyamirambo) {
    const { products, ...bizData } = b;
    await prisma.business.upsert({
      where: { id: b.id },
      update: {
        ...bizData,
      },
      create: {
        ...bizData,
      },
    });

    for (const p of products) {
      await prisma.product.create({
        data: {
          businessId: b.id,
          name: p.name,
          nameRw: p.nameRw,
          price: p.price,
          currency: "RWF",
          unit: p.unit,
          isAvailable: true,
          dataStatus: DataStatus.VERIFIED,
        },
      });
    }
  }

  console.log("✓ Seeded biz-5 to biz-8 in Nyamirambo!");
  await prisma.$disconnect();
}

main().catch(console.error);
