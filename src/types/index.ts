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

export type LocationSource = 
  | "GPS_DEVICE" 
  | "AGENT_PIN" 
  | "MAP_SELECTION" 
  | "ADMIN_MANUAL" 
  | "OWNER_REPORTED";

export type LocationVerificationStatus = 
  | "UNVERIFIED" 
  | "AGENT_CAPTURED" 
  | "AGENT_VERIFIED" 
  | "COMMUNITY_VERIFIED" 
  | "BUSINESS_CONFIRMED";

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
  nearestLandmark?: string; // e.g. "Near MINAGRI Main Gate"
  streetName?: string;   // e.g. "KG 569 St"
  nearbyPlace?: string;  // e.g. "Opposite Bank of Kigali"
  locationDescription?: string; // e.g. "Opposite the yellow MTN kiosk, 2nd shop after the pharmacy"
  coordinates: {
    lat: number;
    lng: number;
  };
  accuracy?: number;     // in meters
  source?: LocationSource;
  verificationStatus?: LocationVerificationStatus;
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
  isService?: boolean;
  moderationStatus?: "APPROVED" | "FLAGGED" | "REMOVED";
  moderationNote?: string;
  dataStatus?: DataStatus;
  category?: string;
  extractedFrom?: "RECEIPT" | "MENU" | "PRICE_BOARD" | "STOREFRONT_SIGN" | "MANUAL";
  confidenceScore?: number;
  verifiedByAgent: boolean;
  lastVerifiedAt?: string;
}

export interface BusinessMedia {
  id: string;
  businessId: string;
  mediaType: "IMAGE" | "VIDEO";
  url: string;
  caption?: string;
  isCover: boolean;
  durationSec?: number;
  thumbnailUrl?: string;
  topic?: "PRODUCTS" | "SERVICES" | "OFFERS" | "WORKSHOP" | "NEW_ARRIVALS" | "FACILITY";
  moderationStatus: "APPROVED" | "FLAGGED" | "REMOVED";
  moderationReason?: string;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
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
  // Top-level coordinates & administrative names (synced with Prisma model & formatBusinessRecord)
  latitude?: number;
  longitude?: number;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  // Micro-Business Smart Location & Ground Discovery
  nearestLandmark?: string;
  streetName?: string;
  nearbyPlace?: string;
  locationDescription?: string;
  locationSource?: LocationSource;
  locationAccuracy?: number;
  locationVerificationStatus?: LocationVerificationStatus;
  locationCapturedById?: string;
  locationCapturedAt?: string;
  locationVerifiedById?: string;
  locationVerifiedAt?: string;
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
  mainCategory?: string;
  subCategory?: string;
  businessType?: string;
  businessTypeDisplay?: string;
  businessTypeDisplayRw?: string;
  classificationPath?: string;
  classificationPathRw?: string;
  lastConfirmedAt?: string;
  confirmationIntervalDays?: number;
  healthScore?: number;
  claimedAt?: string;
  claimPhone?: string;
  isClaimed?: boolean;
  status?: string; // ACTIVE, PENDING, SUSPENDED
  ownerId?: string;
  featuredOffer?: {
    id?: string;
    title: string;
    titleRw: string;
    description?: string;
    discount: string;
    validUntil: string;
    status?: string;
  };
  updates?: BusinessUpdateRecord[];
  opportunities?: BusinessOpportunityRecord[];
  media?: BusinessMedia[];
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

export type BusinessUpdateType = 
  | "ANNOUNCEMENT"
  | "NEW_ARRIVAL"
  | "SERVICE_UPDATE"
  | "OFFER"
  | "TEMPORARY_CLOSURE"
  | "NOTICE";

export interface BusinessUpdateRecord {
  id: string;
  businessId: string;
  type: BusinessUpdateType;
  title: string;
  titleRw?: string | null;
  content: string;
  contentRw?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  validUntil?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "REMOVED";
  moderationStatus: "APPROVED" | "FLAGGED" | "REMOVED";
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityType = 
  | "EMPLOYMENT"
  | "PARTNERSHIP"
  | "SUPPLIER_REQUEST"
  | "COLLABORATION"
  | "OTHER";

export type OpportunityStatus = "OPEN" | "PAUSED" | "FILLED" | "CLOSED";

export interface BusinessOpportunityRecord {
  id: string;
  businessId: string;
  type: OpportunityType;
  title: string;
  titleRw?: string | null;
  description: string;
  descriptionRw?: string | null;
  requirements?: string | null;
  compensation?: string | null;
  contactMethod: "WHATSAPP" | "PHONE" | "IN_PERSON";
  contactValue?: string | null;
  deadline?: string | null;
  status: OpportunityStatus;
  moderationStatus: "APPROVED" | "FLAGGED" | "REMOVED";
  responsesCount: number;
  inquiries?: OpportunityInquiryRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityInquiryRecord {
  id: string;
  opportunityId: string;
  applicantName: string;
  applicantPhone: string;
  message?: string | null;
  status: "NEW" | "CONTACTED" | "ARCHIVED";
  createdAt: string;
}

export type InquiryType = 
  | "WHATSAPP_CLICK"
  | "PHONE_CALL"
  | "BOOKING_REQUEST"
  | "ORDER_INQUIRY"
  | "OPPORTUNITY_RESPONSE"
  | "DIRECTIONS_VIEW";

export interface CustomerInquiryRecord {
  id: string;
  businessId: string;
  productId?: string | null;
  type: InquiryType;
  channel: string;
  itemName?: string | null;
  itemPrice?: number | null;
  createdAt: string;
}


