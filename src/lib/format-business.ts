import { Business, RwandaLocation, ProductItem, BusinessHours } from "@/types";

/**
 * Format any raw business record (e.g. from Prisma or fallback)
 * into a typed, safe Business object guaranteed to have .location, .products, etc.
 */
export function formatBusinessRecord(raw: any): Business {
  if (!raw) return raw;

  // Build safe coordinates
  const lat = typeof raw.latitude === "number" ? raw.latitude : (raw.location?.coordinates?.lat ?? -1.981);
  const lng = typeof raw.longitude === "number" ? raw.longitude : (raw.location?.coordinates?.lng ?? 30.046);

  // Build safe RwandaLocation
  const location: RwandaLocation = {
    country: "Rwanda",
    province: raw.location?.province || "Kigali City",
    district: raw.district || raw.location?.district || "Nyarugenge",
    sector: raw.sector || raw.location?.sector || "Nyamirambo",
    cell: raw.cell || raw.location?.cell || "Biryogo",
    community: raw.location?.community || raw.addressNote || raw.cell || "Nyamirambo",
    addressNote: raw.addressNote || raw.location?.addressNote || "",
    coordinates: {
      lat,
      lng,
    },
  };

  // Build safe products list
  const products: ProductItem[] = Array.isArray(raw.products)
    ? raw.products.map((p: any) => ({
        id: String(p.id),
        businessId: String(p.businessId || raw.id),
        name: p.name || "Item",
        nameRw: p.nameRw || p.name,
        description: p.description || undefined,
        price: Number(p.price) || 0,
        currency: "RWF",
        unit: p.unit || "item",
        isAvailable: typeof p.isAvailable === "boolean" ? p.isAvailable : true,
        category: p.category || undefined,
        extractedFrom: p.extractedFrom || "MANUAL",
        confidenceScore: typeof p.confidenceScore === "number" ? p.confidenceScore : undefined,
        verifiedByAgent: typeof p.verifiedByAgent === "boolean" ? p.verifiedByAgent : true,
        lastVerifiedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : (p.createdAt ? new Date(p.createdAt).toISOString() : undefined),
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
    phone: raw.phone || "+250788000000",
    whatsapp: raw.whatsapp || undefined,
    location,
    verificationStatus: raw.verificationStatus || "UNVERIFIED",
    verificationDetails: raw.verificationDetails || {
      agentVerified: raw.verificationStatus === "AGENT_VERIFIED" || raw.verificationStatus === "HIGH_CONFIDENCE",
      agentName: raw.agent?.name || "Emmanuel Hakizimana",
      agentVerifiedAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : undefined,
      locationConfirmed: true,
      ownerConfirmed: raw.verificationStatus === "BUSINESS_VERIFIED",
      communityConfirmationsCount: 14,
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
    createdByAgentId: raw.agentId || raw.createdByAgentId || undefined,
    featuredOffer: raw.featuredOffer || undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
  };
}
