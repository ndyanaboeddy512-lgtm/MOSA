import { PrismaClient, Role, VerificationStatus, DocumentType } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log("🌱 Starting MOSA PostgreSQL database seeding...");

  // 1. Seed Core Users
  const usersData = [
    {
      id: "user-super-admin",
      phone: "+250788000001",
      name: "Diane Uwera",
      role: Role.SUPER_ADMIN,
      community: "Kigali Central",
      points: 1500,
      badges: ["Super Administrator", "Governance Lead"],
      referralCode: "MOSA-ADM-01",
      language: "rw",
    },
    {
      id: "user-comm-admin",
      phone: "+250788000002",
      name: "Patrick Ndayisaba",
      role: Role.COMMUNITY_ADMIN,
      community: "Nyamirambo Sector",
      assignedCell: "Nyamirambo",
      points: 850,
      badges: ["Sector Lead", "Community Organizer"],
      referralCode: "MOSA-SEC-02",
      language: "rw",
    },
    {
      id: "agent-1",
      phone: "+250788000003",
      name: "Emmanuel Hakizimana",
      role: Role.COMMUNITY_AGENT,
      community: "Biryogo",
      assignedCell: "Biryogo & Cosmos",
      points: 420,
      badges: ["Certified Agent", "Local Scout", "Quality Rank #1"],
      referralCode: "MOSA-BIR-77",
      language: "rw",
    },
    {
      id: "user-owner-1",
      phone: "+250788123456",
      name: "Kevine Mukashyaka",
      role: Role.BUSINESS_OWNER,
      community: "Biryogo Car-Free Zone",
      points: 210,
      badges: ["Verified Business Owner", "Early Pioneer"],
      referralCode: "MOSA-OWN-01",
      language: "rw",
    },
    {
      id: "user-customer-1",
      phone: "+250788999888",
      name: "Jean-Paul Mugisha",
      role: Role.CUSTOMER,
      community: "Cosmos, Nyamirambo",
      points: 120,
      badges: ["Neighborhood Explorer", "Top Reviewer"],
      referralCode: "MOSA-RES-99",
      language: "rw",
    },
    {
      id: "user-mod-1",
      phone: "+250788555444",
      name: "Clarisse Keza",
      role: Role.MODERATOR,
      community: "Rwezamenyo",
      points: 390,
      badges: ["Trust Guardian", "Fact Checker"],
      referralCode: "MOSA-MOD-55",
      language: "rw",
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { phone: u.phone },
      update: {
        name: u.name,
        role: u.role,
        points: u.points,
        badges: u.badges,
        language: u.language,
      },
      create: u,
    });
  }
  console.log(`✓ Seeded ${usersData.length} core platform users`);

  // 2. Seed Community Hub: Nyamirambo
  const community = await prisma.community.upsert({
    where: { id: "comm-nyamirambo" },
    update: {},
    create: {
      id: "comm-nyamirambo",
      name: "Nyamirambo Urban Hub",
      nameRw: "Umurenge wa Nyamirambo",
      country: "Rwanda",
      province: "Kigali City",
      district: "Nyarugenge",
      sector: "Nyamirambo",
      cell: "Biryogo",
      latitude: -1.981,
      longitude: 30.046,
    },
  });
  console.log("✓ Seeded community hub: Nyamirambo");

  // 3. Seed Micro-Enterprises with verified products in RWF
  const businesses = [
    {
      id: "biz-1",
      name: "Salon Nova Style Biryogo",
      nameRw: "Salo Nova Style Biryogo",
      nameFr: "Salon Nova Style Biryogo",
      nameSw: "Saluni Nova Style Biryogo",
      category: "salon_barber",
      categoryDisplay: "Salons & Barbers",
      categoryDisplayRw: "Za Salo & Kogosha",
      description: "Specialized in modern African haircuts, fade designs, dreadlocks retwisting, beard grooming, and hair wash.",
      descriptionRw: "Bamenyereye kogosha imisatsi y'ubwoko bwose, gufunga dreadlocks, gusukura ubwanwa, no gukaraba mu mutwe.",
      phone: "+250788123456",
      whatsapp: "250788123456",
      cell: "Biryogo",
      sector: "Nyamirambo",
      district: "Nyarugenge",
      addressNote: "Opposite Green Tea Corner, 2nd door on the right",
      latitude: -1.9774,
      longitude: 30.0482,
      verificationStatus: VerificationStatus.HIGH_CONFIDENCE,
      isOpenNow: true,
      priceRange: "LOW",
      coverImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=60",
      ownerId: "user-owner-1",
      agentId: "agent-1",
      products: [
        { name: "Standard Haircut (Fade / Normal)", nameRw: "Kogosha Bisanzwe", price: 2000, category: "Haircut" },
        { name: "Beard Trim & Hot Towel Treatment", nameRw: "Kogosha Ubwanwa no Kwisiga", price: 1000, category: "Grooming" },
        { name: "Dreadlocks Washing & Retwisting", nameRw: "Gufunga no Koza Dreadlocks", price: 8000, category: "Haircare" },
      ],
    },
    {
      id: "biz-2",
      name: "Atelier de Couture Umwiza",
      nameRw: "Atelier y'Abadozi Umwiza",
      nameFr: "Atelier de Couture Umwiza",
      nameSw: "Karakhana ya Ushonaji Umwiza",
      category: "tailor_crafts",
      categoryDisplay: "Tailors & Craftsmen",
      categoryDisplayRw: "Abadozi & Ubukorikori",
      description: "Expert tailors creating customized Kitenge garments, African suits, school uniforms, and swift emergency zipper repairs.",
      descriptionRw: "Abadozi b'inararibonye badoda ibitenge bigezweho, amakositimu, imyenda y'ishuri, no gusana imyenda yacitse vuba na bwangu.",
      phone: "+250788234567",
      whatsapp: "250788234567",
      cell: "Biryogo",
      sector: "Nyamirambo",
      district: "Nyarugenge",
      addressNote: "Next to Cosmos Pharmacie, green gate",
      latitude: -1.981,
      longitude: 30.046,
      verificationStatus: VerificationStatus.AGENT_VERIFIED,
      isOpenNow: true,
      priceRange: "MODERATE",
      coverImage: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop&q=60",
      agentId: "agent-1",
      products: [
        { name: "Kitenge Modern Dress Tailoring", nameRw: "Kudoda Ikanzu y'Igitenge", price: 14000, category: "Tailoring" },
        { name: "Zipper Replacement / Emergency Hem", nameRw: "Guteraho Umushumi w'Iserire", price: 1500, category: "Alterations" },
        { name: "Men's Traditional Shirt Tailoring", nameRw: "Kudoda Ishati y'Igitenge y'Abagabo", price: 10000, category: "Tailoring" },
      ],
    },
    {
      id: "biz-3",
      name: "Cosmos Tech & Phone Clinic",
      nameRw: "Ibyuma & Gusana Telefone Cosmos",
      nameFr: "Cosmos Réparation Téléphones & High-Tech",
      nameSw: "Ukarabati wa Simu Cosmos",
      category: "phone_electronics",
      categoryDisplay: "Phone & Electronics Repair",
      categoryDisplayRw: "Gusana Telefone & Ibikoresho",
      description: "Fast diagnostics and micro-soldering for Android and iPhones. Broken screens, charging pins, speaker issues, and battery replacement.",
      descriptionRw: "Gusana no gusimbuza ecran za telefone zamenetse, guhindura ama bateri, n'ibindi byuma bya telefone mu buryo bwizewe.",
      phone: "+250788345678",
      whatsapp: "250788345678",
      cell: "Biryogo",
      sector: "Nyamirambo",
      district: "Nyarugenge",
      addressNote: "Beside Cosmos Commercial Center, Shop #4",
      latitude: -1.9815,
      longitude: 30.0465,
      verificationStatus: VerificationStatus.COMMUNITY_VERIFIED,
      isOpenNow: true,
      priceRange: "MODERATE",
      coverImage: "https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?w=800&auto=format&fit=crop&q=60",
      agentId: "agent-1",
      products: [
        { name: "Type-C / Micro Charging Port Replacement", nameRw: "Guhindura Umunwa wo Gucagingiraho", price: 4500, category: "Hardware" },
        { name: "Original Android Screen Assembly", nameRw: "Gusimbuza Ecran y'Umwimerere", price: 18000, category: "Screens" },
        { name: "Tempered Glass Screen Protector + Fitting", nameRw: "Ikirahure cyo Kurinda Ecran", price: 2000, category: "Accessories" },
      ],
    },
    {
      id: "biz-4",
      name: "Kivugiza Fresh Milk & Chapati Corner",
      nameRw: "Amata Meza & Chapati Kivugiza",
      nameFr: "Kivugiza Lait Frais & Chapati Chaud",
      nameSw: "Kivugiza Maziwa Safi & Chapati",
      category: "food_restaurant",
      categoryDisplay: "Food & Milk Bars",
      categoryDisplayRw: "Ibiryo & Amamata",
      description: "Authentic Rwandan milk bar serving fresh boiled Nyagatare milk, traditional spiced tea, hot layered chapatis, and boiled eggs.",
      descriptionRw: "Akabari k'amata gatanga amata meza yatetse aturuka i Nyagatare, icyayi cy'amazi, chapati zishyushye, n'amagi atetse.",
      phone: "+250788456789",
      whatsapp: "250788456789",
      cell: "Mumena",
      sector: "Nyamirambo",
      district: "Nyarugenge",
      addressNote: "Kivugiza Junction near Mumena Primary Gate",
      latitude: -1.992,
      longitude: 30.048,
      verificationStatus: VerificationStatus.HIGH_CONFIDENCE,
      isOpenNow: true,
      priceRange: "LOW",
      coverImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
      agentId: "agent-1",
      products: [
        { name: "Fresh Boiled Cow Milk (1 Cup)", nameRw: "Igikombe cy'Amata y'Inka Yatetse", price: 500, category: "Beverages" },
        { name: "Hot Layered Chapati", nameRw: "Chapati Ishyushye y'Urupapuro", price: 300, category: "Snacks" },
        { name: "Spiced African Ginger Tea (Icyayi cy'Amazi)", nameRw: "Icyayi cy'Amazi kirimo Tangawizi", price: 300, category: "Beverages" },
      ],
    },
  ];

  for (const b of businesses) {
    const { products, ...bizDetails } = b;
    const createdBiz = await prisma.business.upsert({
      where: { id: b.id },
      update: bizDetails,
      create: {
        ...bizDetails,
        communityId: community.id,
      },
    });

    for (const p of products) {
      await prisma.product.create({
        data: {
          businessId: createdBiz.id,
          name: p.name,
          nameRw: p.nameRw,
          price: p.price,
          currency: "RWF",
          category: p.category,
          extractedFrom: DocumentType.PRICE_BOARD,
          verifiedByAgent: true,
        },
      });
    }
  }
  console.log(`✓ Seeded ${businesses.length} micro-enterprises with verified products`);

  // 4. Seed Community Demands (Economic Intelligence Radar)
  const demands = [
    {
      id: "dem-1",
      communityId: community.id,
      sector: "Nyamirambo",
      cell: "Biryogo",
      category: "phone_electronics",
      queryTerm: "Phone screen replacement",
      queryTermRw: "Gusana ecran ya telefone",
      searchCount: 38,
      activeBusinessesCount: 2,
      opportunityScore: "VERY_HIGH",
    },
    {
      id: "dem-2",
      communityId: community.id,
      sector: "Nyamirambo",
      cell: "Mumena",
      category: "services",
      queryTerm: "Emergency electrician near Stadium",
      queryTermRw: "Umunyamashanyarazi wihuta hafi ya Sitade",
      searchCount: 29,
      activeBusinessesCount: 1,
      opportunityScore: "VERY_HIGH",
    },
  ];

  for (const d of demands) {
    await prisma.communityDemand.upsert({
      where: { id: d.id },
      update: d,
      create: d,
    });
  }
  console.log("✓ Seeded community demand radar signals");

  // 5. Seed Community Missions
  const missions = [
    {
      id: "mis-1",
      title: "Discover a Hidden Tailor in Biryogo",
      titleRw: "Vumbura Umudozi Wihishe i Biryogo",
      description: "Find an unlisted neighborhood tailor, snap their storefront sign, and record their location.",
      descriptionRw: "Shakisha umudozi utarandikwa mu gace kawe, ufate ifoto y'icyapa cye, maze wandike aho akorera.",
      targetArea: "Biryogo",
      pointsReward: 50,
      badgeReward: "Neighborhood Explorer",
      category: "DISCOVER",
    },
    {
      id: "mis-2",
      title: "Verify Opening Hours at Cosmos Junction",
      titleRw: "Suzuma Amasaha yo Gufungura Kuri Cosmos",
      description: "Visit 2 shops around Cosmos roundabout and confirm their displayed opening times.",
      descriptionRw: "Sura amaduka 2 akorera kuri Cosmos wemeze niba amasaha agaragazwa ku muryango ahura n'ukuri.",
      targetArea: "Cosmos",
      pointsReward: 30,
      badgeReward: "Community Helper",
      category: "VERIFY",
    },
  ];

  for (const m of missions) {
    await prisma.mission.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
  }
  console.log("✓ Seeded community missions");

  // 6. Record Initial Audit Log Entry
  await prisma.auditLog.create({
    data: {
      action: "DATABASE_SEEDED",
      entityType: "SYSTEM",
      entityId: "SYSTEM_INITIAL_SEED",
      metadata: JSON.stringify({ environment: process.env.NODE_ENV || "development", hub: "Nyamirambo" }),
    },
  });

  console.log("✅ Seeding completed successfully!");
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error("Seeding error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
