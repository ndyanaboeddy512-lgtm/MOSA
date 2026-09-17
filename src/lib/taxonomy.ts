/**
 * MOSA Canonical 3-Tier Business Category Taxonomy
 * 
 * Hierarchy:
 *   Tier 1: Main Category (Broad economic sector)
 *   Tier 2: Subcategory (Functional commercial domain)
 *   Tier 3: Business Type (Specific micro-business establishment type)
 *
 * Fully localized in English (en), Kinyarwanda (rw), French (fr), and Kiswahili (sw).
 */

export interface BusinessTypeItem {
  id: string;
  name: string;
  nameRw: string;
  nameFr: string;
  nameSw: string;
  subCategoryId: string;
  mainCategoryId: string;
  description?: string;
  descriptionRw?: string;
}

export interface SubCategoryItem {
  id: string;
  name: string;
  nameRw: string;
  nameFr: string;
  nameSw: string;
  mainCategoryId: string;
  types: BusinessTypeItem[];
}

export interface MainCategoryItem {
  id: string;
  name: string;
  nameRw: string;
  nameFr: string;
  nameSw: string;
  icon: string;
  subcategories: SubCategoryItem[];
}

export const CANONICAL_TAXONOMY: MainCategoryItem[] = [
  // 1. Retail & Everyday Commerce
  {
    id: "retail",
    name: "Retail & Everyday Commerce",
    nameRw: "Ubucuruzi bwo mu Iduka",
    nameFr: "Commerce de Détail",
    nameSw: "Biashara ya Rejareja",
    icon: "ShoppingBag",
    subcategories: [
      {
        id: "food_groceries",
        name: "Food & Groceries",
        nameRw: "Ibiribwa n'Ibicuruzwa by'Ibanze",
        nameFr: "Alimentation & Épicerie",
        nameSw: "Vyakula na Bidhaa za Nyumbani",
        mainCategoryId: "retail",
        types: [
          { id: "grocery_shop", name: "Grocery Shop / Alimentation", nameRw: "Iduka ry'Ibiribwa (Alimentation)", nameFr: "Épicerie / Alimentation", nameSw: "Duka la Vyakula", subCategoryId: "food_groceries", mainCategoryId: "retail" },
          { id: "fruits_vegetables", name: "Fresh Fruits & Vegetables", nameRw: "Imbuto n'Imboga Nshya", nameFr: "Fruits & Légumes Frais", nameSw: "Matunda na Mbogamboga", subCategoryId: "food_groceries", mainCategoryId: "retail" },
          { id: "butchery", name: "Butchery & Fresh Meat", nameRw: "Ibagiro ry'Inyama (Boucherie)", nameFr: "Boucherie & Viande Fraîche", nameSw: "Bucha ya Nyama", subCategoryId: "food_groceries", mainCategoryId: "retail" },
          { id: "fish_monger", name: "Fresh & Smoked Fish", nameRw: "Amafi Mashya n'Ayumye", nameFr: "Poissonnerie", nameSw: "Samaki Safi na Wakukausha", subCategoryId: "food_groceries", mainCategoryId: "retail" },
          { id: "minimarket", name: "Neighborhood Minimarket", nameRw: "Minimarket y'Agace", nameFr: "Supérette de Quartier", nameSw: "Minimarket ya Mtaani", subCategoryId: "food_groceries", mainCategoryId: "retail" },
        ],
      },
      {
        id: "fashion_apparel",
        name: "Clothing & Footwear",
        nameRw: "Imyenda n'Inkweto",
        nameFr: "Habillement & Chaussures",
        nameSw: "Mavazi na Viatu",
        mainCategoryId: "retail",
        types: [
          { id: "clothing_boutique", name: "Clothing Boutique", nameRw: "Butike y'Imyenda Mishya", nameFr: "Boutique de Prêt-à-Porter", nameSw: "Duka la Nguo Mpya", subCategoryId: "fashion_apparel", mainCategoryId: "retail" },
          { id: "caguwa_retail", name: "Quality Second-Hand (Caguwa)", nameRw: "Imyenda ya Caguwa", nameFr: "Fripes Sélectionnées (Caguwa)", nameSw: "Nguo za Mitumba (Caguwa)", subCategoryId: "fashion_apparel", mainCategoryId: "retail" },
          { id: "footwear_shop", name: "Shoes & Footwear Shop", nameRw: "Iduka ry'Inkweto", nameFr: "Magasin de Chaussures", nameSw: "Duka la Viatu", subCategoryId: "fashion_apparel", mainCategoryId: "retail" },
          { id: "accessories_shop", name: "Bags & Fashion Accessories", nameRw: "Ibikapu n'Imitako", nameFr: "Sacs & Accessoires de Mode", nameSw: "Mifuko na Mapambo", subCategoryId: "fashion_apparel", mainCategoryId: "retail" },
        ],
      },
      {
        id: "household_electronics",
        name: "Household Goods & Electronics",
        nameRw: "Ibikoresho by'Inzu n'Ibyuma",
        nameFr: "Articles Ménagers & Électronique",
        nameSw: "Vyombo vya Nyumbani na Vifaa vya Umeme",
        mainCategoryId: "retail",
        types: [
          { id: "phone_retail", name: "Mobile Phones & Accessories", nameRw: "Telefoni n'Ibyo Kwifashisha", nameFr: "Téléphones & Accessoires", nameSw: "Simu na Vifaa Vyake", subCategoryId: "household_electronics", mainCategoryId: "retail" },
          { id: "home_appliances", name: "Home Utensils & Plastics", nameRw: "Ibikoresho byo mu Gikoni", nameFr: "Ustensiles de Cuisine & Plastiques", nameSw: "Vyombo vya Jikoni na Plastiki", subCategoryId: "household_electronics", mainCategoryId: "retail" },
          { id: "hardware_retail", name: "Hardware, Tools & Paint", nameRw: "Iduka ry'Ubwubatsi (Quincaillerie)", nameFr: "Quincaillerie & Peinture", nameSw: "Vifaa vya Ujenzi na Rangi", subCategoryId: "household_electronics", mainCategoryId: "retail" },
          { id: "electrical_supplies", name: "Electrical Supplies & Solar", nameRw: "Ibicuruzwa by'Amashanyarazi n'Izuba", nameFr: "Matériel Électrique & Solaire", nameSw: "Vifaa vya Umeme na Sola", subCategoryId: "household_electronics", mainCategoryId: "retail" },
        ],
      },
      {
        id: "general_retail",
        name: "Kiosks & General Merchandise",
        nameRw: "Kiyosike n'Ibicuruzwa Rusange",
        nameFr: "Kiosques & Articles Divers",
        nameSw: "Kioski na Bidhaa Mchanganyiko",
        mainCategoryId: "retail",
        types: [
          { id: "neighborhood_kiosk", name: "Neighborhood Kiosk", nameRw: "Kiyosike y'Agace", nameFr: "Kiosque de Quartier", nameSw: "Kioski ya Mtaani", subCategoryId: "general_retail", mainCategoryId: "retail" },
          { id: "stationery_shop", name: "Stationery & School Supplies", nameRw: "Ibicuruzwa by'Ishuri (Papeterie)", nameFr: "Papeterie & Fournitures Scolaires", nameSw: "Vifaa vya Shule na Ofisi", subCategoryId: "general_retail", mainCategoryId: "retail" },
        ],
      },
    ],
  },

  // 2. Personal Care & Beauty
  {
    id: "personal_care",
    name: "Personal Care & Beauty",
    nameRw: "Ubwiza n'Isuku y'Umubiri",
    nameFr: "Soins Personnels & Beauté",
    nameSw: "Urembo na Usafi Binafsi",
    icon: "Sparkles",
    subcategories: [
      {
        id: "beauty_hair",
        name: "Hair & Grooming",
        nameRw: "Imisatsi n'Ubwanwa",
        nameFr: "Coiffure & Soins Capillaires",
        nameSw: "Kutengeneza Nywele na Ndevu",
        mainCategoryId: "personal_care",
        types: [
          { id: "hair_salon", name: "Hair Salon / Coiffure", nameRw: "Saluni y'Abari n'Abategarugori", nameFr: "Salon de Coiffure Dames", nameSw: "Saluni ya Wanawake", subCategoryId: "beauty_hair", mainCategoryId: "personal_care" },
          { id: "barbershop", name: "Barbershop / Kinyozi", nameRw: "Ikinyozi (Saluni y'Abagabo)", nameFr: "Salon de Coiffure Hommes / Kinyozi", nameSw: "Kinyozi", subCategoryId: "beauty_hair", mainCategoryId: "personal_care" },
          { id: "braiding_studio", name: "Braiding & Dreadlocks Studio", nameRw: "Ibyo Kuboha Imisatsi na Dreadlocks", nameFr: "Tresses & Dreadlocks", nameSw: "Kusuka Nywele na Rasta", subCategoryId: "beauty_hair", mainCategoryId: "personal_care" },
          { id: "nail_bar", name: "Nail & Lash Bar", nameRw: "Ibyo Gukora Inzara n'Ingohe", nameFr: "Onglerie & Cils", nameSw: "Kusafisha na Kupaka Kucha", subCategoryId: "beauty_hair", mainCategoryId: "personal_care" },
        ],
      },
      {
        id: "wellness_spa",
        name: "Cosmetics & Wellness",
        nameRw: "Amavuta yo Kwisiga n'Ubuzima",
        nameFr: "Cosmétiques & Bien-Être",
        nameSw: "Vipodozi na Massage",
        mainCategoryId: "personal_care",
        types: [
          { id: "cosmetics_shop", name: "Cosmetics & Perfume Shop", nameRw: "Iduka ry'Amavuta n'Imibavu", nameFr: "Boutique de Cosmétiques & Parfums", nameSw: "Duka la Vipodozi na Marashi", subCategoryId: "wellness_spa", mainCategoryId: "personal_care" },
          { id: "massage_spa", name: "Local Massage & Spa Studio", nameRw: "Ahabera Massage n'Isuku", nameFr: "Studio de Massage & Spa", nameSw: "Chumba cha Massage na Spa", subCategoryId: "wellness_spa", mainCategoryId: "personal_care" },
        ],
      },
    ],
  },

  // 3. Food, Dining & Hospitality
  {
    id: "food_hospitality",
    name: "Food, Dining & Hospitality",
    nameRw: "Amafunguro n'Urugwiro",
    nameFr: "Restauration & Hôtellerie",
    nameSw: "Mikahawa na Ukarimu",
    icon: "Utensils",
    subcategories: [
      {
        id: "restaurants_dining",
        name: "Restaurants & Fast Dining",
        nameRw: "Resitora n'Amafunguro Yihuse",
        nameFr: "Restaurants & Restauration Rapide",
        nameSw: "Migahawa na Chakula cha Haraka",
        mainCategoryId: "food_hospitality",
        types: [
          { id: "local_restaurant", name: "Local Restaurant / Buffet", nameRw: "Resitora y'Ibiryo bya Kinyarwanda", nameFr: "Restaurant Local / Buffet", nameSw: "Mkahawa wa Vyakula Asili", subCategoryId: "restaurants_dining", mainCategoryId: "food_hospitality" },
          { id: "fast_food_brochettes", name: "Brochettes, Grill & Fast Food", nameRw: "Ubwugamo bwa Muzika na Burusheti", nameFr: "Brochettes & Grillades", nameSw: "Mishikaki na Nyama Choma", subCategoryId: "restaurants_dining", mainCategoryId: "food_hospitality" },
          { id: "cafe_coffee", name: "Cafe & Rwandan Specialty Coffee", nameRw: "Ahabera Ikawa y'u Rwanda n'Icyayi", nameFr: "Café & Dégustation", nameSw: "Duka la Kahawa na Chai", subCategoryId: "restaurants_dining", mainCategoryId: "food_hospitality" },
        ],
      },
      {
        id: "dairy_milk",
        name: "Milk Bars & Fresh Juice",
        nameRw: "Amamata Meza n'Imitobe",
        nameFr: "Bars Laitiers & Jus Frais",
        nameSw: "Maziwa Safi na Juisi",
        mainCategoryId: "food_hospitality",
        types: [
          { id: "milk_bar", name: "Milk Bar / Amata Meza", nameRw: "Ikiraro cy'Amata (Milk Bar)", nameFr: "Bar Laitier (Amata Meza)", nameSw: "Kibanda cha Maziwa", subCategoryId: "dairy_milk", mainCategoryId: "food_hospitality" },
          { id: "juice_ice_cream", name: "Fresh Juice & Ice Cream", nameRw: "Umutobe Wakuwe mu Mbuto n'Urubura", nameFr: "Jus Naturels & Glaces", nameSw: "Juisi Asilia na Aiskrimu", subCategoryId: "dairy_milk", mainCategoryId: "food_hospitality" },
        ],
      },
      {
        id: "bakery_snacks",
        name: "Bakery & Street Snacks",
        nameRw: "Umugati n'Udushya",
        nameFr: "Boulangerie & Snacks",
        nameSw: "Mikate na Vitafunwa",
        mainCategoryId: "food_hospitality",
        types: [
          { id: "bakery_pastry", name: "Bakery & Fresh Pastries", nameRw: "Ahatunganyirizwa Imigati na Keke", nameFr: "Boulangerie & Pâtisserie", nameSw: "Duka la Mikate na Keki", subCategoryId: "bakery_snacks", mainCategoryId: "food_hospitality" },
          { id: "street_snacks", name: "Chapati, Sambusa & Mandazi Stand", nameRw: "Chapati, Sambusa na Mandazi", nameFr: "Stand de Beignets & Sambusa", nameSw: "Kibanda cha Chapati na Sambusa", subCategoryId: "bakery_snacks", mainCategoryId: "food_hospitality" },
        ],
      },
      {
        id: "hospitality_lodging",
        name: "Guest Houses & Lodging",
        nameRw: "Aho Kurara n'Amahuryo",
        nameFr: "Auberges & Hébergement",
        nameSw: "Nyumba za Wageni",
        mainCategoryId: "food_hospitality",
        types: [
          { id: "guest_house", name: "Community Guest House / Lodge", nameRw: "Icumbi ry'Agace (Guest House)", nameFr: "Auberge de Quartier", nameSw: "Nyumba ya Wageni", subCategoryId: "hospitality_lodging", mainCategoryId: "food_hospitality" },
        ],
      },
    ],
  },

  // 4. Artisans, Crafts & Tailoring
  {
    id: "crafts_tailoring",
    name: "Artisans, Crafts & Tailoring",
    nameRw: "Abadozi n'Abanyabukorikori",
    nameFr: "Artisans & Couture",
    nameSw: "Washonaji na Mafundi wa Sanaa",
    icon: "Scissors",
    subcategories: [
      {
        id: "tailoring_fashion",
        name: "Tailoring & Fashion Design",
        nameRw: "Ubudodozi n'Imideri",
        nameFr: "Couture & Stylisme",
        nameSw: "Ushonaji na Mitindo",
        mainCategoryId: "crafts_tailoring",
        types: [
          { id: "custom_tailor", name: "Custom Tailor (Umudozi)", nameRw: "Umudozi w'Imyenda (W'Abari n'Abagabo)", nameFr: "Atelier de Couture sur Mesure", nameSw: "Fundi Cherehani", subCategoryId: "tailoring_fashion", mainCategoryId: "crafts_tailoring" },
          { id: "fabric_kitenge", name: "Kitenge & Fabric Specialist", nameRw: "Ibitenge n'Ibitambaro by'Ubwoko Bwose", nameFr: "Tissus Kitenge & Étoffes", nameSw: "Duka la Vitenge na Vitambaa", subCategoryId: "tailoring_fashion", mainCategoryId: "crafts_tailoring" },
          { id: "embroidery_mending", name: "Embroidery & Garment Alterations", nameRw: "Kugorora Imyenda no Kudoda Imitako", nameFr: "Broderie & Retouches Vêtements", nameSw: "Kudarizi na Kurekebisha Nguo", subCategoryId: "tailoring_fashion", mainCategoryId: "crafts_tailoring" },
        ],
      },
      {
        id: "traditional_crafts",
        name: "Handicrafts & Materials",
        nameRw: "Ubukorikori n'Ubugeni Nyarwanda",
        nameFr: "Artisanat d'Art & Décoration",
        nameSw: "Sanaa za Mikono na Mapambo",
        mainCategoryId: "crafts_tailoring",
        types: [
          { id: "agaseke_weaving", name: "Agaseke & Basket Weaving", nameRw: "Ububoshyi bw'Uduseke n'Ibikoresho", nameFr: "Vannerie & Agaseke Traditionnel", nameSw: "Vikapu vya Agaseke", subCategoryId: "traditional_crafts", mainCategoryId: "crafts_tailoring" },
          { id: "wood_carving", name: "Wood Carving & Local Furniture", nameRw: "Ububaji n'Imitako y'Ibikoresho by'Imbaho", nameFr: "Sculpture sur Bois & Ébénisterie", nameSw: "Uchongaji Mbao na Samani", subCategoryId: "traditional_crafts", mainCategoryId: "crafts_tailoring" },
          { id: "leather_cobbler", name: "Shoemaker & Leather Repairs", nameRw: "Umukoroshi w'Inkweto n'Impuzu", nameFr: "Cordonnerie & Travail du Cuir", nameSw: "Fundi Viatu na Ngozi", subCategoryId: "traditional_crafts", mainCategoryId: "crafts_tailoring" },
        ],
      },
    ],
  },

  // 5. Repair, Mechanics & Technical Services
  {
    id: "repair_technical",
    name: "Repair, Mechanics & Technical",
    nameRw: "Abakanishi n'Ibyuma",
    nameFr: "Réparation & Mécanique",
    nameSw: "Ukarabati na Ufundi",
    icon: "Wrench",
    subcategories: [
      {
        id: "electronics_repair",
        name: "Electronics & Smartphone Repair",
        nameRw: "Gukanika Telefoni n'Ibyuma by'Ikoranabuhanga",
        nameFr: "Réparation Téléphones & Électronique",
        nameSw: "Kutengeneza Simu na Vifaa vya Umeme",
        mainCategoryId: "repair_technical",
        types: [
          { id: "phone_repair", name: "Smartphone Repair Technician", nameRw: "Gukora Telefoni Zangiritse", nameFr: "Technicien Réparation Smartphones", nameSw: "Fundi wa Simu za Mkononi", subCategoryId: "electronics_repair", mainCategoryId: "repair_technical" },
          { id: "computer_repair", name: "Laptop & Computer Services", nameRw: "Gukora Mudasobwa", nameFr: "Dépannage Informatique", nameSw: "Kutengeneza Kompyuta", subCategoryId: "electronics_repair", mainCategoryId: "repair_technical" },
          { id: "appliance_repair", name: "Radio, TV & Audio Repair", nameRw: "Gukanika Televiziyo na Radiyo", nameFr: "Réparation Téléviseurs & Radios", nameSw: "Kutengeneza TV na Redio", subCategoryId: "electronics_repair", mainCategoryId: "repair_technical" },
        ],
      },
      {
        id: "auto_mechanics",
        name: "Motorcycle & Vehicle Mechanics",
        nameRw: "Gukanika Moto n'Ibinyabiziga",
        nameFr: "Mécanique Moto & Automobile",
        nameSw: "Ufundi wa Pikipiki na Magari",
        mainCategoryId: "repair_technical",
        types: [
          { id: "moto_repair", name: "Motorcycle Garage & Moto Spares", nameRw: "Gukanika Moto no Kugurisha Ibyuma byayo", nameFr: "Garage & Pièces Détachées Moto", nameSw: "Gereji ya Pikipiki na Vipuri", subCategoryId: "auto_mechanics", mainCategoryId: "repair_technical" },
          { id: "bicycle_repair", name: "Bicycle Mechanic (Igare)", nameRw: "Gukora Amagare", nameFr: "Réparation de Bicyclettes (Igare)", nameSw: "Fundi Baiskeli (Igare)", subCategoryId: "auto_mechanics", mainCategoryId: "repair_technical" },
          { id: "auto_garage", name: "Auto Repair Workshop", nameRw: "Igaraje ry'Imodoka", nameFr: "Atelier de Réparation Automobile", nameSw: "Gereji ya Magari", subCategoryId: "auto_mechanics", mainCategoryId: "repair_technical" },
          { id: "tire_repair", name: "Tire Pressure & Vulcanizer", nameRw: "Gushyiramo Umwuka no Kudoda Amapine", nameFr: "Vulcanisation & Réparation Pneus", nameSw: "Kuziba Panja na Kujaza Upepo", subCategoryId: "auto_mechanics", mainCategoryId: "repair_technical" },
        ],
      },
    ],
  },

  // 6. Agriculture & Agro-Produce
  {
    id: "agriculture_produce",
    name: "Agro-Produce & Agro-Veterinary",
    nameRw: "Ubuhinzi n'Ubworozi",
    nameFr: "Agriculture & Agro-Vétérinaire",
    nameSw: "Kilimo na Mifugo",
    icon: "Sprout",
    subcategories: [
      {
        id: "agri_supplies",
        name: "Seeds, Feeds & Veterinary",
        nameRw: "Imbuto, Ibiryo by'Amatungo n'Imiti",
        nameFr: "Semences, Aliments Bétail & Vétérinaire",
        nameSw: "Mbegu, Vyakula vya Mifugo na Dawa",
        mainCategoryId: "agriculture_produce",
        types: [
          { id: "agroveterinary_shop", name: "Agro-Veterinary Supply (Agro-Vet)", nameRw: "Iduka ry'Imiti y'Amatungo n'Ubuhinzi", nameFr: "Pharmacie Agro-Vétérinaire", nameSw: "Duka la Mifugo na Kilimo (Agro-Vet)", subCategoryId: "agri_supplies", mainCategoryId: "agriculture_produce" },
          { id: "seeds_fertilizer", name: "Certified Seeds & Fertilizers", nameRw: "Imbuto z'Indobanure n'Ifumbire", nameFr: "Semences Certifiées & Engrais", nameSw: "Mbegu Bora na Mbolea", subCategoryId: "agri_supplies", mainCategoryId: "agriculture_produce" },
          { id: "animal_feeds", name: "Animal Feeds & Supplements", nameRw: "Ibiryo by'Inkoko, Inka n'Ingurube", nameFr: "Aliments Concentrés pour Bétail", nameSw: "Chakula cha Mifugo na Kuku", subCategoryId: "agri_supplies", mainCategoryId: "agriculture_produce" },
        ],
      },
      {
        id: "produce_aggregation",
        name: "Milling & Farm Gate Collection",
        nameRw: "Gusya Ibinyampeke n'Ikegeranyo",
        nameFr: "Moulins & Collecte Agricole",
        nameSw: "Kusaga Nafaka na Ukusanyaji Mazao",
        mainCategoryId: "agriculture_produce",
        types: [
          { id: "grain_milling", name: "Maize, Cassava & Grain Mill", nameRw: "Urusyo rw'Ibigori, Imyumbati n'Ibigori", nameFr: "Moulin à Maïs & Manioc", nameSw: "Kinu cha Kusaga Mahindi na Mihogo", subCategoryId: "produce_aggregation", mainCategoryId: "agriculture_produce" },
          { id: "coffee_tea_collection", name: "Coffee & Tea Cherry Collection Post", nameRw: "Ikusanyirizo ry'Ikawa cyangwa Icyayi", nameFr: "Poste de Collecte Café / Thé", nameSw: "Kituo cha Kukusanya Kahawa au Chai", subCategoryId: "produce_aggregation", mainCategoryId: "agriculture_produce" },
        ],
      },
    ],
  },

  // 7. Health & Pharmacy
  {
    id: "health_pharmacy",
    name: "Pharmacies & Health Care",
    nameRw: "Ubuzima na Farumasi",
    nameFr: "Pharmacie & Santé",
    nameSw: "Afya na Famasia",
    icon: "HeartPulse",
    subcategories: [
      {
        id: "pharmacy_dispensary",
        name: "Pharmacy & Natural Health",
        nameRw: "Farumasi n'Imiti Kamere",
        nameFr: "Pharmacie & Santé Naturelle",
        nameSw: "Famasia na Dawa Asilia",
        mainCategoryId: "health_pharmacy",
        types: [
          { id: "community_pharmacy", name: "Community Pharmacy / Farumasi", nameRw: "Farumasi y'Agace (Pharmacy)", nameFr: "Pharmacie d'Officine", nameSw: "Famasia ya Mtaani", subCategoryId: "pharmacy_dispensary", mainCategoryId: "health_pharmacy" },
          { id: "herbal_shop", name: "Traditional & Natural Herbs", nameRw: "Imiti Kamere Nyafurika", nameFr: "Herboristerie & Produits Naturels", nameSw: "Dawa za Asili", subCategoryId: "pharmacy_dispensary", mainCategoryId: "health_pharmacy" },
        ],
      },
      {
        id: "medical_clinic",
        name: "Clinics & Optical Services",
        nameRw: "Ivuriro ry'Agace n'Amadarubindi",
        nameFr: "Cliniques & Optique",
        nameSw: "Zahanati na Miwani",
        mainCategoryId: "health_pharmacy",
        types: [
          { id: "private_clinic", name: "Private Dispensary / Clinic", nameRw: "Ivuriro Ryigenga ry'Ibanze", nameFr: "Dispensaire / Clinique Privée", nameSw: "Kliniki Binafsi", subCategoryId: "medical_clinic", mainCategoryId: "health_pharmacy" },
          { id: "optician_dental", name: "Optical Frames & Dental Care", nameRw: "Amadarubindi n'Ubuvuzi bw'Amenyo", nameFr: "Optique Médicale & Soins Dentaires", nameSw: "Miwani na Huduma ya Meno", subCategoryId: "medical_clinic", mainCategoryId: "health_pharmacy" },
        ],
      },
    ],
  },

  // 8. Digital, Financial & Public Services
  {
    id: "services_office",
    name: "Public, Irembo & Financial Services",
    nameRw: "Serivisi z'Ibiro, Irembo na MoMo",
    nameFr: "Services Publics, Irembo & Finances",
    nameSw: "Huduma za Umma, Irembo na Fedha",
    icon: "Building",
    subcategories: [
      {
        id: "secretarial_digital",
        name: "Irembo & Secretarial Services",
        nameRw: "Irembo, Gufotora no Gucapa",
        nameFr: "Services Irembo & Secrétariat",
        nameSw: "Huduma za Irembo na Ofisi",
        mainCategoryId: "services_office",
        types: [
          { id: "irembo_cyber", name: "Irembo Agent & Cyber Cafe", nameRw: "Irembo n'Ikoranabuhanga ry'Agace", nameFr: "Agent Agréé Irembo & Cybercafé", nameSw: "Wakala wa Irembo na Intaneti", subCategoryId: "secretarial_digital", mainCategoryId: "services_office" },
          { id: "printing_services", name: "Printing, Photocopy & Scanning", nameRw: "Gufotora, Gucapa no Gusikana", nameFr: "Impression, Photocopie & Numérisation", nameSw: "Kupiga Chapa na Kutoa Nakala", subCategoryId: "secretarial_digital", mainCategoryId: "services_office" },
          { id: "photo_studio", name: "Photography & Passport Studio", nameRw: "Sitidiyo y'Amafoto na Pasiporo", nameFr: "Studio Photo & Photos Passeport", nameSw: "Studio ya Picha na Pasipoti", subCategoryId: "secretarial_digital", mainCategoryId: "services_office" },
        ],
      },
      {
        id: "agent_banking",
        name: "Mobile Money & Agency Banking",
        nameRw: "Kwakira no Kohereza Amafaranga (MoMo/Airtel)",
        nameFr: "Mobile Money & Services Bancaires",
        nameSw: "Wakala wa Fedha (M-Pesa, MoMo, Benki)",
        mainCategoryId: "services_office",
        types: [
          { id: "momo_agent", name: "Mobile Money (MTN MoMo / Airtel Money)", nameRw: "Wakala wa MoMo na Airtel Money", nameFr: "Point Mobile Money & Retrait", nameSw: "Wakala wa MoMo na Airtel Money", subCategoryId: "agent_banking", mainCategoryId: "services_office" },
          { id: "forex_bureau", name: "Local Agency Banking & Remittances", nameRw: "Ibiro bya Banki by'Agace (Agency Banking)", nameFr: "Guichet Bancaire Délégué", nameSw: "Wakala wa Benki Mtaani", subCategoryId: "agent_banking", mainCategoryId: "services_office" },
        ],
      },
      {
        id: "events_logistics",
        name: "Events, Sound & Local Logistics",
        nameRw: "Ibirori n'Ubwikorezi bw'Agace",
        nameFr: "Événements & Logistique Locale",
        nameSw: "Shughuli na Usafirishaji",
        mainCategoryId: "services_office",
        types: [
          { id: "event_rental", name: "Tents, Chairs & Sound System Rental", nameRw: "Gukodesha Amahema, Intebe n'Ibyuma by'Umuziki", nameFr: "Location Tentes, Chaises & Sonorisation", nameSw: "Kukodisha Mahema, Viti na Spika", subCategoryId: "events_logistics", mainCategoryId: "services_office" },
          { id: "local_courier", name: "Local Delivery & Moto Cargo Courier", nameRw: "Ubwikorezi bw'Ibicuruzwa no Gutwara Ibiribwa", nameFr: "Coursier Express & Livraison Moto", nameSw: "Usafirishaji wa Mizigo Midogo", subCategoryId: "events_logistics", mainCategoryId: "services_office" },
        ],
      },
    ],
  },
];

