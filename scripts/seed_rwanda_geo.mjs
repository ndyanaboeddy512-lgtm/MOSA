import { PrismaClient, Role, VerificationStatus, DataStatus, PriceType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== SEEDING RWANDA-WIDE GEOGRAPHIC HIERARCHY & TEST DATASET ===");

  // 1. PROVINCES (5)
  const provincesData = [
    { code: "KIGALI", name: "City of Kigali", nameRw: "Umujyi wa Kigali" },
    { code: "NORTH", name: "Northern Province", nameRw: "Intara y'Amajyaruguru" },
    { code: "SOUTH", name: "Southern Province", nameRw: "Intara y'Amajyepfo" },
    { code: "EAST", name: "Eastern Province", nameRw: "Intara y'Iburasirazuba" },
    { code: "WEST", name: "Western Province", nameRw: "Intara y'Iburengerazuba" },
  ];

  const provinces = {};
  for (const prov of provincesData) {
    const p = await prisma.geographicProvince.upsert({
      where: { code: prov.code },
      update: { name: prov.name, nameRw: prov.nameRw },
      create: prov,
    });
    provinces[prov.code] = p;
  }
  console.log(`✓ Seeded ${Object.keys(provinces).length} Provinces`);

  // 2. DISTRICTS
  const districtsData = [
    { code: "GASABO", provinceCode: "KIGALI", name: "Gasabo", nameRw: "Gasabo", latitude: -1.9355, longitude: 30.0880 },
    { code: "NYARUGENGE", provinceCode: "KIGALI", name: "Nyarugenge", nameRw: "Nyarugenge", latitude: -1.9810, longitude: 30.0460 },
    { code: "KICUKIRO", provinceCode: "KIGALI", name: "Kicukiro", nameRw: "Kicukiro", latitude: -1.9700, longitude: 30.1000 },
    { code: "MUSANZE", provinceCode: "NORTH", name: "Musanze", nameRw: "Musanze", latitude: -1.4998, longitude: 29.6342 },
    { code: "GICUMBI", provinceCode: "NORTH", name: "Gicumbi", nameRw: "Gicumbi", latitude: -1.5760, longitude: 30.0680 },
    { code: "HUYE", provinceCode: "SOUTH", name: "Huye", nameRw: "Huye", latitude: -2.5974, longitude: 29.7391 },
    { code: "MUHANGA", provinceCode: "SOUTH", name: "Muhanga", nameRw: "Muhanga", latitude: -2.0790, longitude: 29.7560 },
    { code: "RWAMAGANA", provinceCode: "EAST", name: "Rwamagana", nameRw: "Rwamagana", latitude: -1.9486, longitude: 30.4348 },
    { code: "BUGESERA", provinceCode: "EAST", name: "Bugesera", nameRw: "Bugesera", latitude: -2.1600, longitude: 30.0900 },
    { code: "RUBAVU", provinceCode: "WEST", name: "Rubavu", nameRw: "Rubavu", latitude: -1.6763, longitude: 29.2602 },
    { code: "RUSIZI", provinceCode: "WEST", name: "Rusizi", nameRw: "Rusizi", latitude: -2.4830, longitude: 28.8980 },
  ];

  const districts = {};
  for (const dist of districtsData) {
    const d = await prisma.geographicDistrict.upsert({
      where: { code: dist.code },
      update: { name: dist.name, nameRw: dist.nameRw, latitude: dist.latitude, longitude: dist.longitude },
      create: {
        code: dist.code,
        provinceId: provinces[dist.provinceCode].id,
        name: dist.name,
        nameRw: dist.nameRw,
        latitude: dist.latitude,
        longitude: dist.longitude,
      },
    });
    districts[dist.code] = d;
  }
  console.log(`✓ Seeded ${Object.keys(districts).length} Districts`);

  // 3. SECTORS
  const sectorsData = [
    {
      code: "KACYIRU",
      districtCode: "GASABO",
      name: "Kacyiru",
      nameRw: "Kacyiru",
      latitude: -1.9355,
      longitude: 30.0880,
      description: "Administrative, institutional and residential hub of Kigali with emerging micro-enterprises and agro-services near MINAGRI.",
    },
    {
      code: "NYAMIRAMBO",
      districtCode: "NYARUGENGE",
      name: "Nyamirambo",
      nameRw: "Nyamirambo",
      latitude: -1.9810,
      longitude: 30.0460,
      description: "Historic commercial, cultural and culinary heart of Kigali with dense artisanal, tailoring, and salon networks.",
    },
    {
      code: "MUHOZA",
      districtCode: "MUSANZE",
      name: "Muhoza",
      nameRw: "Muhoza",
      latitude: -1.4998,
      longitude: 29.6342,
      description: "Northern commercial center, agricultural marketplace and tourism gateway.",
    },
    {
      code: "NGOMA",
      districtCode: "HUYE",
      name: "Ngoma",
      nameRw: "Ngoma",
      latitude: -2.5974,
      longitude: 29.7391,
      description: "Southern cultural, educational, and artisanal carpentry cluster.",
    },
    {
      code: "GISENYI",
      districtCode: "RUBAVU",
      name: "Gisenyi",
      nameRw: "Gisenyi",
      latitude: -1.6763,
      longitude: 29.2602,
      description: "Western lakefront commercial hub with cross-border trade, fisheries and hospitality.",
    },
    {
      code: "KIGABIRO",
      districtCode: "RWAMAGANA",
      name: "Kigabiro",
      nameRw: "Kigabiro",
      latitude: -1.9486,
      longitude: 30.4348,
      description: "Eastern transport crossroads and regional agricultural produce market.",
    },
  ];

  const sectors = {};
  for (const sec of sectorsData) {
    const s = await prisma.geographicSector.upsert({
      where: { code: sec.code },
      update: { name: sec.name, nameRw: sec.nameRw, latitude: sec.latitude, longitude: sec.longitude, description: sec.description },
      create: {
        code: sec.code,
        districtId: districts[sec.districtCode].id,
        name: sec.name,
        nameRw: sec.nameRw,
        latitude: sec.latitude,
        longitude: sec.longitude,
        description: sec.description,
      },
    });
    sectors[sec.code] = s;
  }
  console.log(`✓ Seeded ${Object.keys(sectors).length} Focus Sectors`);

  // 4. CELLS
  const cellsData = [
    // Kacyiru Sector cells
    { sectorCode: "KACYIRU", name: "Kamutwa", nameRw: "Kamutwa", latitude: -1.9365, longitude: 30.0868 },
    { sectorCode: "KACYIRU", name: "Kibaza", nameRw: "Kibaza", latitude: -1.9342, longitude: 30.0915 },
    { sectorCode: "KACYIRU", name: "Kamatamu", nameRw: "Kamatamu", latitude: -1.9388, longitude: 30.0835 },

    // Nyamirambo Sector cells
    { sectorCode: "NYAMIRAMBO", name: "Biryogo", nameRw: "Biryogo", latitude: -1.9790, longitude: 30.0520 },
    { sectorCode: "NYAMIRAMBO", name: "Rwezamenyo", nameRw: "Rwezamenyo", latitude: -1.9750, longitude: 30.0480 },
    { sectorCode: "NYAMIRAMBO", name: "Mumena", nameRw: "Mumena", latitude: -1.9850, longitude: 30.0410 },

    // Muhoza cells
    { sectorCode: "MUHOZA", name: "Ruhengeri", nameRw: "Ruhengeri", latitude: -1.5000, longitude: 29.6350 },
    { sectorCode: "MUHOZA", name: "Cyivugiza", nameRw: "Cyivugiza", latitude: -1.4980, longitude: 29.6320 },

    // Ngoma cells
    { sectorCode: "NGOMA", name: "Matyazo", nameRw: "Matyazo", latitude: -2.5980, longitude: 29.7400 },
    { sectorCode: "NGOMA", name: "Ngoma", nameRw: "Ngoma", latitude: -2.5960, longitude: 29.7380 },

    // Gisenyi cells
    { sectorCode: "GISENYI", name: "Kivumu", nameRw: "Kivumu", latitude: -1.6780, longitude: 29.2610 },
    { sectorCode: "GISENYI", name: "Mbugangari", nameRw: "Mbugangari", latitude: -1.6740, longitude: 29.2580 },
  ];

  const cells = {};
  for (const c of cellsData) {
    const key = `${c.sectorCode}_${c.name.toUpperCase()}`;
    const cell = await prisma.geographicCell.upsert({
      where: {
        sectorId_name: {
          sectorId: sectors[c.sectorCode].id,
          name: c.name,
        },
      },
      update: { nameRw: c.nameRw, latitude: c.latitude, longitude: c.longitude },
      create: {
        sectorId: sectors[c.sectorCode].id,
        name: c.name,
        nameRw: c.nameRw,
        latitude: c.latitude,
        longitude: c.longitude,
      },
    });
    cells[key] = cell;
  }
  console.log(`✓ Seeded ${Object.keys(cells).length} Cells across sectors`);

  // 5. LOCAL AREAS & LANDMARKS
  const localAreasData = [
    // Kamutwa, Kacyiru
    {
      sectorCode: "KACYIRU",
      cellKey: "KACYIRU_KAMUTWA",
      name: "MINAGRI Area (KG 569 St)",
      nameRw: "Agace ka MINAGRI (KG 569 St)",
      type: "LANDMARK",
      landmark: "Ministry of Agriculture and Animal Resources (KG 569 St)",
      addressNote: "KG 569 St, near MINAGRI Head Office",
      latitude: -1.9365,
      longitude: 30.0868,
    },
    {
      sectorCode: "KACYIRU",
      cellKey: "KACYIRU_KAMUTWA",
      name: "Boulevard de l'Umuganda Corridor",
      nameRw: "Umuhanda wa Boulevard de l'Umuganda",
      type: "CORRIDOR",
      landmark: "Near Kigali Public Library & Embassies",
      addressNote: "KG 7 Ave / Blvd de l'Umuganda",
      latitude: -1.9335,
      longitude: 30.0890,
    },
    // Kibaza, Kacyiru
    {
      sectorCode: "KACYIRU",
      cellKey: "KACYIRU_KIBAZA",
      name: "Kibaza Commercial Strip",
      nameRw: "Agace k'Ubucuruzi i Kibaza",
      type: "COMMERCIAL_HUB",
      landmark: "Kibaza Market & Primary School",
      addressNote: "KG 554 St",
      latitude: -1.9342,
      longitude: 30.0915,
    },
    // Kamatamu, Kacyiru
    {
      sectorCode: "KACYIRU",
      cellKey: "KACYIRU_KAMATAMU",
      name: "Kamatamu Artisanal Alley",
      nameRw: "Ubukorikori bwa Kamatamu",
      type: "LOCALITY",
      landmark: "Kamatamu Workshops & Metalwork",
      addressNote: "KG 515 St",
      latitude: -1.9388,
      longitude: 30.0835,
    },
    // Biryogo, Nyamirambo
    {
      sectorCode: "NYAMIRAMBO",
      cellKey: "NYAMIRAMBO_BIRYOGO",
      name: "Biryogo Car-Free Zone",
      nameRw: "Agace k'Abanyamaguru i Biryogo",
      type: "COMMERCIAL_HUB",
      landmark: "Biryogo Green Walkway",
      addressNote: "Biryogo Street",
      latitude: -1.9785,
      longitude: 30.0515,
    },
    {
      sectorCode: "NYAMIRAMBO",
      cellKey: "NYAMIRAMBO_BIRYOGO",
      name: "Cosmos Commercial Center",
      nameRw: "Hagati i Cosmos",
      type: "COMMERCIAL_HUB",
      landmark: "Cosmos Bar & Mosque",
      addressNote: "Cosmos Junction",
      latitude: -1.9802,
      longitude: 30.0475,
    },
  ];

  const localAreas = {};
  for (const la of localAreasData) {
    const cellId = cells[la.cellKey]?.id || null;
    const area = await prisma.localArea.create({
      data: {
        sectorId: sectors[la.sectorCode].id,
        cellId,
        name: la.name,
        nameRw: la.nameRw,
        type: la.type,
        landmark: la.landmark,
        addressNote: la.addressNote,
        latitude: la.latitude,
        longitude: la.longitude,
      },
    });
    localAreas[la.name] = area;
  }
  console.log(`✓ Seeded ${Object.keys(localAreas).length} Local Areas and Discovery Landmarks`);

  // 6. COMMUNITY AGENTS & GEOGRAPHIC ASSIGNMENTS
  const agentAlice = await prisma.user.upsert({
    where: { phone: "+250788000004" },
    update: {
      community: "Kacyiru",
      assignedCell: "Kamutwa & MINAGRI Area",
    },
    create: {
      phone: "+250788000004",
      name: "Alice Mukamana",
      role: Role.COMMUNITY_AGENT,
      language: "rw",
      community: "Kacyiru",
      assignedCell: "Kamutwa & MINAGRI Area",
      points: 460,
      badges: ["Certified Agent", "Kacyiru Field Scout", "Agro-Discovery Lead"],
      referralCode: "MOSA-KAC-12",
    },
  });

  // Assign Alice to Kacyiru -> Kamutwa
  await prisma.agentAssignment.create({
    data: {
      userId: agentAlice.id,
      sectorId: sectors["KACYIRU"].id,
      cellId: cells["KACYIRU_KAMUTWA"].id,
      status: "ACTIVE",
    },
  });

  // Ensure Nyamirambo agent Emmanuel is also assigned
  const agentEmmanuel = await prisma.user.findFirst({ where: { phone: "+250788000003" } });
  if (agentEmmanuel) {
    await prisma.agentAssignment.create({
      data: {
        userId: agentEmmanuel.id,
        sectorId: sectors["NYAMIRAMBO"].id,
        cellId: cells["NYAMIRAMBO_BIRYOGO"].id,
        status: "ACTIVE",
      },
    }).catch(() => {});
  }
  console.log("✓ Certified Community Agents assigned to jurisdictions (Kacyiru & Nyamirambo)");

  // 7. BACKWARDS COMPATIBILITY: Update existing Nyamirambo businesses with relational links
  await prisma.business.updateMany({
    where: { sector: "Nyamirambo" },
    data: {
      provinceId: provinces["KIGALI"].id,
      districtId: districts["NYARUGENGE"].id,
      sectorId: sectors["NYAMIRAMBO"].id,
      dataStatus: DataStatus.VERIFIED,
      source: "AGENT_FIELD_AUDIT",
    },
  });
  console.log("✓ Preserved existing Nyamirambo businesses and attached relational geography");

  // 8. SEED REPRESENTATIVE KACYIRU BUSINESSES (Clearly marked as DEMO, with estimated prices)
  const kacyiruBusinesses = [
    {
      id: "biz-kac-1",
      name: "MINAGRI Farmers Coffee & Milk Point",
      nameRw: "Icyayi n'Amata by'Abahinzi MINAGRI",
      category: "food_restaurant",
      categoryDisplay: "Coffee, Milk & Snacks",
      categoryDisplayRw: "Kawa, Amata & Ibyo Kurya Byihuse",
      description: "Convenient neighborhood milk bar and coffee spot serving agro-extension workers and residents on KG 569 St.",
      descriptionRw: "Icyayi cy'amazi, amata meza n'igikoma bihorana ubushyuhe hafi ya MINAGRI kuri KG 569 St.",
      phone: "+250780000011 (Demo)",
      whatsapp: "+250780000011",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "LOW",
      priceRangeMin: 300,
      priceRangeMax: 1500,
      provinceId: provinces["KIGALI"].id,
      districtId: districts["GASABO"].id,
      sectorId: sectors["KACYIRU"].id,
      cellId: cells["KACYIRU_KAMUTWA"].id,
      localAreaId: localAreas["MINAGRI Area (KG 569 St)"]?.id,
      cell: "Kamutwa",
      sector: "Kacyiru",
      district: "Gasabo",
      addressNote: "KG 569 St, directly opposite MINAGRI gate",
      latitude: -1.9366,
      longitude: 30.0867,
      coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.COMMUNITY_VERIFIED,
      agentId: agentAlice.id,
      products: [
        { name: "Fresh Boiled Cow Milk (Cup)", nameRw: "Igikombe cy'Amata y'Inka Yatetse", price: 500, priceMin: 400, priceMax: 600, priceType: PriceType.RANGE, isEstimated: true, unit: "cup" },
        { name: "Hot Spiced Ginger Tea (Icyayi cy'Amazi)", nameRw: "Icyayi cy'Amazi kirimo Tangawizi", price: 300, priceMin: 300, priceMax: 500, priceType: PriceType.RANGE, isEstimated: true, unit: "cup" },
        { name: "Hot Layered Chapati", nameRw: "Chapati Ishyushye", price: 300, priceMin: 250, priceMax: 350, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
        { name: "Farm Fresh Boiled Egg", nameRw: "Igi Ryatetswe", price: 250, priceMin: 200, priceMax: 300, priceType: PriceType.RANGE, isEstimated: true, unit: "item" },
      ],
    },
    {
      id: "biz-kac-2",
      name: "Kacyiru Agro-Veterinary & Seed Supply",
      nameRw: "Ubucuruzi bw'Inyongeramusaruro n'Imbuto Kacyiru",
      category: "agriculture_produce",
      categoryDisplay: "Agro-Inputs & Vet Supplies",
      categoryDisplayRw: "Inyongeramusaruro & Imiti y'Amatungo",
      description: "Certified agricultural inputs shop supporting urban gardens and peri-urban vegetable and livestock farmers.",
      descriptionRw: "Amaduka y'imbuto zizewe, ifumbire, ibiryo by'amatungo n'imiti y'ubuhinzi.",
      phone: "+250780000012 (Demo)",
      whatsapp: "+250780000012",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "MODERATE",
      priceRangeMin: 1500,
      priceRangeMax: 25000,
      provinceId: provinces["KIGALI"].id,
      districtId: districts["GASABO"].id,
      sectorId: sectors["KACYIRU"].id,
      cellId: cells["KACYIRU_KAMUTWA"].id,
      localAreaId: localAreas["MINAGRI Area (KG 569 St)"]?.id,
      cell: "Kamutwa",
      sector: "Kacyiru",
      district: "Gasabo",
      addressNote: "KG 569 St, Commercial Arcade Unit 3",
      latitude: -1.9368,
      longitude: 30.0864,
      coverImage: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.UNVERIFIED,
      agentId: agentAlice.id,
      products: [
        { name: "Certified Hybrid Maize Seed (2kg)", nameRw: "Imbuto y'Ibigori Yemejwe (2kg)", price: 4000, priceMin: 3500, priceMax: 4500, priceType: PriceType.RANGE, isEstimated: true, unit: "2kg pack" },
        { name: "Organic Bio-Fertilizer (5kg bag)", nameRw: "Ifumbire y'Umwimerere (5kg)", price: 9000, priceMin: 8000, priceMax: 10500, priceType: PriceType.RANGE, isEstimated: true, unit: "bag" },
        { name: "Livestock Dewormer Solution (100ml)", nameRw: "Umuti w'Inzoka z'Amatungo (100ml)", price: 3200, priceMin: 2800, priceMax: 3600, priceType: PriceType.RANGE, isEstimated: true, unit: "bottle" },
        { name: "Knapsack Sprayer Nozzle Replacement", nameRw: "Umunwa w'Igitereko cyo Gutera Imiti", price: 1500, priceMin: 1200, priceMax: 1800, priceType: PriceType.RANGE, isEstimated: true, unit: "item" },
      ],
    },
    {
      id: "biz-kac-3",
      name: "Kacyiru Mobile & Solar Device Clinic",
      nameRw: "Ibyuma bya Telefone n'Imirasire y'Izuba Kacyiru",
      category: "phone_electronics",
      categoryDisplay: "Electronics & Solar Repairs",
      categoryDisplayRw: "Gusana Telefone & Imirasire y'Izuba",
      description: "Prompt electronic repairs, screen replacement, solar inverter diagnostics, and battery revival in Kibaza.",
      descriptionRw: "Gusana za telefone, amabateri, radiyo, n'ibikoresho by'imirasire y'izuba.",
      phone: "+250780000013 (Demo)",
      whatsapp: "+250780000013",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "MODERATE",
      priceRangeMin: 3000,
      priceRangeMax: 35000,
      provinceId: provinces["KIGALI"].id,
      districtId: districts["GASABO"].id,
      sectorId: sectors["KACYIRU"].id,
      cellId: cells["KACYIRU_KIBAZA"].id,
      localAreaId: localAreas["Kibaza Commercial Strip"]?.id,
      cell: "Kibaza",
      sector: "Kacyiru",
      district: "Gasabo",
      addressNote: "KG 554 St, near Kibaza Center",
      latitude: -1.9344,
      longitude: 30.0913,
      coverImage: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.UNVERIFIED,
      agentId: agentAlice.id,
      products: [
        { name: "Smartphone Screen Replacement (Grade A)", nameRw: "Guhindura Ekara ya Telefone", price: 25000, priceMin: 20000, priceMax: 35000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Solar Inverter Diagnostic & Fuse Repair", nameRw: "Kugenzura no Gusana Onduleri y'Imirasire", price: 8000, priceMin: 6000, priceMax: 12000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Fast USB-C / Lightning Cable", nameRw: "Umuheha wo Gusharija Byihuse", price: 3000, priceMin: 2500, priceMax: 4000, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
      ],
    },
    {
      id: "biz-kac-4",
      name: "Kibaza Modern Kitenge Couture",
      nameRw: "Ubudodo bwa Kitenge bugezweho Kibaza",
      category: "tailor_crafts",
      categoryDisplay: "Tailors & African Fashion",
      categoryDisplayRw: "Abadozi b'Imyenda n'Ibitenge",
      description: "Custom Kitenge designs, ceremonial wear, rapid alterations, and school uniform stitching.",
      descriptionRw: "Gudoda amakanzu n'amakoti y'igitenge, gusana imyenda yacitse no kuyigabanya.",
      phone: "+250780000014 (Demo)",
      whatsapp: "+250780000014",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "MODERATE",
      priceRangeMin: 2000,
      priceRangeMax: 28000,
      provinceId: provinces["KIGALI"].id,
      districtId: districts["GASABO"].id,
      sectorId: sectors["KACYIRU"].id,
      cellId: cells["KACYIRU_KIBAZA"].id,
      localAreaId: localAreas["Kibaza Commercial Strip"]?.id,
      cell: "Kibaza",
      sector: "Kacyiru",
      district: "Gasabo",
      addressNote: "KG 554 St, Atelier No. 7",
      latitude: -1.9340,
      longitude: 30.0918,
      coverImage: "https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.COMMUNITY_VERIFIED,
      agentId: agentAlice.id,
      products: [
        { name: "Tailored Kitenge Dress (Bespoke)", nameRw: "Ikanzu y'Igitenge Idodewe Umuntu", price: 18000, priceMin: 14000, priceMax: 25000, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
        { name: "Men's Tailored Pattern Shirt", nameRw: "Ishati y'Umugabo y'Igitenge", price: 12000, priceMin: 9000, priceMax: 15000, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
        { name: "Rapid Hem & Waist Alteration", nameRw: "Kugabanya cyangwa Gusana Igitenge", price: 2000, priceMin: 1500, priceMax: 2500, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
      ],
    },
    {
      id: "biz-kac-5",
      name: "Kamutwa Express Irembo & Secretarial Bureau",
      nameRw: "Irembo & Serivisi z'Inyandiko Kamutwa",
      category: "services",
      categoryDisplay: "Public & Document Services",
      categoryDisplayRw: "Serivisi z'Inyandiko n'Irembo",
      description: "Assisting residents and workers with online Irembo filings, document photocopies, laminations, and official applications.",
      descriptionRw: "Gusaba serivisi z'Irembo, gusoma fagitire, gukoporora inyandiko no gufata amafoto ya pasiporo.",
      phone: "+250780000015 (Demo)",
      whatsapp: "+250780000015",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "LOW",
      priceRangeMin: 200,
      priceRangeMax: 3000,
      provinceId: provinces["KIGALI"].id,
      districtId: districts["GASABO"].id,
      sectorId: sectors["KACYIRU"].id,
      cellId: cells["KACYIRU_KAMUTWA"].id,
      localAreaId: localAreas["MINAGRI Area (KG 569 St)"]?.id,
      cell: "Kamutwa",
      sector: "Kacyiru",
      district: "Gasabo",
      addressNote: "KG 569 St, near bus stop",
      latitude: -1.9363,
      longitude: 30.0870,
      coverImage: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.UNVERIFIED,
      agentId: agentAlice.id,
      products: [
        { name: "Irembo Application Assistance Fee", nameRw: "Gufasha Gusaba Serivisi kuri Irembo", price: 1000, priceMin: 500, priceMax: 1500, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Official Passport Photos (4 Prints)", nameRw: "Amafoto ya Pasiporo (4)", price: 2000, priceMin: 1500, priceMax: 2500, priceType: PriceType.RANGE, isEstimated: true, unit: "set" },
        { name: "Color Document Printing (per page)", nameRw: "Gucapa Inyandiko mu Mabara", price: 300, priceMin: 200, priceMax: 500, priceType: PriceType.RANGE, isEstimated: true, unit: "page" },
      ],
    },
    {
      id: "biz-kac-6",
      name: "Kamatamu Moto Garage & Metal Fabrication",
      nameRw: "Gusana Moto n'Ibyuma Kamatamu",
      category: "mechanic_repair",
      categoryDisplay: "Mechanics & Welding",
      categoryDisplayRw: "Abakanishi & Gusudira",
      description: "Quick turnaround motorcycle maintenance, tire changes, electric welding, and gate reinforcement in Kamatamu.",
      descriptionRw: "Gusana moto, guhindura amavuta, gusudira ibyuma n'inzugi zikomeye.",
      phone: "+250780000016 (Demo)",
      whatsapp: "+250780000016",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "MODERATE",
      priceRangeMin: 1500,
      priceRangeMax: 45000,
      provinceId: provinces["KIGALI"].id,
      districtId: districts["GASABO"].id,
      sectorId: sectors["KACYIRU"].id,
      cellId: cells["KACYIRU_KAMATAMU"].id,
      localAreaId: localAreas["Kamatamu Artisanal Alley"]?.id,
      cell: "Kamatamu",
      sector: "Kacyiru",
      district: "Gasabo",
      addressNote: "KG 515 St, Workshop #14",
      latitude: -1.9389,
      longitude: 30.0837,
      coverImage: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.UNVERIFIED,
      agentId: agentAlice.id,
      products: [
        { name: "Motorcycle Oil Change & Filter Clean", nameRw: "Guhindura Amavuta ya Moto", price: 2500, priceMin: 2000, priceMax: 3500, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Brake Shoe Replacement (Front/Rear)", nameRw: "Gushyiramo Fereri Nshya za Moto", price: 3500, priceMin: 3000, priceMax: 4500, priceType: PriceType.RANGE, isEstimated: true, unit: "pair" },
        { name: "Window Grill Metal Welding & Paint", nameRw: "Gukora Idirishya ry'Icyuma", price: 35000, priceMin: 28000, priceMax: 45000, priceType: PriceType.RANGE, isEstimated: true, unit: "window" },
      ],
    },
  ];

  for (const b of kacyiruBusinesses) {
    const { products, ...bizData } = b;
    const createdBiz = await prisma.business.upsert({
      where: { id: b.id },
      update: bizData,
      create: bizData,
    });

    if (products && products.length > 0) {
      for (const p of products) {
        await prisma.product.create({
          data: {
            businessId: createdBiz.id,
            name: p.name,
            nameRw: p.nameRw,
            price: p.price,
            priceMin: p.priceMin,
            priceMax: p.priceMax,
            priceType: p.priceType,
            isEstimated: p.isEstimated,
            currency: "RWF",
            unit: p.unit,
            dataStatus: DataStatus.DEMO,
            verifiedByAgent: false,
          },
        }).catch(() => {});
      }
    }
  }
  console.log(`✓ Seeded ${kacyiruBusinesses.length} Representative Kacyiru Businesses with estimated price ranges`);

  // 9. PROVINCIAL REPRESENTATIVE BUSINESSES (DEMO)
  const provincialBusinesses = [
    {
      id: "biz-mus-1",
      name: "Musanze Moto Spare & Service Garage",
      nameRw: "Ibyuma bya Moto & Garaje Musanze",
      category: "mechanic_repair",
      categoryDisplay: "Mechanics & Spares",
      categoryDisplayRw: "Abakanishi & Ibyuma bya Moto",
      description: "Reputable motorcycle repair and genuine spare parts shop in Ruhengeri town center.",
      phone: "+250780000021 (Demo)",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "MODERATE",
      priceRangeMin: 1500,
      priceRangeMax: 30000,
      provinceId: provinces["NORTH"].id,
      districtId: districts["MUSANZE"].id,
      sectorId: sectors["MUHOZA"].id,
      cellId: cells["MUHOZA_RUHENGERI"].id,
      cell: "Ruhengeri",
      sector: "Muhoza",
      district: "Musanze",
      addressNote: "Musanze Commercial Avenue",
      latitude: -1.4995,
      longitude: 29.6345,
      coverImage: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.UNVERIFIED,
    },
    {
      id: "biz-huy-1",
      name: "Huye Solid Wood & Furniture Workshop",
      nameRw: "Ububaji bw'Imbaho zikomeye Huye",
      category: "tailor_crafts",
      categoryDisplay: "Carpentry & Furniture",
      categoryDisplayRw: "Ububaji & Intebe z'Imbaho",
      description: "Custom hardwood study desks, kitchen stools, and bed frames handcrafted by local artisans.",
      phone: "+250780000022 (Demo)",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "PREMIUM",
      priceRangeMin: 8000,
      priceRangeMax: 85000,
      provinceId: provinces["SOUTH"].id,
      districtId: districts["HUYE"].id,
      sectorId: sectors["NGOMA"].id,
      cellId: cells["NGOMA_MATYAZO"].id,
      cell: "Matyazo",
      sector: "Ngoma",
      district: "Huye",
      addressNote: "Near University Road",
      latitude: -2.5978,
      longitude: 29.7395,
      coverImage: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.UNVERIFIED,
    },
    {
      id: "biz-rub-1",
      name: "Rubavu Lakeview Fresh Fish & Veg Depot",
      nameRw: "Isambaza z'Ikiyaga & Imboga Nshya Rubavu",
      category: "shop_retail",
      categoryDisplay: "Fresh Produce & Fish",
      categoryDisplayRw: "Ibyo Kurya & Isambaza Nshya",
      description: "Fresh Lake Kivu fish (Sambaza), fresh Irish potatoes from Gishwati, and seasonal vegetables.",
      phone: "+250780000023 (Demo)",
      dataStatus: DataStatus.DEMO,
      source: "SAMPLE_SEED",
      priceRange: "LOW",
      priceRangeMin: 1200,
      priceRangeMax: 8000,
      provinceId: provinces["WEST"].id,
      districtId: districts["RUBAVU"].id,
      sectorId: sectors["GISENYI"].id,
      cellId: cells["GISENYI_KIVUMU"].id,
      cell: "Kivumu",
      sector: "Gisenyi",
      district: "Rubavu",
      addressNote: "Lakefront Market Street",
      latitude: -1.6765,
      longitude: 29.2605,
      coverImage: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&auto=format&fit=crop&q=60",
      verificationStatus: VerificationStatus.UNVERIFIED,
    },
  ];

  for (const b of provincialBusinesses) {
    await prisma.business.upsert({
      where: { id: b.id },
      update: b,
      create: b,
    });
  }
  console.log(`✓ Seeded ${provincialBusinesses.length} Provincial Representative Businesses (Musanze, Huye, Rubavu)`);

  // 10. KACYIRU DEMAND SIGNALS
  const kacyiruDemands = [
    {
      sector: "Kacyiru",
      cell: "Kamutwa",
      category: "Fresh Farm Produce",
      queryTerm: "Organic vegetable crate supply",
      queryTermRw: "Gusura no kugezwaho imboga nshya",
      searchCount: 38,
      activeBusinessesCount: 1,
      opportunityScore: "HIGH",
    },
    {
      sector: "Kacyiru",
      cell: "Kibaza",
      category: "Solar & Power Repair",
      queryTerm: "Solar inverter & battery repair",
      queryTermRw: "Gusana bateri n'imirasire y'izuba",
      searchCount: 29,
      activeBusinessesCount: 1,
      opportunityScore: "HIGH",
    },
  ];

  for (const d of kacyiruDemands) {
    await prisma.communityDemand.create({
      data: {
        ...d,
        sectorId: sectors["KACYIRU"].id,
      },
    }).catch(() => {});
  }
  console.log(`✓ Seeded Kacyiru Demand Signals`);

  // 11. KACYIRU MISSIONS
  const kacyiruMissions = [
    {
      title: "Audit KG 569 St Micro-Enterprises around MINAGRI",
      titleRw: "Kugenzura Ubucuruzi Buto kuri KG 569 St Hafi ya MINAGRI",
      description: "Photograph price boards, menus, and verify physical existence of food stalls and agro shops near MINAGRI.",
      descriptionRw: "Gufata amafoto y'amamenyu n'ibiciro by'ubucuruzi bukorera kuri KG 569 St.",
      targetArea: "Kamutwa, Kacyiru",
      pointsReward: 60,
      badgeReward: "Kacyiru Field Pioneer",
      category: "DISCOVER",
    },
    {
      title: "Map Out Kibaza Artisanal Tailoring Workshops",
      titleRw: "Gushyira ku Ikarita Abadozi b'Imyenda i Kibaza",
      description: "Verify local tailors on KG 554 St, capture sample Kitenge prices and opening hours.",
      descriptionRw: "Gusura abadozi bo ku muhanda wa KG 554 St no kwinjiza ibiciro by'ubudodo.",
      targetArea: "Kibaza, Kacyiru",
      pointsReward: 45,
      badgeReward: "Kibaza Craft Scout",
      category: "VERIFY",
    },
  ];

  for (const m of kacyiruMissions) {
    await prisma.mission.create({ data: m }).catch(() => {});
  }
  console.log(`✓ Seeded Kacyiru Community Missions`);

  console.log("=== SEEDING COMPLETED SUCCESSFULLY! ===");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
