import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { VerificationStatus, LocationSource, LocationVerificationStatus } from "@prisma/client";
import { INITIAL_BUSINESSES } from "@/lib/seed-data";
import { formatBusinessRecord } from "@/lib/format-business";
import { parseSearchQuery } from "@/lib/search-nlp";
import { checkNearDuplicates } from "@/lib/location-quality";

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
  const locationVerification = searchParams.get("locationVerification") || searchParams.get("locationVerificationStatus") || undefined;
  const targetLat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : (searchParams.get("latitude") ? parseFloat(searchParams.get("latitude")!) : undefined);
  const targetLng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : (searchParams.get("longitude") ? parseFloat(searchParams.get("longitude")!) : undefined);

  try {
    // Proximity duplicate detection check using Haversine algorithm
    if (checkDuplicate && (search || searchParams.get("name"))) {
      const nameQuery = (search || searchParams.get("name") || "").trim();
      const candidateBusinesses = await prisma.business.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            ...(sector ? [{ sector: { equals: sector, mode: "insensitive" as const } }] : []),
            ...(cell ? [{ cell: { equals: cell, mode: "insensitive" as const } }] : []),
            ...(provinceId ? [{ provinceId }] : []),
            ...(districtId ? [{ districtId }] : []),
          ],
        },
        select: { id: true, name: true, cell: true, sector: true, district: true, dataStatus: true, latitude: true, longitude: true, category: true },
      });

      if (typeof targetLat === "number" && typeof targetLng === "number") {
        const dupCheck = checkNearDuplicates(
          { lat: targetLat, lng: targetLng, name: nameQuery, category },
          candidateBusinesses,
          25
        );
        return NextResponse.json({
          success: true,
          isDuplicate: dupCheck.isNearDuplicate,
          matchedBusiness: dupCheck.matchedBusiness,
          distanceMeters: dupCheck.distanceMeters,
          matchesCount: dupCheck.isNearDuplicate ? 1 : 0,
        });
      }

      const existing = candidateBusinesses.filter((b) =>
        b.name.toLowerCase().includes(nameQuery.toLowerCase()) || nameQuery.toLowerCase().includes(b.name.toLowerCase())
      );

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
          { nearestLandmark: { contains: community, mode: "insensitive" } },
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

    if (locationVerification && locationVerification !== "all") {
      where.locationVerificationStatus = locationVerification as LocationVerificationStatus;
    }

    let parsedNlp: any = null;

    if (search) {
      parsedNlp = parseSearchQuery(search);
      const q = parsedNlp.cleanQuery || search.trim();
      where.AND = where.AND || [];

      // If category was auto-detected from NLP query and not explicitly selected
      if (parsedNlp.detectedCategory && (!category || category === "all")) {
        where.category = parsedNlp.detectedCategory;
      }

      // If landmark was detected
      if (parsedNlp.matchedLandmark) {
        where.AND.push({
          OR: [
            { nearestLandmark: { contains: parsedNlp.matchedLandmark, mode: "insensitive" } },
            { addressNote: { contains: parsedNlp.matchedLandmark, mode: "insensitive" } },
            { localArea: { name: { contains: parsedNlp.matchedLandmark, mode: "insensitive" } } },
            { locationDescription: { contains: parsedNlp.matchedLandmark, mode: "insensitive" } },
          ],
        });
      }

      // If sector was detected
      if (parsedNlp.matchedSector && (!sector || sector === "all")) {
        where.AND.push({
          OR: [
            { sector: { contains: parsedNlp.matchedSector, mode: "insensitive" } },
            { sectorRel: { name: { contains: parsedNlp.matchedSector, mode: "insensitive" } } },
          ],
        });
      }

      // If cell was detected
      if (parsedNlp.matchedCell && (!cell || cell === "all")) {
        where.AND.push({
          OR: [
            { cell: { contains: parsedNlp.matchedCell, mode: "insensitive" } },
            { cellRel: { name: { contains: parsedNlp.matchedCell, mode: "insensitive" } } },
          ],
        });
      }

      // If price condition detected (e.g. under 2000 Frw)
      if (parsedNlp.priceMax) {
        where.AND.push({
          OR: [
            { products: { some: { price: { lte: parsedNlp.priceMax } } } },
            { priceRangeMin: { lte: parsedNlp.priceMax } },
          ],
        });
      }

      // Text query match
      if (q) {
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
            { nearestLandmark: { contains: q, mode: "insensitive" } },
            { streetName: { contains: q, mode: "insensitive" } },
            { nearbyPlace: { contains: q, mode: "insensitive" } },
            { locationDescription: { contains: q, mode: "insensitive" } },
            { cell: { contains: q, mode: "insensitive" } },
            { sector: { contains: q, mode: "insensitive" } },
            { addressNote: { contains: q, mode: "insensitive" } },
            { products: { some: { name: { contains: q, mode: "insensitive" } } } },
          ],
        });
      }

      // Record search event asynchronously for Demand Intelligence
      prisma.searchEvent
        .create({
          data: {
            query: search.trim(),
            sector: sector || parsedNlp.matchedSector || "Nyamirambo",
            cell: cell || parsedNlp.matchedCell || community || "Biryogo",
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
      nlpParsed: parsedNlp,
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
      nearestLandmark,
      streetName,
      nearbyPlace,
      locationDescription,
      locationSource: rawLocationSource,
      locationAccuracy: rawLocationAccuracy,
      locationVerificationStatus: rawLocationVerificationStatus,
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

    const accuracy = rawLocationAccuracy ? Number(rawLocationAccuracy) : null;
    const locSource: LocationSource = (rawLocationSource as LocationSource) || (accuracy ? LocationSource.GPS_DEVICE : LocationSource.ADMIN_MANUAL);
    const locVerification: LocationVerificationStatus = (rawLocationVerificationStatus as LocationVerificationStatus) || 
      (accuracy ? LocationVerificationStatus.AGENT_CAPTURED : 
       (user?.role === "COMMUNITY_AGENT" ? LocationVerificationStatus.AGENT_VERIFIED : LocationVerificationStatus.UNVERIFIED));

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
        nearestLandmark: nearestLandmark || addressNote || null,
        streetName: streetName || null,
        nearbyPlace: nearbyPlace || null,
        locationDescription: locationDescription || null,
        locationSource: locSource,
        locationAccuracy: accuracy,
        locationVerificationStatus: locVerification,
        locationCapturedById: accuracy ? (user?.id || null) : null,
        locationCapturedAt: accuracy ? new Date() : null,
        locationVerifiedById: user?.role === "COMMUNITY_AGENT" ? user.id : null,
        locationVerifiedAt: user?.role === "COMMUNITY_AGENT" ? new Date() : null,
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
