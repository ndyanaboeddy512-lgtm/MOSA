import { prisma } from "@/lib/prisma";
import { formatBusinessRecord } from "./format-business";

export interface PulseOverview {
  whatsNew: {
    title: string;
    titleRw: string;
    count: number;
    items: any[];
  };
  whatsNeeded: {
    title: string;
    titleRw: string;
    count: number;
    items: any[];
  };
  whatsPopular: {
    title: string;
    titleRw: string;
    topCategories: { category: string; categoryRw: string; count: number }[];
  };
  whatsAvailable: {
    title: string;
    titleRw: string;
    totalServices: number;
    activeBusinesses: number;
  };
  whatsChanging: {
    title: string;
    titleRw: string;
    recentUpdatesCount: number;
    recentPriceChanges: {
      businessName: string;
      productName: string;
      newPrice: number;
      updatedAt: string;
      cell: string;
    }[];
  };
  hiddenGems: any[];
}

/**
 * Aggregates real community intelligence from Neon PostgreSQL
 * Strictly privacy-compliant: aggregates queries, searches, and inventory
 */
export async function getCommunityPulse(sector?: string, cell?: string): Promise<PulseOverview> {
  const whereLocation: any = {};
  if (sector && sector !== "ALL") {
    whereLocation.sector = sector;
  }
  if (cell && cell !== "ALL") {
    whereLocation.cell = cell;
  }

  const [
    recentBusinesses,
    demandSignals,
    allBusinesses,
    totalProductsCount,
    recentHistory,
    hiddenGemRecords,
  ] = await Promise.all([
    // What's New: Businesses created or onboarded recently
    prisma.business.findMany({
      where: { ...whereLocation, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { localArea: true },
    }),

    // What's Needed: High search demand signals
    prisma.communityDemand.findMany({
      where: sector && sector !== "ALL" ? { sector } : {},
      orderBy: { searchCount: "desc" },
      take: 6,
    }),

    // Categorical breakdown
    prisma.business.findMany({
      where: { ...whereLocation, status: "ACTIVE" },
      select: { category: true, categoryDisplay: true, categoryDisplayRw: true, viewsCount: true },
    }),

    // What's Available: Total products count
    prisma.product.count({
      where: { isAvailable: true, isArchived: false },
    }),

    // What's Changing: Recent price changes from BusinessChangeHistory
    prisma.businessChangeHistory.findMany({
      where: { action: "PRICE_CHANGED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        business: { select: { name: true, cell: true } },
        product: { select: { name: true } },
      },
    }),

    // Hidden Gems: Highly rated / verified or newly digitized micro-enterprises
    prisma.business.findMany({
      where: {
        ...whereLocation,
        status: "ACTIVE",
        verificationStatus: { in: ["AGENT_VERIFIED", "HIGH_CONFIDENCE", "BUSINESS_VERIFIED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { products: true, localArea: true },
    }),
  ]);

  // Aggregate category popularity
  const categoryCounts: Record<string, { category: string; categoryRw: string; count: number }> = {};
  for (const b of allBusinesses) {
    const key = b.category;
    if (!categoryCounts[key]) {
      categoryCounts[key] = {
        category: b.categoryDisplay || key,
        categoryRw: b.categoryDisplayRw || key,
        count: 0,
      };
    }
    categoryCounts[key].count += 1 + (b.viewsCount > 0 ? 1 : 0);
  }

  const topCategories = Object.values(categoryCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const formattedRecentPriceChanges = recentHistory.map((h) => ({
    businessName: h.business?.name || "Local Shop",
    productName: h.product?.name || h.fieldChanged || "Service Item",
    newPrice: Number(h.newValue) || 0,
    updatedAt: h.createdAt.toISOString(),
    cell: h.business?.cell || "Kigali",
  }));

  return {
    whatsNew: {
      title: "What's New in Your Community",
      titleRw: "Ibishya Byongerewe mu Agace Kanyu",
      count: recentBusinesses.length,
      items: recentBusinesses.map((b) => ({
        id: b.id,
        name: b.name,
        nameRw: b.nameRw || b.name,
        category: b.categoryDisplay,
        cell: b.cell,
        sector: b.sector,
        createdAt: b.createdAt.toISOString(),
      })),
    },
    whatsNeeded: {
      title: "What's in High Demand",
      titleRw: "Ibyo Abaturage Bari Gushaka Cyane",
      count: demandSignals.length,
      items: demandSignals.map((d) => ({
        id: d.id,
        term: d.queryTerm,
        termRw: d.queryTermRw || d.queryTerm,
        searchCount: d.searchCount,
        cell: d.cell,
        opportunityScore: d.opportunityScore,
      })),
    },
    whatsPopular: {
      title: "What's Popular Around You",
      titleRw: "Ibyiciro Bikunzwe Cyane",
      topCategories,
    },
    whatsAvailable: {
      title: "What's Available Across Network",
      titleRw: "Ibiboneka mu Muyoboro wa MOSA",
      totalServices: totalProductsCount,
      activeBusinesses: allBusinesses.length,
    },
    whatsChanging: {
      title: "What's Changing: Price & Service Updates",
      titleRw: "Ibiri Guhinduka: Ibiciro na Serivisi Nshya",
      recentUpdatesCount: recentHistory.length,
      recentPriceChanges: formattedRecentPriceChanges,
    },
    hiddenGems: hiddenGemRecords.map(formatBusinessRecord),
  };
}
