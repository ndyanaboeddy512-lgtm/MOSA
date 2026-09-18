/**
 * MOSA Canonical 3-Tier Business Category Taxonomy
 * 
 * Hierarchy:
 *   Tier 1: Main Category (Broad economic sector)
 *   Tier 2: Subcategory (Functional commercial domain)
 *   Tier 3: Business Type (Specific micro-business establishment type)
 *
 * Fully localized in English (en), Kinyarwanda (rw), French (fr), and Kiswahili (sw).
 * Features explicit service-based business differentiation (isService flag & operatingModel).
 */

export type BusinessOperatingModel = "PRODUCTS" | "SERVICES" | "FOOD_DINING";

export interface BusinessTypeItem {
  id: string;
  name: string;
  nameRw: string;
  nameFr: string;
  nameSw: string;
  subCategoryId: string;
  mainCategoryId: string;
  isService?: boolean;
  operatingModel?: BusinessOperatingModel;
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
    id: "retail_shops",
    name: "Retail, Shops & General Commerce",
    nameRw: "Ubucuruzi bwo mu Iduka",
    nameFr: "Commerce de Détail & Boutiques",
    nameSw: "Biashara ya Rejareja na Maduka",
    icon: "ShoppingBag",
    subcategories: [
      {
        id: "food_grocery",
        name: "Food & Groceries",
        nameRw: "Ibiribwa n'Ibicuruzwa by'Ibanze",
        nameFr: "Alimentation & Épicerie",
        nameSw: "Vyakula na Bidhaa za Nyumbani",
        mainCategoryId: "retail_shops",
        types: [
          { id: "grocery_shop", name: "Grocery Store / Alimentation", nameRw: "Iduka ry'Ibiribwa (Alimentation)", nameFr: "Épicerie / Alimentation", nameSw: "Duka la Vyakula", subCategoryId: "food_grocery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "supermarket_minimarket", name: "Supermarket & Minimarket", nameRw: "Supermarike na Minimarket y'Agace", nameFr: "Supermarché & Supérette", nameSw: "Supamaketi na Minimarket", subCategoryId: "food_grocery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "fresh_fruits_vegetables", name: "Fresh Fruits & Vegetables", nameRw: "Imbuto n'Imboga Nshya", nameFr: "Fruits & Légumes Frais", nameSw: "Matunda na Mbogamboga", subCategoryId: "food_grocery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "butchery_meat", name: "Butchery & Fresh Meat", nameRw: "Ibagiro ry'Inyama (Boucherie)", nameFr: "Boucherie & Viande Fraîche", nameSw: "Bucha ya Nyama", subCategoryId: "food_grocery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "fishmonger", name: "Fresh & Dried Fish Shop", nameRw: "Amafi Mashya n'Ayumye", nameFr: "Poissonnerie", nameSw: "Duka la Samaki", subCategoryId: "food_grocery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "spices_specialty_food", name: "Spices, Dry Goods & Cereals", nameRw: "Ibirungo, Amashaza n'Ibinyampeke", nameFr: "Épices, Céréales & Féculents", nameSw: "Viungo na Nafaka", subCategoryId: "food_grocery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "home_appliances_goods",
        name: "Household Goods & Kitchenware",
        nameRw: "Ibikoresho by'Inzu n'Ibyuma",
        nameFr: "Articles Ménagers & Électroménager",
        nameSw: "Vyombo vya Nyumbani na Vifaa",
        mainCategoryId: "retail_shops",
        types: [
          { id: "household_utensils", name: "Kitchenware & Plastics Shop", nameRw: "Ibikoresho byo mu Gikoni n'Amapulasitiki", nameFr: "Ustensiles de Cuisine & Plastiques", nameSw: "Vyombo vya Jikoni na Plastiki", subCategoryId: "home_appliances_goods", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "home_appliances_retail", name: "Home & Kitchen Appliances", nameRw: "Ibyuma byo mu Nzu", nameFr: "Électroménager", nameSw: "Vifaa vya Umeme vya Nyumbani", subCategoryId: "home_appliances_goods", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "furniture_home_decor", name: "Furniture & Bedding Shop", nameRw: "Ibikoresho by'Imbaho n'Ibyo Kuryamaho", nameFr: "Meubles & Literie", nameSw: "Samani na Vifaa vya Kulalia", subCategoryId: "home_appliances_goods", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "kiosks_stationery",
        name: "Kiosks & Stationery",
        nameRw: "Kiyosike n'Ibicuruzwa by'Ishuri",
        nameFr: "Kiosques & Papeterie",
        nameSw: "Kioski na Vifaa vya Shule",
        mainCategoryId: "retail_shops",
        types: [
          { id: "neighborhood_kiosk", name: "Neighborhood Kiosk", nameRw: "Kiyosike y'Agace", nameFr: "Kiosque de Quartier", nameSw: "Kioski ya Mtaani", subCategoryId: "kiosks_stationery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "stationery_bookshop", name: "Stationery & School Supplies", nameRw: "Ibicuruzwa by'Ishuri na Papeterie", nameFr: "Papeterie & Fournitures Scolaires", nameSw: "Vifaa vya Shule na Vitabu", subCategoryId: "kiosks_stationery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "cosmetics_retail", name: "Beauty Products & Toiletries Retail", nameRw: "Amavuta n'Ibikoresho by'Isuku", nameFr: "Cosmétiques & Parfumerie", nameSw: "Duka la Vipodozi", subCategoryId: "kiosks_stationery", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "wholesale_distribution",
        name: "Wholesale & Depots",
        nameRw: "Ububiko bw'Ibicuruzwa Byinshi (Depot)",
        nameFr: "Commerce de Gros & Dépôts",
        nameSw: "Uuzaji wa Jumla na Bohari",
        mainCategoryId: "retail_shops",
        types: [
          { id: "beverage_depot", name: "Beverage & Soft Drinks Depot", nameRw: "Irimbi ry'Ibinyobwa (Depot)", nameFr: "Dépôt de Boissons", nameSw: "Bohari ya Vinywaji", subCategoryId: "wholesale_distribution", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "grain_flour_wholesale", name: "Grain, Flour & Sugar Wholesale", nameRw: "Ibyokezo by'Ibinyampeke n'Ifu", nameFr: "Grossiste Céréales & Farine", nameSw: "Wauzaji wa Nafaka na Unga Jumla", subCategoryId: "wholesale_distribution", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "consumer_goods_wholesale", name: "FMCG Consumer Goods Wholesale", nameRw: "Ibicuruzwa Byinshi Rusange", nameFr: "Grossiste Produits de Grande Consommation", nameSw: "Wauzaji wa Bidhaa za Rejareja Jumla", subCategoryId: "wholesale_distribution", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
          { id: "packaging_supplies", name: "Packaging Materials & Bags", nameRw: "Ibipfunyikwamo n'Amashashi", nameFr: "Matériaux d'Emballage & Sacs", nameSw: "Mifuko na Vifaa vya Kufungia", subCategoryId: "wholesale_distribution", mainCategoryId: "retail_shops", operatingModel: "PRODUCTS" },
        ],
      },
    ],
  },

  // 2. Boutiques & Fashion
  {
    id: "fashion_apparel",
    name: "Boutiques & Fashion",
    nameRw: "Imyenda, Inkweto n'Imideri",
    nameFr: "Boutiques & Mode",
    nameSw: "Mavazi na Mitindo",
    icon: "Shirt",
    subcategories: [
      {
        id: "clothing_boutiques",
        name: "Clothing & Boutiques",
        nameRw: "Butike z'Imyenda",
        nameFr: "Boutiques de Prêt-à-Porter",
        nameSw: "Maduka ya Nguo",
        mainCategoryId: "fashion_apparel",
        types: [
          { id: "womens_boutique", name: "Women's Fashion Boutique", nameRw: "Butike y'Imyenda y'Abategarugori", nameFr: "Boutique Prêt-à-Porter Dames", nameSw: "Duka la Nguo za Kike", subCategoryId: "clothing_boutiques", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
          { id: "mens_boutique", name: "Men's Clothing Boutique", nameRw: "Butike y'Imyenda y'Abagabo", nameFr: "Boutique Prêt-à-Porter Hommes", nameSw: "Duka la Nguo za Kiume", subCategoryId: "clothing_boutiques", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
          { id: "children_baby_wear", name: "Children & Baby Wear", nameRw: "Imyenda y'Abana n'Impinja", nameFr: "Vêtements Enfants & Bébés", nameSw: "Nguo za Watoto na Wachanga", subCategoryId: "clothing_boutiques", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
          { id: "caguwa_selected", name: "Selected Second-Hand Wear (Caguwa)", nameRw: "Imyenda myiza ya Caguwa", nameFr: "Fripes Sélectionnées (Caguwa)", nameSw: "Nguo Bora za Mitumba", subCategoryId: "clothing_boutiques", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
          { id: "traditional_attire", name: "Traditional & Ceremonial Wear", nameRw: "Imyambaro ya Kinyarwanda n'Ubukwe", nameFr: "Tenues Traditionnelles & Cérémonielles", nameSw: "Mavazi ya Harusi na Asili", subCategoryId: "clothing_boutiques", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "footwear_accessories",
        name: "Shoes & Accessories",
        nameRw: "Inkweto, Ibikapu n'Imitako",
        nameFr: "Chaussures & Accessoires",
        nameSw: "Viatu na Vifaa vya Urembo",
        mainCategoryId: "fashion_apparel",
        types: [
          { id: "shoe_store", name: "Shoes & Footwear Store", nameRw: "Iduka ry'Inkweto z'Ubwoko Bwose", nameFr: "Magasin de Chaussures", nameSw: "Duka la Viatu", subCategoryId: "footwear_accessories", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
          { id: "handbags_leather", name: "Handbags, Belts & Wallets", nameRw: "Ibikapu, Imikandara n'Ibihingwa", nameFr: "Sacs à Main & Maroquinerie", nameSw: "Mikoba, Mikanda na Pochi", subCategoryId: "footwear_accessories", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
          { id: "jewelry_watches", name: "Fashion Jewelry & Watches", nameRw: "Imitako, Amasaha n'Impeta", nameFr: "Bijouterie & Montres", nameSw: "Mapambo, Saa na Cheni", subCategoryId: "footwear_accessories", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "fabrics_supplies",
        name: "Fabrics & Textiles",
        nameRw: "Ibitenge n'Ibitambaro",
        nameFr: "Tissus & Étoffes",
        nameSw: "Vitenge na Vitambaa",
        mainCategoryId: "fashion_apparel",
        types: [
          { id: "kitenge_wax_fabrics", name: "Kitenge & African Wax Fabrics", nameRw: "Ibitenge n'Ibitambaro bya Wax", nameFr: "Tissus Pagne & Kitenge Wax", nameSw: "Vitenge na Vitambaa vya Nguo", subCategoryId: "fabrics_supplies", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
          { id: "sewing_accessories", name: "Sewing Threads & Haberdashery", nameRw: "Ubudodo, Impeta z'Imyenda n'Ibikoresho", nameFr: "Mercerie & Accessoires de Couture", nameSw: "Nyuzi, Vifungo na Vifaa vya Cherehani", subCategoryId: "fabrics_supplies", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
          { id: "curtains_home_textiles", name: "Curtains & Upholstery Fabrics", nameRw: "Ibitambaro by'Amadirishya n'Intebe", nameFr: "Rideaux & Tissus d'Ameublement", nameSw: "Mapazia na Vitambaa vya Samani", subCategoryId: "fabrics_supplies", mainCategoryId: "fashion_apparel", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "tailoring_dressmaking",
        name: "Tailoring & Dressmaking",
        nameRw: "Ubudodo n'Ubudashyikirwa mu Myenda",
        nameFr: "Tailleur & Confection sur Mesure",
        nameSw: "Ushonaji Nguo na Mitindo",
        mainCategoryId: "fashion_apparel",
        types: [
          { id: "bespoke_tailor", name: "Bespoke Tailor & African Wear (Umudozi)", nameRw: "Umudozi w'Imyenda Yihariye n'Ibitenge", nameFr: "Tailleur sur Mesure & Tenues Africaines", nameSw: "Mshona Nguo wa Vipimo Maalumu", subCategoryId: "tailoring_dressmaking", mainCategoryId: "fashion_apparel", isService: true, operatingModel: "SERVICES" },
          { id: "dressmaker_couture", name: "Dressmaker & Modern Couture", nameRw: "Umudozi w'Imideri n'Imyenda y'Ubukwe", nameFr: "Couturière & Robes de Cérémonie", nameSw: "Mshona Nguo za Kike na Harusi", subCategoryId: "tailoring_dressmaking", mainCategoryId: "fashion_apparel", isService: true, operatingModel: "SERVICES" },
          { id: "traditional_tailor", name: "Traditional Kitenge Tailor", nameRw: "Umudozi w'Ibitenge bya Kera n'Ubu", nameFr: "Atelier de Couture Traditionnelle Kitenge", nameSw: "Mshona Vitenge Asilia", subCategoryId: "tailoring_dressmaking", mainCategoryId: "fashion_apparel", isService: true, operatingModel: "SERVICES" },
          { id: "garment_alterations", name: "Garment Alterations & Repairs", nameRw: "Gusana no Kuringaniza Imyenda", nameFr: "Retouches & Réparations de Vêtements", nameSw: "Marekebisho ya Nguo na Zipu", subCategoryId: "tailoring_dressmaking", mainCategoryId: "fashion_apparel", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 3. Restaurants & Food
  {
    id: "food_dining",
    name: "Restaurants & Food",
    nameRw: "Amafunguro na Resitora",
    nameFr: "Restaurants & Gastronomie",
    nameSw: "Migahawa na Vyakula",
    icon: "Utensils",
    subcategories: [
      {
        id: "restaurants_eateries",
        name: "Restaurants & Fast Food",
        nameRw: "Resitora n'Amafunguro Yihuse",
        nameFr: "Restaurants & Restauration Rapide",
        nameSw: "Migahawa na Chakula cha Haraka",
        mainCategoryId: "food_dining",
        types: [
          { id: "local_buffet_restaurant", name: "Local Buffet Restaurant", nameRw: "Resitora y'Ibiryo bya Kinyarwanda", nameFr: "Restaurant Buffet Local", nameSw: "Mkahawa wa Vyakula Asili", subCategoryId: "restaurants_eateries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "alacarte_dining", name: "A La Carte & Fine Dining", nameRw: "Resitora ifite Amafunguro Yihariye", nameFr: "Restaurant À la Carte", nameSw: "Mkahawa wa Menyu Maalumu", subCategoryId: "restaurants_eateries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "fast_food_grill", name: "Brochettes, Grill & Fast Food", nameRw: "Burusheti, Inyama Zokeje n'Ibirayi", nameFr: "Brochettes & Grillades", nameSw: "Mishikaki, Nyama Choma na Chipsi", subCategoryId: "restaurants_eateries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "pizzeria_burgers", name: "Pizzeria & Burger Joint", nameRw: "Ahatunganyirizwa Piza na Burgers", nameFr: "Pizzeria & Burgers", nameSw: "Pizzeria na Baga", subCategoryId: "restaurants_eateries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "african_specialty_dining", name: "African Regional Specialties", nameRw: "Amafunguro y'Ibihugu by'Afurika", nameFr: "Spécialités Culinaires Africaines", nameSw: "Vyakula vya Kiafrika", subCategoryId: "restaurants_eateries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
        ],
      },
      {
        id: "cafes_bakeries",
        name: "Cafés & Bakeries",
        nameRw: "Ahabera Ikawa n'Imigati",
        nameFr: "Cafés & Boulangeries",
        nameSw: "Kahawa na Mikate",
        mainCategoryId: "food_dining",
        types: [
          { id: "coffee_tea_house", name: "Specialty Coffee & Tea House", nameRw: "Ahabera Ikawa y'u Rwanda n'Icyayi", nameFr: "Café & Salon de Thé", nameSw: "Duka la Kahawa Safi na Chai", subCategoryId: "cafes_bakeries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "bakery_patisserie", name: "Bakery & Pastry Shop", nameRw: "Ahatunganyirizwa Imigati, Keke na Biswi", nameFr: "Boulangerie & Pâtisserie", nameSw: "Duka la Mikate na Keki", subCategoryId: "cafes_bakeries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "breakfast_snack_bar", name: "Breakfast & Snack Bar", nameRw: "Amafunguro ya Mugitondo n'Udushya", nameFr: "Café-Snack Petit-Déjeuner", nameSw: "Vitafunwa vya Asubuhi na Chai", subCategoryId: "cafes_bakeries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "ice_cream_juice_bar", name: "Fresh Juice & Ice Cream Bar", nameRw: "Umutobe w'Imbuto n'Urubura ruribwa", nameFr: "Bar à Jus Naturels & Glacerie", nameSw: "Juisi Asilia na Aiskrimu", subCategoryId: "cafes_bakeries", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
        ],
      },
      {
        id: "dairy_milk_bars",
        name: "Milk Bars & Local Dairy",
        nameRw: "Ibiraro by'Amata (Milk Bars)",
        nameFr: "Bars Laitiers & Produits Laitiers",
        nameSw: "Vibanda vya Maziwa Safi",
        mainCategoryId: "food_dining",
        types: [
          { id: "milk_bar_fresh", name: "Neighborhood Milk Bar (Amata Meza)", nameRw: "Ikiraro cy'Amata (Milk Bar)", nameFr: "Bar Laitier (Amata Meza)", nameSw: "Kibanda cha Maziwa", subCategoryId: "dairy_milk_bars", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "yoghurt_dairy_stand", name: "Artisanal Yoghurt & Butter Kiosk", nameRw: "Ikivuguto n'Amavuta y'Inka", nameFr: "Yaourt Artisanal & Dérivés Laitiers", nameSw: "Mtindi na Bidhaa za Maziwa", subCategoryId: "dairy_milk_bars", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
        ],
      },
      {
        id: "catering_services",
        name: "Catering & Street Food",
        nameRw: "Ibyo Gutegura Amafunguro n'Iby'Umuhanda",
        nameFr: "Traiteurs & Street Food",
        nameSw: "Vyakula vya Sherehe na Mtaani",
        mainCategoryId: "food_dining",
        types: [
          { id: "event_caterer", name: "Event & Wedding Catering", nameRw: "Ibyo Gutegura Amafunguro mu Birori", nameFr: "Service Traiteur & Réceptions", nameSw: "Huduma ya Vyakula vya Sherehe", subCategoryId: "catering_services", mainCategoryId: "food_dining", isService: true, operatingModel: "SERVICES" },
          { id: "canteen_packed_meals", name: "Office Canteen & Packed Lunch", nameRw: "Gufungura ku Kazi n'Amafunguro Apfunyitse", nameFr: "Cantine d'Entreprise & Plats Emportés", nameSw: "Chakula cha Maofisini", subCategoryId: "catering_services", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
          { id: "street_food_stand", name: "Chapati, Sambusa & Street Food Stand", nameRw: "Chapati, Sambusa na Mandazi", nameFr: "Stand de Beignets, Chapati & Sambusa", nameSw: "Kibanda cha Chapati na Sambusa", subCategoryId: "catering_services", mainCategoryId: "food_dining", operatingModel: "FOOD_DINING" },
        ],
      },
    ],
  },

  // 4. Bars & Lounges
  {
    id: "bars_nightlife",
    name: "Bars & Lounges",
    nameRw: "Utubari n'Ibinyobwa",
    nameFr: "Bars & Vie Nocturne",
    nameSw: "Baa na Vilabu",
    icon: "Wine",
    subcategories: [
      {
        id: "bars_pubs",
        name: "Bars & Pubs",
        nameRw: "Utubari n'Ahabera Imikino",
        nameFr: "Bars & Pubs",
        nameSw: "Baa na Vilabu vya Mtaani",
        mainCategoryId: "bars_nightlife",
        types: [
          { id: "sports_bar_pub", name: "Neighborhood Sports Bar & Pub", nameRw: "Akabari k'Agace k'Imikino", nameFr: "Bar & Pub de Quartier", nameSw: "Baa ya Mtaani na Michezo", subCategoryId: "bars_pubs", mainCategoryId: "bars_nightlife", operatingModel: "FOOD_DINING" },
          { id: "beer_garden_restobar", name: "Resto-Bar & Beer Garden", nameRw: "Resitora irimo Akabari n'Ubusitani", nameFr: "Resto-Bar & Brasserie", nameSw: "Mkahawa wenye Baa", subCategoryId: "bars_pubs", mainCategoryId: "bars_nightlife", operatingModel: "FOOD_DINING" },
          { id: "wine_cocktail_bar", name: "Wine & Cocktail Bar", nameRw: "Akabari k'Imivinyo na Kokiteli", nameFr: "Bar à Vins & Cocktails", nameSw: "Baa ya Mvinyo na Vinywaji Maalumu", subCategoryId: "bars_pubs", mainCategoryId: "bars_nightlife", operatingModel: "FOOD_DINING" },
        ],
      },
      {
        id: "lounges_clubs",
        name: "Nightclubs & Lounges",
        nameRw: "Ahabera Umuziki n'Utubyiniro",
        nameFr: "Clubs & Salons Lounge",
        nameSw: "Klabu za Usiku na Sebule za Muziki",
        mainCategoryId: "bars_nightlife",
        types: [
          { id: "nightclub_dance", name: "Nightclub & Dance Lounge", nameRw: "Akabyiniro n'Ahabera Umuziki", nameFr: "Discothèque & Club", nameSw: "Klabu ya Usiku na Muziki", subCategoryId: "lounges_clubs", mainCategoryId: "bars_nightlife", isService: true, operatingModel: "SERVICES" },
          { id: "rooftop_shisha_lounge", name: "Rooftop Lounge & Terrace", nameRw: "Ubwugamo bwo Hejuru bufite Akayaga", nameFr: "Lounge en Terrasse & Rooftop", nameSw: "Sebule ya Paani", subCategoryId: "lounges_clubs", mainCategoryId: "bars_nightlife", isService: true, operatingModel: "SERVICES" },
          { id: "live_music_venue", name: "Live Music Venue", nameRw: "Ahabera Umuziki wa Live", nameFr: "Salle de Musique Live", nameSw: "Ukumbi wa Muziki wa Moja kwa Moja", subCategoryId: "lounges_clubs", mainCategoryId: "bars_nightlife", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 5. Hotels & Accommodation
  {
    id: "hospitality_lodging",
    name: "Hotels & Accommodation",
    nameRw: "Amahóteri n'Amahuryo",
    nameFr: "Hôtels & Hébergement",
    nameSw: "Hoteli na Malazi",
    icon: "Hotel",
    subcategories: [
      {
        id: "hotels_resorts",
        name: "Hotels & Resorts",
        nameRw: "Amahóteri n'Ahabera Ubukerarugendo",
        nameFr: "Hôtels & Complexes Hôteliers",
        nameSw: "Hoteli na Maeneo ya Mapumziko",
        mainCategoryId: "hospitality_lodging",
        types: [
          { id: "city_hotel_lodge", name: "City Hotel & Business Lodge", nameRw: "Hoteli yo mu Mujyi", nameFr: "Hôtel Urbain & Lodge d'Affaires", nameSw: "Hoteli ya Mjini", subCategoryId: "hotels_resorts", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
          { id: "boutique_resort", name: "Resort & Boutique Eco-Lodge", nameRw: "Hoteli yo Kuruhukiramo n'Ubukerarugendo", nameFr: "Complexe Hôtelier & Écolodge", nameSw: "Hoteli ya Mapumziko", subCategoryId: "hotels_resorts", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "guesthouses_apartments",
        name: "Guest Houses & Apartments",
        nameRw: "Aho Kurara n'Amazu Yagateganyo",
        nameFr: "Auberges & Appartements Meublés",
        nameSw: "Nyumba za Wageni na Vyumba",
        mainCategoryId: "hospitality_lodging",
        types: [
          { id: "guesthouse_motel", name: "Guest House & Motel", nameRw: "Icumbi ry'Agace (Guest House)", nameFr: "Auberge & Maison d'Hôtes", nameSw: "Nyumba ya Wageni", subCategoryId: "guesthouses_apartments", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
          { id: "serviced_apartments", name: "Serviced Apartment & Vacation Rental", nameRw: "Inzu ifite Ibikoresho yo Gukodesha", nameFr: "Appartement Meublé & Résidence", nameSw: "Vyumba vya Kupangisha vya Likizo", subCategoryId: "guesthouses_apartments", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
          { id: "budget_hostel", name: "Budget Rooms & Backpackers Hostel", nameRw: "Aho Kurara Haciriritse", nameFr: "Auberge de Jeunesse & Chambres Éco", nameSw: "Vyumba vya Bei Nafuu", subCategoryId: "guesthouses_apartments", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "travel_tourism",
        name: "Travel & Tourism Agencies",
        nameRw: "Ingendo n'Ubukerarugendo",
        nameFr: "Agences de Voyages & Tourisme",
        nameSw: "Mashirika ya Safari na Utalii",
        mainCategoryId: "hospitality_lodging",
        types: [
          { id: "tour_operator_safari", name: "Tour Operator & Safari Agency", nameRw: "Ibiro by'Ubukerarugendo na Safari", nameFr: "Agence de Tourisme & Safaris", nameSw: "Kampuni ya Safari za Kitalii", subCategoryId: "travel_tourism", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
          { id: "travel_ticketing_agency", name: "Travel Agency & Flight Ticketing", nameRw: "Ibiro by'Ingendo n'Amatike", nameFr: "Agence de Voyages & Billetterie", nameSw: "Wakala wa Usafiri na Tiketi za Ndege", subCategoryId: "travel_tourism", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
          { id: "tour_guide_service", name: "Professional Tour Guide", nameRw: "Umunyabukerarugendo uyobora Ingendo", nameFr: "Guide Touristique Professionnel", nameSw: "Muongoza Watalii", subCategoryId: "travel_tourism", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
          { id: "boat_lake_tours", name: "Lake Boat & Water Excursions", nameRw: "Ubwato bwo mu Kiyaga cya Kivu", nameFr: "Excursions en Bateau Lac Kivu", nameSw: "Safari za Mashua Ziwa Kivu", subCategoryId: "travel_tourism", mainCategoryId: "hospitality_lodging", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 6. Beauty, Salon & Barber
  {
    id: "beauty_personal_care",
    name: "Beauty, Salon & Barber",
    nameRw: "Ubwiza, Saluni n'Ikinyozi",
    nameFr: "Beauté, Salons & Coiffure",
    nameSw: "Urembo na Saluni",
    icon: "Scissors",
    subcategories: [
      {
        id: "hair_grooming",
        name: "Hair & Grooming",
        nameRw: "Imisatsi n'Ubwanwa",
        nameFr: "Coiffure & Soins Capillaires",
        nameSw: "Kutengeneza Nywele na Ndevu",
        mainCategoryId: "beauty_personal_care",
        types: [
          { id: "barbershop", name: "Barbershop / Kinyozi", nameRw: "Ikinyozi (Saluni y'Abagabo)", nameFr: "Salon de Coiffure Hommes / Kinyozi", nameSw: "Kinyozi", subCategoryId: "hair_grooming", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
          { id: "hair_salon_women", name: "Women's Hair Salon (Coiffure)", nameRw: "Saluni y'Abategarugori n'Abari", nameFr: "Salon de Coiffure Dames", nameSw: "Saluni ya Wanawake", subCategoryId: "hair_grooming", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
          { id: "braiding_dreadlocks", name: "Braiding & Dreadlocks Studio", nameRw: "Kuboha Imisatsi na Dreadlocks", nameFr: "Tresses & Dreadlocks", nameSw: "Kusuka Nywele na Rasta", subCategoryId: "hair_grooming", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
          { id: "natural_hair_afro", name: "Natural Hair & Afro Care Studio", nameRw: "Kuvura no Kwita ku Misatsi Kamere", nameFr: "Studio Soins Cheveux Naturels Afro", nameSw: "Nywele Asilia za Kiafrika", subCategoryId: "hair_grooming", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "nail_skin_care",
        name: "Nails, Skin & Makeup",
        nameRw: "Inzara, Uruhu n'Ibirungo",
        nameFr: "Onglerie, Soins de la Peau & Maquillage",
        nameSw: "Kucha, Ngozi na Make-up",
        mainCategoryId: "beauty_personal_care",
        types: [
          { id: "nail_salon", name: "Nail & Lash Bar", nameRw: "Gukora Inzara n'Ingohe", nameFr: "Bar à Ongles & Cils", nameSw: "Kusafisha na Kupaka Kucha", subCategoryId: "nail_skin_care", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
          { id: "skincare_esthetics", name: "Skincare & Facial Esthetics", nameRw: "Isuku yo mu Maso n'Uruhu", nameFr: "Soins du Visage & Esthétique", nameSw: "Matunzo ya Ngozi na Uso", subCategoryId: "nail_skin_care", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
          { id: "makeup_studio", name: "Makeup Artist & Bridal Studio", nameRw: "Gusiga Ibirungo n'Imyiteguro y'Ubukwe", nameFr: "Maquillage & Mise en Beauté Mariée", nameSw: "Upakaji Make-up na Mahususi ya Harusi", subCategoryId: "nail_skin_care", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "spa_wellness",
        name: "Massage, Spa & Wellness",
        nameRw: "Massage, Sauna n'Isuku",
        nameFr: "Massage, Spa & Bien-Être",
        nameSw: "Massage, Spa na Urembo wa Mwili",
        mainCategoryId: "beauty_personal_care",
        types: [
          { id: "massage_center", name: "Massage & Reflexology Center", nameRw: "Ahabera Massage n'Uruhuko", nameFr: "Centre de Massage & Réflexologie", nameSw: "Kituo cha Massage", subCategoryId: "spa_wellness", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
          { id: "day_spa_sauna", name: "Day Spa, Sauna & Steam Bath", nameRw: "Sauna, Hamam n'Uruhuko bw'Umubiri", nameFr: "Spa Urbain, Sauna & Hammam", nameSw: "Sauna, Mvuke na Bafu", subCategoryId: "spa_wellness", mainCategoryId: "beauty_personal_care", isService: true, operatingModel: "SERVICES" },
          { id: "cosmetics_perfumes", name: "Cosmetics & Perfume Shop", nameRw: "Iduka ry'Amavuta n'Imibavu", nameFr: "Parfumerie & Soins Corporels", nameSw: "Duka la Marashi na Vipodozi", subCategoryId: "spa_wellness", mainCategoryId: "beauty_personal_care", operatingModel: "PRODUCTS" },
        ],
      },
    ],
  },

  // 7. Health & Wellness
  {
    id: "health_wellness",
    name: "Health & Wellness",
    nameRw: "Ubuzima na Farumasi",
    nameFr: "Santé & Bien-Être",
    nameSw: "Afya na Matibabu",
    icon: "HeartPulse",
    subcategories: [
      {
        id: "pharmacies_natural",
        name: "Pharmacies & Natural Health",
        nameRw: "Farumasi n'Imiti Kamere",
        nameFr: "Pharmacies & Santé Naturelle",
        nameSw: "Famasia na Dawa Asilia",
        mainCategoryId: "health_wellness",
        types: [
          { id: "community_pharmacy", name: "Community Pharmacy (Farumasi)", nameRw: "Farumasi y'Agace", nameFr: "Pharmacie d'Officine", nameSw: "Famasia ya Mtaani", subCategoryId: "pharmacies_natural", mainCategoryId: "health_wellness", operatingModel: "PRODUCTS" },
          { id: "herbal_natural_clinic", name: "Traditional Herbs & Natural Medicine", nameRw: "Imiti Kamere Nyafurika n'Ibyatsi", nameFr: "Herboristerie & Médecine Naturelle", nameSw: "Dawa za Asili", subCategoryId: "pharmacies_natural", mainCategoryId: "health_wellness", operatingModel: "PRODUCTS" },
          { id: "nutrition_supplements", name: "Nutrition & Dietary Supplements", nameRw: "Ibiribwa Byunganira Ubuzima", nameFr: "Compléments Alimentaires & Nutrition", nameSw: "Virutubisho vya Afya", subCategoryId: "pharmacies_natural", mainCategoryId: "health_wellness", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "clinics_medical",
        name: "Clinics & Medical Care",
        nameRw: "Amavuriro n'Ubuvuzi bw'Ibanze",
        nameFr: "Cliniques & Soins Médicaux",
        nameSw: "Kliniki na Huduma za Matibabu",
        mainCategoryId: "health_wellness",
        types: [
          { id: "private_clinic_dispensary", name: "Private Clinic & Dispensary", nameRw: "Ivuriro Ryigenga ry'Agace", nameFr: "Clinique Privée & Dispensaire", nameSw: "Zahanati Binafsi", subCategoryId: "clinics_medical", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
          { id: "dental_clinic", name: "Dental Clinic & Oral Health", nameRw: "Ivuriro ry'Amenyo", nameFr: "Cabinet Dentaire", nameSw: "Kliniki ya Meno", subCategoryId: "clinics_medical", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
          { id: "optician_eyecare", name: "Optician & Eye Care Center", nameRw: "Amadarubindi n'Ubuvuzi bw'Amaso", nameFr: "Opticien & Soins Visuels", nameSw: "Duka la Miwani na Afya ya Macho", subCategoryId: "clinics_medical", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
          { id: "physiotherapy_rehab", name: "Physiotherapy & Rehabilitation", nameRw: "Kugorora Imitsi n'Ubumuga", nameFr: "Kinésithérapie & Rééducation", nameSw: "Tiba ya Viungo na Mazoezi", subCategoryId: "clinics_medical", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
          { id: "diagnostic_laboratory", name: "Medical Diagnostic Laboratory", nameRw: "Laboratwari y'Ibizamini by'Ubuzima", nameFr: "Laboratoire d'Analyses Médicales", nameSw: "Maabara ya Uchunguzi wa Afya", subCategoryId: "clinics_medical", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "fitness_sports",
        name: "Fitness, Gyms & Sports",
        nameRw: "Imyitozo Ngororangingo na Siporo",
        nameFr: "Fitness, Salles de Sport & Musculation",
        nameSw: "Vituo vya Mazoezi na Michezo",
        mainCategoryId: "health_wellness",
        types: [
          { id: "gym_fitness_center", name: "Gym & Fitness Center", nameRw: "Ahabera Imyitozo Ngororangingo", nameFr: "Salle de Gym & Musculation", nameSw: "Gym na Vituo vya Mazoezi", subCategoryId: "fitness_sports", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
          { id: "yoga_pilates_studio", name: "Yoga & Pilates Studio", nameRw: "Ahabera Yoga n'Uruhuko", nameFr: "Studio de Yoga & Pilates", nameSw: "Studio ya Yoga na Mazoezi", subCategoryId: "fitness_sports", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
          { id: "martial_arts_boxing", name: "Martial Arts & Boxing Academy", nameRw: "Ishuri ry'Imikino Ntokamoke", nameFr: "Académie d'Arts Martiaux & Boxe", nameSw: "Mafunzo ya Karate na Ndondi", subCategoryId: "fitness_sports", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
          { id: "sports_swimming_complex", name: "Sports Complex & Swimming Pool", nameRw: "Pisine n'Ikibuga cy'Imikino", nameFr: "Complexe Sportif & Piscine", nameSw: "Viwanja vya Michezo na Dimbwi", subCategoryId: "fitness_sports", mainCategoryId: "health_wellness", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 8. Art, Culture & Creative Spaces
  {
    id: "creative_art_media",
    name: "Art, Culture & Creative Spaces",
    nameRw: "Ubugeni, Amafoto n'Umuco",
    nameFr: "Art, Culture & Médias",
    nameSw: "Sanaa, Utamaduni na Picha",
    icon: "Palette",
    subcategories: [
      {
        id: "art_galleries_crafts",
        name: "Art Galleries & Cultural Crafts",
        nameRw: "Inzu z'Ubugeni n'Ubukorikori",
        nameFr: "Galeries d'Art & Artisanat",
        nameSw: "Nyumba za Sanaa na Ufundi wa Asili",
        mainCategoryId: "creative_art_media",
        types: [
          { id: "art_gallery_studio", name: "Art Gallery & Contemporary Studio", nameRw: "Inzu y'Ubugeni n'Ibikorwa by'Ubuhanga", nameFr: "Galerie d'Art & Atelier d'Artiste", nameSw: "Nyumba ya Sanaa na Maonyesho", subCategoryId: "art_galleries_crafts", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
          { id: "handicrafts_workshop", name: "Traditional Handicrafts & Basketry", nameRw: "Ubukorikori bw'Uduseke n'Imitako", nameFr: "Atelier d'Artisanat & Vannerie", nameSw: "Sanaa za Mikono na Vikapu", subCategoryId: "art_galleries_crafts", mainCategoryId: "creative_art_media", operatingModel: "PRODUCTS" },
          { id: "cultural_heritage_center", name: "Cultural Center & Living Museum", nameRw: "Inzu Ndangamuco y'u Rwanda", nameFr: "Centre Culturel & Espace Patrimoine", nameSw: "Kituo cha Utamaduni na Urithi", subCategoryId: "art_galleries_crafts", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
          { id: "pottery_ceramic_studio", name: "Pottery & Ceramic Workshop", nameRw: "Ububumbyi n'Ibikoresho by'Ibumbe", nameFr: "Atelier de Poterie & Céramique", nameSw: "Karakana ya Vyungu na Udongo", subCategoryId: "art_galleries_crafts", mainCategoryId: "creative_art_media", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "photography_audiovisual",
        name: "Photography & Audiovisual",
        nameRw: "Amafoto, Amashusho n'Amajwi",
        nameFr: "Photographie & Audiovisuel",
        nameSw: "Picha, Video na Sauti",
        mainCategoryId: "creative_art_media",
        types: [
          { id: "photo_studio_portrait", name: "Photo Studio & Passport Photos", nameRw: "Sitidiyo y'Amafoto na Pasiporo", nameFr: "Studio Photo & Portraits", nameSw: "Studio ya Picha na Pasipoti", subCategoryId: "photography_audiovisual", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
          { id: "event_photographer_freelance", name: "Freelance Event & Commercial Photographer", nameRw: "Umufotozi wigenga mu Birori", nameFr: "Photographe Événementiel Indépendant", nameSw: "Mpiga Picha Binafsi wa Sherehe", subCategoryId: "photography_audiovisual", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
          { id: "videography_drone_pilot", name: "Videography & Drone Production", nameRw: "Gufata Amashusho na Drones", nameFr: "Vidéaste & Télé-Pilote de Drone", nameSw: "Upigaji Video na Droni", subCategoryId: "photography_audiovisual", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
          { id: "music_audio_studio", name: "Music Recording & Voiceover Studio", nameRw: "Sitidiyo Itunganya Umuziki n'Amajwi", nameFr: "Studio d'Enregistrement Musical", nameSw: "Studio ya Kurekodi Muziki na Sauti", subCategoryId: "photography_audiovisual", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "creative_design_services",
        name: "Graphic, Interior & Fine Art Design",
        nameRw: "Ibishushanyo mbonera n'Imitako",
        nameFr: "Design Graphique, Décoration & Beaux-Arts",
        nameSw: "Usanifu wa Michoro na Mapambo ya Ndani",
        mainCategoryId: "creative_art_media",
        types: [
          { id: "graphic_brand_designer", name: "Graphic Design & Brand Identity", nameRw: "Gukora Ibishushanyo n'Ibyapa", nameFr: "Designer Graphique & Identité Visuelle", nameSw: "Msanifu wa Michoro na Nembo", subCategoryId: "creative_design_services", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
          { id: "interior_designer", name: "Interior Designer & Home Stager", nameRw: "Gutegura Imitako yo mu Nzu", nameFr: "Architecte d'Intérieur & Décoration", nameSw: "Ubunifu wa Ndani ya Nyumba", subCategoryId: "creative_design_services", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
          { id: "painter_muralist", name: "Fine Artist, Painter & Muralist", nameRw: "Umushushanyi w'Ibishushanyo ku Nkuta", nameFr: "Peintre d'Art & Muraliste", nameSw: "Mchoraji wa Picha na Kuta", subCategoryId: "creative_design_services", mainCategoryId: "creative_art_media", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 9. Entertainment & Recreation
  {
    id: "entertainment_events",
    name: "Entertainment & Events",
    nameRw: "Ibirori n'Imyidagaduro",
    nameFr: "Événements & Loisirs",
    nameSw: "Shughuli na Burudani",
    icon: "PartyPopper",
    subcategories: [
      {
        id: "event_coordination",
        name: "Event Planning & Coordination",
        nameRw: "Gutegura Ubukwe n'Ibirori",
        nameFr: "Organisation d'Événements & Mariages",
        nameSw: "Mipango ya Harusi na Shughuli",
        mainCategoryId: "entertainment_events",
        types: [
          { id: "wedding_event_planner", name: "Wedding & Corporate Event Planner", nameRw: "Gutegura Ubukwe n'Ibirori", nameFr: "Organisateur de Mariages & Événements", nameSw: "Mpangaji wa Harusi na Shughuli", subCategoryId: "event_coordination", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
          { id: "event_decorator_florist", name: "Event Decorator & Floral Designer", nameRw: "Umutako w'Ibirori n'Indabyo", nameFr: "Décorateur Événementiel & Fleuriste", nameSw: "Mpambaji wa Sherehe na Maua", subCategoryId: "event_coordination", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
          { id: "mc_dj_entertainer", name: "Master of Ceremonies (MC) & DJ", nameRw: "Umunyamakuru w'Ibirori (MC) na DJ", nameFr: "Maître de Cérémonie (MC) & DJ", nameSw: "MC wa Sherehe na DJ", subCategoryId: "event_coordination", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "event_rentals",
        name: "Event Equipment & Sound Hire",
        nameRw: "Gukodesha Amahema, Intebe n'Ibyuma",
        nameFr: "Location Tentes, Chaises & Matériel",
        nameSw: "Kukodisha Mahema, Viti na Spika",
        mainCategoryId: "entertainment_events",
        types: [
          { id: "tent_chair_rental", name: "Tents, Chairs & Tables Rental", nameRw: "Gukodesha Amahema, Intebe n'Ameza", nameFr: "Location Tentes, Chaises & Tables", nameSw: "Ukodishaji wa Mahema, Viti na Meza", subCategoryId: "event_rentals", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
          { id: "sound_lighting_stage", name: "Sound System, Lighting & Stage Hire", nameRw: "Ibyuma by'Umuziki, Amatara na Sitaje", nameFr: "Sonorisation, Éclairage & Podium", nameSw: "Vifaa vya Muziki, Taa na Jukwaa", subCategoryId: "event_rentals", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
          { id: "party_props_bouncers", name: "Party Props, Inflatables & Games", nameRw: "Ibikoresho by'Ibirori n'Ibyo Kwidagadura", nameFr: "Structures Gonflables & Décor Festif", nameSw: "Michezo ya Watoto na Mapambo", subCategoryId: "event_rentals", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "leisure_recreation",
        name: "Leisure, Gaming & Arcades",
        nameRw: "Ahabera Imikino n'Uruhuko",
        nameFr: "Jeux, Arcades & Divertissement",
        nameSw: "Michezo ya Kielektroniki na Burudani",
        mainCategoryId: "entertainment_events",
        types: [
          { id: "playstation_game_lounge", name: "Gaming Lounge & PlayStation Arcade", nameRw: "Ahabera Imikino ya PlayStation", nameFr: "Salle de Jeux Vidéo & Arcade", nameSw: "Ukumbi wa Michezo ya PlayStation", subCategoryId: "leisure_recreation", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
          { id: "billiards_pool_hall", name: "Pool & Billiards Hall", nameRw: "Ahabera Imikino y'Amapuli", nameFr: "Salle de Billard", nameSw: "Ukumbi wa Mchezo wa Biliadi", subCategoryId: "leisure_recreation", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
          { id: "kids_playpark", name: "Children's Playpark & Amusement", nameRw: "Aho Abana Bidagadurira", nameFr: "Parc de Jeux pour Enfants", nameSw: "Uwanja wa Michezo ya Watoto", subCategoryId: "leisure_recreation", mainCategoryId: "entertainment_events", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 10. Repair & Maintenance
  {
    id: "repair_maintenance",
    name: "Repair & Maintenance",
    nameRw: "Gukanika no Gusana",
    nameFr: "Réparation & Maintenance",
    nameSw: "Ukarabati na Ufundi",
    icon: "Wrench",
    subcategories: [
      {
        id: "electronics_repair",
        name: "Electronics, Phones & Computers",
        nameRw: "Telefoni, Mudasobwa n'Ibyuma",
        nameFr: "Réparation Téléphones, PC & Électronique",
        nameSw: "Kutengeneza Simu, Kompyuta na Umeme",
        mainCategoryId: "repair_maintenance",
        types: [
          { id: "phone_repair", name: "Smartphone & Tablet Repair", nameRw: "Gukora Telefoni na Tablette", nameFr: "Réparation Smartphones & Tablettes", nameSw: "Fundi wa Simu za Mkononi", subCategoryId: "electronics_repair", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "computer_laptop_repair", name: "Computer & Laptop Service", nameRw: "Gukora Mudasobwa z'Ubwoko Bwose", nameFr: "Dépannage Informatique & PC", nameSw: "Fundi Kompyuta na Laptopy", subCategoryId: "electronics_repair", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "tv_home_appliances_repair", name: "TV, Radio & Audio Equipment Repair", nameRw: "Gukanika Televiziyo na Radiyo", nameFr: "Réparation TV & Appareils Audio", nameSw: "Kutengeneza TV, Redio na Spika", subCategoryId: "electronics_repair", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "solar_inverter_technician", name: "Solar Power & Inverter Repair", nameRw: "Gukanika Imirasire y'Izuba n'Imashini", nameFr: "Réparation Systèmes Solaires & Onduleurs", nameSw: "Fundi Sola na Inverter", subCategoryId: "electronics_repair", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "auto_motorcycle_care",
        name: "Motorcycle & Auto Mechanics",
        nameRw: "Moto n'Imodoka",
        nameFr: "Mécanique Moto & Automobile",
        nameSw: "Ufundi wa Pikipiki na Magari",
        mainCategoryId: "repair_maintenance",
        types: [
          { id: "moto_repair_spares", name: "Motorcycle Garage & Spare Parts", nameRw: "Gukanika Moto no Kugurisha Ibyuma byayo", nameFr: "Garage Motos & Pièces Détachées", nameSw: "Gereji ya Pikipiki na Vipuri", subCategoryId: "auto_motorcycle_care", mainCategoryId: "repair_maintenance", operatingModel: "SERVICES" },
          { id: "bicycle_mechanic", name: "Bicycle Mechanic (Igare)", nameRw: "Gukora Amagare", nameFr: "Réparateur de Bicyclettes (Igare)", nameSw: "Fundi Baiskeli", subCategoryId: "auto_motorcycle_care", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "auto_mechanic_garage", name: "Auto Mechanics & Car Repair", nameRw: "Igaraje ry'Imodoka", nameFr: "Atelier de Mécanique Automobile", nameSw: "Gereji ya Magari", subCategoryId: "auto_motorcycle_care", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "auto_electrician_diagnostics", name: "Auto Electrician & Computer Diagnostics", nameRw: "Amashanyarazi y'Imodoka no Gusuzuma", nameFr: "Électricien Auto & Diagnostic Électronique", nameSw: "Fundi Umeme wa Magari na Vipimo", subCategoryId: "auto_motorcycle_care", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "tire_repair_vulcanizing", name: "Tire Repair, Balancing & Vulcanizer", nameRw: "Guteranya no Kudoda Amapine", nameFr: "Réparation Pneus & Équilibrage", nameSw: "Kuziba Panja na Kujaza Upepo", subCategoryId: "auto_motorcycle_care", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "car_moto_wash", name: "Car Wash & Motorcycle Detailing", nameRw: "Koza Imodoka na Moto", nameFr: "Lavage Auto & Moto", nameSw: "Kituo cha Kuosha Magari na Pikipiki", subCategoryId: "auto_motorcycle_care", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "mechanical_locks",
        name: "Engines, Sewing Machines & Locks",
        nameRw: "Jenerateri, Imashini zidoda n'Imfunguzo",
        nameFr: "Générateurs, Machines à Coudre & Serrures",
        nameSw: "Jenereta, Cherehani na Kufuli",
        mainCategoryId: "repair_maintenance",
        types: [
          { id: "generator_engine_repair", name: "Generator & Small Engine Repair", nameRw: "Gukanika Moteri na Jenerateri", nameFr: "Réparation Groupes Électrogènes", nameSw: "Fundi Jenereta na Mashine", subCategoryId: "mechanical_locks", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "sewing_machine_repair", name: "Sewing Machine Technician", nameRw: "Gukora Imashini Zidoda", nameFr: "Réparateur de Machines à Coudre", nameSw: "Fundi Cherehani", subCategoryId: "mechanical_locks", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
          { id: "locksmith_keys", name: "Locksmith & Key Duplication", nameRw: "Gukora Inzugi no Gukoporora Imfunguzo", nameFr: "Serrurerie & Reproduction de Clés", nameSw: "Fundi Kufuli na Kutengeneza Funguo", subCategoryId: "mechanical_locks", mainCategoryId: "repair_maintenance", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 11. Construction & Building Services
  {
    id: "construction_building",
    name: "Construction & Building Services",
    nameRw: "Ubwubatsi n'Ubuyobozi bw'Imirimo",
    nameFr: "Construction & Bâtiment",
    nameSw: "Ujenzi na Mafundi",
    icon: "HardHat",
    subcategories: [
      {
        id: "construction_contractors",
        name: "General Building & Masonry",
        nameRw: "Kompanyi z'Ubwubatsi n'Ubwubatsi Rusange",
        nameFr: "Entreprises Générales & Maçonnerie",
        nameSw: "Wakandarasi na Mafundi Uashi",
        mainCategoryId: "construction_building",
        types: [
          { id: "general_building_contractor", name: "General Building Contractor", nameRw: "Kompanyi y'Ubwubatsi Rusange", nameFr: "Entreprise Générale de Bâtiment", nameSw: "Mkandarasi Mkuu wa Ujenzi", subCategoryId: "construction_contractors", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "masonry_bricklaying", name: "Masonry & Bricklaying Team", nameRw: "Abafundi b'Ubwubatsi", nameFr: "Équipe de Maçonnerie & Briquetage", nameSw: "Mafundi Uashi", subCategoryId: "construction_contractors", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "roofing_waterproofing", name: "Roofing & Waterproofing Contractor", nameRw: "Gusakara no Kurinda Amazi", nameFr: "Toiture, Charpente & Étanchéité", nameSw: "Mafundi Paa na Kuzuia Maji", subCategoryId: "construction_contractors", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "paving_stonework", name: "Paving Blocks & Stone Masonry", nameRw: "Gushyiramo Amapave no Kubaza Amabuye", nameFr: "Pose Pavés & Maçonnerie de Pierre", nameSw: "Uwekaji Paving na Mawe", subCategoryId: "construction_contractors", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "trade_crafts",
        name: "Electricians, Plumbers & Specialized Trades",
        nameRw: "Abamashanyarazi, Ab'Amazi n'Ababaji",
        nameFr: "Électriciens, Plombiers & Artisans du Bâtiment",
        nameSw: "Mafundi Umeme, Mabomba na Mbao",
        mainCategoryId: "construction_building",
        types: [
          { id: "residential_electrician", name: "Electrician & Electrical Installation", nameRw: "Umukanishi w'Amashanyarazi", nameFr: "Électricien d'Installation & Dépannage", nameSw: "Fundi Umeme wa Majumbani", subCategoryId: "trade_crafts", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "plumber_pipefitter", name: "Plumber & Sanitary Pipefitter", nameRw: "Umukanishi w'Amazi", nameFr: "Plombier & Installations Sanitaires", nameSw: "Fundi Bomba la Maji", subCategoryId: "trade_crafts", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "carpenter_joiner", name: "Carpenter & Wood Joiner", nameRw: "Umubaji w'Imbaho n'Inzugi", nameFr: "Menuisier & Charpentier Bois", nameSw: "Fundi Seremala wa Mbao", subCategoryId: "trade_crafts", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "welder_metal_fabricator", name: "Welder & Metal Fabricator", nameRw: "Gusudira no Gukora Ibyuma", nameFr: "Soudeur & Ferronnier Métallique", nameSw: "Fundi Kuchomelea na Vyuma", subCategoryId: "trade_crafts", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "painter_decorator_building", name: "House Painter & Surface Finisher", nameRw: "Gusiga Irangi Amazu", nameFr: "Peintre en Bâtiment", nameSw: "Fundi Rangi wa Majengo", subCategoryId: "trade_crafts", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "tile_setter_flooring", name: "Tile Setter & Flooring Specialist", nameRw: "Gusasaho Amakaroro", nameFr: "Carreleur & Revêtement de Sol", nameSw: "Fundi Vigae na Sakafu", subCategoryId: "trade_crafts", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "gypsum_ceiling_contractor", name: "Gypsum Board & False Ceilings", nameRw: "Ibyapa bya Gypsum n'Umutako wo Hejuru", nameFr: "Faux Plafonds & Plaques de Plâtre", nameSw: "Fundi Dari na Gypsum", subCategoryId: "trade_crafts", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "glass_aluminum_fitter", name: "Aluminum & Glass Window Fitter", nameRw: "Gukora Amadirishya y'Icyuma n'Ikirahure", nameFr: "Menuiserie Aluminium & Vitrerie", nameSw: "Fundi Vioo na Fremu za Aluminiamu", subCategoryId: "trade_crafts", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "architecture_survey",
        name: "Architecture & Surveying",
        nameRw: "Gushushanya Amazu no Gupima Ubutaka",
        nameFr: "Architecture, Ingénierie & Géomètres",
        nameSw: "Usanifu Majengo na Upimaji wa Ardhi",
        mainCategoryId: "construction_building",
        types: [
          { id: "architect_designer", name: "Architectural Drafter & Designer", nameRw: "Gushushanya Amazu no Kuyategura", nameFr: "Architecte & Dessinateur", nameSw: "Msanifu Majengo na Michoro", subCategoryId: "architecture_survey", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
          { id: "land_surveyor_topographer", name: "Land Surveyor & Topographer", nameRw: "Gupima Imbibi n'Ubutaka", nameFr: "Géomètre-Topographe & Bornage", nameSw: "Mpima Ardhi na Mipaka", subCategoryId: "architecture_survey", mainCategoryId: "construction_building", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "building_materials_hardware",
        name: "Hardware & Building Supplies",
        nameRw: "Ibikoresho by'Ubwubatsi (Quincaillerie)",
        nameFr: "Quincaillerie & Matériaux de Construction",
        nameSw: "Vifaa vya Ujenzi (Hardware)",
        mainCategoryId: "construction_building",
        types: [
          { id: "hardware_general_store", name: "General Hardware Store (Quincaillerie)", nameRw: "Iduka ry'Ibikoresho by'Ubwubatsi (Quincaillerie)", nameFr: "Quincaillerie Générale", nameSw: "Duka Kuu la Vifaa vya Ujenzi", subCategoryId: "building_materials_hardware", mainCategoryId: "construction_building", operatingModel: "PRODUCTS" },
          { id: "cement_bricks_depot", name: "Cement, Lime & Sand Depot", nameRw: "Depo ya Sima, Isuka n'Umucanga", nameFr: "Dépôt de Ciment & Granulats", nameSw: "Bohari ya Saruji na Mchanga", subCategoryId: "building_materials_hardware", mainCategoryId: "construction_building", operatingModel: "PRODUCTS" },
          { id: "timber_yard_depot", name: "Timber Yard & Wood Depot", nameRw: "Depo y'Imbaho z'Ubwubatsi", nameFr: "Dépôt de Bois & Madriers", nameSw: "Bohari ya Mbao za Ujenzi", subCategoryId: "building_materials_hardware", mainCategoryId: "construction_building", operatingModel: "PRODUCTS" },
          { id: "plumbing_electrical_supplies", name: "Plumbing & Electrical Supplies Shop", nameRw: "Iduka ry'Imipira y'Amazi n'Insinga z'Amashanyarazi", nameFr: "Fournitures Plomberie & Électricité", nameSw: "Duka la Vifaa vya Mabomba na Umeme", subCategoryId: "building_materials_hardware", mainCategoryId: "construction_building", operatingModel: "PRODUCTS" },
          { id: "iron_sheets_steel", name: "Iron Roofing Sheets & Steel Bars", nameRw: "Amabati, Imisumari n'Ibyuma by'Ubwubatsi", nameFr: "Tôles, Fers à Béton & Profilés", nameSw: "Mabati na Nondo za Ujenzi", subCategoryId: "building_materials_hardware", mainCategoryId: "construction_building", operatingModel: "PRODUCTS" },
        ],
      },
    ],
  },

  // 12. Home & Property Services
  {
    id: "home_property",
    name: "Home & Property Services",
    nameRw: "Amazu n'Isambu",
    nameFr: "Services Immobiliers & Habitat",
    nameSw: "Huduma za Nyumba na Ardhi",
    icon: "Home",
    subcategories: [
      {
        id: "real_estate_services",
        name: "Real Estate & Property Management",
        nameRw: "Ibiro Bigurisha no Gucunga Amazu",
        nameFr: "Agences Immobilières & Gestion",
        nameSw: "Mawakala wa Majumba na Viwanja",
        mainCategoryId: "home_property",
        types: [
          { id: "real_estate_agency", name: "Real Estate Agency & Broker", nameRw: "Ibiro Bigurisha no Gukodesha Amazu", nameFr: "Agence Immobilière & Courtage", nameSw: "Wakala wa Majumba na Viwanja", subCategoryId: "real_estate_services", mainCategoryId: "home_property", isService: true, operatingModel: "SERVICES" },
          { id: "property_management", name: "Property Caretaking & Management", nameRw: "Gukurikirana no Gucunga Amazu", nameFr: "Gestion Immobilière & Syndic", nameSw: "Usimamizi wa Majengo", subCategoryId: "real_estate_services", mainCategoryId: "home_property", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "landscaping_grounds",
        name: "Landscaping & Gardening",
        nameRw: "Ubusitani n'Indabyo",
        nameFr: "Aménagement Paysager & Jardinage",
        nameSw: "Utunzaji wa Bustani na Maua",
        mainCategoryId: "home_property",
        types: [
          { id: "landscaping_gardener", name: "Landscape Designer & Gardener", nameRw: "Gutegura Ubusitani no Kububungabunga", nameFr: "Paysagiste & Entretien de Jardins", nameSw: "Mbunifu Bustani na Mtunza Maua", subCategoryId: "landscaping_grounds", mainCategoryId: "home_property", isService: true, operatingModel: "SERVICES" },
          { id: "plant_nursery_flowers", name: "Plant Nursery & Seedling Grower", nameRw: "Ikusanyirizo ry'Ingemwe n'Indabyo", nameFr: "Pépinière de Plantes & Fleurs", nameSw: "Kitalu cha Mimea na Maua", subCategoryId: "landscaping_grounds", mainCategoryId: "home_property", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "pest_waste_environment",
        name: "Pest Control & Sanitation",
        nameRw: "Kwicisha Udukoko n'Ibyobo by'Imyanda",
        nameFr: "Désinsectisation, Dératisation & Assainissement",
        nameSw: "Udhibiti wa Wadudu na Majitaka",
        mainCategoryId: "home_property",
        types: [
          { id: "pest_control_fumigation", name: "Fumigation & Pest Control", nameRw: "Kwicisha Imbeba n'Udukoko", nameFr: "Désinsectisation & Dératisation", nameSw: "Huduma ya Kupiga Dawa ya Wadudu", subCategoryId: "pest_waste_environment", mainCategoryId: "home_property", isService: true, operatingModel: "SERVICES" },
          { id: "septic_drainage_pumping", name: "Septic Tank Pumping & Drainage", nameRw: "Kunywa no Gusukura Ibyobo by'Imyanda", nameFr: "Vidange de Fosses Septiques", nameSw: "Usafishaji wa Mashimo ya Majitaka", subCategoryId: "pest_waste_environment", mainCategoryId: "home_property", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 13. Cleaning & Laundry
  {
    id: "cleaning_laundry",
    name: "Cleaning & Laundry",
    nameRw: "Isuku no Kumesa",
    nameFr: "Nettoyage & Blanchisserie",
    nameSw: "Usafi na Dobi",
    icon: "Sparkles",
    subcategories: [
      {
        id: "laundry_services",
        name: "Laundry & Dry Cleaning",
        nameRw: "Kumesa no Kugorora Imyenda",
        nameFr: "Pressing & Blanchisserie",
        nameSw: "Huduma za Dobi na Kupasi Nguo",
        mainCategoryId: "cleaning_laundry",
        types: [
          { id: "dry_cleaner_pressing", name: "Dry Cleaner & Garment Pressing", nameRw: "Gukoresha Imashini mu Kumesa no Kugorora", nameFr: "Pressing & Nettoyage à Sec", nameSw: "Dobi ya Kisasa na Kupasi Nguo", subCategoryId: "laundry_services", mainCategoryId: "cleaning_laundry", isService: true, operatingModel: "SERVICES" },
          { id: "neighborhood_laundry", name: "Neighborhood Laundry & Wash Stand", nameRw: "Aho Bamesera Imyenda", nameFr: "Blanchisserie de Quartier", nameSw: "Dobi ya Kawaida ya Mtaani", subCategoryId: "laundry_services", mainCategoryId: "cleaning_laundry", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "facility_cleaning",
        name: "Residential & Commercial Cleaning",
        nameRw: "Isuku yo mu Ngo no mu Biro",
        nameFr: "Nettoyage Résidentiel & Professionnel",
        nameSw: "Usafi wa Nyumbani na Maofisini",
        mainCategoryId: "cleaning_laundry",
        types: [
          { id: "residential_home_cleaning", name: "Home & Domestic Cleaning Service", nameRw: "Isuku yo mu Ngo", nameFr: "Nettoyage Résidentiel à Domicile", nameSw: "Usafi wa Nyumbani", subCategoryId: "facility_cleaning", mainCategoryId: "cleaning_laundry", isService: true, operatingModel: "SERVICES" },
          { id: "office_commercial_janitorial", name: "Office & Commercial Janitorial", nameRw: "Isuku yo mu Biro n'Ibigo", nameFr: "Nettoyage de Bureaux & Locaux", nameSw: "Usafi wa Maofisini na Majengo ya Biashara", subCategoryId: "facility_cleaning", mainCategoryId: "cleaning_laundry", isService: true, operatingModel: "SERVICES" },
          { id: "carpet_upholstery_cleaning", name: "Carpet & Sofa Deep Cleaning", nameRw: "Koza Amatapi n'Intebe zifite Ibitambaro", nameFr: "Nettoyage Canapés & Tapis", nameSw: "Usafi wa Mazulia na Masofa", subCategoryId: "facility_cleaning", mainCategoryId: "cleaning_laundry", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 14. Automotive & Transport
  {
    id: "transport_logistics",
    name: "Automotive & Transport",
    nameRw: "Gutwara Abantu n'Ibintu",
    nameFr: "Transport & Logistique",
    nameSw: "Usafiri na Usafirishaji",
    icon: "Truck",
    subcategories: [
      {
        id: "passenger_transport",
        name: "Passenger Transport",
        nameRw: "Gutwara Abagenzi",
        nameFr: "Transport de Personnes",
        nameSw: "Usafiri wa Abiria",
        mainCategoryId: "transport_logistics",
        types: [
          { id: "taxi_cab_operator", name: "Taxi Cab Operator", nameRw: "Tagisi Itwara Abantu", nameFr: "Chauffeur de Taxi Agréé", nameSw: "Dereva Teksi", subCategoryId: "passenger_transport", mainCategoryId: "transport_logistics", isService: true, operatingModel: "SERVICES" },
          { id: "car_rental_chauffeur", name: "Car Rental & Chauffeur Services", nameRw: "Gukodesha Imodoka n'Abashoferi", nameFr: "Location de Voitures & Chauffeur", nameSw: "Kukodisha Magari na Dereva", subCategoryId: "passenger_transport", mainCategoryId: "transport_logistics", isService: true, operatingModel: "SERVICES" },
          { id: "tour_bus_charter", name: "Bus & Coaster Charter", nameRw: "Gukodesha Bisi n'Ibinyabiziga Binini", nameFr: "Location de Minibus & Coaster", nameSw: "Kukodisha Mabasi Madogo na Makubwa", subCategoryId: "passenger_transport", mainCategoryId: "transport_logistics", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "freight_delivery",
        name: "Courier, Delivery & Freight",
        nameRw: "Ubwikorezi bw'Ibicuruzwa n'Imizigo",
        nameFr: "Courrier Express & Fret Routier",
        nameSw: "Ujumbe wa Haraka na Usafirishaji Mizigo",
        mainCategoryId: "transport_logistics",
        types: [
          { id: "moto_delivery_courier", name: "Moto Courier & Quick Delivery", nameRw: "Abamotari Batwara Amabaruwa n'Ibipfunyitse", nameFr: "Coursier Express à Moto", nameSw: "Usafirishaji wa Haraka wa Pikipiki", subCategoryId: "freight_delivery", mainCategoryId: "transport_logistics", isService: true, operatingModel: "SERVICES" },
          { id: "freight_trucking_service", name: "Freight Trucking & Cargo Haulage", nameRw: "Ikamyo Zitwara Ibicuruzwa", nameFr: "Transport Routier de Marchandises", nameSw: "Usafirishaji wa Mizigo Mikubwa kwa Malori", subCategoryId: "freight_delivery", mainCategoryId: "transport_logistics", isService: true, operatingModel: "SERVICES" },
          { id: "moving_relocation", name: "Home & Office Moving Service", nameRw: "Kwinjiza no Kwimura Ibikoresho", nameFr: "Déménagement Résidentiel & Entreprise", nameSw: "Huduma ya Kuhama na Kuhamisha Vitu", subCategoryId: "freight_delivery", mainCategoryId: "transport_logistics", isService: true, operatingModel: "SERVICES" },
          { id: "customs_clearing_forwarding", name: "Customs Clearing & Forwarding Agent", nameRw: "Abakora Imirimo ya Gasutamo", nameFr: "Agence en Douane & Transit", nameSw: "Wakala wa Forodha na Usafirishaji", subCategoryId: "freight_delivery", mainCategoryId: "transport_logistics", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 15. Professional Services
  {
    id: "professional_services",
    name: "Professional Services & Consulting",
    nameRw: "Inama z'Ubuhanga n'Amategeko",
    nameFr: "Services Professionnels & Conseil",
    nameSw: "Huduma za Kitaalamu na Ushauri",
    icon: "Briefcase",
    subcategories: [
      {
        id: "legal_compliance",
        name: "Legal, Notary & Compliance",
        nameRw: "Amategeko, Noteri no Kwandikisha",
        nameFr: "Services Juridiques & Notariés",
        nameSw: "Huduma za Kisheria na Notisi",
        mainCategoryId: "professional_services",
        types: [
          { id: "law_firm_advocate", name: "Law Firm, Advocate & Legal Consultant", nameRw: "Ibiro by'Abavoka n'Inama mu Mategeko", nameFr: "Cabinet d'Avocats & Conseil Juridique", nameSw: "Kampuni ya Wanasheria na Mawakili", subCategoryId: "legal_compliance", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
          { id: "notary_document_agent", name: "Notary & Certified Document Services", nameRw: "Serivisi za Noteri n'Inyandiko zemewe", nameFr: "Services Notariaux & Certification", nameSw: "Huduma za Notisi na Uthibitishaji Nyaraka", subCategoryId: "legal_compliance", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
          { id: "business_registration_agent", name: "Company Registration & RDB Filing Agent", nameRw: "Ibiro bifasha Kwandikisha Ubucuruzi (RDB)", nameFr: "Formalités d'Entreprise & Guichet RDB", nameSw: "Wakala wa Usajili wa Biashara (RDB)", subCategoryId: "legal_compliance", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "accounting_tax",
        name: "Accounting, Audit & Tax Advisory",
        nameRw: "Ibaruramari, Imisoro n'Imishahara",
        nameFr: "Comptabilité, Fiscalité & Audit",
        nameSw: "Uhasibu, Kodi na Ukaguzi wa Hesabu",
        mainCategoryId: "professional_services",
        types: [
          { id: "accounting_audit_firm", name: "Accounting, Audit & Tax Advisory", nameRw: "Ibiro by'Ibaruramari n'Imisoro", nameFr: "Cabinet d'Expertise Comptable & Fiscalité", nameSw: "Wahasibu, Wakaguzi na Washauri wa Kodi", subCategoryId: "accounting_tax", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
          { id: "payroll_service", name: "Payroll & Statutory Filing Agent", nameRw: "Gucunga Imishahara n'Ubwiteganyirize", nameFr: "Gestion de Paie & Déclarations", nameSw: "Usimamizi wa Mishahara", subCategoryId: "accounting_tax", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "consulting_advisory",
        name: "Management, HR & Translation",
        nameRw: "Inama mu Bucuruzi, Abakozi n'Indimi",
        nameFr: "Conseil en Gestion, RH & Traduction",
        nameSw: "Washauri wa Biashara, Ajira na Ukalimani",
        mainCategoryId: "professional_services",
        types: [
          { id: "management_consultant", name: "Business Management Consultant", nameRw: "Inama mu Iterambere ry'Ubucuruzi", nameFr: "Conseil en Stratégie & Gestion", nameSw: "Washauri wa Usimamizi wa Biashara", subCategoryId: "consulting_advisory", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
          { id: "recruitment_hr_agency", name: "Recruitment & Staffing Agency", nameRw: "Ibiro Bishaka Abakozi", nameFr: "Cabinet de Recrutement & RH", nameSw: "Wakala wa Ajira na Rasilimali Watu", subCategoryId: "consulting_advisory", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
          { id: "marketing_pr_agency", name: "Marketing, Social Media & PR Agency", nameRw: "Ibiro byo Kwamamaza no Kumenyekanisha", nameFr: "Agence Marketing & Relations Publiques", nameSw: "Wakala wa Masoko na Mahusiano ya Umma", subCategoryId: "consulting_advisory", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
          { id: "translation_interpretation", name: "Translation & Interpretation Agency", nameRw: "Guhindura Indimi no Gusobanura", nameFr: "Traduction & Interprétariat", nameSw: "Huduma za Ukalimani na Tafsiri ya Lugha", subCategoryId: "consulting_advisory", mainCategoryId: "professional_services", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 16. Financial & Business Services
  {
    id: "finance_banking",
    name: "Financial & Banking Services",
    nameRw: "Amafaranga na MoMo",
    nameFr: "Services Financiers & Bancaires",
    nameSw: "Huduma za Kifedha na Benki",
    icon: "Landmark",
    subcategories: [
      {
        id: "mobile_agency_banking",
        name: "Mobile Money & Agency Banking",
        nameRw: "MoMo, Airtel Money na Banki",
        nameFr: "Mobile Money & Points Bancaires",
        nameSw: "Wakala wa Simu na Benki",
        mainCategoryId: "finance_banking",
        types: [
          { id: "momo_airtel_agent", name: "Mobile Money Agent (MTN MoMo / Airtel Money)", nameRw: "Wakala wa MoMo na Airtel Money", nameFr: "Agent Mobile Money Agréé", nameSw: "Wakala wa MoMo na Airtel Money", subCategoryId: "mobile_agency_banking", mainCategoryId: "finance_banking", isService: true, operatingModel: "SERVICES" },
          { id: "bank_agency_outlet", name: "Bank Agent & Agency Banking Outlet", nameRw: "Ibiro bya Banki by'Agace (BK, Equity, I&M)", nameFr: "Guichet Bancaire Délégué", nameSw: "Wakala wa Benki Mtaani", subCategoryId: "mobile_agency_banking", mainCategoryId: "finance_banking", isService: true, operatingModel: "SERVICES" },
          { id: "microfinance_sacco", name: "Microfinance Institution & Umurenge SACCO", nameRw: "Ibigo by'Imari Iciriritse na SACCO", nameFr: "Institution de Microfinance & SACCO", nameSw: "Taasisi Ndogo ya Fedha na SACCO", subCategoryId: "mobile_agency_banking", mainCategoryId: "finance_banking", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "forex_remittance",
        name: "Forex & Remittances",
        nameRw: "Ibiro Bivunja n'Ibyo Kohereza Amafaranga",
        nameFr: "Bureaux de Change & Transferts",
        nameSw: "Ubadilishaji Fedha na Utumaji Pesa",
        mainCategoryId: "finance_banking",
        types: [
          { id: "forex_bureau", name: "Foreign Exchange Bureau", nameRw: "Ibiro Bivunja Amafaranga y'Amahanga", nameFr: "Bureau de Change", nameSw: "Duka la Kubadilisha Fedha za Kigeni", subCategoryId: "forex_remittance", mainCategoryId: "finance_banking", isService: true, operatingModel: "SERVICES" },
          { id: "money_transfer_remittance", name: "International Remittance & Money Transfer", nameRw: "Kohereza no Kwakira Amafaranga Hanze", nameFr: "Transfert d'Argent International", nameSw: "Huduma ya Kutuma na Kupokea Fedha Kimataifa", subCategoryId: "forex_remittance", mainCategoryId: "finance_banking", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 17. Education & Training
  {
    id: "education_training",
    name: "Education & Training",
    nameRw: "Uburezi n'Amahugurwa",
    nameFr: "Éducation & Formation",
    nameSw: "Elimu na Mafunzo",
    icon: "GraduationCap",
    subcategories: [
      {
        id: "schools_academies",
        name: "Schools, TVET & Academies",
        nameRw: "Amashuri y'Imyuga n'Ubumenyingiro",
        nameFr: "Écoles, TVET & Académies",
        nameSw: "Shule, Vyuo vya Ufundi na Sanaa",
        mainCategoryId: "education_training",
        types: [
          { id: "nursery_daycare_school", name: "Nursery & Pre-Primary School", nameRw: "Ishuri ry'Inshuke n'Irerero", nameFr: "École Maternelle & Jardin d'Enfants", nameSw: "Shule ya Chekechea na Malezi", subCategoryId: "schools_academies", mainCategoryId: "education_training", isService: true, operatingModel: "SERVICES" },
          { id: "primary_secondary_school", name: "Primary & Secondary School", nameRw: "Ishuri ribanza n'Iryisumbuye", nameFr: "École Primaire & Secondaire", nameSw: "Shule ya Msingi na Sekondari", subCategoryId: "schools_academies", mainCategoryId: "education_training", isService: true, operatingModel: "SERVICES" },
          { id: "tvet_vocational_center", name: "TVET & Vocational Skills Center", nameRw: "Ishuri ry'Imyuga n'Ubumenyingiro (TVET)", nameFr: "Centre de Formation Professionnelle (TVET)", nameSw: "Chuo cha Mafunzo ya Ufundi Stadi", subCategoryId: "schools_academies", mainCategoryId: "education_training", isService: true, operatingModel: "SERVICES" },
          { id: "music_arts_school", name: "Music, Dance & Drama Academy", nameRw: "Ishuri ry'Umuziki n'Ibyino", nameFr: "École de Musique & Danse", nameSw: "Shule ya Muziki na Dansi", subCategoryId: "schools_academies", mainCategoryId: "education_training", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "tutoring_specialized",
        name: "Tutoring, Languages & Driving",
        nameRw: "Amahugurwa mu Masomo, Indimi na Permi",
        nameFr: "Soutien Scolaire, Langues & Auto-Écoles",
        nameSw: "Masomo ya Ziada, Lugha na Udereva",
        mainCategoryId: "education_training",
        types: [
          { id: "academic_tutor_center", name: "Academic Tutoring & Exam Preparation", nameRw: "Amahugurwa mu Masomo no Kwitegura Ibizamini", nameFr: "Soutien Scolaire & Préparation Concours", nameSw: "Masomo ya Ziada na Maandalizi ya Mitihani", subCategoryId: "tutoring_specialized", mainCategoryId: "education_training", isService: true, operatingModel: "SERVICES" },
          { id: "language_school", name: "Language School (EN, FR, RW, SW)", nameRw: "Ishuri ry'Indimi", nameFr: "Centre d'Apprentissage des Langues", nameSw: "Kituo cha Kujifunza Lugha", subCategoryId: "tutoring_specialized", mainCategoryId: "education_training", isService: true, operatingModel: "SERVICES" },
          { id: "driving_school", name: "Driving School (Auto-École)", nameRw: "Ishuri ry'Amategeko y'Umuhanda no Gutwara", nameFr: "Auto-École Agréée", nameSw: "Shule ya Udereva", subCategoryId: "tutoring_specialized", mainCategoryId: "education_training", isService: true, operatingModel: "SERVICES" },
          { id: "coding_tech_bootcamp", name: "Tech Bootcamp & Computer Literacy", nameRw: "Amahugurwa ya Mudasobwa no Kwandika Code", nameFr: "Bootcamp Informatique & Programmation", nameSw: "Mafunzo ya Kompyuta na Uandishi wa Programu", subCategoryId: "tutoring_specialized", mainCategoryId: "education_training", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 18. Technology & Electronics
  {
    id: "technology_telecom",
    name: "Technology & Electronics",
    nameRw: "Ikoranabuhanga n'Ibyuma",
    nameFr: "Technologie & Télécom",
    nameSw: "Teknolojia na Mawasiliano",
    icon: "Cpu",
    subcategories: [
      {
        id: "public_digital_access",
        name: "Irembo & Digital Public Centers",
        nameRw: "Irembo n'Ikoranabuhanga ry'Agace",
        nameFr: "Centres Numériques Irembo & Publics",
        nameSw: "Huduma za Irembo na Intaneti",
        mainCategoryId: "technology_telecom",
        types: [
          { id: "irembo_center", name: "Irembo Agent & Public Government Services", nameRw: "Irembo n'Ubufasha mu Nyandiko za Leta", nameFr: "Agent Certifié Irembo & E-Gouvernement", nameSw: "Wakala wa Huduma za Irembo na Serikali", subCategoryId: "public_digital_access", mainCategoryId: "technology_telecom", isService: true, operatingModel: "SERVICES" },
          { id: "cyber_cafe_printing", name: "Cyber Cafe & Public Internet Center", nameRw: "Ibiro by'Ikoranabuhanga n'Intaneti", nameFr: "Cybercafé & Point Internet", nameSw: "Kituo cha Intaneti na Huduma za Kompyuta", subCategoryId: "public_digital_access", mainCategoryId: "technology_telecom", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "it_networking",
        name: "Software & Network Solutions",
        nameRw: "Gukora Imbuga n'Imiyoboro ya Wi-Fi",
        nameFr: "Solutions Réseau & Développement Logiciel",
        nameSw: "Utengenezaji Mifumo na Mitandao ya Wi-Fi",
        mainCategoryId: "technology_telecom",
        types: [
          { id: "web_software_agency", name: "Web, Mobile & Software Development", nameRw: "Gukora Imbuga za Interineti n'Amaporogaramu", nameFr: "Agence Web & Développement Logiciel", nameSw: "Watengenezaji Tovuti na Mifumo", subCategoryId: "it_networking", mainCategoryId: "technology_telecom", isService: true, operatingModel: "SERVICES" },
          { id: "network_cctv_installer", name: "Network Cabling & Wi-Fi Installation", nameRw: "Gushyiramo Wi-Fi n'Imirongo ya Mudasobwa", nameFr: "Câblage Réseau & Solutions Wi-Fi", nameSw: "Ufungaji wa Mtandao na Wi-Fi", subCategoryId: "it_networking", mainCategoryId: "technology_telecom", isService: true, operatingModel: "SERVICES" },
          { id: "pos_retail_systems", name: "POS Systems & Business Software", nameRw: "Amaporogaramu yo mu Maduka na Resitora", nameFr: "Solutions Caisses & Logiciels de Vente", nameSw: "Mifumo ya Malipo ya Madukani", subCategoryId: "it_networking", mainCategoryId: "technology_telecom", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "telecom_devices",
        name: "Telecom & Satellite TV",
        nameRw: "Imiyoboro ya Telefoni na Dish",
        nameFr: "Services Télécoms & Télévision Satellite",
        nameSw: "Mawasiliano ya Simu na Ving'amuzi",
        mainCategoryId: "technology_telecom",
        types: [
          { id: "sim_telecom_services", name: "Telecom Airtime, SIM & Data Center", nameRw: "Kugurisha Imirongo ya Telefoni n'Amayinite", nameFr: "Point Télécom, Recharges & Cartes SIM", nameSw: "Vituo vya Usajili wa Laini za Simu na Salio", subCategoryId: "telecom_devices", mainCategoryId: "technology_telecom", operatingModel: "PRODUCTS" },
          { id: "satellite_tv_installation", name: "Satellite Dish & Decoder Installation (Canal+, DStv)", nameRw: "Gushyiraho Amasogisi na Dekoderi", nameFr: "Installation Antennes Paraboliques & Décodeurs", nameSw: "Ufungaji wa Ving'amuzi na Dish", subCategoryId: "telecom_devices", mainCategoryId: "technology_telecom", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 19. Agriculture & Agribusiness
  {
    id: "agriculture_agribusiness",
    name: "Agriculture & Agribusiness",
    nameRw: "Ubuhinzi n'Ubworozi",
    nameFr: "Agriculture & Agroalimentaire",
    nameSw: "Kilimo na Ufugaji",
    icon: "Sprout",
    subcategories: [
      {
        id: "agri_inputs",
        name: "Agro-Veterinary & Farm Inputs",
        nameRw: "Imiti y'Ubuhinzi, Imbuto n'Ifumbire",
        nameFr: "Agro-Vétérinaire & Intrants Agricoles",
        nameSw: "Duka la Pembejeo za Kilimo na Mifugo",
        mainCategoryId: "agriculture_agribusiness",
        types: [
          { id: "agroveterinary_pharmacy", name: "Agro-Veterinary Pharmacy (Agro-Vet)", nameRw: "Iduka ry'Imiti y'Amatungo n'Ibihingwa", nameFr: "Pharmacie Agro-Vétérinaire", nameSw: "Duka la Mifugo na Kilimo (Agro-Vet)", subCategoryId: "agri_inputs", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
          { id: "seeds_fertilizer_outlet", name: "Certified Seeds & Fertilizers", nameRw: "Imbuto z'Indobanure n'Ifumbire", nameFr: "Semences Certifiées & Engrais", nameSw: "Mbegu Bora na Mbolea", subCategoryId: "agri_inputs", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
          { id: "animal_feeds_supplements", name: "Animal Feeds & Poultry Nutrition", nameRw: "Ibiryo by'Amatungo n'Inkoko", nameFr: "Aliments Concentrés pour Élevage", nameSw: "Chakula cha Mifugo na Kuku", subCategoryId: "agri_inputs", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
          { id: "irrigation_farm_tools", name: "Farm Tools, Sprayers & Irrigation", nameRw: "Ibikoresho by'Ubuhinzi n'Ubwuhirizi", nameFr: "Outils Agricoles & Matériel d'Irrigation", nameSw: "Zana za Kilimo na Vifaa vya Kumwagilia", subCategoryId: "agri_inputs", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "crop_livestock_production",
        name: "Crop, Poultry & Livestock Production",
        nameRw: "Ubworozi bw'Inkoko, Inka n'Ibihingwa",
        nameFr: "Élevage, Aviculture & Maraîchage",
        nameSw: "Ufugaji wa Kuku, Mifugo na Kilimo cha Mboga",
        mainCategoryId: "agriculture_agribusiness",
        types: [
          { id: "produce_aggregator", name: "Fresh Farm Produce Aggregator", nameRw: "Ikusanyirizo ry'Imbuto n'Imboga", nameFr: "Collecteur de Produits Maraîchers", nameSw: "Wakusanyaji wa Mazao ya Shamba", subCategoryId: "crop_livestock_production", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
          { id: "poultry_egg_farm", name: "Poultry & Egg Farm", nameRw: "Ubworozi bw'Inkoko n'Amagi", nameFr: "Élevage Avicole & Production d'Œufs", nameSw: "Ufugaji wa Kuku na Mayai", subCategoryId: "crop_livestock_production", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
          { id: "dairy_cattle_farming", name: "Dairy & Cattle Farming", nameRw: "Ubworozi bw'Inka n'Amata", nameFr: "Élevage Bovin & Production Laitière", nameSw: "Ufugaji wa Ng'ombe na Maziwa", subCategoryId: "crop_livestock_production", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
          { id: "honey_beekeeping", name: "Beekeeping & Pure Honey Production", nameRw: "Ubworozi bw'Inzuki n'Ubuki", nameFr: "Apiculture & Miel Naturel", nameSw: "Ufugaji Nyuki na Asali Asilia", subCategoryId: "crop_livestock_production", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
          { id: "fish_farming_aquaculture", name: "Fish Farming & Aquaculture", nameRw: "Ubworozi bw'Amafi", nameFr: "Pisciculture & Aquaculture", nameSw: "Ufugaji wa Samaki", subCategoryId: "crop_livestock_production", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "agro_processing",
        name: "Milling & Agricultural Processing",
        nameRw: "Gusya Ibinyampeke n'Ikegeranyo",
        nameFr: "Moulins & Transformation Agricole",
        nameSw: "Kusaga Nafaka na Usindikaji wa Mazao",
        mainCategoryId: "agriculture_agribusiness",
        types: [
          { id: "grain_cassava_mill", name: "Maize, Cassava & Grain Mill", nameRw: "Urusyo rw'Ibigori n'Imyumbati", nameFr: "Moulin à Céréales & Manioc", nameSw: "Kinu cha Kusaga Mahindi na Mihogo", subCategoryId: "agro_processing", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
          { id: "coffee_washing_station", name: "Coffee Washing Station & Wet Mill", nameRw: "Ikusanyirizo ryo Koza Ikawa", nameFr: "Station de Lavage de Café", nameSw: "Kituo cha Kuoshea Kahawa", subCategoryId: "agro_processing", mainCategoryId: "agriculture_agribusiness", operatingModel: "PRODUCTS" },
        ],
      },
    ],
  },

  // 20. Manufacturing & Production
  {
    id: "manufacturing_production",
    name: "Manufacturing & Production",
    nameRw: "Inganda n'Ubukorikori",
    nameFr: "Fabrication & Production",
    nameSw: "Utengenezaji na Viwanda",
    icon: "Factory",
    subcategories: [
      {
        id: "artisanal_goods",
        name: "Artisanal Fabrication & Workshops",
        nameRw: "Ubwubatsi bw'Ibyuma, Imbaho n'Imyenda",
        nameFr: "Ateliers d'Artisanat & Ferronnerie",
        nameSw: "Karakana za Samani, Vyuma na Nguo",
        mainCategoryId: "manufacturing_production",
        types: [
          { id: "custom_tailoring_workshop", name: "Custom Tailoring & Garment Workshop", nameRw: "Atelier yo Kudoda Imyenda", nameFr: "Atelier de Confection Textile", nameSw: "Karakana ya Kushona Nguo", subCategoryId: "artisanal_goods", mainCategoryId: "manufacturing_production", isService: true, operatingModel: "SERVICES" },
          { id: "wood_furniture_production", name: "Woodworking & Custom Furniture", nameRw: "Ububaji bw'Intebe n'Imbaho", nameFr: "Ébénisterie & Menuiserie Bois", nameSw: "Utengenezaji wa Samani za Mbao", subCategoryId: "artisanal_goods", mainCategoryId: "manufacturing_production", operatingModel: "PRODUCTS" },
          { id: "metal_doors_windows_fabrication", name: "Metal Doors, Windows & Gates Fabrication", nameRw: "Gukora Inzugi n'Amadirishya by'Icyuma", nameFr: "Chaudronnerie & Portails Métalliques", nameSw: "Utengenezaji wa Milango na Madirisha ya Chuma", subCategoryId: "artisanal_goods", mainCategoryId: "manufacturing_production", operatingModel: "PRODUCTS" },
          { id: "leather_cobbler_production", name: "Leather Footwear & Goods Workshop", nameRw: "Gukora Inkweto n'Ibikoresho by'Uruhu", nameFr: "Cordonnerie & Fabrication Cuir", nameSw: "Utengenezaji wa Viatu na Bidhaa za Ngozi", subCategoryId: "artisanal_goods", mainCategoryId: "manufacturing_production", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "food_processing",
        name: "Packaged Foods & Beverages",
        nameRw: "Gutunganya Ibiribwa n'Ibinyobwa Bipfunyitse",
        nameFr: "Agroalimentaire & Boissons Embouteillées",
        nameSw: "Usindikaji wa Vyakula na Vinywaji Vilivyofungwa",
        mainCategoryId: "manufacturing_production",
        types: [
          { id: "packaged_food_bakery", name: "Packaged Snacks & Biscuit Manufacturing", nameRw: "Gukora Ibiribwa Bipfunyitse na Biswi", nameFr: "Fabrication Biscuits & Snacks Conditionnés", nameSw: "Kiwanda cha Vitafunwa na Biskuti", subCategoryId: "food_processing", mainCategoryId: "manufacturing_production", operatingModel: "PRODUCTS" },
          { id: "juice_beverage_bottling", name: "Natural Juice & Beverage Bottling", nameRw: "Gutunganya Imitobe mu Macupa", nameFr: "Embouteillage de Jus Naturels", nameSw: "Kiwanda cha Kufungia Juisi kwenye Chupa", subCategoryId: "food_processing", mainCategoryId: "manufacturing_production", operatingModel: "PRODUCTS" },
          { id: "coffee_roasting_packaging", name: "Coffee Roasting & Packaging", nameRw: "Gutunganya no Gupfunyika Ikawa", nameFr: "Torréfaction & Conditionnement Café", nameSw: "Kiwanda cha Kukaanga na Kufungia Kahawa", subCategoryId: "food_processing", mainCategoryId: "manufacturing_production", operatingModel: "PRODUCTS" },
        ],
      },
      {
        id: "construction_materials_production",
        name: "Building Materials Manufacturing",
        nameRw: "Gukora Amapave, Amatafari n'Amarangi",
        nameFr: "Matériaux de Construction & Briques",
        nameSw: "Utengenezaji wa Matofali, Pavers na Rangi",
        mainCategoryId: "manufacturing_production",
        types: [
          { id: "concrete_block_making", name: "Concrete Blocks & Brick Yard", nameRw: "Gukora Amapave n'Amabuye y'Ubwubatsi", nameFr: "Briqueterie & Parpaings", nameSw: "Utengenezaji wa Matofali ya Saruji", subCategoryId: "construction_materials_production", mainCategoryId: "manufacturing_production", operatingModel: "PRODUCTS" },
          { id: "paint_chemicals_mixing", name: "Local Paint & Adhesives Production", nameRw: "Gukora Amarangi n'Ibinonkozerano", nameFr: "Fabrication Peintures & Dérivés", nameSw: "Utengenezaji wa Rangi za Majengo", subCategoryId: "construction_materials_production", mainCategoryId: "manufacturing_production", operatingModel: "PRODUCTS" },
        ],
      },
    ],
  },

  // 21. Security Services
  {
    id: "security_safety",
    name: "Security Services",
    nameRw: "Umutekano n'Uburinzi",
    nameFr: "Sécurité & Gardiennage",
    nameSw: "Huduma za Ulinzi",
    icon: "Shield",
    subcategories: [
      {
        id: "manned_security",
        name: "Security Guards & Event Bouncers",
        nameRw: "Abarinzi n'Umutekano wo mu Birori",
        nameFr: "Gardiennage & Sécurité Événementielle",
        nameSw: "Walinzi Binafsi na Sherehe",
        mainCategoryId: "security_safety",
        types: [
          { id: "security_guard_agency", name: "Security Guard & Manned Protection", nameRw: "Kompanyi y'Uburinzi bw'Amazu n'Ibigo", nameFr: "Société de Gardiennage & Surveillance", nameSw: "Kampuni ya Walinzi binafsi", subCategoryId: "manned_security", mainCategoryId: "security_safety", isService: true, operatingModel: "SERVICES" },
          { id: "bouncer_event_protection", name: "Bouncer & Event Protocol Security", nameRw: "Abarinzi bo mu Birori n'Ubwugamo", nameFr: "Sécurité Événementielle & Garde du Corps", nameSw: "Walinzi wa Sherehe na Watu Mashuhuri", subCategoryId: "manned_security", mainCategoryId: "security_safety", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "electronic_security",
        name: "CCTV, Electric Fences & Alarms",
        nameRw: "Kamera z'Umutekano, Amatara n'Insinga z'Amashanyarazi",
        nameFr: "Vidéosurveillance CCTV, Alarmes & Clôtures Électriques",
        nameSw: "Kamera za CCTV, Waya za Umeme na Kengele",
        mainCategoryId: "security_safety",
        types: [
          { id: "cctv_surveillance_installation", name: "CCTV & Surveillance Camera Installation", nameRw: "Gushyiraho Kamera z'Umutekano (CCTV)", nameFr: "Installation Vidéosurveillance & Caméras", nameSw: "Ufungaji wa Kamera za Usalama (CCTV)", subCategoryId: "electronic_security", mainCategoryId: "security_safety", isService: true, operatingModel: "SERVICES" },
          { id: "electric_fence_alarms", name: "Electric Fencing & Intruder Alarms", nameRw: "Gushyiraho Amashanyarazi ku Ruzitiro n'Inzogera", nameFr: "Clôtures Électriques & Alarmes", nameSw: "Waya za Umeme za Ukutani na Kengele", subCategoryId: "electronic_security", mainCategoryId: "security_safety", isService: true, operatingModel: "SERVICES" },
          { id: "fire_safety_extinguishers", name: "Fire Safety Equipment & Extinguishers", nameRw: "Ibikoresho byo Kuzimya Inkongi", nameFr: "Équipements Incendie & Extincteurs", nameSw: "Vifaa vya Kuzimia Moto", subCategoryId: "electronic_security", mainCategoryId: "security_safety", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 22. Printing & Branding
  {
    id: "printing_branding",
    name: "Printing & Branding",
    nameRw: "Gucapa no Kwamamaza",
    nameFr: "Imprimerie & Sérigraphie",
    nameSw: "Uchapishaji na Matangazo",
    icon: "Printer",
    subcategories: [
      {
        id: "commercial_printing",
        name: "Commercial Printing & Large Format",
        nameRw: "Gucapa Inyandiko n'Ibyapa Binini",
        nameFr: "Impression Commerciale & Grand Format",
        nameSw: "Uchapishaji wa Kibiashara na Mabango",
        mainCategoryId: "printing_branding",
        types: [
          { id: "digital_offset_printing", name: "Digital & Offset Commercial Printing", nameRw: "Gucapa Inyandiko, Ibitabo n'Impapuro", nameFr: "Imprimerie Offset & Numérique", nameSw: "Uchapishaji wa Kidijitali na Vitabu", subCategoryId: "commercial_printing", mainCategoryId: "printing_branding", isService: true, operatingModel: "SERVICES" },
          { id: "large_format_banners", name: "Large Format Banners & Posters", nameRw: "Gucapa Ibyapa Binini byo Kwamamaza", nameFr: "Impression Grand Format & Banderoles", nameSw: "Mabango Makubwa ya Matangazo", subCategoryId: "commercial_printing", mainCategoryId: "printing_branding", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "promotional_branding",
        name: "Apparel Screen Printing & Signage",
        nameRw: "Gucapa ku Myenda, Ingofero n'Ibyapa by'Amaduka",
        nameFr: "Sérigraphie Textile & Enseignes",
        nameSw: "Uchapaji wa T-shirt na Mabango ya Maduka",
        mainCategoryId: "printing_branding",
        types: [
          { id: "apparel_screen_printing", name: "T-Shirt Screen Printing & Embroidery", nameRw: "Gucapa ku Myenda n'Ingofero", nameFr: "Sérigraphie Textile & Broderie T-Shirts", nameSw: "Uchapaji wa T-shirt na Nguo", subCategoryId: "promotional_branding", mainCategoryId: "printing_branding", isService: true, operatingModel: "SERVICES" },
          { id: "signboards_3d_letters", name: "Storefront Signboards & 3D Letters", nameRw: "Gukora Ibyapa by'Amaduka n'Imyandiko y'Umutako", nameFr: "Enseignes Lumineuses & Lettres 3D", nameSw: "Mabango ya Madukani na Herufi za 3D", subCategoryId: "promotional_branding", mainCategoryId: "printing_branding", isService: true, operatingModel: "SERVICES" },
          { id: "corporate_gifts_branding", name: "Branded Corporate Gifts & Stationery", nameRw: "Ibikoresho byo Kwamamaza n'Impano z'Ibigo", nameFr: "Objets Publicitaires & Goodies", nameSw: "Vifaa vya Promosheni na Zawadi za Kampuni", subCategoryId: "promotional_branding", mainCategoryId: "printing_branding", isService: true, operatingModel: "SERVICES" },
          { id: "vehicle_branding_wraps", name: "Vehicle Branding & Vinyl Decals", nameRw: "Gupfutsa Imodoka Amatangazo", nameFr: "Marquage & Covering Véhicules", nameSw: "Kubandika Stika na Matangazo Kwenye Magari", subCategoryId: "promotional_branding", mainCategoryId: "printing_branding", isService: true, operatingModel: "SERVICES" },
        ],
      },
    ],
  },

  // 23. Childcare & Personal Services
  {
    id: "childcare_personal_services",
    name: "Childcare & Personal Services",
    nameRw: "Abana n'Imirimo y'Urugo",
    nameFr: "Services Familiaux & Personnels",
    nameSw: "Malezi na Huduma Binafsi",
    icon: "Baby",
    subcategories: [
      {
        id: "childcare_family",
        name: "Daycare & Babysitting",
        nameRw: "Irerero ry'Abana bato n'Abarerezi",
        nameFr: "Crèches, Garderies & Nounous",
        nameSw: "Vituo vya Malezi na Yaya",
        mainCategoryId: "childcare_personal_services",
        types: [
          { id: "daycare_creche", name: "Daycare Center & Crèche", nameRw: "Irerero ry'Abana bato", nameFr: "Crèche & Garderie d'Enfants", nameSw: "Kituo cha Malezi ya Watoto Wadogo", subCategoryId: "childcare_family", mainCategoryId: "childcare_personal_services", isService: true, operatingModel: "SERVICES" },
          { id: "babysitting_nanny_agency", name: "Nanny & Babysitting Agency", nameRw: "Ibiro bishakira Abantu Abarezi b'Abana", nameFr: "Agence de Nounous & Garde d'Enfants", nameSw: "Huduma ya Yaya na Walezi wa Watoto Nyumbani", subCategoryId: "childcare_family", mainCategoryId: "childcare_personal_services", isService: true, operatingModel: "SERVICES" },
        ],
      },
      {
        id: "personal_concierge",
        name: "Errands, Tailoring Mending & Home Help",
        nameRw: "Gutumwa, Gusana Imyenda n'Abakozi bo mu Rugo",
        nameFr: "Courses, Retouches Vêtements & Aide à Domicile",
        nameSw: "Kutumwa, Kurekebisha Nguo na Wafanyakazi wa Ndani",
        mainCategoryId: "childcare_personal_services",
        types: [
          { id: "errands_personal_shopper", name: "Personal Shopper & Errands Runner", nameRw: "Guhahirira Abandi no Gutumwa", nameFr: "Coursier Personnel & Dépôt-Course", nameSw: "Huduma ya Kufanya Manunuzi na Kutumwa", subCategoryId: "personal_concierge", mainCategoryId: "childcare_personal_services", isService: true, operatingModel: "SERVICES" },
          { id: "clothing_alterations_mending", name: "Clothing Alterations & Mending", nameRw: "Kugorora Imyenda no Guteranya", nameFr: "Retouches & Réparation Vêtements", nameSw: "Kurekebisha na Kushona Nguo Zilizoraruka", subCategoryId: "personal_concierge", mainCategoryId: "childcare_personal_services", isService: true, operatingModel: "SERVICES" },
          { id: "domestic_staffing_agency", name: "Domestic Staffing & Housekeepers Agency", nameRw: "Ibiro Bishaka Abakozi bo mu Rugo", nameFr: "Agence de Personnel de Maison", nameSw: "Wakala wa Wafanyakazi wa Ndani", subCategoryId: "personal_concierge", mainCategoryId: "childcare_personal_services", isService: true, operatingModel: "SERVICES" },
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
  // Legacy category slugs
  shop_retail: "retail_shops",
  retail: "retail_shops",
  salon_barber: "beauty_personal_care",
  personal_care: "beauty_personal_care",
  food_restaurant: "food_dining",
  food_hospitality: "food_dining",
  tailor_crafts: "fashion_apparel",
  crafts_tailoring: "fashion_apparel",
  phone_electronics: "technology_telecom",
  mechanic_repair: "repair_maintenance",
  repair_technical: "repair_maintenance",
  hardware_construction: "construction_building",
  pharmacy_health: "health_wellness",
  health_pharmacy: "health_wellness",
  services: "professional_services",
  services_office: "professional_services",
  art_culture: "creative_art_media",
  agriculture_produce: "agriculture_agribusiness",

  // Legacy free-text values
  "Pharmacy & Health": "health_wellness",
  "Restaurant & Cafe": "food_dining",
  "Tailoring & Fashion": "fashion_apparel",
};

// Aliases so lookup via legacy key also finds the canonical MainCategoryItem
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
    if (!sub || (sub.mainCategoryId !== resolvedMainId && LEGACY_CATEGORY_MAP[sub.mainCategoryId] !== resolvedMainId)) {
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
    if (bt.mainCategoryId !== resolvedMainId && LEGACY_CATEGORY_MAP[bt.mainCategoryId] !== resolvedMainId) {
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

  const resolvedMainId = LEGACY_CATEGORY_MAP[businessTypeIdOrSub] || businessTypeIdOrSub;
  const main = ALL_MAIN_CATEGORIES[resolvedMainId];
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

export interface OperatingModelInfo {
  model: BusinessOperatingModel;
  stepLabel: string;
  stepLabelRw: string;
  continueBtnLabel: string;
  continueBtnLabelRw: string;
  sectionTitle: string;
  sectionTitleRw: string;
  sectionSubtitle: string;
  sectionSubtitleRw: string;
  itemTerm: string;
  itemTermRw: string;
  itemPlaceholder: string;
  itemPlaceholderRw: string;
  addAnotherText: string;
  addAnotherTextRw: string;
  addBtnLabel: string;
  addBtnLabelRw: string;
  isServiceDefault: boolean;
  hasBookings: boolean;
  hasOrders: boolean;
  hasStock: boolean;
}

/**
 * Derives the core business operating model from the 3-tier taxonomy.
 * Differentiates product retail, pure service establishments, and food/dining.
 */
export function getBusinessOperatingModel(
  mainCategory?: string | null,
  subCategory?: string | null,
  businessType?: string | null
): OperatingModelInfo {
  const bt = businessType ? ALL_BUSINESS_TYPES[businessType] : null;
  const resolvedMain = mainCategory ? (LEGACY_CATEGORY_MAP[mainCategory] || mainCategory) : "retail_shops";

  // Check explicit operatingModel or isService on businessType first
  if (bt) {
    if (bt.operatingModel === "FOOD_DINING") {
      return getFoodDiningModel();
    }
    if (bt.operatingModel === "SERVICES" || bt.isService) {
      return getServicesModel();
    }
    if (bt.operatingModel === "PRODUCTS") {
      return getProductsModel();
    }
  }

  // Pure service categories
  const isServiceCategory =
    resolvedMain === "beauty_personal_care" ||
    resolvedMain === "repair_maintenance" ||
    resolvedMain === "construction_building" ||
    resolvedMain === "cleaning_laundry" ||
    resolvedMain === "transport_logistics" ||
    resolvedMain === "professional_services" ||
    resolvedMain === "finance_banking" ||
    resolvedMain === "education_training" ||
    resolvedMain === "security_safety" ||
    resolvedMain === "childcare_personal_services" ||
    resolvedMain === "entertainment_events";

  if (isServiceCategory) {
    return getServicesModel();
  }

  // Food & dining categories
  if (resolvedMain === "food_dining" || resolvedMain === "bars_nightlife") {
    return getFoodDiningModel();
  }

  // Default: Product Retail & Merchandise
  return getProductsModel();
}

function getServicesModel(): OperatingModelInfo {
  return {
    model: "SERVICES",
    stepLabel: "Services",
    stepLabelRw: "Serivisi",
    continueBtnLabel: "Continue to Services",
    continueBtnLabelRw: "Komeza kuri Serivisi",
    sectionTitle: "Services & Pricing",
    sectionTitleRw: "Serivisi n'Ibiciro Byazo",
    sectionSubtitle: "List the primary services you provide to clients with standard starting rates or fixed fees.",
    sectionSubtitleRw: "Shyiraho serivisi z'ibanze utanga n'ibiciro byazo bisanzwe.",
    itemTerm: "Service",
    itemTermRw: "Serivisi",
    itemPlaceholder: "e.g. Electrical Wiring, Men's Haircut, Tax Filing, Plumbing Inspection",
    itemPlaceholderRw: "Urugero: Gukora Amashanyarazi, Kogosha Imisatsi, Ibaruramari, Gukanika Amazi",
    addAnotherText: "Add Another Service",
    addAnotherTextRw: "Ongeraho Indi Serivisi",
    addBtnLabel: "Add Service",
    addBtnLabelRw: "Ongeraho Serivisi",
    isServiceDefault: true,
    hasBookings: true,
    hasOrders: false,
    hasStock: false,
  };
}

function getFoodDiningModel(): OperatingModelInfo {
  return {
    model: "FOOD_DINING",
    stepLabel: "Menu & Offerings",
    stepLabelRw: "Amenu n'Amafunguro",
    continueBtnLabel: "Continue to Menu & Offerings",
    continueBtnLabelRw: "Komeza kuri Amenu",
    sectionTitle: "Menu Items & Offerings",
    sectionTitleRw: "Amenu y'Ibiryo n'Ibinyobwa",
    sectionSubtitle: "List your popular dishes, fresh milk, bakery items or drinks along with current prices.",
    sectionSubtitleRw: "Shyiraho amafunguro n'ibinyobwa bikunzwe n'ibiciro byabyo ubu.",
    itemTerm: "Menu Item / Dish",
    itemTermRw: "Ifunguro / Ikinyobwa",
    itemPlaceholder: "e.g. Brochettes & Chips, Fresh Milk (1L), Buffet Lunch, House Coffee",
    itemPlaceholderRw: "Urugero: Burusheti n'Ibirayi, Amata Meza Litiro 1, Ifunguro ry'Umunsi, Ikawa y'u Rwanda",
    addAnotherText: "Add Another Menu Item",
    addAnotherTextRw: "Ongeraho Ikindi ku Menu",
    addBtnLabel: "Add Menu Item",
    addBtnLabelRw: "Ongeraho ku Menu",
    isServiceDefault: false,
    hasBookings: true,
    hasOrders: true,
    hasStock: true,
  };
}

function getProductsModel(): OperatingModelInfo {
  return {
    model: "PRODUCTS",
    stepLabel: "Products",
    stepLabelRw: "Ibicuruzwa",
    continueBtnLabel: "Continue to Products",
    continueBtnLabelRw: "Komeza ku Bicuruzwa",
    sectionTitle: "Products & Initial Inventory Prices",
    sectionTitleRw: "Ibicuruzwa n'Ibiciro by'Ibanze",
    sectionSubtitle: "List key goods or products you regularly sell with their verified shelf prices.",
    sectionSubtitleRw: "Shyiraho ibicuruzwa by'ingenzi ugurisha buri munsi n'ibiciro byabyo.",
    itemTerm: "Product",
    itemTermRw: "Igicuruzwa",
    itemPlaceholder: "e.g. Fresh Tomatoes (1kg), White Rice (25kg), Cement Bag (50kg), Kitenge Wax",
    itemPlaceholderRw: "Urugero: Inyanya Nshya (1kg), Umuceri (25kg), Isima (50kg), Igitenge cya Wax",
    addAnotherText: "Add Another Product",
    addAnotherTextRw: "Ongeraho Ikindi Gicuruzwa",
    addBtnLabel: "Add Product",
    addBtnLabelRw: "Ongeraho Igicuruzwa",
    isServiceDefault: false,
    hasBookings: false,
    hasOrders: true,
    hasStock: true,
  };
}
