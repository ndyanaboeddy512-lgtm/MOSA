import { SMSTemplateId, SMSLanguage } from "./types";

export interface TemplateDefinition {
  render(vars: Record<string, string | number>): string;
}

export const SMS_TEMPLATES: Record<SMSTemplateId, Record<SMSLanguage, TemplateDefinition>> = {
  UPDATE_SUCCESS: {
    rw: {
      render: (v) => `MOSA: Amakuru y'ubucuruzi bwa ${v.businessName || "ubucuruzi bwanyu"} yavuguruwe neza. Igiciro gishya cya ${v.itemName || "igicuruzwa"}: ${v.price || ""} Frw. mosa.rw`,
    },
    en: {
      render: (v) => `MOSA: Your business profile for ${v.businessName || "your business"} was updated successfully. ${v.itemName ? `New price for ${v.itemName}: ${v.price} RWF.` : ""} mosa.rw`,
    },
    fr: {
      render: (v) => `MOSA: Les informations de votre entreprise ${v.businessName || ""} ont été mises à jour avec succès. ${v.itemName ? `Nouveau prix pour ${v.itemName}: ${v.price} RWF.` : ""} mosa.rw`,
    },
    sw: {
      render: (v) => `MOSA: Wasifu wa biashara yako ya ${v.businessName || ""} umesasishwa kikamilifu. ${v.itemName ? `Bei mpya ya ${v.itemName}: ${v.price} RWF.` : ""} mosa.rw`,
    },
  },
  REMINDER: {
    rw: {
      render: (v) => `MOSA Ibibutsa: Hasize iminsi ${v.days || 60} mudasubiramo amakuru ya ${v.businessName || "ubucuruzi bwanyu"}. Kanda hano wemeze cyangwa uvugurure: mosa.rw/owner`,
    },
    en: {
      render: (v) => `MOSA Reminder: It has been ${v.days || 60} days since you last confirmed ${v.businessName || "your business"} details. Please confirm or update: mosa.rw/owner`,
    },
    fr: {
      render: (v) => `Rappel MOSA: Il s'est écoulé ${v.days || 60} jours depuis votre dernière confirmation pour ${v.businessName || "votre entreprise"}. Confirmez: mosa.rw/owner`,
    },
    sw: {
      render: (v) => `Kikumbusho cha MOSA: Zimepita siku ${v.days || 60} tangu uthibitishe maelezo ya ${v.businessName || "biashara yako"}. Thibitisha: mosa.rw/owner`,
    },
  },
  SECURITY_ALERT: {
    rw: {
      render: (v) => `MOSA Umutekano: Umwirondoro cyangwa ijambobanga ry'ubucuruzi ${v.businessName || ""} byahinduwe. Niba atari wowe, vugana natwe ako kanya.`,
    },
    en: {
      render: (v) => `MOSA Security Alert: Account security settings or password for ${v.businessName || "your business"} were changed. If this wasn't you, contact support immediately.`,
    },
    fr: {
      render: (v) => `Alerte de Sécurité MOSA: Les paramètres de sécurité de votre compte pour ${v.businessName || ""} ont été modifiés. Contactez le support si ce n'est pas vous.`,
    },
    sw: {
      render: (v) => `Tahadhari ya Usalama ya MOSA: Mipangilio ya usalama ya akaunti ya ${v.businessName || ""} imebadilishwa. Wasiliana nasi mara moja ikiwa sio wewe.`,
    },
  },
  PROFILE_CONFIRMATION: {
    rw: {
      render: (v) => `MOSA: Urakoze kwemeza ko amakuru ya ${v.businessName || "ubucuruzi bwanyu"} ari yo. Ubucuruzi bwanyu buzahora bugaragara neza mu gace kanyu. mosa.rw`,
    },
    en: {
      render: (v) => `MOSA: Thank you for confirming your business information for ${v.businessName || "your business"}. Your listing remains active and verified. mosa.rw`,
    },
    fr: {
      render: (v) => `MOSA: Merci d'avoir confirmé les informations de ${v.businessName || "votre entreprise"}. Votre profil reste actif et vérifié. mosa.rw`,
    },
    sw: {
      render: (v) => `MOSA: Asante kwa kuthibitisha maelezo ya ${v.businessName || "biashara yako"}. Orodha yako inasalia kuwa hai na iliyothibitishwa. mosa.rw`,
    },
  },
  DEMAND_ALERT: {
    rw: {
      render: (v) => `MOSA Isoko: Abaturage ${v.searchCount || "benshi"} bashatse serivisi nka ${v.category || "izanyu"} muri ${v.cell || "agace kanyu"} muri iki cyumweru. Reba: mosa.rw/owner`,
    },
    en: {
      render: (v) => `MOSA Demand Alert: ${v.searchCount || "Multiple"} neighbors searched for ${v.category || "services like yours"} in ${v.cell || "your neighborhood"} this week. View: mosa.rw/owner`,
    },
    fr: {
      render: (v) => `Alerte Demande MOSA: ${v.searchCount || "Plusieurs"} résidents ont recherché ${v.category || "vos services"} à ${v.cell || "votre quartier"} cette semaine. mosa.rw/owner`,
    },
    sw: {
      render: (v) => `Tahadhari ya Mahitaji ya MOSA: Majirani ${v.searchCount || "wengi"} walitafuta huduma za ${v.category || "kama zako"} huko ${v.cell || "mtaa wako"} wiki hii. mosa.rw/owner`,
    },
  },
  MONTHLY_SUMMARY: {
    rw: {
      render: (v) => `MOSA Raporo (${v.monthYear}): Ibicuruzwa: ${v.totalPurchases || 0}, Igiteranyo cy'ibigurwa: ${v.totalCost || 0} RWF, Ibyitezwe kwinjira: ${v.expectedRevenue || 0} RWF, Inyungu yitezwe: ${v.expectedProfit || 0} RWF (Iteganijwe). mosa.rw/owner`,
    },
    en: {
      render: (v) => `MOSA Summary (${v.monthYear}): Purchases: ${v.totalPurchases || 0}, Cost: ${v.totalCost || 0} RWF, Expected Rev: ${v.expectedRevenue || 0} RWF, Expected Gross Profit: ${v.expectedProfit || 0} RWF (Estimated). mosa.rw/owner`,
    },
    fr: {
      render: (v) => `MOSA Bilan (${v.monthYear}): Achats: ${v.totalPurchases || 0}, Coût: ${v.totalCost || 0} RWF, Revenu prévu: ${v.expectedRevenue || 0} RWF, Bénéfice brut estimé: ${v.expectedProfit || 0} RWF (Estimé). mosa.rw/owner`,
    },
    sw: {
      render: (v) => `MOSA Ripoti (${v.monthYear}): Manunuzi: ${v.totalPurchases || 0}, Gharama: ${v.totalCost || 0} RWF, Mapato yanayotarajiwa: ${v.expectedRevenue || 0} RWF, Faida inayotarajiwa: ${v.expectedProfit || 0} RWF (Makadirio). mosa.rw/owner`,
    },
  },
  WELCOME_OWNER: {
    rw: {
      render: (v) => `Murakaza neza kuri MOSA! Ubucuruzi bwanyu "${v.businessName || ""}" bwanditswe neza. Mwinjire hano gucunga ubucuruzi: ${v.dashboardUrl || "mosa.rw/owner"}`,
    },
    en: {
      render: (v) => `Welcome to MOSA! Your business "${v.businessName || ""}" has been registered successfully. Manage your business anytime: ${v.dashboardUrl || "mosa.rw/owner"}`,
    },
    fr: {
      render: (v) => `Bienvenue sur MOSA! Votre entreprise "${v.businessName || ""}" a été enregistrée avec succès. Gérez votre entreprise: ${v.dashboardUrl || "mosa.rw/owner"}`,
    },
    sw: {
      render: (v) => `Karibu MOSA! Biashara yako "${v.businessName || ""}" imesajiliwa kikamilifu. Simamia biashara yako: ${v.dashboardUrl || "mosa.rw/owner"}`,
    },
  },
};

export function renderSMSTemplate(
  templateId: SMSTemplateId,
  lang: SMSLanguage = "rw",
  vars: Record<string, string | number> = {}
): string {
  const tpl = SMS_TEMPLATES[templateId]?.[lang] || SMS_TEMPLATES[templateId]?.["en"];
  if (!tpl) {
    return `MOSA Notification: Event ${templateId} occurred for your business.`;
  }
  return tpl.render(vars);
}
