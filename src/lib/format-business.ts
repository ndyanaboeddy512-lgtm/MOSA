import { Business, RwandaLocation, ProductItem, BusinessHours, DataStatus, PriceType } from "@/types";
import { formatCategoryClassification } from "./taxonomy";

/**
 * Format any raw business record (e.g. from Prisma or fallback)
 * into a typed, safe Business object guaranteed to have .location, .products, .dataStatus, etc.
 */
export function formatBusinessRecord(raw: any): Business {
  if (!raw) return raw;

  // Build safe coordinates
  const lat = typeof raw.latitude === "number" ? raw.latitude : (raw.location?.coordinates?.lat ?? -1.981);
  const lng = typeof raw.longitude === "number" ? raw.longitude : (raw.location?.coordinates?.lng ?? 30.046);

  // Extract smart location fields
  const nearestLandmark = raw.nearestLandmark || raw.location?.nearestLandmark || raw.localArea?.landmark || (raw.localArea?.type === "LANDMARK" ? raw.localArea?.name : undefined) || (raw.addressNote?.toLowerCase().includes("near") || raw.addressNote?.toLowerCase().includes("ahegereye") ? raw.addressNote : undefined);
  const streetName = raw.streetName || raw.location?.streetName || (raw.addressNote?.match(/K[G|N|K]\s*\d+\s*(?:St|Street|Rd|Road)/i)?.[0]) || undefined;
  const nearbyPlace = raw.nearbyPlace || raw.location?.nearbyPlace || undefined;
  const locationDescription = raw.locationDescription || raw.location?.locationDescription || undefined;
  const locationAccuracy = typeof raw.locationAccuracy === "number" ? raw.locationAccuracy : (typeof raw.location?.accuracy === "number" ? raw.location.accuracy : undefined);
  const locationSource = raw.locationSource || raw.location?.source || (locationAccuracy ? "GPS_DEVICE" : "ADMIN_MANUAL");
  const locationVerificationStatus = raw.locationVerificationStatus || raw.location?.verificationStatus || (locationAccuracy ? "AGENT_CAPTURED" : (raw.verificationStatus === "AGENT_VERIFIED" ? "AGENT_VERIFIED" : "UNVERIFIED"));

  // Build safe RwandaLocation
  const location: RwandaLocation = {
    country: "Rwanda",
    province: raw.location?.province || raw.provinceRel?.name || (raw.district === "Gasabo" ? "Kigali City" : "Kigali City"),
    district: raw.district || raw.districtRel?.name || raw.location?.district || (raw.sector === "Kacyiru" ? "Gasabo" : "Nyarugenge"),
    sector: raw.sector || raw.sectorRel?.name || raw.location?.sector || "Nyamirambo",
    cell: raw.cell || raw.cellRel?.name || raw.location?.cell || (raw.sector === "Kacyiru" ? "Kamutwa" : "Biryogo"),
    community: raw.location?.community || raw.localArea?.name || raw.addressNote || raw.cell || "Nyamirambo",
    addressNote: raw.addressNote || raw.location?.addressNote || "",
    nearestLandmark,
    streetName,
    nearbyPlace,
    locationDescription,
    accuracy: locationAccuracy,
    source: locationSource,
    verificationStatus: locationVerificationStatus,
    coordinates: {
      lat,
      lng,
    },
  };

  // Determine dataStatus cleanly
  const dataStatus: DataStatus = (raw.dataStatus as DataStatus) || 
    (raw.verificationStatus === "AGENT_VERIFIED" || raw.verificationStatus === "HIGH_CONFIDENCE" ? "VERIFIED" : "DEMO");

  // Build safe products list
  const products: ProductItem[] = Array.isArray(raw.products)
    ? raw.products.map((p: any) => ({
        id: String(p.id),
        businessId: String(p.businessId || raw.id),
        name: p.name || "Item",
        nameRw: p.nameRw || p.name,
        description: p.description || undefined,
        price: Number(p.price) || 0,
        priceMin: typeof p.priceMin === "number" ? p.priceMin : undefined,
        priceMax: typeof p.priceMax === "number" ? p.priceMax : undefined,
        priceType: (p.priceType as PriceType) || (p.priceMin && p.priceMax ? "RANGE" : (p.isEstimated ? "ESTIMATED" : "FIXED")),
        isEstimated: Boolean(p.isEstimated || p.priceType === "ESTIMATED" || p.priceType === "RANGE"),
        dataStatus: (p.dataStatus as DataStatus) || dataStatus,
        currency: "RWF",
        unit: p.unit || "item",
        isAvailable: typeof p.isAvailable === "boolean" ? p.isAvailable : true,
        isService: Boolean(p.isService),
        moderationStatus: p.moderationStatus || "APPROVED",
        category: p.category || undefined,
        extractedFrom: p.extractedFrom || "MANUAL",
        confidenceScore: typeof p.confidenceScore === "number" ? p.confidenceScore : undefined,
        verifiedByAgent: typeof p.verifiedByAgent === "boolean" ? p.verifiedByAgent : (dataStatus === "VERIFIED"),
        lastVerifiedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : (p.createdAt ? new Date(p.createdAt).toISOString() : undefined),
        mediaUrl: p.mediaUrl || undefined,
        mediaType: p.mediaType || "IMAGE",
        mediaCaption: p.mediaCaption || undefined,
      }))
    : [];

  // Build safe hours
  const openingHours: BusinessHours[] = Array.isArray(raw.businessHours)
    ? raw.businessHours.map((h: any) => ({
        day: h.day,
        dayRw: h.dayRw || h.day,
        open: h.open || "08:00",
        close: h.close || "20:00",
        isClosed: Boolean(h.isClosed),
      }))
    : (Array.isArray(raw.openingHours) ? raw.openingHours : []);

  // Return complete Business object
  return {
    id: String(raw.id),
    name: raw.name || "Unnamed Business",
    nameRw: raw.nameRw || raw.name,
    category: raw.category || "services",
    categoryDisplay: raw.categoryDisplay || "Local Business",
    categoryDisplayRw: raw.categoryDisplayRw || "Ubucuruzi bw'Agace",
    description: raw.description || "",
    descriptionRw: raw.descriptionRw || raw.description || "",
    phone: raw.phone || (dataStatus === "DEMO" ? "+250780000000" : "+250788000000"),
    whatsapp: raw.whatsapp || undefined,
    dataStatus,
    source: raw.source || (dataStatus === "DEMO" ? "SAMPLE_SEED" : "AGENT_FIELD_AUDIT"),
    priceRangeMin: typeof raw.priceRangeMin === "number" ? raw.priceRangeMin : undefined,
    priceRangeMax: typeof raw.priceRangeMax === "number" ? raw.priceRangeMax : undefined,
    lastVerifiedAt: raw.lastVerifiedAt ? new Date(raw.lastVerifiedAt).toISOString() : undefined,
    provinceId: raw.provinceId || undefined,
    districtId: raw.districtId || undefined,
    sectorId: raw.sectorId || undefined,
    cellId: raw.cellId || undefined,
    localAreaId: raw.localAreaId || undefined,
    localArea: raw.localArea ? {
      id: raw.localArea.id,
      sectorId: raw.localArea.sectorId,
      cellId: raw.localArea.cellId || undefined,
      name: raw.localArea.name,
      nameRw: raw.localArea.nameRw || raw.localArea.name,
      type: raw.localArea.type || "LOCALITY",
      landmark: raw.localArea.landmark || undefined,
      addressNote: raw.localArea.addressNote || undefined,
      latitude: raw.localArea.latitude || undefined,
      longitude: raw.localArea.longitude || undefined,
    } : undefined,
    location,
    latitude: typeof raw.latitude === "number" ? raw.latitude : (location.coordinates?.lat ?? -1.981),
    longitude: typeof raw.longitude === "number" ? raw.longitude : (location.coordinates?.lng ?? 30.046),
    province: location.province,
    district: location.district,
    sector: location.sector,
    cell: location.cell,
    // Micro-Business Smart Location & Ground Discovery
    nearestLandmark,
    streetName,
    nearbyPlace,
    locationDescription,
    locationSource,
    locationAccuracy,
    locationVerificationStatus,
    locationCapturedById: raw.locationCapturedById || undefined,
    locationCapturedAt: raw.locationCapturedAt ? new Date(raw.locationCapturedAt).toISOString() : undefined,
    locationVerifiedById: raw.locationVerifiedById || undefined,
    locationVerifiedAt: raw.locationVerifiedAt ? new Date(raw.locationVerifiedAt).toISOString() : undefined,
    verificationStatus: raw.verificationStatus || (dataStatus === "DEMO" ? "UNVERIFIED" : "AGENT_VERIFIED"),
    verificationDetails: raw.verificationDetails || {
      agentVerified: raw.verificationStatus === "AGENT_VERIFIED" || raw.verificationStatus === "HIGH_CONFIDENCE",
      agentName: raw.agent?.name || (raw.sector === "Kacyiru" ? "Alice Mukamana" : "Emmanuel Hakizimana"),
      agentVerifiedAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : undefined,
      locationConfirmed: dataStatus === "VERIFIED",
      ownerConfirmed: raw.verificationStatus === "BUSINESS_VERIFIED",
      communityConfirmationsCount: dataStatus === "VERIFIED" ? 14 : 0,
      recentActivityDate: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    },
    photos: Array.isArray(raw.photos) && raw.photos.length > 0
      ? raw.photos
      : (raw.coverImage ? [raw.coverImage] : ["https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60"]),
    coverImage: raw.coverImage || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
    openingHours,
    isOpenNow: typeof raw.isOpenNow === "boolean" ? raw.isOpenNow : true,
    priceRange: raw.priceRange || "LOW",
    products,
    viewsCount: Number(raw.viewsCount) || 0,
    contactClicksCount: Number(raw.contactClicksCount) || 0,
    searchAppearancesCount: Number(raw.searchCount) || Number(raw.searchAppearancesCount) || 0,
    claimedByUserId: raw.ownerId || raw.claimedByUserId || undefined,
    mainCategory: raw.mainCategory || raw.category || undefined,
    subCategory: raw.subCategory || undefined,
    businessType: raw.businessType || undefined,
    businessTypeDisplay: raw.businessTypeDisplay || raw.businessType || undefined,
    businessTypeDisplayRw: raw.businessTypeDisplayRw || raw.businessTypeDisplay || raw.businessType || undefined,
    classificationPath: formatCategoryClassification(raw.mainCategory || raw.category, raw.subCategory, raw.businessType, "en").fullPath,
    classificationPathRw: formatCategoryClassification(raw.mainCategory || raw.category, raw.subCategory, raw.businessType, "rw").fullPath,
    lastConfirmedAt: raw.lastConfirmedAt ? new Date(raw.lastConfirmedAt).toISOString() : undefined,
    confirmationIntervalDays: raw.confirmationIntervalDays || 60,
    healthScore: typeof raw.healthScore === "number" ? raw.healthScore : undefined,
    claimedAt: raw.claimedAt ? new Date(raw.claimedAt).toISOString() : undefined,
    claimPhone: raw.claimPhone || undefined,
    isClaimed: Boolean(raw.isClaimed || raw.ownerId),
    status: raw.status || "ACTIVE",
    ownerId: raw.ownerId || raw.claimedByUserId || undefined,
    featuredOffer: raw.featuredOffer || (Array.isArray(raw.offers) && raw.offers.length > 0 ? {
      id: raw.offers[0].id,
      title: raw.offers[0].title,
      titleRw: raw.offers[0].titleRw || raw.offers[0].title,
      description: raw.offers[0].description || undefined,
      discount: raw.offers[0].discount,
      validUntil: raw.offers[0].validUntil ? new Date(raw.offers[0].validUntil).toISOString() : "2026-12-31",
      status: raw.offers[0].status || "ACTIVE",
    } : undefined),
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
  };
}