// Flat lookup index of all business types
export const ALL_BUSINESS_TYPES: Record<string, BusinessTypeItem> = {};
export const ALL_SUBCATEGORIES: Record<string, SubCategoryItem> = {};
export const ALL_MAIN_CATEGORIES: Record<string, MainCategoryItem> = {};

// Populate lookup indices
for (const main of CANONICAL_TAXONOMY) {
  ALL_MAIN_CATEGORIES[main.id] = main;
  for (const sub of main.subcategories) {
    ALL_SUBCATEGORIES[sub.id] = sub;
    for (const bt of sub.types) {
      ALL_BUSINESS_TYPES[bt.id] = bt;
    }
  }
}

// Backward compatibility alias map for legacy category codes
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  shop_retail: "retail",
  salon_barber: "personal_care",
  food_restaurant: "food_hospitality",
  tailor_crafts: "crafts_tailoring",
  phone_electronics: "repair_technical",
  mechanic_repair: "repair_technical",
  hardware_construction: "retail",
  pharmacy_health: "health_pharmacy",
  services: "services_office",
};

for (const [legacyId, canonicalId] of Object.entries(LEGACY_CATEGORY_MAP)) {
  if (ALL_MAIN_CATEGORIES[canonicalId] && !ALL_MAIN_CATEGORIES[legacyId]) {
    ALL_MAIN_CATEGORIES[legacyId] = ALL_MAIN_CATEGORIES[canonicalId];
  }
}

