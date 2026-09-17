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

export interface PublicBusiness {
  id: string;
  name: string;
  nameRw?: string;
  category: string;
  categoryDisplay?: string;
  categoryDisplayRw?: string;
  subCategory?: string;
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
  products: PublicProduct[];
  featuredOffer?: PublicOffer;
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

  const safeProducts: PublicProduct[] = Array.isArray(formatted.products)
    ? formatted.products.map((p) => ({
        id: p.id,
        name: p.name,
        nameRw: p.nameRw,
        description: p.description,
        price: p.price,
        priceMin: p.priceMin,
        priceMax: p.priceMax,
        priceType: p.priceType,
        isEstimated: p.isEstimated,
        currency: p.currency || "RWF",
        unit: p.unit || "unit",
        isAvailable: p.isAvailable !== false,
        category: p.category,
      }))
    : [];

  return {
    id: formatted.id,
    name: formatted.name,
    nameRw: formatted.nameRw,
    category: formatted.category,
    categoryDisplay: formatted.categoryDisplay,
    categoryDisplayRw: formatted.categoryDisplayRw,
    subCategory: formatted.subCategory,
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
    photos: formatted.photos,
    products: safeProducts,
    featuredOffer: formatted.featuredOffer,
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
