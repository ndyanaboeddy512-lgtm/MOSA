import { PrismaClient, Role, VerificationStatus, DataStatus, PriceType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("🇷🇼 SEEDING NATIONWIDE RWANDA GEOGRAPHIC DATASET & DEMO COMMERCE");
  console.log("   Covering all 5 Provinces and all 30 Official Districts");
  console.log("==================================================================");

  // ==========================================
  // 1. ALL 5 PROVINCES
  // ==========================================
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

  // ==========================================
  // 2. ALL 30 OFFICIAL DISTRICTS OF RWANDA
  // ==========================================
  const districtsData = [
    // City of Kigali (3)
    { code: "GASABO", provinceCode: "KIGALI", name: "Gasabo", nameRw: "Gasabo", latitude: -1.9355, longitude: 30.0880 },
    { code: "NYARUGENGE", provinceCode: "KIGALI", name: "Nyarugenge", nameRw: "Nyarugenge", latitude: -1.9810, longitude: 30.0460 },
    { code: "KICUKIRO", provinceCode: "KIGALI", name: "Kicukiro", nameRw: "Kicukiro", latitude: -1.9700, longitude: 30.1000 },

    // Northern Province (5)
    { code: "MUSANZE", provinceCode: "NORTH", name: "Musanze", nameRw: "Musanze", latitude: -1.4998, longitude: 29.6342 },
    { code: "BURERA", provinceCode: "NORTH", name: "Burera", nameRw: "Burera", latitude: -1.4390, longitude: 29.8050 },
    { code: "GICUMBI", provinceCode: "NORTH", name: "Gicumbi", nameRw: "Gicumbi", latitude: -1.5760, longitude: 30.0680 },
    { code: "RULINDO", provinceCode: "NORTH", name: "Rulindo", nameRw: "Rulindo", latitude: -1.7330, longitude: 29.9830 },
    { code: "GAKENKE", provinceCode: "NORTH", name: "Gakenke", nameRw: "Gakenke", latitude: -1.6960, longitude: 29.7890 },

    // Southern Province (8)
    { code: "HUYE", provinceCode: "SOUTH", name: "Huye", nameRw: "Huye", latitude: -2.5974, longitude: 29.7391 },
    { code: "NYANZA", provinceCode: "SOUTH", name: "Nyanza", nameRw: "Nyanza", latitude: -2.3520, longitude: 29.7500 },
    { code: "GISAGARA", provinceCode: "SOUTH", name: "Gisagara", nameRw: "Gisagara", latitude: -2.6180, longitude: 29.8430 },
    { code: "MUHANGA", provinceCode: "SOUTH", name: "Muhanga", nameRw: "Muhanga", latitude: -2.0790, longitude: 29.7560 },
    { code: "KAMONYI", provinceCode: "SOUTH", name: "Kamonyi", nameRw: "Kamonyi", latitude: -1.9960, longitude: 29.9320 },
    { code: "RUHANGO", provinceCode: "SOUTH", name: "Ruhango", nameRw: "Ruhango", latitude: -2.2230, longitude: 29.7810 },
    { code: "NYAMAGABE", provinceCode: "SOUTH", name: "Nyamagabe", nameRw: "Nyamagabe", latitude: -2.4780, longitude: 29.4790 },
    { code: "NYARUGURU", provinceCode: "SOUTH", name: "Nyaruguru", nameRw: "Nyaruguru", latitude: -2.7160, longitude: 29.5250 },

    // Eastern Province (7)
    { code: "RWAMAGANA", provinceCode: "EAST", name: "Rwamagana", nameRw: "Rwamagana", latitude: -1.9486, longitude: 30.4348 },
    { code: "KAYONZA", provinceCode: "EAST", name: "Kayonza", nameRw: "Kayonza", latitude: -1.8980, longitude: 30.6550 },
    { code: "GATSIBO", provinceCode: "EAST", name: "Gatsibo", nameRw: "Gatsibo", latitude: -1.5970, longitude: 30.4570 },
    { code: "NYAGATARE", provinceCode: "EAST", name: "Nyagatare", nameRw: "Nyagatare", latitude: -1.2970, longitude: 30.3250 },
    { code: "BUGESERA", provinceCode: "EAST", name: "Bugesera", nameRw: "Bugesera", latitude: -2.1600, longitude: 30.0900 },
    { code: "NGOMA", provinceCode: "EAST", name: "Ngoma", nameRw: "Ngoma", latitude: -2.1640, longitude: 30.5360 },
    { code: "KIREHE", provinceCode: "EAST", name: "Kirehe", nameRw: "Kirehe", latitude: -2.2680, longitude: 30.6510 },

    // Western Province (7)
    { code: "RUBAVU", provinceCode: "WEST", name: "Rubavu", nameRw: "Rubavu", latitude: -1.6763, longitude: 29.2602 },
    { code: "RUSIZI", provinceCode: "WEST", name: "Rusizi", nameRw: "Rusizi", latitude: -2.4830, longitude: 28.8980 },
    { code: "KARONGI", provinceCode: "WEST", name: "Karongi", nameRw: "Karongi", latitude: -2.0620, longitude: 29.3510 },
    { code: "RUTSIRO", provinceCode: "WEST", name: "Rutsiro", nameRw: "Rutsiro", latitude: -1.9360, longitude: 29.3240 },
    { code: "NYAMASHEKE", provinceCode: "WEST", name: "Nyamasheke", nameRw: "Nyamasheke", latitude: -2.3590, longitude: 29.1460 },
    { code: "NGORORERO", provinceCode: "WEST", name: "Ngororero", nameRw: "Ngororero", latitude: -1.8650, longitude: 29.6250 },
    { code: "NYABIHU", provinceCode: "WEST", name: "Nyabihu", nameRw: "Nyabihu", latitude: -1.6540, longitude: 29.5100 },
  ];

  const districts = {};
  for (const dist of districtsData) {
    const d = await prisma.geographicDistrict.upsert({
      where: { code: dist.code },
      update: {
        provinceId: provinces[dist.provinceCode].id,
        name: dist.name,
        nameRw: dist.nameRw,
        latitude: dist.latitude,
        longitude: dist.longitude,
      },
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
  console.log(`✓ Seeded ${Object.keys(districts).length} Districts (All 30 Official Districts of Rwanda)`);

  // ==========================================
  // 3. REPRESENTATIVE SECTORS ACROSS ALL 30 DISTRICTS
  // ==========================================
  const sectorsData = [
    // City of Kigali - Gasabo
    { code: "KACYIRU", districtCode: "GASABO", name: "Kacyiru", nameRw: "Kacyiru", latitude: -1.9355, longitude: 30.0880, description: "Administrative, institutional and residential hub with micro-enterprises and agro-services around MINAGRI." },
    { code: "KIMIRONKO", districtCode: "GASABO", name: "Kimironko", nameRw: "Kimironko", latitude: -1.9530, longitude: 30.1260, description: "Major retail, fruit, textile, and produce market commercial district." },
    { code: "REMERA", districtCode: "GASABO", name: "Remera", nameRw: "Remera", latitude: -1.9580, longitude: 30.1130, description: "Transit, hospitality, auto repair, and nightlife corridor near BK Arena and Amahoro Stadium." },
    { code: "GISOZI", districtCode: "GASABO", name: "Gisozi", nameRw: "Gisozi", latitude: -1.9180, longitude: 30.0620, description: "Artisanal timber, carpentry, hardware, and university residential sector." },

    // City of Kigali - Nyarugenge
    { code: "NYAMIRAMBO", districtCode: "NYARUGENGE", name: "Nyamirambo", nameRw: "Nyamirambo", latitude: -1.9810, longitude: 30.0460, description: "Historic commercial, cultural and culinary heart of Kigali with dense artisanal and tailoring networks." },
    { code: "KIMISAGARA", districtCode: "NYARUGENGE", name: "Kimisagara", nameRw: "Kimisagara", latitude: -1.9680, longitude: 30.0450, description: "High-density trading center, fresh slaughterhouse supply, and youth enterprises." },
    { code: "NYARUGENGE_SECTOR", districtCode: "NYARUGENGE", name: "Nyarugenge", nameRw: "Nyarugenge", latitude: -1.9490, longitude: 30.0580, description: "Downtown financial, wholesale, and central business district." },

    // City of Kigali - Kicukiro
    { code: "NIBOYE", districtCode: "KICUKIRO", name: "Niboye", nameRw: "Niboye", latitude: -1.9750, longitude: 30.1080, description: "Commercial strip, health clinics, and residential service providers." },
    { code: "KAGARAMA", districtCode: "KICUKIRO", name: "Kagarama", nameRw: "Kagarama", latitude: -1.9890, longitude: 30.1020, description: "Neighborhood services, electronics, and small supermarkets." },
    { code: "GAHANGA", districtCode: "KICUKIRO", name: "Gahanga", nameRw: "Gahanga", latitude: -2.0300, longitude: 30.1080, description: "Industrial zone, cricket stadium locality, and building materials hub." },

    // Northern - Musanze
    { code: "MUHOZA", districtCode: "MUSANZE", name: "Muhoza", nameRw: "Muhoza", latitude: -1.4998, longitude: 29.6342, description: "Northern commercial center, agricultural marketplace, and transport hub." },
    { code: "KINIGI", districtCode: "MUSANZE", name: "Kinigi", nameRw: "Kinigi", latitude: -1.4280, longitude: 29.5930, description: "Volcanoes gateway, ecotourism craft cooperatives, and potato farming." },

    // Northern - Burera
    { code: "RUGARAMA", districtCode: "BURERA", name: "Rugarama", nameRw: "Rugarama", latitude: -1.4390, longitude: 29.8050, description: "District headquarters, small eateries, and agro-inputs." },
    { code: "CYANIKA", districtCode: "BURERA", name: "Cyanika", nameRw: "Cyanika", latitude: -1.3480, longitude: 29.7420, description: "Border trading post with Uganda, wholesale dry goods and produce." },

    // Northern - Gicumbi
    { code: "BYUMBA", districtCode: "GICUMBI", name: "Byumba", nameRw: "Byumba", latitude: -1.5760, longitude: 30.0680, description: "Highland commercial town, dairy cooperatives, and transport nexus." },

    // Northern - Rulindo
    { code: "TARE", districtCode: "RULINDO", name: "Tare", nameRw: "Tare", latitude: -1.7330, longitude: 29.9830, description: "District commercial center, roadside produce market on Kigali-Musanze highway." },
    { code: "SHYORONGI", districtCode: "RULINDO", name: "Shyorongi", nameRw: "Shyorongi", latitude: -1.8680, longitude: 29.9920, description: "Peri-urban quarrying, transport logistics, and small restaurants." },

    // Northern - Gakenke
    { code: "GAKENKE_SECTOR", districtCode: "GAKENKE", name: "Gakenke", nameRw: "Gakenke", latitude: -1.6960, longitude: 29.7890, description: "Coffee washing station hub, mountain honey, and artisanal tool shops." },

    // Southern - Huye
    { code: "NGOMA", districtCode: "HUYE", name: "Ngoma", nameRw: "Ngoma", latitude: -2.5974, longitude: 29.7391, description: "Southern cultural, university, and artisanal carpentry cluster." },
    { code: "TUMBA", districtCode: "HUYE", name: "Tumba", nameRw: "Tumba", latitude: -2.6100, longitude: 29.7300, description: "Student housing zone, printing bureaus, and affordable diners." },

    // Southern - Nyanza
    { code: "BUSASAMANA", districtCode: "NYANZA", name: "Busasamana", nameRw: "Busasamana", latitude: -2.3520, longitude: 29.7500, description: "Historic Royal Capital, traditional milk bars, and cultural crafts." },

    // Southern - Gisagara
    { code: "NDORA", districtCode: "GISAGARA", name: "Ndora", nameRw: "Ndora", latitude: -2.6180, longitude: 29.8430, description: "District administrative town, local grain mills, and motorcycle spares." },

    // Southern - Muhanga
    { code: "NYAMABUYE", districtCode: "MUHANGA", name: "Nyamabuye", nameRw: "Nyamabuye", latitude: -2.0790, longitude: 29.7560, description: "Major central trade crossroads, wholesale commerce, and repair garages." },

    // Southern - Kamonyi
    { code: "RUNDA", districtCode: "KAMONYI", name: "Runda", nameRw: "Runda", latitude: -1.9960, longitude: 29.9320, description: "Nyabarongo gateway, brickmaking, transit shops, and fresh produce." },

    // Southern - Ruhango
    { code: "RUHANGO_SECTOR", districtCode: "RUHANGO", name: "Ruhango", nameRw: "Ruhango", latitude: -2.2230, longitude: 29.7810, description: "Cassava processing center, clothing tailors, and hardware." },

    // Southern - Nyamagabe
    { code: "GASAKA", districtCode: "NYAMAGABE", name: "Gasaka", nameRw: "Gasaka", latitude: -2.4780, longitude: 29.4790, description: "Nyungwe gateway, tea & timber market, and mechanical workshops." },

    // Southern - Nyaruguru
    { code: "KIBEHO", districtCode: "NYARUGURU", name: "Kibeho", nameRw: "Kibeho", latitude: -2.7160, longitude: 29.5250, description: "Pilgrimage destination, religious artisanal crafts, and hospitality." },

    // Eastern - Rwamagana
    { code: "KIGABIRO", districtCode: "RWAMAGANA", name: "Kigabiro", nameRw: "Kigabiro", latitude: -1.9486, longitude: 30.4348, description: "Eastern province administrative capital, busy central market and bus park." },

    // Eastern - Kayonza
    { code: "MUKARANGE", districtCode: "KAYONZA", name: "Mukarange", nameRw: "Mukarange", latitude: -1.8980, longitude: 30.6550, description: "Transport junction toward Tanzania and Akagera, truck stops, and agro-vet supply." },

    // Eastern - Gatsibo
    { code: "KABARORE", districtCode: "GATSIBO", name: "Kabarore", nameRw: "Kabarore", latitude: -1.5970, longitude: 30.4570, description: "Livestock trading center, cattle products, and solar lighting equipment." },

    // Eastern - Nyagatare
    { code: "NYAGATARE_SECTOR", districtCode: "NYAGATARE", name: "Nyagatare", nameRw: "Nyagatare", latitude: -1.2970, longitude: 30.3250, description: "Dairy capital of Rwanda, milk processing points, veterinary supplies, and university." },

    // Eastern - Bugesera
    { code: "NYAMATA", districtCode: "BUGESERA", name: "Nyamata", nameRw: "Nyamata", latitude: -2.1600, longitude: 30.0900, description: "Rapidly growing airport corridor city, modern retail, and construction hardware." },

    // Eastern - Ngoma
    { code: "KIBUNGO", districtCode: "NGOMA", name: "Kibungo", nameRw: "Kibungo", latitude: -2.1640, longitude: 30.5360, description: "Banana farming capital, agro-logistics, and regional medical center services." },

    // Eastern - Kirehe
    { code: "GATORE", districtCode: "KIREHE", name: "Gatore", nameRw: "Gatore", latitude: -2.2680, longitude: 30.6510, description: "Agricultural produce market, rice milling, and cross-border trade route." },

    // Western - Rubavu
    { code: "GISENYI", districtCode: "RUBAVU", name: "Gisenyi", nameRw: "Gisenyi", latitude: -1.6763, longitude: 29.2602, description: "Western lakefront commercial hub with cross-border trade, fisheries and hospitality." },

    // Western - Rusizi
    { code: "KAMEMBE", districtCode: "RUSIZI", name: "Kamembe", nameRw: "Kamembe", latitude: -2.4830, longitude: 28.8980, description: "Border commercial city with Bukavu (DRC), airport services, and lake transport." },

    // Western - Karongi
    { code: "BWISHYURA", districtCode: "KARONGI", name: "Bwishyura", nameRw: "Bwishyura", latitude: -2.0620, longitude: 29.3510, description: "Lake Kivu tourism hub, boat repair, artisanal fishing, and honey cooperatives." },

    // Western - Rutsiro
    { code: "GIHANGO", districtCode: "RUTSIRO", name: "Gihango", nameRw: "Gihango", latitude: -1.9360, longitude: 29.3240, description: "Mining region supply hub, specialty coffee washing, and small commerce." },

    // Western - Nyamasheke
    { code: "KAGANO", districtCode: "NYAMASHEKE", name: "Kagano", nameRw: "Kagano", latitude: -2.3590, longitude: 29.1460, description: "Lakeside tea processing, fresh sambaza depot, and motorbike transport." },

    // Western - Ngororero
    { code: "NGORORERO_SECTOR", districtCode: "NGORORERO", name: "Ngororero", nameRw: "Ngororero", latitude: -1.8650, longitude: 29.6250, description: "Terraced farming commercial center, coltan trade logistics, and repair shops." },

    // Western - Nyabihu
    { code: "MUKAMIRA", districtCode: "NYABIHU", name: "Mukamira", nameRw: "Mukamira", latitude: -1.6540, longitude: 29.5100, description: "Pyrethrum and dairy belt junction, truck repair, and cold-climate fresh produce." },
  ];

  const sectors = {};
  for (const sec of sectorsData) {
    const s = await prisma.geographicSector.upsert({
      where: { code: sec.code },
      update: {
        districtId: districts[sec.districtCode].id,
        name: sec.name,
        nameRw: sec.nameRw,
        latitude: sec.latitude,
        longitude: sec.longitude,
        description: sec.description,
      },
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
  console.log(`✓ Seeded ${Object.keys(sectors).length} Representative Sectors covering all 30 Districts`);

  // ==========================================
  // 4. CELLS FOR EVERY SECTOR
  // ==========================================
  const cellsData = [
    // Gasabo - Kacyiru
    { sectorCode: "KACYIRU", name: "Kamutwa", nameRw: "Kamutwa", latitude: -1.9365, longitude: 30.0868 },
    { sectorCode: "KACYIRU", name: "Kibaza", nameRw: "Kibaza", latitude: -1.9342, longitude: 30.0915 },
    { sectorCode: "KACYIRU", name: "Kamatamu", nameRw: "Kamatamu", latitude: -1.9388, longitude: 30.0835 },

    // Gasabo - Kimironko
    { sectorCode: "KIMIRONKO", name: "Bibare", nameRw: "Bibare", latitude: -1.9520, longitude: 30.1250 },
    { sectorCode: "KIMIRONKO", name: "Kibagabaga", nameRw: "Kibagabaga", latitude: -1.9420, longitude: 30.1180 },

    // Gasabo - Remera
    { sectorCode: "REMERA", name: "Rukiri I", nameRw: "Rukiri I", latitude: -1.9590, longitude: 30.1120 },
    { sectorCode: "REMERA", name: "Nyabisindu", nameRw: "Nyabisindu", latitude: -1.9510, longitude: 30.1060 },

    // Gasabo - Gisozi
    { sectorCode: "GISOZI", name: "Musezero", nameRw: "Musezero", latitude: -1.9190, longitude: 30.0610 },
    { sectorCode: "GISOZI", name: "Ruhango", nameRw: "Ruhango", latitude: -1.9160, longitude: 30.0680 },

    // Nyarugenge - Nyamirambo
    { sectorCode: "NYAMIRAMBO", name: "Biryogo", nameRw: "Biryogo", latitude: -1.9790, longitude: 30.0520 },
    { sectorCode: "NYAMIRAMBO", name: "Rwezamenyo", nameRw: "Rwezamenyo", latitude: -1.9750, longitude: 30.0480 },
    { sectorCode: "NYAMIRAMBO", name: "Mumena", nameRw: "Mumena", latitude: -1.9850, longitude: 30.0410 },

    // Nyarugenge - Kimisagara
    { sectorCode: "KIMISAGARA", name: "Katabaro", nameRw: "Katabaro", latitude: -1.9670, longitude: 30.0440 },
    { sectorCode: "KIMISAGARA", name: "Kamuhoza", nameRw: "Kamuhoza", latitude: -1.9710, longitude: 30.0380 },

    // Nyarugenge - Nyarugenge
    { sectorCode: "NYARUGENGE_SECTOR", name: "Kiyovu", nameRw: "Kiyovu", latitude: -1.9520, longitude: 30.0620 },
    { sectorCode: "NYARUGENGE_SECTOR", name: "Rwampara", nameRw: "Rwampara", latitude: -1.9610, longitude: 30.0550 },

    // Kicukiro - Niboye
    { sectorCode: "NIBOYE", name: "Niboye", nameRw: "Niboye", latitude: -1.9740, longitude: 30.1070 },
    { sectorCode: "NIBOYE", name: "Gatenga", nameRw: "Gatenga", latitude: -1.9790, longitude: 30.1010 },

    // Kicukiro - Kagarama
    { sectorCode: "KAGARAMA", name: "Kanserege", nameRw: "Kanserege", latitude: -1.9880, longitude: 30.1010 },

    // Kicukiro - Gahanga
    { sectorCode: "GAHANGA", name: "Karembure", nameRw: "Karembure", latitude: -2.0310, longitude: 30.1070 },

    // Musanze - Muhoza
    { sectorCode: "MUHOZA", name: "Ruhengeri", nameRw: "Ruhengeri", latitude: -1.5000, longitude: 29.6350 },
    { sectorCode: "MUHOZA", name: "Cyivugiza", nameRw: "Cyivugiza", latitude: -1.4980, longitude: 29.6320 },

    // Musanze - Kinigi
    { sectorCode: "KINIGI", name: "Kampanga", nameRw: "Kampanga", latitude: -1.4270, longitude: 29.5910 },

    // Burera - Rugarama
    { sectorCode: "RUGARAMA", name: "Rugerero", nameRw: "Rugerero", latitude: -1.4380, longitude: 29.8040 },
    { sectorCode: "CYANIKA", name: "Kabyiniro", nameRw: "Kabyiniro", latitude: -1.3470, longitude: 29.7410 },

    // Gicumbi - Byumba
    { sectorCode: "BYUMBA", name: "Nyamabuye", nameRw: "Nyamabuye", latitude: -1.5750, longitude: 30.0670 },
    { sectorCode: "BYUMBA", name: "Kibali", nameRw: "Kibali", latitude: -1.5780, longitude: 30.0710 },

    // Rulindo - Tare
    { sectorCode: "TARE", name: "Gasiza", nameRw: "Gasiza", latitude: -1.7320, longitude: 29.9820 },
    { sectorCode: "SHYORONGI", name: "Rutonde", nameRw: "Rutonde", latitude: -1.8670, longitude: 29.9910 },

    // Gakenke - Gakenke
    { sectorCode: "GAKENKE_SECTOR", name: "Rusagara", nameRw: "Rusagara", latitude: -1.6950, longitude: 29.7880 },

    // Huye - Ngoma
    { sectorCode: "NGOMA", name: "Matyazo", nameRw: "Matyazo", latitude: -2.5980, longitude: 29.7400 },
    { sectorCode: "NGOMA", name: "Ngoma", nameRw: "Ngoma", latitude: -2.5960, longitude: 29.7380 },
    { sectorCode: "TUMBA", name: "Cyarwa", nameRw: "Cyarwa", latitude: -2.6090, longitude: 29.7290 },

    // Nyanza - Busasamana
    { sectorCode: "BUSASAMANA", name: "Nyanza", nameRw: "Nyanza", latitude: -2.3510, longitude: 29.7490 },
    { sectorCode: "BUSASAMANA", name: "Rwesero", nameRw: "Rwesero", latitude: -2.3540, longitude: 29.7530 },

    // Gisagara - Ndora
    { sectorCode: "NDORA", name: "Dahwe", nameRw: "Dahwe", latitude: -2.6170, longitude: 29.8420 },

    // Muhanga - Nyamabuye
    { sectorCode: "NYAMABUYE", name: "Gitarama", nameRw: "Gitarama", latitude: -2.0780, longitude: 29.7550 },
    { sectorCode: "NYAMABUYE", name: "Ntenyo", nameRw: "Ntenyo", latitude: -2.0820, longitude: 29.7590 },

    // Kamonyi - Runda
    { sectorCode: "RUNDA", name: "Ruyenzi", nameRw: "Ruyenzi", latitude: -1.9950, longitude: 29.9310 },
    { sectorCode: "RUNDA", name: "Muganza", nameRw: "Muganza", latitude: -1.9980, longitude: 29.9350 },

    // Ruhango - Ruhango
    { sectorCode: "RUHANGO_SECTOR", name: "Buhoro", nameRw: "Buhoro", latitude: -2.2220, longitude: 29.7800 },

    // Nyamagabe - Gasaka
    { sectorCode: "GASAKA", name: "Nyamagabe", nameRw: "Nyamagabe", latitude: -2.4770, longitude: 29.4780 },

    // Nyaruguru - Kibeho
    { sectorCode: "KIBEHO", name: "Nyange", nameRw: "Nyange", latitude: -2.7150, longitude: 29.5240 },

    // Eastern - Rwamagana
    { sectorCode: "KIGABIRO", name: "Sibagire", nameRw: "Sibagire", latitude: -1.9470, longitude: 30.4330 },
    { sectorCode: "KIGABIRO", name: "Bukinanyana", nameRw: "Bukinanyana", latitude: -1.9510, longitude: 30.4370 },

    // Eastern - Kayonza
    { sectorCode: "MUKARANGE", name: "Kayonza", nameRw: "Kayonza", latitude: -1.8970, longitude: 30.6540 },

    // Eastern - Gatsibo
    { sectorCode: "KABARORE", name: "Kabarore", nameRw: "Kabarore", latitude: -1.5960, longitude: 30.4560 },

    // Eastern - Nyagatare
    { sectorCode: "NYAGATARE_SECTOR", name: "Barija", nameRw: "Barija", latitude: -1.2960, longitude: 30.3240 },
    { sectorCode: "NYAGATARE_SECTOR", name: "Ryabega", nameRw: "Ryabega", latitude: -1.2990, longitude: 30.3280 },

    // Eastern - Bugesera
    { sectorCode: "NYAMATA", name: "Nyamata Ville", nameRw: "Nyamata Ville", latitude: -2.1590, longitude: 30.0890 },
    { sectorCode: "NYAMATA", name: "Maranyundo", nameRw: "Maranyundo", latitude: -2.1630, longitude: 30.0930 },

    // Eastern - Ngoma
    { sectorCode: "KIBUNGO", name: "Kibungo", nameRw: "Kibungo", latitude: -2.1630, longitude: 30.5350 },

    // Eastern - Kirehe
    { sectorCode: "GATORE", name: "Curazo", nameRw: "Curazo", latitude: -2.2670, longitude: 30.6500 },

    // Western - Rubavu
    { sectorCode: "GISENYI", name: "Kivumu", nameRw: "Kivumu", latitude: -1.6780, longitude: 29.2610 },
    { sectorCode: "GISENYI", name: "Mbugangari", nameRw: "Mbugangari", latitude: -1.6740, longitude: 29.2580 },

    // Western - Rusizi
    { sectorCode: "KAMEMBE", name: "Kamembe", nameRw: "Kamembe", latitude: -2.4820, longitude: 28.8970 },
    { sectorCode: "KAMEMBE", name: "Gihundwe", nameRw: "Gihundwe", latitude: -2.4850, longitude: 28.9020 },

    // Western - Karongi
    { sectorCode: "BWISHYURA", name: "Kibuye", nameRw: "Kibuye", latitude: -2.0610, longitude: 29.3500 },

    // Western - Rutsiro
    { sectorCode: "GIHANGO", name: "Gihango", nameRw: "Gihango", latitude: -1.9350, longitude: 29.3230 },

    // Western - Nyamasheke
    { sectorCode: "KAGANO", name: "Kagano", nameRw: "Kagano", latitude: -2.3580, longitude: 29.1450 },

    // Western - Ngororero
    { sectorCode: "NGORORERO_SECTOR", name: "Ngororero", nameRw: "Ngororero", latitude: -1.8640, longitude: 29.6240 },

    // Western - Nyabihu
    { sectorCode: "MUKAMIRA", name: "Jenda", nameRw: "Jenda", latitude: -1.6530, longitude: 29.5090 },
  ];

  const cells = {};
  for (const c of cellsData) {
    const key = `${c.sectorCode}_${c.name.toUpperCase().replace(/\s+/g, "_")}`;
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
  console.log(`✓ Seeded ${Object.keys(cells).length} Cells across the sectors`);

  // ==========================================
  // 5. LOCAL AREAS & DISCOVERY LANDMARKS
  // ==========================================
  const localAreasData = [
    // Kacyiru, Gasabo
    { sectorCode: "KACYIRU", cellKey: "KACYIRU_KAMUTWA", name: "MINAGRI Area (KG 569 St)", nameRw: "Agace ka MINAGRI (KG 569 St)", type: "LANDMARK", landmark: "Ministry of Agriculture and Animal Resources (KG 569 St)", addressNote: "KG 569 St, near MINAGRI Head Office", latitude: -1.9365, longitude: 30.0868 },
    { sectorCode: "KACYIRU", cellKey: "KACYIRU_KIBAZA", name: "Kibaza Commercial Strip", nameRw: "Agace k'Ubucuruzi i Kibaza", type: "COMMERCIAL_HUB", landmark: "Kibaza Market & Primary School", addressNote: "KG 554 St", latitude: -1.9342, longitude: 30.0915 },
    { sectorCode: "KACYIRU", cellKey: "KACYIRU_KAMATAMU", name: "Kamatamu Artisanal Alley", nameRw: "Ubukorikori bwa Kamatamu", type: "LOCALITY", landmark: "Kamatamu Workshops & Metalwork", addressNote: "KG 515 St", latitude: -1.9388, longitude: 30.0835 },

    // Nyamirambo, Nyarugenge
    { sectorCode: "NYAMIRAMBO", cellKey: "NYAMIRAMBO_BIRYOGO", name: "Biryogo Car-Free Zone", nameRw: "Agace k'Abanyamaguru i Biryogo", type: "COMMERCIAL_HUB", landmark: "Biryogo Green Walkway", addressNote: "Biryogo Street", latitude: -1.9785, longitude: 30.0515 },
    { sectorCode: "NYAMIRAMBO", cellKey: "NYAMIRAMBO_BIRYOGO", name: "Cosmos Commercial Center", nameRw: "Hagati i Cosmos", type: "COMMERCIAL_HUB", landmark: "Cosmos Bar & Mosque", addressNote: "Cosmos Junction", latitude: -1.9802, longitude: 30.0475 },
    { sectorCode: "NYAMIRAMBO", cellKey: "NYAMIRAMBO_RWEZAMENYO", name: "Tapi Rouge & Youth Center", nameRw: "Tapi Rouge n'Inzu y'Urubyiruko", type: "LANDMARK", landmark: "Maison des Jeunes", addressNote: "Tapi Rouge Junction", latitude: -1.9840, longitude: 30.0450 },

    // Kimironko, Gasabo
    { sectorCode: "KIMIRONKO", cellKey: "KIMIRONKO_BIBARE", name: "Kimironko Grand Market & Taxi Park", nameRw: "Isoko Rinini rya Kimironko", type: "MARKET", landmark: "Kimironko Market Gate 1", addressNote: "KG 11 Ave", latitude: -1.9525, longitude: 30.1255 },

    // Gisozi, Gasabo
    { sectorCode: "GISOZI", cellKey: "GISOZI_MUSEZERO", name: "Gisozi Carpentry & Timber Hub", nameRw: "Ahabajirwa imbaho i Gisozi", type: "COMMERCIAL_HUB", landmark: "Gisozi Memorial Road Junction", addressNote: "KG 686 St", latitude: -1.9195, longitude: 30.0615 },

    // Remera, Gasabo
    { sectorCode: "REMERA", cellKey: "REMERA_NYABISINDU", name: "Remera Giporoso & Transit Strip", nameRw: "Kuri Giporoso", type: "COMMERCIAL_HUB", landmark: "Giporoso Junction", addressNote: "Airport Road Corridor", latitude: -1.9515, longitude: 30.1065 },

    // Musanze, Muhoza
    { sectorCode: "MUHOZA", cellKey: "MUHOZA_RUHENGERI", name: "Musanze Modern Market & Bus Park", nameRw: "Isoko rya Musanze na Gari ya Moshi", type: "MARKET", landmark: "Musanze Bus Terminal", addressNote: "RN4 Highway Corridor", latitude: -1.4998, longitude: 29.6345 },

    // Huye, Ngoma
    { sectorCode: "NGOMA", cellKey: "NGOMA_MATYAZO", name: "Butare University Commercial Corridor", nameRw: "Ahegereye Kaminuza i Butare", type: "CORRIDOR", landmark: "Near University of Rwanda Main Gate", addressNote: "University Ave", latitude: -2.5975, longitude: 29.7395 },

    // Rubavu, Gisenyi
    { sectorCode: "GISENYI", cellKey: "GISENYI_KIVUMU", name: "Gisenyi Petite Barriere Cross-Border Market", nameRw: "Isoko ryo ku Mupaka Petite Barrière", type: "MARKET", landmark: "Petite Barriere Border Post", addressNote: "Border Avenue", latitude: -1.6775, longitude: 29.2608 },

    // Rwamagana, Kigabiro
    { sectorCode: "KIGABIRO", cellKey: "KIGABIRO_SIBAGIRE", name: "Rwamagana Main Bus Terminal & Market", nameRw: "Gari ya Rwamagana n'Isoko", type: "MARKET", landmark: "Rwamagana Roundabout", addressNote: "RN3 Highway", latitude: -1.9480, longitude: 30.4340 },

    // Muhanga, Nyamabuye
    { sectorCode: "NYAMABUYE", cellKey: "NYAMABUYE_GITARAMA", name: "Muhanga Commercial Crossroads", nameRw: "Hagati mu Mujyi wa Muhanga", type: "COMMERCIAL_HUB", landmark: "Gitarama Cathedral Junction", addressNote: "RN1 Main Road", latitude: -2.0785, longitude: 29.7555 },

    // Rusizi, Kamembe
    { sectorCode: "KAMEMBE", cellKey: "KAMEMBE_KAMEMBE", name: "Kamembe Commercial Port & Market", nameRw: "Isoko rya Kamembe n'Icyambu", type: "MARKET", landmark: "Kamembe Central Market", addressNote: "Lake Road", latitude: -2.4825, longitude: 28.8975 },

    // Bugesera, Nyamata
    { sectorCode: "NYAMATA", cellKey: "NYAMATA_NYAMATA_VILLE", name: "Nyamata Town Center & Boulevard", nameRw: "Umujyi wa Nyamata", type: "COMMERCIAL_HUB", landmark: "Nyamata Roundabout", addressNote: "Airport Boulevard", latitude: -2.1595, longitude: 30.0895 },

    // Nyagatare
    { sectorCode: "NYAGATARE_SECTOR", cellKey: "NYAGATARE_SECTOR_BARIJA", name: "Nyagatare Dairy Cattle Trade Point", nameRw: "Isoko ry'Amata n'Amatungo Nyagatare", type: "MARKET", landmark: "Nyagatare Bus Terminal", addressNote: "Main Dairy Road", latitude: -1.2965, longitude: 30.3245 },

    // Karongi
    { sectorCode: "BWISHYURA", cellKey: "BWISHYURA_KIBUYE", name: "Kibuye Lakeside Promenade & Harbor", nameRw: "Icyambu cy'Ikiyaga i Kibuye", type: "LANDMARK", landmark: "Lake Kivu Harbor", addressNote: "Lakeside Drive", latitude: -2.0615, longitude: 29.3505 },
  ];

  const localAreas = {};
  for (const la of localAreasData) {
    const cellId = cells[la.cellKey]?.id || null;
    let area = await prisma.localArea.findFirst({
      where: {
        sectorId: sectors[la.sectorCode].id,
        name: la.name,
      },
    });

    if (area) {
      area = await prisma.localArea.update({
        where: { id: area.id },
        data: {
          cellId,
          nameRw: la.nameRw,
          type: la.type,
          landmark: la.landmark,
          addressNote: la.addressNote,
          latitude: la.latitude,
          longitude: la.longitude,
        },
      });
    } else {
      area = await prisma.localArea.create({
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
    }
    localAreas[la.name] = area;
  }
  console.log(`✓ Seeded ${Object.keys(localAreas).length} Local Areas and Discovery Landmarks`);

  // ==========================================
  // 6. REPRESENTATIVE NATIONWIDE DEMO BUSINESSES & ESTIMATED PRICE CATALOG
  // Covering 22+ Commerce Categories Across All 5 Provinces and 30 Districts
  // ==========================================
  console.log("\nSeeding nationwide representative DEMO businesses...");

  const nationwideDemoBusinesses = [
    // ----------------------------------------------------------------
    // GASABO DISTRICT (Kigali)
    // ----------------------------------------------------------------
    {
      id: "demo-gas-kim-1",
      name: "Kimironko Fresh Agro-Produce & Basketry",
      nameRw: "Isoko ry'Imboga n'Ibyibo Kimironko",
      category: "agriculture_produce",
      categoryDisplay: "Produce & Traditional Crafts",
      categoryDisplayRw: "Imboga, Imbuto & Uduseke",
      description: "Wholesale and retail sweet potatoes, passion fruits, green bananas, and hand-woven peace baskets.",
      descriptionRw: "Ibijumba, amatunda, ibitoki byiza n'agaseke k'amahoro.",
      phone: "+250780000031 (Demo)",
      whatsapp: "+250780000031",
      provinceCode: "KIGALI",
      districtCode: "GASABO",
      sectorCode: "KIMIRONKO",
      cellKey: "KIMIRONKO_BIBARE",
      localAreaName: "Kimironko Grand Market & Taxi Park",
      cell: "Bibare",
      sector: "Kimironko",
      district: "Gasabo",
      addressNote: "Kimironko Market, Stall B-42",
      latitude: -1.9526,
      longitude: 30.1256,
      coverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 500,
      priceRangeMax: 15000,
      products: [
        { name: "Sack of Rwandan Irish Potatoes (Kinigi 25kg)", nameRw: "Ikinigi cy'ibirayi (25kg)", price: 14000, priceMin: 12000, priceMax: 16000, priceType: PriceType.RANGE, isEstimated: true, unit: "25kg sack" },
        { name: "Fresh Passion Fruits (Crate 5kg)", nameRw: "Amatunda meza (5kg)", price: 6000, priceMin: 5000, priceMax: 7500, priceType: PriceType.RANGE, isEstimated: true, unit: "crate" },
        { name: "Handcrafted Agaseke Peace Basket", nameRw: "Agaseke k'uburanga", price: 8000, priceMin: 6000, priceMax: 12000, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
      ],
    },
    {
      id: "demo-gas-gis-1",
      name: "Gisozi Timber & Custom Hardwood Workshop",
      nameRw: "Ububaji n'Imbaho zikomeye Gisozi",
      category: "tailor_crafts",
      categoryDisplay: "Carpentry & Timber",
      categoryDisplayRw: "Ububaji & Ibikoresho by'Imbaho",
      description: "Hardwood doors, dining tables, durable office desks, and building timber cutting services.",
      descriptionRw: "Inzugi z'imbaho zikomeye, ameza yo kuriraho n'imbaho z'ubwubatsi.",
      phone: "+250780000032 (Demo)",
      whatsapp: "+250780000032",
      provinceCode: "KIGALI",
      districtCode: "GASABO",
      sectorCode: "GISOZI",
      cellKey: "GISOZI_MUSEZERO",
      localAreaName: "Gisozi Carpentry & Timber Hub",
      cell: "Musezero",
      sector: "Gisozi",
      district: "Gasabo",
      addressNote: "KG 686 St, Timber Yard 8",
      latitude: -1.9196,
      longitude: 30.0616,
      coverImage: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=60",
      priceRange: "PREMIUM",
      priceRangeMin: 15000,
      priceRangeMax: 250000,
      products: [
        { name: "Solid Grevillea Hardwood Door & Frame", nameRw: "Urugi rw'imbaho ya Greveleya n'ikadiri", price: 65000, priceMin: 50000, priceMax: 85000, priceType: PriceType.RANGE, isEstimated: true, unit: "unit" },
        { name: "6-Seater Family Dining Table with Benches", nameRw: "Ameza y'umuryango n'intebe zayo", price: 180000, priceMin: 150000, priceMax: 220000, priceType: PriceType.RANGE, isEstimated: true, unit: "set" },
        { name: "Timber Planing and Precision Cutting (per beam)", nameRw: "Kugorora no gukata imbaho", price: 1200, priceMin: 800, priceMax: 1500, priceType: PriceType.RANGE, isEstimated: true, unit: "beam" },
      ],
    },

    // ----------------------------------------------------------------
    // KICUKIRO DISTRICT (Kigali)
    // ----------------------------------------------------------------
    {
      id: "demo-kic-nib-1",
      name: "Niboye Community Pharmacy & Wellness",
      nameRw: "Farumasi y'Agace ka Niboye",
      category: "pharmacy_health",
      categoryDisplay: "Pharmacy & First Aid",
      categoryDisplayRw: "Imiti n'Ubutabazi bw'Ibanze",
      description: "Essential pharmaceuticals, first aid kits, generic antibiotics, baby nutrition, and blood pressure screening.",
      descriptionRw: "Imiti yemejwe, ibipimo by'umuvuduko w'amaraso n'ibiryo by'abana.",
      phone: "+250780000033 (Demo)",
      whatsapp: "+250780000033",
      provinceCode: "KIGALI",
      districtCode: "KICUKIRO",
      sectorCode: "NIBOYE",
      cellKey: "NIBOYE_NIBOYE",
      cell: "Niboye",
      sector: "Niboye",
      district: "Kicukiro",
      addressNote: "KK 15 Rd, Niboye Center",
      latitude: -1.9745,
      longitude: 30.1075,
      coverImage: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 500,
      priceRangeMax: 25000,
      products: [
        { name: "Rapid Malaria Diagnostic Test & Treatment Strip", nameRw: "Ibizamini by'umuriro wa malariya", price: 2500, priceMin: 2000, priceMax: 3500, priceType: PriceType.RANGE, isEstimated: true, unit: "test" },
        { name: "Blood Pressure & Blood Sugar Check", nameRw: "Gupima umuvuduko n'isukari", price: 1000, priceMin: 800, priceMax: 1500, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Multi-Vitamin Syrup for Children (200ml)", nameRw: "Vitamini z'abana mu mazi", price: 4500, priceMin: 4000, priceMax: 5500, priceType: PriceType.RANGE, isEstimated: true, unit: "bottle" },
      ],
    },
    {
      id: "demo-kic-gah-1",
      name: "Gahanga Hardware & Quality Cement Depot",
      nameRw: "Ibyuma by'Ubwubatsi & Simo Gahanga",
      category: "hardware_construction",
      categoryDisplay: "Hardware & Construction",
      categoryDisplayRw: "Ibikoresho by'Ubwubatsi",
      description: "Cimerwa cement, iron roofing sheets, deformed reinforcement rebar, and plumbing PVC fittings.",
      descriptionRw: "Sima ya Cimerwa, amabati, ibyuma by'ubwubatsi n'imiyoboro y'amazi.",
      phone: "+250780000034 (Demo)",
      whatsapp: "+250780000034",
      provinceCode: "KIGALI",
      districtCode: "KICUKIRO",
      sectorCode: "GAHANGA",
      cellKey: "GAHANGA_KAREMBURE",
      cell: "Karembure",
      sector: "Gahanga",
      district: "Kicukiro",
      addressNote: "Main Stadium Road, Unit 12",
      latitude: -2.0315,
      longitude: 30.1078,
      coverImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=60",
      priceRange: "PREMIUM",
      priceRangeMin: 1200,
      priceRangeMax: 95000,
      products: [
        { name: "Cimerwa 32.5R Cement (50kg Bag)", nameRw: "Umusozi wa Sima ya Cimerwa (50kg)", price: 11500, priceMin: 11000, priceMax: 12500, priceType: PriceType.RANGE, isEstimated: true, unit: "bag" },
        { name: "Corrugated Iron Sheet (Gauge 28, 3 meters)", nameRw: "Ibati ryo gusakara (Gauge 28, 3m)", price: 9500, priceMin: 9000, priceMax: 10500, priceType: PriceType.RANGE, isEstimated: true, unit: "sheet" },
        { name: "High-Tensile Rebar 12mm (12m length)", nameRw: "Icyuma cya beto 12mm", price: 8200, priceMin: 7800, priceMax: 9000, priceType: PriceType.RANGE, isEstimated: true, unit: "bar" },
      ],
    },

    // ----------------------------------------------------------------
    // NYARUGENGE DISTRICT (Additional to Nyamirambo)
    // ----------------------------------------------------------------
    {
      id: "demo-nya-kim-1",
      name: "Kimisagara Youth Tech & Mobile Lab",
      nameRw: "Laboratwari ya Telefone Kimisagara",
      category: "phone_electronics",
      categoryDisplay: "Phone & Gadget Repairs",
      categoryDisplayRw: "Gusana Telefone n'Ibyuma",
      description: "Quick-fix smartphone screen changes, battery replacements, charging port soldering, and sound speaker repairs.",
      descriptionRw: "Guhindura amasakara, amabateri ya telefone no gusudira ama-connecteur.",
      phone: "+250780000035 (Demo)",
      whatsapp: "+250780000035",
      provinceCode: "KIGALI",
      districtCode: "NYARUGENGE",
      sectorCode: "KIMISAGARA",
      cellKey: "KIMISAGARA_KATABARO",
      cell: "Katabaro",
      sector: "Kimisagara",
      district: "Nyarugenge",
      addressNote: "Katabaro Commercial Strip, Near Youth Center",
      latitude: -1.9675,
      longitude: 30.0445,
      coverImage: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 2000,
      priceRangeMax: 40000,
      products: [
        { name: "Type-C Charging Port Soldering Repair", nameRw: "Gusana no gusudira aho bacomeka umuriro", price: 3500, priceMin: 3000, priceMax: 5000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Screen Glass Protective Installation", nameRw: "Gushyiraho ikirahure cyo kurinda ekara", price: 2000, priceMin: 1500, priceMax: 3000, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
      ],
    },

    // ----------------------------------------------------------------
    // NORTHERN PROVINCE (Musanze, Burera, Gicumbi, Rulindo, Gakenke)
    // ----------------------------------------------------------------
    {
      id: "demo-nor-mus-kin-1",
      name: "Kinigi Volcano Ecotourism Craft Cooperative",
      nameRw: "Koperative y'Ubukorikori bw'Ibirunga Kinigi",
      category: "tailor_crafts",
      categoryDisplay: "Artisanal Crafts & Souvenirs",
      categoryDisplayRw: "Ubukorikori n'Umutako",
      description: "Carved wooden mountain gorillas, volcanic stone art, handwoven baskets, and handmade wool scarves.",
      descriptionRw: "Ingagi zibajwe mu mbaho, ubugeni bw'amabuye y'ibirunga n'imipira y'ubwoya.",
      phone: "+250780000041 (Demo)",
      provinceCode: "NORTH",
      districtCode: "MUSANZE",
      sectorCode: "KINIGI",
      cellKey: "KINIGI_KAMPANGA",
      cell: "Kampanga",
      sector: "Kinigi",
      district: "Musanze",
      addressNote: "Volcanoes National Park Road",
      latitude: -1.4275,
      longitude: 29.5915,
      coverImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 3000,
      priceRangeMax: 45000,
      products: [
        { name: "Hand-Carved Mountain Gorilla Figurine (Jacaranda Wood)", nameRw: "Igishushanyo cy'ingagi kibajwe", price: 15000, priceMin: 12000, priceMax: 22000, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
        { name: "Volcanic Basalt Stone Candle Holder", nameRw: "Igitekerwamo buji cy'ibuye ry'ikirunga", price: 6000, priceMin: 4500, priceMax: 8000, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
      ],
    },
    {
      id: "demo-nor-bur-1",
      name: "Cyanika Border Traders General Store",
      nameRw: "Amaduka y'Ubutunzi Cyanika ku Mupaka",
      category: "shop_retail",
      categoryDisplay: "Wholesale & Dry Goods",
      categoryDisplayRw: "Amaduka y'Ibicuruzwa",
      description: "Dry beans, maize flour, salt, vegetable oil, and laundry soap for border communities.",
      phone: "+250780000042 (Demo)",
      provinceCode: "NORTH",
      districtCode: "BURERA",
      sectorCode: "CYANIKA",
      cellKey: "CYANIKA_KABYINIRO",
      cell: "Kabyiniro",
      sector: "Cyanika",
      district: "Burera",
      addressNote: "Border Main Street",
      latitude: -1.3475,
      longitude: 29.7415,
      coverImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 400,
      priceRangeMax: 18000,
      products: [
        { name: "Fortified Maize Flour Kawunga (25kg)", nameRw: "Ifu y'ibigori ya Kawunga (25kg)", price: 16500, priceMin: 15000, priceMax: 18000, priceType: PriceType.RANGE, isEstimated: true, unit: "sack" },
        { name: "Dry Yellow Beans (5kg bucket)", nameRw: "Ibishyimbo by'umuhondo (5kg)", price: 5500, priceMin: 4800, priceMax: 6500, priceType: PriceType.RANGE, isEstimated: true, unit: "bucket" },
      ],
    },
    {
      id: "demo-nor-gic-1",
      name: "Gicumbi High-Altitude Dairy & Milk Bar",
      nameRw: "Icyayi n'Amata Meza by'i Gicumbi",
      category: "food_restaurant",
      categoryDisplay: "Dairy & Milk Bar",
      categoryDisplayRw: "Kawa, Icyayi & Amata y'Inka",
      description: "Pasteurized highland cow milk, fermented ikivuguto, hot African ginger tea, and mandazi.",
      phone: "+250780000043 (Demo)",
      provinceCode: "NORTH",
      districtCode: "GICUMBI",
      sectorCode: "BYUMBA",
      cellKey: "BYUMBA_NYAMABUYE",
      cell: "Nyamabuye",
      sector: "Byumba",
      district: "Gicumbi",
      addressNote: "Byumba Town Market Street",
      latitude: -1.5755,
      longitude: 30.0675,
      coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 200,
      priceRangeMax: 2500,
      products: [
        { name: "Fresh Chilled Ikivuguto (Fermented Milk 500ml)", nameRw: "Ikivuguto cyiza cy'inshyushyu (500ml)", price: 700, priceMin: 600, priceMax: 900, priceType: PriceType.RANGE, isEstimated: true, unit: "cup" },
        { name: "Hot Ginger African Tea with Mandazi", nameRw: "Icyayi cy'amazi n'amandazi abiri", price: 500, priceMin: 400, priceMax: 700, priceType: PriceType.RANGE, isEstimated: true, unit: "combo" },
      ],
    },
    {
      id: "demo-nor-rul-1",
      name: "Rulindo Tare Roadside Agri-Market",
      nameRw: "Isoko ry'Umusaruro rya Tare ku Muhanda",
      category: "agriculture_produce",
      categoryDisplay: "Fresh Farm Produce",
      categoryDisplayRw: "Imboga n'Imbuto by'Umusozi",
      description: "Fresh passion fruit baskets, tree tomatoes (ibinyomoro), wild honey, and mountain cabbage.",
      phone: "+250780000044 (Demo)",
      provinceCode: "NORTH",
      districtCode: "RULINDO",
      sectorCode: "TARE",
      cellKey: "TARE_GASIZA",
      cell: "Gasiza",
      sector: "Tare",
      district: "Rulindo",
      addressNote: "Kigali-Musanze RN4 Highway Stop",
      latitude: -1.7325,
      longitude: 29.9825,
      coverImage: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 500,
      priceRangeMax: 8000,
      products: [
        { name: "Fresh Tree Tomatoes Ibinyomoro (1kg)", nameRw: "Ibinyomoro bishya (1kg)", price: 1500, priceMin: 1200, priceMax: 1800, priceType: PriceType.RANGE, isEstimated: true, unit: "kg" },
        { name: "Pure Mountain Forest Honey (500ml glass jar)", nameRw: "Ubuki bw'umwimerere bw'ishyamba", price: 4000, priceMin: 3500, priceMax: 5000, priceType: PriceType.RANGE, isEstimated: true, unit: "jar" },
      ],
    },
    {
      id: "demo-nor-gak-1",
      name: "Gakenke Coffee Growers Tool & Repair Point",
      nameRw: "Ibikoresho by'Abahinzi ba Kawa Gakenke",
      category: "mechanic_repair",
      categoryDisplay: "Agro Tools & Welding",
      categoryDisplayRw: "Gusana Ibikoresho by'Ubuhinzi",
      description: "Sharpening pruning shears, repairing coffee pulping equipment, bicycle transport welding, and machetes.",
      phone: "+250780000045 (Demo)",
      provinceCode: "NORTH",
      districtCode: "GAKENKE",
      sectorCode: "GAKENKE_SECTOR",
      cellKey: "GAKENKE_SECTOR_RUSAGARA",
      cell: "Rusagara",
      sector: "Gakenke",
      district: "Gakenke",
      addressNote: "Near Gakenke District Office",
      latitude: -1.6955,
      longitude: 29.7885,
      coverImage: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 1000,
      priceRangeMax: 28000,
      products: [
        { name: "Bicycle Cargo Carrier Frame Reinforced Welding", nameRw: "Gusudira igare ry'imizigo", price: 4500, priceMin: 3500, priceMax: 6000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Coffee Tree Pruning Shears (Forged Steel)", nameRw: "Umukerekezo wo gutunganya ikawa", price: 7500, priceMin: 6500, priceMax: 9000, priceType: PriceType.RANGE, isEstimated: true, unit: "item" },
      ],
    },

    // ----------------------------------------------------------------
    // SOUTHERN PROVINCE (Huye, Nyanza, Gisagara, Muhanga, Kamonyi, Ruhango, Nyamagabe, Nyaruguru)
    // ----------------------------------------------------------------
    {
      id: "demo-sou-nya-1",
      name: "Nyanza Royal Heritage Milk Bar & Creamery",
      nameRw: "Amata y'Ingoma i Nyanza",
      category: "food_restaurant",
      categoryDisplay: "Traditional Milk Bar",
      categoryDisplayRw: "Amata n'Iby'Umuco",
      description: "Traditional fermented milk (ikivuguto), fresh raw unpasteurized milk from Inyambo cattle lineage, and local cheese.",
      phone: "+250780000051 (Demo)",
      provinceCode: "SOUTH",
      districtCode: "NYANZA",
      sectorCode: "BUSASAMANA",
      cellKey: "BUSASAMANA_NYANZA",
      cell: "Nyanza",
      sector: "Busasamana",
      district: "Nyanza",
      addressNote: "Royal Palace Museum Road",
      latitude: -2.3515,
      longitude: 29.7495,
      coverImage: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 300,
      priceRangeMax: 4000,
      products: [
        { name: "Traditional Nyanza Clay Pot Ikivuguto (1 Liter)", nameRw: "Ikivuguto cy'inkongoro y'ububumbyi", price: 1200, priceMin: 1000, priceMax: 1500, priceType: PriceType.RANGE, isEstimated: true, unit: "liter" },
        { name: "Nyanza Artisan Cow Milk Cheese (250g wheel)", nameRw: "Foromaje y'amata y'inka (250g)", price: 3000, priceMin: 2500, priceMax: 3800, priceType: PriceType.RANGE, isEstimated: true, unit: "wheel" },
      ],
    },
    {
      id: "demo-sou-muh-1",
      name: "Muhanga Junction Moto Garage & Tires",
      nameRw: "Garaje ya Moto n'Amapine Muhanga",
      category: "mechanic_repair",
      categoryDisplay: "Mechanic & Tires",
      categoryDisplayRw: "Abakanishi ba Moto",
      description: "Motorcycle engine overhauls, tubeless tire puncture repair, suspension tuning, and high-quality chain replacement.",
      phone: "+250780000052 (Demo)",
      provinceCode: "SOUTH",
      districtCode: "MUHANGA",
      sectorCode: "NYAMABUYE",
      cellKey: "NYAMABUYE_GITARAMA",
      localAreaName: "Muhanga Commercial Crossroads",
      cell: "Gitarama",
      sector: "Nyamabuye",
      district: "Muhanga",
      addressNote: "RN1 Commercial Corridor, Garage 4",
      latitude: -2.0788,
      longitude: 29.7558,
      coverImage: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 1500,
      priceRangeMax: 50000,
      products: [
        { name: "Motorcycle Drive Chain & Sprocket Set Replacement", nameRw: "Gushyiramo umunyururu mushya wa moto", price: 18000, priceMin: 15000, priceMax: 22000, priceType: PriceType.RANGE, isEstimated: true, unit: "set" },
        { name: "Tubeless Tire Puncture Vulcanization", nameRw: "Kuvurikaniza ipine ritagira umuheha", price: 2000, priceMin: 1500, priceMax: 2500, priceType: PriceType.RANGE, isEstimated: true, unit: "tire" },
      ],
    },
    {
      id: "demo-sou-kam-1",
      name: "Kamonyi Ruyenzi Modern Salon & Barber",
      nameRw: "Salo yo Kogosha no Gutunganya Imisatsi Ruyenzi",
      category: "salon_barber",
      categoryDisplay: "Barber & Hair Styling",
      categoryDisplayRw: "Kogosha & Gutunganya Imisatsi",
      description: "Men's fade haircuts, dreadlock interlocking, women's cornrows, facial steam scrub, and beard conditioning.",
      phone: "+250780000053 (Demo)",
      provinceCode: "SOUTH",
      districtCode: "KAMONYI",
      sectorCode: "RUNDA",
      cellKey: "RUNDA_RUYENZI",
      cell: "Ruyenzi",
      sector: "Runda",
      district: "Kamonyi",
      addressNote: "Ruyenzi Center, Opposite Taxi Park",
      latitude: -1.9955,
      longitude: 29.9315,
      coverImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 1000,
      priceRangeMax: 15000,
      products: [
        { name: "Classic Men's Fade Haircut & Beard Trim", nameRw: "Kogosha umusatsi n'ubwanwa neza", price: 2000, priceMin: 1500, priceMax: 2500, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Ladies Cornrow Braiding (Full Head)", nameRw: "Gusuka ibisuko by'abagore", price: 6000, priceMin: 5000, priceMax: 8000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
      ],
    },
    {
      id: "demo-sou-ruh-1",
      name: "Ruhango Kinazi Cassava Flour Depot",
      nameRw: "Ububiko bw'Ifu y'Imyumbati Ruhango",
      category: "agriculture_produce",
      categoryDisplay: "Grain & Cassava Depot",
      categoryDisplayRw: "Ifu y'Imyumbati n'Ibinyamisogwe",
      description: "Finely milled odorless cassava flour (Ifu y'imyumbati), sweet potato starch, and dry red beans.",
      phone: "+250780000054 (Demo)",
      provinceCode: "SOUTH",
      districtCode: "RUHANGO",
      sectorCode: "RUHANGO_SECTOR",
      cellKey: "RUHANGO_SECTOR_BUHORO",
      cell: "Buhoro",
      sector: "Ruhango",
      district: "Ruhango",
      addressNote: "Ruhango Commercial Market",
      latitude: -2.2225,
      longitude: 29.7805,
      coverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 500,
      priceRangeMax: 12000,
      products: [
        { name: "Premium Odorless Cassava Flour (25kg sack)", nameRw: "Ifu y'imyumbati idafite impumuro (25kg)", price: 11000, priceMin: 9500, priceMax: 12500, priceType: PriceType.RANGE, isEstimated: true, unit: "sack" },
      ],
    },
    {
      id: "demo-sou-nya2-1",
      name: "Nyamagabe Mountain Tea & Seedling Nursery",
      nameRw: "Icyayi cy'Imisozi n'Ingemwe Nyamagabe",
      category: "agriculture_produce",
      categoryDisplay: "Tea & Tree Seedlings",
      categoryDisplayRw: "Ingemwe z'Icyayi n'Ibiti",
      description: "Highland Kitabi black tea leaves, avocado grafted seedlings, agroforestry tree saplings, and organic compost.",
      phone: "+250780000055 (Demo)",
      provinceCode: "SOUTH",
      districtCode: "NYAMAGABE",
      sectorCode: "GASAKA",
      cellKey: "GASAKA_NYAMAGABE",
      cell: "Nyamagabe",
      sector: "Gasaka",
      district: "Nyamagabe",
      addressNote: "Kitabi Road Junction",
      latitude: -2.4775,
      longitude: 29.4785,
      coverImage: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 500,
      priceRangeMax: 6000,
      products: [
        { name: "Premium Loose Black Tea Leaves (500g tin)", nameRw: "Icyayi cy'umukara gitetse (500g)", price: 3500, priceMin: 3000, priceMax: 4500, priceType: PriceType.RANGE, isEstimated: true, unit: "tin" },
        { name: "Hass Avocado Grafted Seedling (ready for planting)", nameRw: "Urugemwe rw'avoka rwa Hass", price: 1500, priceMin: 1200, priceMax: 2000, priceType: PriceType.RANGE, isEstimated: true, unit: "seedling" },
      ],
    },
    {
      id: "demo-sou-nyar-1",
      name: "Kibeho Pilgrims Hospitality & Craft Center",
      nameRw: "Ibicuruzwa n'Umutako by'Abasura Kibeho",
      category: "services",
      categoryDisplay: "Pilgrim Services & Crafts",
      categoryDisplayRw: "Serivisi z'Ubukerarugendo",
      description: "Religious souvenirs, hand-made rosaries, lodging guides, clean drinking water supply, and umbrellas.",
      phone: "+250780000056 (Demo)",
      provinceCode: "SOUTH",
      districtCode: "NYARUGURU",
      sectorCode: "KIBEHO",
      cellKey: "KIBEHO_NYANGE",
      cell: "Nyange",
      sector: "Kibeho",
      district: "Nyaruguru",
      addressNote: "Sanctuary Way",
      latitude: -2.7155,
      longitude: 29.5245,
      coverImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 1000,
      priceRangeMax: 15000,
      products: [
        { name: "Olive Wood Handcrafted Rosary Beads", nameRw: "Ishapule y'ibiti by'amavuta", price: 4000, priceMin: 3000, priceMax: 6000, priceType: PriceType.RANGE, isEstimated: true, unit: "piece" },
      ],
    },

    // ----------------------------------------------------------------
    // EASTERN PROVINCE (Rwamagana, Kayonza, Gatsibo, Nyagatare, Bugesera, Ngoma, Kirehe)
    // ----------------------------------------------------------------
    {
      id: "demo-eas-rwa-1",
      name: "Rwamagana Lake Muhazi Tilapia & Grill Point",
      nameRw: "Ifi ya Tilapiya y'i Muhazi i Rwamagana",
      category: "food_restaurant",
      categoryDisplay: "Fresh Lake Fish & Grill",
      categoryDisplayRw: "Amafi Nshya ya Tilapiya",
      description: "Charcoal-grilled fresh Lake Muhazi tilapia, fried plantains (akabenz), fresh salad, and cold beverages.",
      phone: "+250780000061 (Demo)",
      provinceCode: "EAST",
      districtCode: "RWAMAGANA",
      sectorCode: "KIGABIRO",
      cellKey: "KIGABIRO_SIBAGIRE",
      localAreaName: "Rwamagana Main Bus Terminal & Market",
      cell: "Sibagire",
      sector: "Kigabiro",
      district: "Rwamagana",
      addressNote: "Near Lake Muhazi Road Turnoff",
      latitude: -1.9475,
      longitude: 30.4335,
      coverImage: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 3000,
      priceRangeMax: 18000,
      products: [
        { name: "Whole Charcoal Grilled Tilapia with Chips & Salad", nameRw: "Ifi yose ya tilapiya ikaranze n'ibirayi", price: 8000, priceMin: 7000, priceMax: 10000, priceType: PriceType.RANGE, isEstimated: true, unit: "plate" },
      ],
    },
    {
      id: "demo-eas-kay-1",
      name: "Kayonza Highway Truck Stop & Auto Electrician",
      nameRw: "Umunyamashanyarazi w'Imodoka Kayonza",
      category: "mechanic_repair",
      categoryDisplay: "Auto Electrics & Battery",
      categoryDisplayRw: "Amashanyarazi y'Imodoka",
      description: "Heavy truck and car alternator diagnostics, 12V/24V battery charging, headlamp leveling, and wiring repairs.",
      phone: "+250780000062 (Demo)",
      provinceCode: "EAST",
      districtCode: "KAYONZA",
      sectorCode: "MUKARANGE",
      cellKey: "MUKARANGE_KAYONZA",
      cell: "Kayonza",
      sector: "Mukarange",
      district: "Kayonza",
      addressNote: "Kayonza Junction RN3/RN4",
      latitude: -1.8975,
      longitude: 30.6545,
      coverImage: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 2000,
      priceRangeMax: 45000,
      products: [
        { name: "12V Battery Fast Charging & Acid Level Top-Up", nameRw: "Gusharija bateri y'imodoka", price: 3000, priceMin: 2500, priceMax: 4000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
        { name: "Starter Motor Solenoid & Brush Replacement", nameRw: "Gusana demoleli y'imodoka", price: 15000, priceMin: 12000, priceMax: 20000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
      ],
    },
    {
      id: "demo-eas-nya-1",
      name: "Nyagatare Savanna Agro-Vet & Livestock Clinic",
      nameRw: "Imiti y'Amatungo n'Ubuhinzi Nyagatare",
      category: "agriculture_produce",
      categoryDisplay: "Veterinary Supplies & Feed",
      categoryDisplayRw: "Imiti n'Ibiryo by'Amatungo",
      description: "Dairy cattle acaricide sprays for tick control, mastitis injectors, mineral licking blocks, and alfalfa grass seeds.",
      phone: "+250780000063 (Demo)",
      provinceCode: "EAST",
      districtCode: "NYAGATARE",
      sectorCode: "NYAGATARE_SECTOR",
      cellKey: "NYAGATARE_SECTOR_BARIJA",
      localAreaName: "Nyagatare Dairy Cattle Trade Point",
      cell: "Barija",
      sector: "Nyagatare",
      district: "Nyagatare",
      addressNote: "Commercial Street, Near Dairy Plant",
      latitude: -1.2968,
      longitude: 30.3248,
      coverImage: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 2500,
      priceRangeMax: 40000,
      products: [
        { name: "Cattle Tick Control Dip Solution (1 Liter)", nameRw: "Umuti w'Ingurube n'Inka wo kurwanya imituku", price: 16000, priceMin: 14000, priceMax: 18500, priceType: PriceType.RANGE, isEstimated: true, unit: "bottle" },
        { name: "Mineral Salt Licking Block for Dairy Cows (5kg)", nameRw: "Umunyu w'inka zo gukamwa (5kg)", price: 4500, priceMin: 4000, priceMax: 5500, priceType: PriceType.RANGE, isEstimated: true, unit: "block" },
      ],
    },
    {
      id: "demo-eas-bug-1",
      name: "Bugesera Green Valley Irrigation & Solar Pumps",
      nameRw: "Ibyuma byo Kuhira n'Imirasire Bugesera",
      category: "hardware_construction",
      categoryDisplay: "Irrigation & Solar Equipment",
      categoryDisplayRw: "Ibikoresho byo Kuhira",
      description: "Submersible DC solar water pumps, drip irrigation pipe rolls, PVC connectors, and high-efficiency solar panels.",
      phone: "+250780000064 (Demo)",
      provinceCode: "EAST",
      districtCode: "BUGESERA",
      sectorCode: "NYAMATA",
      cellKey: "NYAMATA_NYAMATA_VILLE",
      localAreaName: "Nyamata Town Center & Boulevard",
      cell: "Nyamata Ville",
      sector: "Nyamata",
      district: "Bugesera",
      addressNote: "Airport Boulevard, Commercial Complex #3",
      latitude: -2.1598,
      longitude: 30.0898,
      coverImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=60",
      priceRange: "PREMIUM",
      priceRangeMin: 15000,
      priceRangeMax: 350000,
      products: [
        { name: "Drip Irrigation Pipe Roll (100 meters, 16mm)", nameRw: "Imiheha yo kuhira amatonyanga (100m)", price: 28000, priceMin: 24000, priceMax: 32000, priceType: PriceType.RANGE, isEstimated: true, unit: "roll" },
        { name: "DC Solar Submersible Water Pump (12V/150W)", nameRw: "Pompe y'amazi ikoresha imirasire y'izuba", price: 145000, priceMin: 130000, priceMax: 165000, priceType: PriceType.RANGE, isEstimated: true, unit: "unit" },
      ],
    },
    {
      id: "demo-eas-ngo-1",
      name: "Ngoma Kibungo Banana Agro-Flour & Juice Point",
      nameRw: "Umutobe w'Ibitoki & Ifu Kibungo",
      category: "food_restaurant",
      categoryDisplay: "Local Juice & Bakery",
      categoryDisplayRw: "Umutobe n'Ibyo Kurya",
      description: "Fresh banana juice (umutobe w'ibitoki), plantain chips, roasted groundnuts, and freshly baked bread.",
      phone: "+250780000065 (Demo)",
      provinceCode: "EAST",
      districtCode: "NGOMA",
      sectorCode: "KIBUNGO",
      cellKey: "KIBUNGO_KIBUNGO",
      cell: "Kibungo",
      sector: "Kibungo",
      district: "Ngoma",
      addressNote: "Kibungo Market St",
      latitude: -2.1635,
      longitude: 30.5355,
      coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 300,
      priceRangeMax: 3000,
      products: [
        { name: "Fresh Banana Juice Umutobe (500ml bottle)", nameRw: "Umutobe mwiza w'ibitoki (500ml)", price: 600, priceMin: 500, priceMax: 800, priceType: PriceType.RANGE, isEstimated: true, unit: "bottle" },
      ],
    },
    {
      id: "demo-eas-kir-1",
      name: "Kirehe Gatore Rice Milling & Grain Depot",
      nameRw: "Urusyo rw'Umuceri n'Imyaka Gatore",
      category: "shop_retail",
      categoryDisplay: "Rice Milling & Grains",
      categoryDisplayRw: "Umuceri n'Urusyo",
      description: "Freshly milled Kirehe marshland aromatic rice, white maize grain, sorghum flour, and soybean grain.",
      phone: "+250780000066 (Demo)",
      provinceCode: "EAST",
      districtCode: "KIREHE",
      sectorCode: "GATORE",
      cellKey: "GATORE_CURAZO",
      cell: "Curazo",
      sector: "Gatore",
      district: "Kirehe",
      addressNote: "Gatore Commercial Center",
      latitude: -2.2675,
      longitude: 30.6505,
      coverImage: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 800,
      priceRangeMax: 32000,
      products: [
        { name: "Grade 1 Aromatic Kirehe Long Grain Rice (25kg)", nameRw: "Umuceri mwiza wa Kirehe (25kg)", price: 29000, priceMin: 27000, priceMax: 32000, priceType: PriceType.RANGE, isEstimated: true, unit: "sack" },
      ],
    },

    // ----------------------------------------------------------------
    // WESTERN PROVINCE (Rubavu, Rusizi, Karongi, Rutsiro, Nyamasheke, Ngororero, Nyabihu)
    // ----------------------------------------------------------------
    {
      id: "demo-wes-rus-1",
      name: "Rusizi Kamembe Port Cross-Border Logistics & Irembo",
      nameRw: "Irembo & Serivisi z'Ubwikorezi Kamembe",
      category: "services",
      categoryDisplay: "Logistics, Irembo & Print",
      categoryDisplayRw: "Serivisi z'Irembo & Ubwikorezi",
      description: "Cross-border travel clearance assistance, Irembo document filings, color photocopies, and express cargo tracking.",
      phone: "+250780000071 (Demo)",
      provinceCode: "WEST",
      districtCode: "RUSIZI",
      sectorCode: "KAMEMBE",
      cellKey: "KAMEMBE_KAMEMBE",
      localAreaName: "Kamembe Commercial Port & Market",
      cell: "Kamembe",
      sector: "Kamembe",
      district: "Rusizi",
      addressNote: "Port Access Road, Unit 5",
      latitude: -2.4828,
      longitude: 28.8978,
      coverImage: "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 500,
      priceRangeMax: 10000,
      products: [
        { name: "Border Pass Filing Assistance & Passport Photo", nameRw: "Gusaba uruhushya rwo kwambuka umupaka", price: 2000, priceMin: 1500, priceMax: 3000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
      ],
    },
    {
      id: "demo-wes-kar-1",
      name: "Karongi Kibuye Boat Repair & Lake Kivu Fish Depot",
      nameRw: "Gusana Ubwato & Isambaza Kibuye",
      category: "mechanic_repair",
      categoryDisplay: "Boat Mechanics & Fisheries",
      categoryDisplayRw: "Gusana Ubwato & Amafi",
      description: "Outboard boat engine repairs (Yamaha/Suzuki), fishing net mending, fresh Sambaza drying racks, and lake life jackets.",
      phone: "+250780000072 (Demo)",
      provinceCode: "WEST",
      districtCode: "KARONGI",
      sectorCode: "BWISHYURA",
      cellKey: "BWISHYURA_KIBUYE",
      localAreaName: "Kibuye Lakeside Promenade & Harbor",
      cell: "Kibuye",
      sector: "Bwishyura",
      district: "Karongi",
      addressNote: "Lake Kivu Marina Road",
      latitude: -2.0618,
      longitude: 29.3508,
      coverImage: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=800&auto=format&fit=crop&q=60",
      priceRange: "MODERATE",
      priceRangeMin: 2000,
      priceRangeMax: 65000,
      products: [
        { name: "Lake Kivu Sun-Dried Crispy Sambaza (1kg bag)", nameRw: "Isambaza zikaranze z'i Kivu (1kg)", price: 4500, priceMin: 4000, priceMax: 5500, priceType: PriceType.RANGE, isEstimated: true, unit: "kg" },
        { name: "Outboard Boat Motor Spark Plug & Carburetor Tune-up", nameRw: "Gutunganya moteri y'ubwato", price: 15000, priceMin: 12000, priceMax: 20000, priceType: PriceType.RANGE, isEstimated: true, unit: "service" },
      ],
    },
    {
      id: "demo-wes-nya-1",
      name: "Nyabihu Mukamira High-Altitude Seed Potato Depot",
      nameRw: "Imbuto y'Ibirayi bya Kinigi Mukamira",
      category: "agriculture_produce",
      categoryDisplay: "Seed Potatoes & Fertilizer",
      categoryDisplayRw: "Imbuto y'Ibirayi",
      description: "Certified disease-free Kinigi and Kuruseke seed potatoes, organic compost, and potato storage sacks.",
      phone: "+250780000073 (Demo)",
      provinceCode: "WEST",
      districtCode: "NYABIHU",
      sectorCode: "MUKAMIRA",
      cellKey: "MUKAMIRA_JENDA",
      cell: "Jenda",
      sector: "Mukamira",
      district: "Nyabihu",
      addressNote: "Mukamira Potato Hub",
      latitude: -1.6535,
      longitude: 29.5095,
      coverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=60",
      priceRange: "LOW",
      priceRangeMin: 800,
      priceRangeMax: 22000,
      products: [
        { name: "Certified Kinigi Seed Potatoes (50kg bag)", nameRw: "Imbuto y'ibirayi y'ikinigi (50kg)", price: 19000, priceMin: 17000, priceMax: 22000, priceType: PriceType.RANGE, isEstimated: true, unit: "bag" },
      ],
    },
  ];

  let seededBizCount = 0;
  let seededProdCount = 0;

  for (const b of nationwideDemoBusinesses) {
    const { products, provinceCode, districtCode, sectorCode, cellKey, localAreaName, ...bizData } = b;

    const provinceId = provinces[provinceCode]?.id;
    const districtId = districts[districtCode]?.id;
    const sectorId = sectors[sectorCode]?.id;
    const cellId = cellKey && cells[cellKey] ? cells[cellKey].id : null;
    const localAreaId = localAreaName && localAreas[localAreaName] ? localAreas[localAreaName].id : null;

    const upsertedBiz = await prisma.business.upsert({
      where: { id: b.id },
      update: {
        ...bizData,
        provinceId,
        districtId,
        sectorId,
        cellId,
        localAreaId,
        dataStatus: DataStatus.DEMO,
        source: "SAMPLE_SEED",
      },
      create: {
        ...bizData,
        provinceId,
        districtId,
        sectorId,
        cellId,
        localAreaId,
        dataStatus: DataStatus.DEMO,
        source: "SAMPLE_SEED",
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
    });
    seededBizCount++;

    if (products && products.length > 0) {
      for (const p of products) {
        // Check if product already exists
        const existingProd = await prisma.product.findFirst({
          where: { businessId: upsertedBiz.id, name: p.name },
        });

        if (!existingProd) {
          await prisma.product.create({
            data: {
              businessId: upsertedBiz.id,
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
          });
          seededProdCount++;
        }
      }
    }
  }

  console.log(`✓ Seeded ${seededBizCount} Representative DEMO Businesses with ${seededProdCount} Estimated Price Products`);

  // ==========================================
  // 7. COMMUNITY DEMAND SIGNALS ACROSS REGIONS
  // ==========================================
  const regionalDemands = [
    { sectorCode: "MUHOZA", cell: "Ruhengeri", category: "Hardware & Construction", queryTerm: "Corrugated iron sheets & cement", queryTermRw: "Amabati n'amasima yo gusakara", searchCount: 42, activeBusinessesCount: 1, opportunityScore: "HIGH" },
    { sectorCode: "NGOMA", cell: "Matyazo", category: "Carpentry & Furniture", queryTerm: "Hardwood study desks & chairs", queryTermRw: "Ameza n'intebe byo gusomeraho", searchCount: 36, activeBusinessesCount: 1, opportunityScore: "HIGH" },
    { sectorCode: "GISENYI", cell: "Kivumu", category: "Fish & Fresh Produce", queryTerm: "Fresh lake Sambaza crate supply", queryTermRw: "Kugura isambaza nshya z'ikiyaga", searchCount: 51, activeBusinessesCount: 1, opportunityScore: "VERY_HIGH" },
    { sectorCode: "KIGABIRO", cell: "Sibagire", category: "Dairy & Livestock", queryTerm: "Bulk cow milk & cheese supplier", queryTermRw: "Amata menshi n'amata y'uruganda", searchCount: 28, activeBusinessesCount: 1, opportunityScore: "HIGH" },
    { sectorCode: "NYAMATA", cell: "Nyamata Ville", category: "Solar & Irrigation", queryTerm: "Solar drip irrigation water pump", queryTermRw: "Pompe z'amazi z'imirasire y'izuba", searchCount: 39, activeBusinessesCount: 1, opportunityScore: "HIGH" },
    { sectorCode: "KAMEMBE", cell: "Kamembe", category: "Public & Irembo Services", queryTerm: "Cross border permit & Irembo", queryTermRw: "Uruhushya rwo kwambuka umupaka", searchCount: 44, activeBusinessesCount: 1, opportunityScore: "HIGH" },
  ];

  for (const d of regionalDemands) {
    const { sectorCode, ...demandData } = d;
    await prisma.communityDemand.create({
      data: {
        ...demandData,
        sector: sectors[sectorCode]?.name || "Rwanda",
        sectorId: sectors[sectorCode]?.id,
      },
    }).catch(() => {});
  }
  console.log(`✓ Seeded ${regionalDemands.length} Regional Community Demand Signals`);

  // ==========================================
  // 8. FINAL METRICS VERIFICATION
  // ==========================================
  const totalProvinces = await prisma.geographicProvince.count();
  const totalDistricts = await prisma.geographicDistrict.count();
  const totalSectors = await prisma.geographicSector.count();
  const totalCells = await prisma.geographicCell.count();
  const totalLocalAreas = await prisma.localArea.count();
  const totalBusinesses = await prisma.business.count();
  const demoBusinesses = await prisma.business.count({ where: { dataStatus: DataStatus.DEMO } });
  const researchedBusinesses = await prisma.business.count({ where: { dataStatus: DataStatus.RESEARCHED } });
  const verifiedBusinesses = await prisma.business.count({ where: { dataStatus: DataStatus.VERIFIED } });
  const totalProducts = await prisma.product.count();
  const estimatedProducts = await prisma.product.count({ where: { isEstimated: true } });

  console.log("\n==================================================================");
  console.log("📊 NATIONWIDE DATASET SEEDING COMPLETE — SUMMARY METRICS");
  console.log("==================================================================");
  console.log(`• Provinces in Neon:        ${totalProvinces} (All 5 Official Provinces)`);
  console.log(`• Districts in Neon:        ${totalDistricts} (All 30 Official Districts)`);
  console.log(`• Sectors in Neon:          ${totalSectors}`);
  console.log(`• Cells in Neon:            ${totalCells}`);
  console.log(`• Local Areas / Landmarks:  ${totalLocalAreas}`);
  console.log(`• Total Businesses:         ${totalBusinesses}`);
  console.log(`  - DEMO Businesses:        ${demoBusinesses} (clearly marked samples)`);
  console.log(`  - RESEARCHED Businesses:  ${researchedBusinesses}`);
  console.log(`  - VERIFIED Businesses:    ${verifiedBusinesses} (includes original Nyamirambo pilot)`);
  console.log(`• Total Products / Services: ${totalProducts}`);
  console.log(`  - Estimated Price Ranged: ${estimatedProducts}`);
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("Nationwide seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