/**
 * Validate that a business type belongs to the given main category and subcategory
 */
export function validateCategoryHierarchy(
  mainCategoryId: string,
  subCategoryId?: string | null,
  businessTypeId?: string | null
): { isValid: boolean; error?: string; resolvedType?: BusinessTypeItem } {
  const resolvedMainId = LEGACY_CATEGORY_MAP[mainCategoryId] || mainCategoryId;
  if (!resolvedMainId || !ALL_MAIN_CATEGORIES[resolvedMainId]) {
    return { isValid: false, error: `Invalid main category: "${mainCategoryId}". Must select a recognized category.` };
  }

  if (subCategoryId) {
    const sub = ALL_SUBCATEGORIES[subCategoryId];
    if (!sub || sub.mainCategoryId !== resolvedMainId) {
      return { isValid: false, error: `Subcategory "${subCategoryId}" does not belong to main category "${mainCategoryId}".` };
    }
  }

  if (businessTypeId) {
    const bt = ALL_BUSINESS_TYPES[businessTypeId];
    if (!bt) {
      return { isValid: false, error: `Invalid business type: "${businessTypeId}".` };
    }
    if (subCategoryId && bt.subCategoryId !== subCategoryId) {
      return { isValid: false, error: `Business type "${businessTypeId}" does not belong to subcategory "${subCategoryId}".` };
    }
    if (bt.mainCategoryId !== resolvedMainId) {
      return { isValid: false, error: `Business type "${businessTypeId}" does not belong to main category "${mainCategoryId}".` };
    }
    return { isValid: true, resolvedType: bt };
  }

  return { isValid: true };
}

