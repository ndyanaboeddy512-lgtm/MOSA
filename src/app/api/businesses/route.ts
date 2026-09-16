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

  const district = searchParams.get("district") || undefined;
  const districtId = searchParams.get("districtId") || undefined;
  const province = searchParams.get("province") || undefined;
  const provinceId = searchParams.get("provinceId") || undefined;
  const checkDuplicate = searchParams.get("checkDuplicate") === "true";

  try {
    // Duplicate detection check
    if (checkDuplicate && search) {
      const nameQuery = search.trim();
      const existing = await prisma.business.findMany({
        where: {
          name: { contains: nameQuery, mode: "insensitive" as const },
          OR: [
            ...(sector ? [{ sector: { equals: sector, mode: "insensitive" as const } }] : []),
            ...(cell ? [{ cell: { equals: cell, mode: "insensitive" as const } }] : []),
          ],
        },
        select: { id: true, name: true, cell: true, sector: true, district: true, dataStatus: true },
      });
      return NextResponse.json({
        success: true,
        isDuplicate: existing.length > 0,
        matchesCount: existing.length,
        matches: existing,
      });
    }

    const where: any = {
      status: "ACTIVE",
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (provinceId) {
      where.provinceId = provinceId;
    } else if (province && province !== "all") {
      where.OR = where.OR || [];
      where.provinceRel = {
        OR: [
          { name: { equals: province, mode: "insensitive" } },
          { nameRw: { equals: province, mode: "insensitive" } },
          { code: { equals: province, mode: "insensitive" } },
        ],
      };
    }

    if (districtId) {
      where.districtId = districtId;
    } else if (district && district !== "all") {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { district: { equals: district, mode: "insensitive" } },
          { districtRel: { name: { equals: district, mode: "insensitive" } } },
          { districtRel: { code: { equals: district, mode: "insensitive" } } },
        ],
      });
    }

    if (sector && sector !== "all") {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { sector: { equals: sector, mode: "insensitive" } },
          { sectorRel: { name: { equals: sector, mode: "insensitive" } } },
        ],
      });
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
      province = "Kigali City",
      addressNote,
      latitude = -1.981,
      longitude = 30.046,
      priceRange = "LOW",
      priceRangeMin,
      priceRangeMax,
      coverImage,
      provinceId,
      districtId,
      sectorId,
      cellId,
      localAreaId,
      dataStatus = "DEMO",
      source,
      products = [],
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Business name and category are required" },
        { status: 400 }
      );
    }

    // Resolve geographic IDs if missing
    let resolvedSectorId = sectorId;
    let resolvedDistrictId = districtId;
    let resolvedProvinceId = provinceId;
    let resolvedCellId = cellId;

    if (!resolvedSectorId && sector) {
      const sec = await prisma.geographicSector.findFirst({
        where: { name: { equals: sector, mode: "insensitive" } },
        include: { districtRel: true },
      });
      if (sec) {
        resolvedSectorId = sec.id;
        if (!resolvedDistrictId) resolvedDistrictId = sec.districtId;
        if (!resolvedProvinceId && sec.districtRel) resolvedProvinceId = sec.districtRel.provinceId;
      }
    }

    if (!resolvedCellId && cell && resolvedSectorId) {
      const c = await prisma.geographicCell.findFirst({
        where: { sectorId: resolvedSectorId, name: { equals: cell, mode: "insensitive" } },
      });
      if (c) resolvedCellId = c.id;
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
        phone: phone || "+250780000000 (Demo)",
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
        provinceId: resolvedProvinceId || null,
        districtId: resolvedDistrictId || null,
        sectorId: resolvedSectorId || null,
        cellId: resolvedCellId || null,
        localAreaId: localAreaId || null,
        dataStatus: (dataStatus as any) || "DEMO",
        source: source || (user ? "COMMUNITY_AGENT" : "SAMPLE_SEED"),
      },
    });

    // Create products if provided
    if (products && Array.isArray(products) && products.length > 0) {
      for (const p of products) {
        if (p.name) {
          await prisma.product.create({
            data: {
              businessId: business.id,
              name: p.name,
              nameRw: p.nameRw || null,
              price: Number(p.price || p.priceMin || 0),
              priceMin: p.priceMin ? Number(p.priceMin) : null,
              priceMax: p.priceMax ? Number(p.priceMax) : null,
              priceType: p.priceType || (p.priceMin && p.priceMax ? "RANGE" : "FIXED"),
              isEstimated: p.isEstimated ?? true,
              currency: "RWF",
              unit: p.unit || "item",
              dataStatus: (dataStatus as any) || "DEMO",
              verifiedByAgent: false,
            },
          }).catch(() => {});
        }
      }
    }

    // Record audit event
    await logAuditEvent({
      actorId: user?.id,
      action: "BUSINESS_REGISTERED",
      entityType: "BUSINESS",
      entityId: business.id,
      metadata: { name: business.name, cell: business.cell, dataStatus: business.dataStatus },
    });

    const fullBusiness = await prisma.business.findUnique({
      where: { id: business.id },
      include: { products: true, localArea: true },
    });

    return NextResponse.json({ success: true, business: formatBusinessRecord(fullBusiness || business) }, { status: 201 });
  } catch (error) {
    console.error("[Business Creation Error]:", error);
    return NextResponse.json(
      { error: "Failed to register business in database" },
      { status: 500 }
    );
  }
}
