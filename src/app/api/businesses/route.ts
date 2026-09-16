import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { VerificationStatus } from "@prisma/client";
import { INITIAL_BUSINESSES } from "@/lib/seed-data";
import { formatBusinessRecord } from "@/lib/format-business";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const community = searchParams.get("community") || undefined;
  const sector = searchParams.get("sector") || undefined;
  const cell = searchParams.get("cell") || undefined;
  const dataStatus = searchParams.get("dataStatus") || undefined;
  const search = searchParams.get("search") || undefined;
  const openNowOnly = searchParams.get("openNowOnly") === "true";
  const verification = searchParams.get("verification") || undefined;

  try {
    const where: any = {
      status: "ACTIVE",
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (sector && sector !== "all") {
      where.OR = [
        { sector: { equals: sector, mode: "insensitive" } },
        { sectorRel: { name: { equals: sector, mode: "insensitive" } } },
      ];
    }

    if (cell && cell !== "all") {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { cell: { equals: cell, mode: "insensitive" } },
          { cellRel: { name: { equals: cell, mode: "insensitive" } } },
        ],
      });
    }

    if (community && community !== "all") {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { cell: { contains: community, mode: "insensitive" } },
          { addressNote: { contains: community, mode: "insensitive" } },
          { localArea: { name: { contains: community, mode: "insensitive" } } },
        ],
      });
    }

    if (dataStatus && dataStatus !== "all") {
      where.dataStatus = dataStatus;
    }

    if (openNowOnly) {
      where.isOpenNow = true;
    }

    if (verification && verification !== "all") {
      where.verificationStatus = verification as VerificationStatus;
    }

    if (search) {
      const q = search.trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nameRw: { contains: q, mode: "insensitive" } },
          { nameFr: { contains: q, mode: "insensitive" } },
          { nameSw: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { descriptionRw: { contains: q, mode: "insensitive" } },
          { categoryDisplay: { contains: q, mode: "insensitive" } },
          { categoryDisplayRw: { contains: q, mode: "insensitive" } },
          { cell: { contains: q, mode: "insensitive" } },
          { sector: { contains: q, mode: "insensitive" } },
          { addressNote: { contains: q, mode: "insensitive" } },
          { products: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      });

      // Record search event asynchronously for Demand Intelligence
      prisma.searchEvent
        .create({
          data: {
            query: q,
            sector: sector || "Nyamirambo",
            cell: cell || community || "Biryogo",
          },
        })
        .catch(() => {});
    }

    let businesses = await prisma.business.findMany({
      where,
      include: {
        products: true,
        reviews: true,
        businessHours: true,
        localArea: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // If database is empty, return initial seed data to prevent empty states
    if (businesses.length === 0 && !search && (!category || category === "all") && (!sector || sector === "all")) {
      return NextResponse.json({
        success: true,
        source: "seed-fallback",
        count: INITIAL_BUSINESSES.length,
        businesses: INITIAL_BUSINESSES.map(formatBusinessRecord),
      });
    }

    const formatted = businesses.map(formatBusinessRecord);

    return NextResponse.json({
      success: true,
      source: "postgres",
      count: formatted.length,
      businesses: formatted,
    });
  } catch (error) {
    console.warn("[Businesses API] PostgreSQL query error, falling back to initial records:", error);
    return NextResponse.json({
      success: true,
      source: "fallback",
      count: INITIAL_BUSINESSES.length,
      businesses: INITIAL_BUSINESSES.map(formatBusinessRecord),
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const {
      name,
      nameRw,
      category,
      categoryDisplay,
      categoryDisplayRw,
      description,
      descriptionRw,
      phone,
      whatsapp,
      cell = "Biryogo",
      sector = "Nyamirambo",
      district = "Nyarugenge",
      addressNote,
      latitude = -1.981,
      longitude = 30.046,
      priceRange = "LOW",
      priceRangeMin,
      priceRangeMax,
      coverImage,
      sectorId,
      cellId,
      localAreaId,
      dataStatus = "VERIFIED",
      source,
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Business name and category are required" },
        { status: 400 }
      );
    }

    const business = await prisma.business.create({
      data: {
        name,
        nameRw: nameRw || name,
        category,
        categoryDisplay: categoryDisplay || "Local Business",
        categoryDisplayRw: categoryDisplayRw || "Ubucuruzi bw'Agace",
        description: description || "Neighborhood business registered on the ground.",
        descriptionRw: descriptionRw || description,
        phone: phone || "+250788000000",
        whatsapp: whatsapp || null,
        cell,
        sector,
        district,
        addressNote,
        latitude: Number(latitude),
        longitude: Number(longitude),
        verificationStatus: user?.role === "COMMUNITY_AGENT" ? "AGENT_VERIFIED" : "UNVERIFIED",
        priceRange,
        priceRangeMin: priceRangeMin ? Number(priceRangeMin) : null,
        priceRangeMax: priceRangeMax ? Number(priceRangeMax) : null,
        coverImage: coverImage || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
        agentId: user?.id || null,
        sectorId: sectorId || null,
        cellId: cellId || null,
        localAreaId: localAreaId || null,
        dataStatus: (dataStatus as any) || "VERIFIED",
        source: source || (user ? "COMMUNITY_AGENT" : "PLATFORM_INPUT"),
      },
    });

    // Record audit event
    await logAuditEvent({
      actorId: user?.id,
      action: "BUSINESS_REGISTERED",
      entityType: "BUSINESS",
      entityId: business.id,
      metadata: { name: business.name, cell: business.cell },
    });

    return NextResponse.json({ success: true, business: formatBusinessRecord(business) }, { status: 201 });
  } catch (error) {
    console.error("[Business Creation Error]:", error);
    return NextResponse.json(
      { error: "Failed to register business in database" },
      { status: 500 }
    );
  }
}