/**
 * Get full taxonomy hierarchy object for a given business type or subcategory
 */
export function getCategoryHierarchy(businessTypeIdOrSub: string) {
  const bt = ALL_BUSINESS_TYPES[businessTypeIdOrSub];
  if (bt) {
    const sub = ALL_SUBCATEGORIES[bt.subCategoryId];
    const main = ALL_MAIN_CATEGORIES[bt.mainCategoryId];
    return {
      mainCategory: main,
      subCategory: sub,
      businessType: bt,
      pathDisplay: `${main.name} → ${sub.name} → ${bt.name}`,
      pathDisplayRw: `${main.nameRw} → ${sub.nameRw} → ${bt.nameRw}`,
    };
  }

  const sub = ALL_SUBCATEGORIES[businessTypeIdOrSub];
  if (sub) {
    const main = ALL_MAIN_CATEGORIES[sub.mainCategoryId];
    return {
      mainCategory: main,
      subCategory: sub,
      businessType: null,
      pathDisplay: `${main.name} → ${sub.name}`,
      pathDisplayRw: `${main.nameRw} → ${sub.nameRw}`,
    };
  }

  const main = ALL_MAIN_CATEGORIES[businessTypeIdOrSub];
  if (main) {
    return {
      mainCategory: main,
      subCategory: null,
      businessType: null,
      pathDisplay: main.name,
      pathDisplayRw: main.nameRw,
    };
  }

  return null;
}

