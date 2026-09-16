import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { store } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cell = searchParams.get("cell");

    const where: any = {};
    if (cell) {
      where.cell = { contains: cell, mode: "insensitive" };
    }

    const demands = await prisma.communityDemand.findMany({
      where,
      orderBy: [
        { searchCount: "desc" },
        { updatedAt: "desc" },
      ],
      take: 20,
    });

    if (demands.length > 0) {
      return NextResponse.json({
        success: true,
        count: demands.length,
        source: "database",
        demands: demands.map((d) => ({
          id: d.id,
          sector: d.sector,
          cell: d.cell,
          category: d.category,
          queryTerm: d.queryTerm,
          queryTermRw: d.queryTermRw || d.queryTerm,
          searchCount: d.searchCount,
          activeBusinessesCount: d.activeBusinessesCount,
          opportunityScore: d.opportunityScore,
          lastSearched: d.updatedAt.toISOString(),
        })),
      });
    }
  } catch (error) {
    console.warn("[Demands DB Fallback]:", error);
  }

  // Graceful fallback to initial seeds if database is not yet populated
  const fallbackDemands = store.getDemands();
  return NextResponse.json({
    success: true,
    count: fallbackDemands.length,
    source: "seed_cache",
    demands: fallbackDemands,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      query, 
      sector = "Nyamirambo", 
      cell = "Biryogo", 
      category = "General Demand" 
    } = body;

    if (!query) {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    const cleanQuery = query.trim();

    // 1. Record in SearchEvent table for analytics
    try {
      await prisma.searchEvent.create({
        data: {
          query: cleanQuery,
          sector,
          cell,
        },
      });

      // 2. Find existing demand signal or create new one
      const existing = await prisma.communityDemand.findFirst({
        where: {
          queryTerm: { equals: cleanQuery, mode: "insensitive" },
          cell: { equals: cell, mode: "insensitive" },
        },
      });

      if (existing) {
        const newCount = existing.searchCount + 1;
        const score = newCount > 30 ? "HIGH" : newCount > 10 ? "MEDIUM" : "EMERGING";
        await prisma.communityDemand.update({
          where: { id: existing.id },
          data: {
            searchCount: newCount,
            opportunityScore: score,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.communityDemand.create({
          data: {
            sector,
            cell,
            category,
            queryTerm: cleanQuery,
            queryTermRw: cleanQuery,
            searchCount: 1,
            activeBusinessesCount: 0,
            opportunityScore: "EMERGING",
          },
        });
      }
    } catch (dbError) {
      console.warn("[Demand Record DB Warning]:", dbError);
    }

    // Keep store synchronized
    store.recordSearchDemand(cleanQuery);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Demand POST Error]:", error);
    return NextResponse.json({ error: "Failed to record demand" }, { status: 500 });
  }
}
