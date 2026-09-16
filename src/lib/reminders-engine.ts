import { prisma } from "@/lib/prisma";

export interface ActiveReminder {
  id: string;
  type: string;
  title: string;
  titleRw: string;
  message: string;
  messageRw: string;
  severity: "INFO" | "WARNING" | "URGENT";
  actionUrl: string | null;
  createdAt: string;
}

/**
 * Evaluates database conditions and syncs reminders for a business
 */
export async function syncAndGetBusinessReminders(businessId: string): Promise<ActiveReminder[]> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      products: true,
      businessHours: true,
      reminders: { where: { isResolved: false }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!business) return [];

  const existingTypes = new Set(business.reminders.map((r) => r.type));

  // 1. Check Confirmation Due
  const interval = business.confirmationIntervalDays || 60;
  const lastTime = business.lastConfirmedAt ? new Date(business.lastConfirmedAt).getTime() : 0;
  const daysSince = lastTime > 0 ? (Date.now() - lastTime) / (1000 * 60 * 60 * 24) : interval + 1;

  if (daysSince >= interval && !existingTypes.has("CONFIRMATION_DUE")) {
    await prisma.businessReminder.create({
      data: {
        businessId,
        type: "CONFIRMATION_DUE",
        title: "Information Confirmation Needed",
        titleRw: "Amakuru y'Ubucuruzi Akeneye Kwemezwa",
        message: `It has been ${Math.round(daysSince)} days since your profile details were confirmed. Confirm everything is still accurate.`,
        messageRw: `Hasize iminsi ${Math.round(daysSince)} mudasubiramo amakuru yanyu. Kanda hano wemeze ko ibintu byose bikiri ukuri.`,
        severity: "URGENT",
        actionUrl: "/owner/dashboard?tab=overview",
      },
    });
  }

  // 2. Check Missing Hours
  if (business.businessHours.length < 5 && !existingTypes.has("HOURS_MISSING")) {
    await prisma.businessReminder.create({
      data: {
        businessId,
        type: "HOURS_MISSING",
        title: "Opening Hours Not Configured",
        titleRw: "Amasaha yo Gukora Ntaramenyekana",
        message: "Your profile has incomplete opening hours. Add your operating days to guide customers.",
        messageRw: "Shyiraho amasaha mufunguriraho kugira ngo abakiriya bamenye igihe babasanga.",
        severity: "WARNING",
        actionUrl: "/owner/dashboard?tab=hours",
      },
    });
  }

  // 3. Check Products Without Price
  const unpriced = business.products.filter((p) => p.price <= 0 && !p.priceMin);
  if (unpriced.length > 0 && !existingTypes.has("PRICES_MISSING")) {
    await prisma.businessReminder.create({
      data: {
        businessId,
        type: "PRICES_MISSING",
        title: `${unpriced.length} Item(s) Without Price`,
        titleRw: `Ibicuruzwa ${unpriced.length} Bitagira Ibiciro`,
        message: "Customers search for verified prices or estimated price ranges. Add pricing to your catalogue.",
        messageRw: "Abakiriya bashaka ibiciro nyabyo cyangwa ibigereranyo. Shyiraho ibiciro ku bicuruzwa byanyu.",
        severity: "WARNING",
        actionUrl: "/owner/dashboard?tab=catalog",
      },
    });
  }

  // 4. Check Local Demand Surge in Sector/Cell
  const demand = await prisma.communityDemand.findFirst({
    where: {
      OR: [
        { cell: business.cell, category: business.category },
        { sector: business.sector, category: business.category },
      ],
      searchCount: { gte: 8 },
    },
    orderBy: { searchCount: "desc" },
  });

  if (demand && !existingTypes.has("DEMAND_SURGE")) {
    await prisma.businessReminder.create({
      data: {
        businessId,
        type: "DEMAND_SURGE",
        title: `Demand Opportunity: ${demand.queryTerm}`,
        titleRw: `Amahirwe y'Isoko: ${demand.queryTermRw || demand.queryTerm}`,
        message: `${demand.searchCount} neighbors in ${demand.cell} searched for "${demand.queryTerm}". Ensure your services are listed and prices up to date.`,
        messageRw: `Abaturage ${demand.searchCount} muri ${demand.cell} bashatse "${demand.queryTermRw || demand.queryTerm}". Reba ko serivisi zawe ziriho kandi ibiciro bikiri bishya.`,
        severity: "INFO",
        actionUrl: "/owner/dashboard?tab=catalog",
      },
    });
  }

  // Re-fetch all unresolved reminders
  const active = await prisma.businessReminder.findMany({
    where: { businessId, isResolved: false },
    orderBy: { createdAt: "desc" },
  });

  return active.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    titleRw: r.titleRw,
    message: r.message,
    messageRw: r.messageRw,
    severity: r.severity as "INFO" | "WARNING" | "URGENT",
    actionUrl: r.actionUrl,
    createdAt: r.createdAt.toISOString(),
  }));
}
