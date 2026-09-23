import { formatBusinessRecord } from "./format-business";

export interface PublicProduct {
  id: string;
  name: string;
  nameRw?: string | null;
  description?: string | null;
  price: number;
  priceMin?: number | null;
  priceMax?: number | null;
  priceType?: string;
  isEstimated?: boolean;
  currency: string;
  unit: string;
  isAvailable: boolean;
  category?: string | null;
  isService?: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaCaption?: string | null;
}

export interface PublicVideo {
  id: string;
  url: string;
  caption?: string | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  topic?: string | null;
  createdAt?: string;
}

export interface PublicOffer {
  id?: string;
  title: string;
  titleRw?: string;
  description?: string;
  discount: string;
  validUntil: string;
  status?: string;
}

export interface PublicBusinessUpdate {
  id: string;
  type: string;
  title: string;
  titleRw?: string | null;
  content: string;
  contentRw?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  validUntil?: string | null;
  createdAt: string;
}

export interface PublicBusinessOpportunity {
  id: string;
  type: string;
  title: string;
  titleRw?: string | null;
  description: string;
  descriptionRw?: string | null;
  requirements?: string | null;
  compensation?: string | null;
  contactMethod: string;
  contactValue?: string | null;
  deadline?: string | null;
  status: string;
  createdAt: string;
}

export interface PublicBusiness {
  id: string;
  name: string;
  nameRw?: string;
  category: string;
  categoryDisplay?: string;
  categoryDisplayRw?: string;
  mainCategory?: string;
  subCategory?: string;
  businessType?: string;
  classificationPath?: string;
  classificationPathRw?: string;
  description?: string;
  descriptionRw?: string;
  phone: string;
  whatsapp?: string;
  dataStatus?: string;
  verificationStatus?: string;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  nearestLandmark?: string;
  streetName?: string;
  nearbyPlace?: string;
  locationDescription?: string;
  locationVerificationStatus?: string;
  location?: any;
  latitude?: number;
  longitude?: number;
  openingHours?: any[];
  isOpenNow?: boolean;
  coverImage?: string;
  photos?: string[];
  videos?: PublicVideo[];
  products: PublicProduct[];
  featuredOffer?: PublicOffer;
  updates?: PublicBusinessUpdate[];
  opportunities?: PublicBusinessOpportunity[];
  lastVerifiedAt?: string;
  lastConfirmedAt?: string;
  updatedAt?: string;
  isClaimed?: boolean;
}

/**
 * Strips all internal, administrative, and private financial data from a business record.
 * GUARANTEES zero leakage of:
 * - Buying prices, cost per unit, total cost, supplier details
 * - Internal margins, expected profit, stock valuation
 * - Internal expenses, monthly financial reports
 * - Agent internal notes, creator IDs, claim user IDs, phone hashes
 * - Health score breakdowns
 */
