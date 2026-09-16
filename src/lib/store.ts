import { Business, PhysicalCaptureRecord, CommunityDemandSignal, CommunityMission, UserReview, ModerationReport, ProductItem, VerificationStatus } from "@/types";
import { INITIAL_BUSINESSES, INITIAL_CAPTURES, INITIAL_DEMAND_SIGNALS, INITIAL_MISSIONS, INITIAL_REVIEWS } from "./seed-data";
import { ExtractedLineItem } from "./ocr";
import { formatBusinessRecord } from "./format-business";

class MosaStore {
  private businesses: Business[] = [...INITIAL_BUSINESSES];
  private captures: PhysicalCaptureRecord[] = [...INITIAL_CAPTURES];
  private demands: CommunityDemandSignal[] = [...INITIAL_DEMAND_SIGNALS];
  private missions: CommunityMission[] = [...INITIAL_MISSIONS];
  private reviews: UserReview[] = [...INITIAL_REVIEWS];
  private reports: ModerationReport[] = [];
  private isBrowser: boolean = typeof window !== "undefined";

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage() {
    if (!this.isBrowser) return;
    try {
      const storedBiz = localStorage.getItem("mosa_businesses");
      if (storedBiz) {
        const parsed = JSON.parse(storedBiz);
        this.businesses = Array.isArray(parsed) ? parsed.map(formatBusinessRecord) : [...INITIAL_BUSINESSES];
      }

      const storedCaps = localStorage.getItem("mosa_captures");
      if (storedCaps) this.captures = JSON.parse(storedCaps);

      const storedDem = localStorage.getItem("mosa_demands");
      if (storedDem) this.demands = JSON.parse(storedDem);

      const storedMis = localStorage.getItem("mosa_missions");
      if (storedMis) this.missions = JSON.parse(storedMis);

      const storedRev = localStorage.getItem("mosa_reviews");
      if (storedRev) this.reviews = JSON.parse(storedRev);

      const storedRep = localStorage.getItem("mosa_reports");
      if (storedRep) this.reports = JSON.parse(storedRep);
    } catch {
      // Use in-memory defaults
    }
  }

