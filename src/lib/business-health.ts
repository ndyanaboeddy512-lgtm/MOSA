import { prisma } from "@/lib/prisma";

export interface HealthRecommendation {
  id: string;
  field: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  titleRw: string;
  titleFr: string;
  titleSw: string;
  description: string;
  descriptionRw: string;
  descriptionFr: string;
  descriptionSw: string;
  actionTab: "profile" | "catalog" | "hours" | "overview";
}

export interface BusinessHealthReport {
  score: number; // 0 to 100
  grade: "POOR" | "FAIR" | "GOOD" | "EXCELLENT";
  checklist: {
    hasName: boolean;
    hasNameRw: boolean;
    hasCategory: boolean;
    hasDescription: boolean;
    hasPhone: boolean;
    hasLocation: boolean;
    hasHours: boolean;
    hasProducts: boolean;
    hasPrices: boolean;
    hasCoverPhoto: boolean;
    isRecentlyConfirmed: boolean;
  };
  recommendations: HealthRecommendation[];
}

export function evaluateBusinessHealth(business: any): BusinessHealthReport {
  let score = 0;
  const recommendations: HealthRecommendation[] = [];

  // 1. Name & Localization (10 pts)
  const hasName = Boolean(business.name && business.name.trim().length > 1);
  const hasNameRw = Boolean(business.nameRw && business.nameRw.trim().length > 1);
  if (hasName) score += 6;
  if (hasNameRw) score += 4;
  else {
    recommendations.push({
      id: "rec_name_rw",
      field: "nameRw",
      severity: "LOW",
      title: "Add Kinyarwanda Name",
      titleRw: "Ongeraho Izina mu Kinyarwanda",
      titleFr: "Ajouter le nom en kinyarwanda",
      titleSw: "Ongeza jina kwa Kinyarwanda",
      description: "Adding your business name in Kinyarwanda helps local residents discover you faster.",
      descriptionRw: "Gushyiraho izina mu Kinyarwanda bifasha abaturanyi kukubona byoroshye.",
      descriptionFr: "Ajouter votre nom en kinyarwanda aide les résidents locaux à vous trouver.",
      descriptionSw: "Kuongeza jina lako kwa Kinyarwanda kunasaidia majirani kukupata kwa urahisi.",
      actionTab: "profile",
    });
  }

  // 2. Category (10 pts)
  const hasCategory = Boolean(business.category && business.category !== "General");
  if (hasCategory) score += 10;
  else {
    recommendations.push({
      id: "rec_cat",
      field: "category",
      severity: "HIGH",
      title: "Specify Specific Category",
      titleRw: "Hitamo Icyiciro Nyacyo cy'Ubucuruzi",
      titleFr: "Préciser la catégorie",
      titleSw: "Bainisha kitengo cha biashara",
      description: "Select a clear category so your shop appears in relevant neighborhood searches.",
      descriptionRw: "Hitamo icyiciro nyacyo kugira ngo ubucuruzi bwawe bugaragare mu ishakiro.",
      descriptionFr: "Sélectionnez une catégorie claire pour apparaître dans les recherches pertinentes.",
      descriptionSw: "Chagua kitengo maalum ili uonekane kwenye utafutaji wa mtaa wako.",
      actionTab: "profile",
    });
  }

  // 3. Description (5 pts)
  const hasDescription = Boolean(business.description && business.description.trim().length > 15);
  if (hasDescription) score += 5;
  else {
    recommendations.push({
      id: "rec_desc",
      field: "description",
      severity: "MEDIUM",
      title: "Write Business Description",
      titleRw: "Andika Ubusobanuro bw'Ubucuruzi",
      titleFr: "Rédiger une description d'entreprise",
      titleSw: "Andika maelezo ya biashara",
      description: "Describe the primary services or products you offer to prospective buyers.",
      descriptionRw: "Sobanura serivisi cyangwa ibicuruzwa by'ibanze utanga ku bakiriya.",
      descriptionFr: "Décrivez vos principaux services ou produits pour attirer les clients.",
      descriptionSw: "Eleza huduma au bidhaa kuu unazotoa kwa wateja watarajiwa.",
      actionTab: "profile",
    });
  }

  // 4. Contact Phone (10 pts)
  const hasPhone = Boolean(business.phone && business.phone.trim().length >= 9);
  if (hasPhone) score += 10;
  else {
    recommendations.push({
      id: "rec_phone",
      field: "phone",
      severity: "HIGH",
      title: "Add Verified Phone Number",
      titleRw: "Shyiraho Telefone Yemewe",
      titleFr: "Ajouter un numéro de téléphone vérifié",
      titleSw: "Ongeza nambari ya simu iliyothibitishwa",
      description: "Customers cannot call or WhatsApp you without a valid phone number.",
      descriptionRw: "Abakiriya ntibabasha kuguhamagara cyangwa kukwandikira kuri WhatsApp.",
      descriptionFr: "Les clients ne peuvent pas vous contacter sans numéro valide.",
      descriptionSw: "Wateja hawawezi kukupigia au kutumia WhatsApp bila nambari sahihi.",
      actionTab: "profile",
    });
  }

  // 5. Geographic Location (15 pts)
  const sectorVal = business.sector || business.location?.sector;
  const cellVal = business.cell || business.location?.cell;
  const addressNoteVal = business.addressNote || business.location?.addressNote || business.localAreaId || business.localArea;
  const hasLocation = Boolean(
    sectorVal &&
    cellVal &&
    addressNoteVal
  );
  if (hasLocation) score += 15;
  else {
    score += (sectorVal && cellVal) ? 10 : 0;
    recommendations.push({
      id: "rec_location",
      field: "location",
      severity: "MEDIUM",
      title: "Refine Discovery Point or Landmark",
      titleRw: "Gena Ahantu Hafi y'Icyapa cyangwa Ahazwi",
      titleFr: "Préciser le point de repère ou le secteur",
      titleSw: "Bainisha alama au eneo la utambuzi",
      description: "Adding a recognizable landmark (e.g. near market, street number) guides local customers.",
      descriptionRw: "Gushyiraho ahantu hazwi (urugero: hafi y'isoko, umuhanda) bifasha abakiriya kukugana.",
      descriptionFr: "Ajouter un point de repère aide les résidents à vous localiser physiquement.",
      descriptionSw: "Kuongeza alama inayotambulika kunasaidia wateja kukufikia kwa urahisi.",
      actionTab: "profile",
    });
  }

  // 6. Opening Hours (15 pts)
  const rawHours = business.businessHours || business.openingHours;
  const hoursCount = Array.isArray(rawHours) ? rawHours.length : 0;
  const hasHours = hoursCount >= 1;
  if (hasHours) score += 15;
  else {
    recommendations.push({
      id: "rec_hours",
      field: "openingHours",
      severity: "HIGH",
      title: "Set Operating Hours",
      titleRw: "Shyiraho Amasaha y'Akazi",
      titleFr: "Définir les heures d'ouverture",
      titleSw: "Weka saa za kazi",
      description: "Provide opening and closing times so customers know when your business is active.",
      descriptionRw: "Shyiraho amasaha yo gufungura no gufunga kugira ngo abakiriya bamenye igihe mukora.",
      descriptionFr: "Indiquez vos horaires pour que les clients sachent quand vous êtes ouvert.",
      descriptionSw: "Weka saa za kufungua na kufunga ili wateja wajue wakati biashara inafanya kazi.",
      actionTab: "hours",
    });
  }

  // 7. Products / Services Count (15 pts)
  const products = Array.isArray(business.products) ? business.products : [];
  const hasProducts = products.length >= 2;
  if (products.length >= 3) score += 15;
  else if (products.length >= 1) score += 8;
  else {
    recommendations.push({
      id: "rec_products",
      field: "products",
      severity: "HIGH",
      title: "Add Products or Services",
      titleRw: "Ongeraho Ibicuruzwa cyangwa Serivisi",
      titleFr: "Ajouter des produits ou services",
      titleSw: "Ongeza bidhaa au huduma",
      description: "List at least 3 products or services to showcase what you sell.",
      descriptionRw: "Shyiraho byibuze ibicuruzwa cyangwa serivisi 3 kugira ngo ugaragaze ibyo ukora.",
      descriptionFr: "Ajoutez au moins 3 produits ou services pour présenter votre offre.",
      descriptionSw: "Ongeza angalau bidhaa au huduma 3 kuonyesha unachouza.",
      actionTab: "catalog",
    });
  }

  // 8. Product Pricing Coverage (10 pts)
  const pricedProducts = products.filter((p: any) => p.price > 0 || (p.priceMin && p.priceMax));
  const hasPrices = products.length > 0 && pricedProducts.length === products.length;
  if (products.length > 0) {
    if (hasPrices) score += 10;
    else {
      const missingCount = products.length - pricedProducts.length;
      recommendations.push({
        id: "rec_prices",
        field: "prices",
        severity: "MEDIUM",
        title: `${missingCount} Item(s) Missing Price Information`,
        titleRw: `Ibicuruzwa ${missingCount} Ntibifite Ibiciro`,
        titleFr: `${missingCount} article(s) sans prix indiqué`,
        titleSw: `Bidhaa ${missingCount} hazina bei`,
        description: "Residents prioritize transparent prices or estimated ranges before visiting.",
        descriptionRw: "Abaturage bakunda kureba ibiciro nyabyo cyangwa igipimo cy'igiciro mbere yo kuza.",
        descriptionFr: "Les résidents privilégient les prix transparents ou les fourchettes estimées.",
        descriptionSw: "Wakazi wanapendelea bei zilizo wazi kabla ya kutembelea biashara.",
        actionTab: "catalog",
      });
    }
  }

  // 9. Photos / Media (5 pts)
  const hasCoverPhoto = Boolean(business.coverImage && !business.coverImage.includes("placeholder"));
  if (hasCoverPhoto) score += 5;

  // 10. Confirmation Recency (5 pts)
  const lastConfirmedAt = business.lastConfirmedAt ? new Date(business.lastConfirmedAt).getTime() : 0;
  const intervalDays = business.confirmationIntervalDays || 60;
  const daysSinceConfirmation = lastConfirmedAt > 0 
    ? (Date.now() - lastConfirmedAt) / (1000 * 60 * 60 * 24)
    : 999;
  const isRecentlyConfirmed = daysSinceConfirmation <= intervalDays;
  if (isRecentlyConfirmed) score += 5;
  else {
    recommendations.push({
      id: "rec_confirm",
      field: "lastConfirmedAt",
      severity: "HIGH",
      title: "Confirm Business Information",
      titleRw: "Emeza Amakuru y'Ubucuruzi Bwawe",
      titleFr: "Confirmez les informations de votre entreprise",
      titleSw: "Thibitisha maelezo ya biashara yako",
      description: `Your profile details have not been confirmed in ${Math.round(daysSinceConfirmation)} days.`,
      descriptionRw: `Hasize iminsi ${Math.round(daysSinceConfirmation)} mudasubiramo amakuru y'ubucuruzi bwanyu.`,
      descriptionFr: `Vos informations n'ont pas été confirmées depuis ${Math.round(daysSinceConfirmation)} jours.`,
      descriptionSw: `Maelezo yako hayajathibitishwa kwa siku ${Math.round(daysSinceConfirmation)}.`,
      actionTab: "overview",
    });
  }

  // Determine grade
  let grade: "POOR" | "FAIR" | "GOOD" | "EXCELLENT" = "POOR";
  if (score >= 85) grade = "EXCELLENT";
  else if (score >= 70) grade = "GOOD";
  else if (score >= 50) grade = "FAIR";

  return {
    score: Math.min(100, Math.max(0, score)),
    grade,
    checklist: {
      hasName,
      hasNameRw,
      hasCategory,
      hasDescription,
      hasPhone,
      hasLocation,
      hasHours,
      hasProducts,
      hasPrices,
      hasCoverPhoto,
      isRecentlyConfirmed,
    },
    recommendations,
  };
}

/**
 * Calculates and persists health score directly to Neon PostgreSQL
 */
export async function calculateAndPersistBusinessHealth(businessId: string): Promise<BusinessHealthReport> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      products: true,
      businessHours: true,
      localArea: true,
    },
  });

  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  const report = evaluateBusinessHealth(business);

  await prisma.business.update({
    where: { id: businessId },
    data: { healthScore: report.score },
  });

  return report;
}