export function serializePublicBusiness(raw: any): PublicBusiness {
  const formatted = formatBusinessRecord(raw);

  const rawMediaList = Array.isArray(raw?.media)
    ? raw.media
    : (Array.isArray(raw?.businessMedia) ? raw.businessMedia : []);

  const safeVideos: PublicVideo[] = rawMediaList
    .filter((m: any) => m.mediaType === "VIDEO" && m.moderationStatus !== "REMOVED")
    .map((v: any) => ({
      id: String(v.id),
      url: v.url,
      caption: v.caption || undefined,
      thumbnailUrl: v.thumbnailUrl || undefined,
      durationSec: v.durationSec || undefined,
      topic: v.topic || undefined,
      createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : undefined,
    }));

  const approvedPhotos: string[] = rawMediaList.length > 0
    ? rawMediaList
        .filter((m: any) => m.mediaType !== "VIDEO" && m.moderationStatus !== "REMOVED")
        .map((m: any) => m.url)
    : (formatted.photos || []);

  const safeProducts: PublicProduct[] = Array.isArray(formatted.products)
    ? formatted.products
        .filter((p: any) => p.moderationStatus !== "REMOVED" && !p.isArchived)
        .map((p) => ({
          id: p.id,
          name: p.name,
          nameRw: p.nameRw,
          description: p.description,
          price: p.price,
          priceMin: p.priceMin,
          priceMax: p.priceMax,
          priceType: p.priceType,
          isEstimated: p.isEstimated,
          isService: Boolean((p as any).isService),
          mediaUrl: (p as any).mediaUrl || null,
          mediaType: (p as any).mediaType || "IMAGE",
          mediaCaption: (p as any).mediaCaption || null,
          currency: p.currency || "RWF",
          unit: p.unit || "unit",
          isAvailable: p.isAvailable !== false,
          category: p.category,
        }))
    : [];

  const now = new Date();

  const safeUpdates: PublicBusinessUpdate[] = Array.isArray(raw?.updates)
    ? raw.updates
        .filter((u: any) => 
          u.status === "ACTIVE" && 
          u.moderationStatus !== "REMOVED" &&
          (!u.validUntil || new Date(u.validUntil) >= now)
        )
        .map((u: any) => ({
          id: u.id,
          type: u.type,
          title: u.title,
          titleRw: u.titleRw || undefined,
          content: u.content,
          contentRw: u.contentRw || undefined,
          imageUrl: u.imageUrl || undefined,
          badge: u.badge || undefined,
          validUntil: u.validUntil ? new Date(u.validUntil).toISOString() : undefined,
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
        }))
    : [];

  const safeOpportunities: PublicBusinessOpportunity[] = Array.isArray(raw?.opportunities)
    ? raw.opportunities
        .filter((o: any) => 
          o.status === "OPEN" && 
          o.moderationStatus !== "REMOVED" &&
          (!o.deadline || new Date(o.deadline) >= now)
        )
        .map((o: any) => ({
          id: o.id,
          type: o.type,
          title: o.title,
          titleRw: o.titleRw || undefined,
          description: o.description,
          descriptionRw: o.descriptionRw || undefined,
          requirements: o.requirements || undefined,
          compensation: o.compensation || undefined,
          contactMethod: o.contactMethod || "WHATSAPP",
          contactValue: o.contactValue || undefined,
          deadline: o.deadline ? new Date(o.deadline).toISOString() : undefined,
          status: o.status,
          createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
        }))
    : [];

  return {
    id: formatted.id,
    name: formatted.name,
    nameRw: formatted.nameRw,
    category: formatted.category,
    categoryDisplay: formatted.categoryDisplay,
    categoryDisplayRw: formatted.categoryDisplayRw,
    mainCategory: (formatted as any).mainCategory || raw.mainCategory || formatted.category,
    subCategory: formatted.subCategory,
    businessType: (formatted as any).businessType || raw.businessType,
    classificationPath: formatted.classificationPath,
    classificationPathRw: formatted.classificationPathRw,
    description: formatted.description,
    descriptionRw: formatted.descriptionRw,
    phone: formatted.phone,
    whatsapp: formatted.whatsapp,
    dataStatus: formatted.dataStatus,
    verificationStatus: formatted.verificationStatus,
    province: formatted.province,
    district: formatted.district,
    sector: formatted.sector,
    cell: formatted.cell,
    nearestLandmark: formatted.nearestLandmark,
    streetName: formatted.streetName,
    nearbyPlace: formatted.nearbyPlace,
    locationDescription: formatted.locationDescription,
    locationVerificationStatus: formatted.locationVerificationStatus,
    location: formatted.location,
    latitude: formatted.latitude,
    longitude: formatted.longitude,
    openingHours: formatted.openingHours,
    isOpenNow: formatted.isOpenNow,
    coverImage: formatted.coverImage,
    photos: approvedPhotos.length > 0 ? approvedPhotos : formatted.photos,
    videos: safeVideos,
    products: safeProducts,
    featuredOffer: formatted.featuredOffer,
    updates: safeUpdates,
    opportunities: safeOpportunities,
    lastVerifiedAt: formatted.lastVerifiedAt,
    lastConfirmedAt: formatted.lastConfirmedAt,
    updatedAt: formatted.updatedAt,
    isClaimed: formatted.isClaimed,
  };
}

export function serializePublicBusinesses(rawList: any[]): PublicBusiness[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(serializePublicBusiness);
}
