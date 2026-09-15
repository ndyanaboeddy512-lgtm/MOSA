export type Role = 
  | "SUPER_ADMIN" 
  | "COMMUNITY_ADMIN" 
  | "COMMUNITY_AGENT" 
  | "BUSINESS_OWNER" 
  | "CUSTOMER" 
  | "MODERATOR";

export type VerificationStatus = 
  | "UNVERIFIED" 
  | "AGENT_VERIFIED" 
  | "COMMUNITY_VERIFIED" 
  | "BUSINESS_VERIFIED" 
  | "HIGH_CONFIDENCE";

export type BusinessCategory = 
  | "salon_barber"
  | "tailor_crafts"
  | "food_restaurant"
  | "phone_electronics"
  | "mechanic_repair"
  | "shop_retail"
  | "agriculture_produce"
  | "art_culture"
  | "services";

export interface RwandaLocation {
  country: "Rwanda";
  province: string;      // e.g. "Kigali City"
  district: string;      // e.g. "Nyarugenge"
  sector: string;        // e.g. "Nyamirambo"
  cell: string;          // e.g. "Biryogo", "Rwezamenyo", "Mumena"
  community: string;     // e.g. "Cosmos", "Biryogo Car-Free Zone", "Tapi Rouge", "Kivugiza"
  addressNote?: string;  // e.g. "Next to Cosmos Bar, near Mosque"
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface ProductItem {
  id: string;
  businessId: string;
  name: string;
  nameRw?: string;
  description?: string;
  price: number;
  currency: "RWF";
  unit?: string; // e.g. "service", "item", "kg", "plate", "meter"
  isAvailable: boolean;
  category?: string;
  extractedFrom?: "RECEIPT" | "MENU" | "PRICE_BOARD" | "STOREFRONT_SIGN" | "MANUAL";
  confidenceScore?: number;
  verifiedByAgent: boolean;
  lastVerifiedAt?: string;
}

export interface BusinessHours {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  dayRw: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface Business {
  id: string;
  name: string;
  nameRw?: string;
  category: BusinessCategory;
  categoryDisplay: string;
  categoryDisplayRw: string;
  description: string;
  descriptionRw?: string;
  phone: string;
  whatsapp?: string;
  location: RwandaLocation;
  verificationStatus: VerificationStatus;
  verificationDetails: {
    agentVerified: boolean;
    agentName?: string;
    agentVerifiedAt?: string;
    locationConfirmed: boolean;
    ownerConfirmed: boolean;
    communityConfirmationsCount: number;
    recentActivityDate: string;
  };
  photos: string[];
  coverImage: string;
  openingHours: BusinessHours[];
  isOpenNow: boolean;
  priceRange: "LOW" | "MODERATE" | "PREMIUM";
  products: ProductItem[];
  viewsCount: number;
  contactClicksCount: number;
  searchAppearancesCount: number;
  claimedByUserId?: string;
  createdByAgentId?: string;
  featuredOffer?: {
    title: string;
    titleRw: string;
    discount: string;
    validUntil: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PhysicalCaptureRecord {
  id: string;
  businessId?: string;
  businessName?: string;
  agentId: string;
  agentName: string;
  documentType: "RECEIPT" | "MENU" | "PRICE_BOARD" | "STOREFRONT_SIGN";
  imageUrl: string;
  rawOcrText?: string;
  extractedMerchant?: string;
  extractedDate?: string;
  extractedItems: {
    id: string;
    name: string;
    price: number;
    quantity?: number;
    category?: string;
    confidence: number;
  }[];
  extractedTotal?: number;
  currency: "RWF";
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  sanitized: boolean; // Confirms personal numbers / payment tokens are redacted
  uploadedAt: string;
  verifiedAt?: string;
}

export interface CommunityDemandSignal {
  id: string;
  sector: string;
  cell: string;
  category: string;
  categoryRw: string;
  queryTerm: string;
  queryTermRw: string;
  searchCount: number;
  activeBusinessesCount: number;
  opportunityScore: "VERY_HIGH" | "HIGH" | "MODERATE";
  description: string;
  descriptionRw: string;
  updatedAt: string;
}

export interface CommunityMission {
  id: string;
  title: string;
  titleRw: string;
  description: string;
  descriptionRw: string;
  targetArea: string; // e.g. "Biryogo", "Cosmos"
  pointsReward: number;
  badgeReward?: string;
  category: "DISCOVER" | "VERIFY" | "UPDATE" | "RECOMMEND";
  isCompleted?: boolean;
}

export interface UserReview {
  id: string;
  businessId: string;
  userName: string;
  userRole: Role;
  rating: number; // 1 to 5
  comment: string;
  commentRw?: string;
  verifiedVisit: boolean;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  businessId: string;
  businessName: string;
  reportedBy: string;
  reason: "FAKE_BUSINESS" | "WRONG_PRICE" | "CLOSED_PERMANENTLY" | "WRONG_LOCATION" | "SPAM";
  details: string;
  status: "OPEN" | "REVIEWED" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}

export interface UserSession {
  id: string;
  name: string;
  phone: string;
  role: Role;
  community: string;
  points: number;
  badges: string[];
  referralCode: string;
  assignedCell?: string;
}
