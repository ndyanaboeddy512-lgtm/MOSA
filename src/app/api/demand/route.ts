import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cell = searchParams.get("cell");
    const sector = searchParams.get("sector");

    const where: any = {};
    if (sector && sector !== "all") {
      where.OR = [
        { sector: { contains: sector, mode: "insensitive" } },
        { sectorRel: { name: { contains: sector, mode: "insensitive" } } },
      ];
    }
    if (cell && cell !== "all") {
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
  } catch (error) {
    console.error("[Demands API DB Error]:", error);
    return NextResponse.json({ error: "Failed to fetch demands from database" }, { status: 500 });
  }
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

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    const cleanQuery = query.trim();

    await prisma.$transaction(async (tx) => {
      // 1. Record search event
      await tx.searchEvent.create({
        data: {
          query: cleanQuery,
          sector,
          cell,
        },
      });

      // 2. Find existing demand signal or create new one
      const existing = await tx.communityDemand.findFirst({
        where: {
          queryTerm: { equals: cleanQuery, mode: "insensitive" },
          cell: { equals: cell, mode: "insensitive" },
        },
      });

      if (existing) {
        const newCount = existing.searchCount + 1;
        const score = newCount > 30 ? "HIGH" : newCount > 10 ? "MEDIUM" : "EMERGING";
        await tx.communityDemand.update({
          where: { id: existing.id },
          data: {
            searchCount: newCount,
            opportunityScore: score,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.communityDemand.create({
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
    });

    return NextResponse.json({ success: true, query: cleanQuery });
  } catch (error) {
    console.error("[Demand POST Error]:", error);
    return NextResponse.json({ error: "Failed to record demand in database" }, { status: 500 });
  }
}