  private persist(key: string, data: unknown) {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore quota exceeded
    }
  }

  // --- Businesses ---
  public getBusinesses(params?: {
    category?: string;
    community?: string;
    search?: string;
    openNowOnly?: boolean;
    verification?: string;
  }): Business[] {
    let result = [...this.businesses];

    if (params?.category && params.category !== "all") {
      result = result.filter((b) => b.category === params.category);
    }

    if (params?.community && params.community !== "all") {
      result = result.filter(
        (b) =>
          (b.location?.community || (b as any).cell || "").toLowerCase().includes(params.community!.toLowerCase()) ||
          (b.location?.cell || (b as any).cell || "").toLowerCase().includes(params.community!.toLowerCase())
      );
    }

    if (params?.openNowOnly) {
      result = result.filter((b) => b.isOpenNow);
    }

    if (params?.verification && params.verification !== "all") {
      result = result.filter((b) => b.verificationStatus === params.verification);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter((b) => {
        const inName = b.name.toLowerCase().includes(q) || (b.nameRw && b.nameRw.toLowerCase().includes(q));
        const inDesc = b.description.toLowerCase().includes(q) || (b.descriptionRw && b.descriptionRw.toLowerCase().includes(q));
        const inCategory = b.categoryDisplay.toLowerCase().includes(q) || b.categoryDisplayRw.toLowerCase().includes(q);
        const inCommunity = (b.location?.community || (b as any).cell || "").toLowerCase().includes(q) || (b.location?.cell || (b as any).cell || "").toLowerCase().includes(q);
        const inProducts = Array.isArray(b.products) && b.products.some((p) => p.name.toLowerCase().includes(q) || (p.nameRw && p.nameRw.toLowerCase().includes(q)));
        return inName || inDesc || inCategory || inCommunity || inProducts;
      });

      // Track search query as a demand signal
      this.recordSearchDemand(params.search);
    }

    return result;
  }

  public getBusinessById(id: string): Business | undefined {
    const found = this.businesses.find((b) => b.id === id);
    return found ? formatBusinessRecord(found) : undefined;
  }

  public registerBusiness(newBiz: Omit<Business, "id" | "createdAt" | "updatedAt" | "viewsCount" | "contactClicksCount" | "searchAppearancesCount">): Business {
    const business: Business = {
      ...newBiz,
      id: `biz-${Date.now()}`,
      viewsCount: 1,
      contactClicksCount: 0,
      searchAppearancesCount: 1,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };
    this.businesses.unshift(business);
    this.persist("mosa_businesses", this.businesses);
    return business;
  }

  public updateBusinessVerification(id: string, status: VerificationStatus, details?: Partial<Business["verificationDetails"]>): boolean {
    const biz = this.getBusinessById(id);
    if (!biz) return false;
    biz.verificationStatus = status;
    if (details) {
      biz.verificationDetails = { ...biz.verificationDetails, ...details };
    }
    biz.updatedAt = new Date().toISOString().split("T")[0];
    this.persist("mosa_businesses", this.businesses);
    return true;
  }

  public claimBusiness(businessId: string, userId: string): boolean {
    const biz = this.getBusinessById(businessId);
    if (!biz) return false;
    biz.claimedByUserId = userId;
    biz.verificationStatus = "BUSINESS_VERIFIED";
    biz.verificationDetails.ownerConfirmed = true;
    biz.updatedAt = new Date().toISOString().split("T")[0];
    this.persist("mosa_businesses", this.businesses);
    return true;
  }

  public addProductToBusiness(businessId: string, item: Omit<ProductItem, "id">): ProductItem | null {
    const biz = this.getBusinessById(businessId);
    if (!biz) return null;
    const newItem: ProductItem = {
      ...item,
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    biz.products.push(newItem);
    biz.updatedAt = new Date().toISOString().split("T")[0];
    this.persist("mosa_businesses", this.businesses);
    return newItem;
  }

  public trackContactClick(businessId: string) {
    const biz = this.getBusinessById(businessId);
    if (biz) {
      biz.contactClicksCount += 1;
      this.persist("mosa_businesses", this.businesses);
    }
  }

  public trackView(businessId: string) {
    const biz = this.getBusinessById(businessId);
    if (biz) {
      biz.viewsCount += 1;
      this.persist("mosa_businesses", this.businesses);
    }
  }

  // --- Physical Captures ---
  public getCaptures(): PhysicalCaptureRecord[] {
    return this.captures;
  }

  public addCapture(record: Omit<PhysicalCaptureRecord, "id" | "uploadedAt">): PhysicalCaptureRecord {
    const capture: PhysicalCaptureRecord = {
      ...record,
      id: `cap-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    this.captures.unshift(capture);
    this.persist("mosa_captures", this.captures);
    return capture;
  }

  public verifyCaptureAndPublish(captureId: string, verifiedItems: ExtractedLineItem[], targetBusinessId: string): boolean {
    const cap = this.captures.find((c) => c.id === captureId);
    if (!cap) return false;

    cap.status = "VERIFIED";
    cap.verifiedAt = new Date().toISOString();
    cap.extractedItems = verifiedItems;
    this.persist("mosa_captures", this.captures);

    const biz = this.getBusinessById(targetBusinessId);
    if (biz) {
      for (const item of verifiedItems) {
        biz.products.push({
          id: `p-ocr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          businessId: biz.id,
          name: item.name,
          price: item.price,
          currency: "RWF",
          unit: "item",
          isAvailable: true,
          category: item.category,
          extractedFrom: cap.documentType,
          confidenceScore: item.confidence,
          verifiedByAgent: true,
          lastVerifiedAt: new Date().toISOString().split("T")[0],
        });
      }
      biz.updatedAt = new Date().toISOString().split("T")[0];
      this.persist("mosa_businesses", this.businesses);
    }
    return true;
  }

  // --- Community Demand Intelligence ---
  public getDemands(): CommunityDemandSignal[] {
    return this.demands;
  }

  public recordSearchDemand(query: string) {
    const clean = query.trim().toLowerCase();
    if (clean.length < 3) return;

    const existing = this.demands.find((d) => d.queryTerm.toLowerCase().includes(clean) || clean.includes(d.queryTerm.toLowerCase()));
    if (existing) {
      existing.searchCount += 1;
      existing.updatedAt = new Date().toISOString().split("T")[0];
    } else {
      this.demands.push({
        id: `dem-${Date.now()}`,
        sector: "Nyamirambo",
        cell: "Biryogo",
        category: "services",
        categoryRw: "Izindi Serivisi",
        queryTerm: query,
        queryTermRw: query,
        searchCount: 1,
        activeBusinessesCount: 1,
        opportunityScore: "MODERATE",
        description: `Active resident searches for "${query}" in Nyamirambo sector.`,
        descriptionRw: `Ibyifuzo by'abaturage bashakisha "${query}" mu murenge wa Nyamirambo.`,
        updatedAt: new Date().toISOString().split("T")[0],
      });
    }
    this.persist("mosa_demands", this.demands);
  }

  // --- Community Missions ---
  public getMissions(): CommunityMission[] {
    return this.missions;
  }

  public completeMission(missionId: string): boolean {
    const m = this.missions.find((x) => x.id === missionId);
    if (!m) return false;
    m.isCompleted = true;
    this.persist("mosa_missions", this.missions);
    return true;
  }

  // --- Reviews ---
  public getReviewsForBusiness(businessId: string): UserReview[] {
    return this.reviews.filter((r) => r.businessId === businessId);
  }

  public addReview(review: Omit<UserReview, "id" | "createdAt">): UserReview {
    const newRev: UserReview = {
      ...review,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.reviews.unshift(newRev);
    this.persist("mosa_reviews", this.reviews);

    // Increase community confirmations count for the business
    const biz = this.getBusinessById(review.businessId);
    if (biz) {
      biz.verificationDetails.communityConfirmationsCount += 1;
      this.persist("mosa_businesses", this.businesses);
    }
    return newRev;
  }

  // --- Reports ---
  public getReports(): ModerationReport[] {
    return this.reports;
  }

  public submitReport(report: Omit<ModerationReport, "id" | "status" | "createdAt">): ModerationReport {
    const newRep: ModerationReport = {
      ...report,
      id: `rep-${Date.now()}`,
      status: "OPEN",
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.reports.unshift(newRep);
    this.persist("mosa_reports", this.reports);
    return newRep;
  }

  public updateReportStatus(id: string, status: ModerationReport["status"]): boolean {
    const rep = this.reports.find((r) => r.id === id);
    if (!rep) return false;
    rep.status = status;
    this.persist("mosa_reports", this.reports);
    return true;
  }
}

// Global singleton for Next.js
const globalStore = (globalThis as unknown as { __mosaStore?: MosaStore });
export const store = globalStore.__mosaStore || new MosaStore();
if (process.env.NODE_ENV !== "production") {
  globalStore.__mosaStore = store;
}