/**
 * Format localized label for a business's category classification
 */
export function formatCategoryClassification(
  mainCategory?: string | null,
  subCategory?: string | null,
  businessType?: string | null,
  lang: string = "en"
): {
  mainLabel: string;
  subLabel: string;
  typeLabel: string;
  fullPath: string;
} {
  const resolvedMainId = mainCategory ? (LEGACY_CATEGORY_MAP[mainCategory] || mainCategory) : null;
  const main = resolvedMainId ? ALL_MAIN_CATEGORIES[resolvedMainId] : null;
  const sub = subCategory ? ALL_SUBCATEGORIES[subCategory] : null;
  const bt = businessType ? ALL_BUSINESS_TYPES[businessType] : null;

  const getLabel = (item: any) => {
    if (!item) return "";
    if (lang === "rw") return item.nameRw || item.name;
    if (lang === "fr") return item.nameFr || item.name;
    if (lang === "sw") return item.nameSw || item.name;
    return item.name;
  };

  const mainLabel = main ? getLabel(main) : "General Business";
  const subLabel = sub ? getLabel(sub) : "";
  const typeLabel = bt ? getLabel(bt) : "";

  const parts = [mainLabel, subLabel, typeLabel].filter(Boolean);

  return {
    mainLabel,
    subLabel,
    typeLabel,
    fullPath: parts.join(" → "),
  };
}
