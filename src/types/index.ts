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

export type DataStatus = 
  | "DEMO" 
  | "RESEARCHED" 
  | "VERIFIED";

export type PriceType = 
  | "FIXED" 
  | "ESTIMATED" 
  | "RANGE";

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

export interface GeographicProvince {
  id: string;
  code: string;
  name: string;
  nameRw: string;
}

export interface GeographicDistrict {
  id: string;
  code: string;
  provinceId: string;
  name: string;
  nameRw: string;
  latitude: number;
  longitude: number;
}

export interface GeographicSector {
  id: string;
  code: string;
  districtId: string;
  name: string;
  nameRw: string;
  latitude: number;
  longitude: number;
  description?: string;
  isActive: boolean;
  cells?: GeographicCell[];
  localAreas?: LocalArea[];
}

export interface GeographicCell {
  id: string;
  sectorId: string;
  name: string;
  nameRw: string;
  latitude?: number;
  longitude?: number;
  localAreas?: LocalArea[];
}

export interface LocalArea {
  id: string;
  sectorId: string;
  cellId?: string;
  name: string;
  nameRw: string;
  type: "LOCALITY" | "LANDMARK" | "MARKET" | "CORRIDOR";
  landmark?: string;
  addressNote?: string;
  latitude?: number;
  longitude?: number;
}

export interface AgentAssignment {
  id: string;
  userId: string;
  sectorId: string;
  cellId?: string;
  assignedAt: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface RwandaLocation {
  country: "Rwanda";
  province: string;      // e.g. "Kigali City"
  district: string;      // e.g. "Nyarugenge", "Gasabo"
  sector: string;        // e.g. "Nyamirambo", "Kacyiru"
  cell: string;          // e.g. "Biryogo", "Kamutwa", "Kibaza"
  community: string;     // e.g. "Cosmos", "MINAGRI Area", "Biryogo Car-Free Zone"
  addressNote?: string;  // e.g. "KG 569 St, near MINAGRI HQ"
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
  priceMin?: number;
  priceMax?: number;
  priceType?: PriceType;
  currency: "RWF";
  unit?: string; // e.g. "service", "item", "kg", "plate", "meter"
  isAvailable: boolean;
  isEstimated?: boolean;
  dataStatus?: DataStatus;
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
  dataStatus?: DataStatus;
  source?: string;
  addressNote?: string;
  priceRangeMin?: number;
  priceRangeMax?: number;
  lastVerifiedAt?: string;
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  cellId?: string;
  localAreaId?: string;
  localArea?: LocalArea;
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
  subCategory?: string;
  lastConfirmedAt?: string;
  confirmationIntervalDays?: number;
  healthScore?: number;
  claimedAt?: string;
  claimPhone?: string;
  isClaimed?: boolean;
  featuredOffer?: {
    id?: string;
    title: string;
    titleRw: string;
    description?: string;
    discount: string;
    validUntil: string;
    status?: string;
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
  merchantDetected?: string;
  extractedMerchant?: string;
  dateDetected?: string;
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
  targetArea: string; // e.g. "Biryogo", "Cosmos", "Kamutwa"
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

export interface BusinessChangeHistoryItem {
  id: string;
  businessId: string;
  productId?: string;
  actorId?: string;
  actorName?: string;
  action: string;
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  approvalStatus: string;
  source: string;
  metadata?: string;
  createdAt: string;
}

export interface BusinessReminderItem {
  id: string;
  businessId: string;
  type: string;
  title: string;
  titleRw: string;
  message: string;
  messageRw: string;
  severity: "INFO" | "WARNING" | "URGENT";
  actionUrl?: string;
  isResolved: boolean;
  createdAt: string;
}

export interface SMSMessageRecord {
  id: string;
  businessId?: string;
  recipientPhone: string;
  templateId: string;
  language: string;
  messageBody: string;
  provider: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}

export interface BusinessClaimRecord {
  id: string;
  businessId: string;
  businessName?: string;
  userId: string;
  userName?: string;
  claimPhone: string;
  ownerName?: string;
  nationalIdOrDoc?: string;
  verificationNotes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: string;
  claimedAt: string;
}

