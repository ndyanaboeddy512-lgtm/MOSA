"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Business, PhysicalCaptureRecord, ModerationReport, CommunityDemandSignal } from "@/types";
import { VerificationBadge, DataStatusBadge } from "@/components/common/Badge";
import { 
  Shield, 
  Users, 
  Store as StoreIcon, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
  History,
  RefreshCw,
  Lock,
  Globe,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Check,
  Building,
  MapPin,
  HeartHandshake,
  Smartphone,
  Activity,
  X
} from "lucide-react";
import { SmartLocationForm, SmartLocationFormData } from "@/components/location/SmartLocationForm";
import { calculateLocationCompleteness } from "@/lib/location-quality";

interface AdminAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; role: string } | null;
}

interface AdminMetrics {
  totalBusinesses: number;
  verifiedCount: number;
  unverifiedCount: number;
  demoCount: number;
  researchedCount: number;
  verifiedDataCount: number;
  totalUsers: number;
  agentCount: number;
  openReportsCount: number;
  totalCaptures: number;
  totalProvinces: number;
  totalDistricts: number;
  totalSectors: number;
  totalCells: number;
  totalLocalAreas: number;
  totalProducts: number;
  estimatedProductsCount: number;
  potentialDuplicatesCount: number;
  pendingClaimsCount?: number;
  totalSMSCount?: number;
}

const CATEGORY_OPTIONS = [
  { id: "food_restaurant", label: "Restaurants, Cafes & Milk Bars" },
  { id: "agriculture_produce", label: "Agro-Produce & Agro-Veterinary" },
  { id: "tailor_crafts", label: "Tailors, Crafts & Fashion" },
  { id: "phone_electronics", label: "Phone Repair & Electronics" },
  { id: "salon_barber", label: "Salons & Barbershops" },
  { id: "mechanic_repair", label: "Mechanics & Motorcycle Spares" },
  { id: "hardware_construction", label: "Hardware & Construction" },
  { id: "pharmacy_health", label: "Pharmacies & Health Care" },
  { id: "shop_retail", label: "Grocery & Retail Alimentations" },
  { id: "services", label: "Public, Irembo & Secretarial Services" },
];

export default function AdminPanelPage() {
  const { lang, t } = useLanguage();
  const { user, switchDemoRole } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "businesses" | "claims" | "sms" | "history" | "captures" | "reports" | "demands" | "audit"
  >("businesses");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [smsMessages, setSmsMessages] = useState<any[]>([]);
  const [changeHistories, setChangeHistories] = useState<any[]>([]);
  const [captures, setCaptures] = useState<PhysicalCaptureRecord[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalBusinesses: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
    demoCount: 0,
    researchedCount: 0,
    verifiedDataCount: 0,
    totalUsers: 0,
    agentCount: 0,
    openReportsCount: 0,
    totalCaptures: 0,
    totalProvinces: 5,
    totalDistricts: 30,
    totalSectors: 41,
    totalCells: 62,
    totalLocalAreas: 19,
    totalProducts: 101,
    estimatedProductsCount: 67,
    potentialDuplicatesCount: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Geographic drill-down filter state
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedCell, setSelectedCell] = useState<string>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<"ALL" | "DEMO" | "RESEARCHED" | "VERIFIED" | "SELF_REGISTERED" | "DUPLICATES">("ALL");

  // Dynamic Geographic options from DB
  const [geoTree, setGeoTree] = useState<any[]>([]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBiz, setEditingBiz] = useState<any | null>(null);
  const [adminSmartLocation, setAdminSmartLocation] = useState<SmartLocationFormData | null>(null);
  const [locationVerificationFilter, setLocationVerificationFilter] = useState<string>("all");

  // New business form state
  const [newBizForm, setNewBizForm] = useState({
    name: "",
    nameRw: "",
    category: "food_restaurant",
    phone: "+250 780 000 0",
    province: "Kigali City",
    district: "Gasabo",
    sector: "Kacyiru",
    cell: "Kamutwa",
    addressNote: "",
    priceRangeMin: 1000,
    priceRangeMax: 15000,
    dataStatus: "DEMO",
    products: [
      { name: "", priceMin: 1000, priceMax: 5000, unit: "item" },
    ],
  });

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        if (data.businesses && data.businesses.length > 0) {
          setBusinesses(data.businesses.map((b: any) => ({
            id: b.id,
            name: b.name,
            nameRw: b.nameRw || b.name,
            category: b.category,
            categoryDisplay: b.categoryDisplay,
            description: b.description || "",
            descriptionRw: b.descriptionRw || "",
            latitude: b.latitude,
            longitude: b.longitude,
            nearestLandmark: b.nearestLandmark,
            streetName: b.streetName,
            nearbyPlace: b.nearbyPlace,
            locationDescription: b.locationDescription,
            locationSource: b.locationSource,
            locationAccuracy: b.locationAccuracy,
            locationVerificationStatus: b.locationVerificationStatus,
            location: {
              district: b.district || "Nyarugenge",
              sector: b.sector || "Nyamirambo",
              cell: b.cell || "Biryogo",
              community: `${b.cell || "Biryogo"}, ${b.sector || "Nyamirambo"}`,
              coordinates: [b.latitude || -1.9706, b.longitude || 30.0444],
            },
            contactPhone: b.phone || "+250788000000",
            phone: b.phone || "+250788000000",
            verificationStatus: b.verificationStatus,
            dataStatus: b.dataStatus || "DEMO",
            source: b.source,
            localArea: b.localArea,
            isOpenNow: b.isOpenNow,
            rating: 4.8,
            reviewsCount: 12,
            coverImage: b.coverImage || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=60",
            priceRange: b.priceRange || "MODERATE",
            priceRangeMin: b.priceRangeMin,
            priceRangeMax: b.priceRangeMax,
            tags: [b.category],
            status: b.status,
            products: b.products || [],
            isPotentialDuplicate: b.isPotentialDuplicate || false,
          })));
        }
        if (data.captures && data.captures.length > 0) setCaptures(data.captures);
        if (data.reports && data.reports.length > 0) setReports(data.reports);
        if (data.demands && data.demands.length > 0) setDemands(data.demands);
        if (data.claims) setClaims(data.claims);
        if (data.smsMessages) setSmsMessages(data.smsMessages);
        if (data.changeHistories) setChangeHistories(data.changeHistories);
      }
    } catch (err) {
      console.warn("[Admin Fetch Fallback]:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE_CLAIM", claimId }),
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.warn("Approve claim error:", err);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT_CLAIM", claimId }),
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.warn("Reject claim error:", err);
    }
  };

  // Fetch geographic hierarchy for cascading filters
  useEffect(() => {
    fetch("/api/geo?level=tree")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.provinces) {
          setGeoTree(data.provinces);
        }
      })
      .catch((err) => console.warn("[Admin Geo Load Error]:", err));

    fetchAdminData();
  }, []);

  const handleToggleVerification = async (bizId: string) => {
    const biz = businesses.find((b) => b.id === bizId);
    if (!biz) return;
    const newStatus = biz.verificationStatus === "HIGH_CONFIDENCE" ? "AGENT_VERIFIED" : "HIGH_CONFIDENCE";

    try {
      await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_VERIFICATION",
          businessId: bizId,
          verificationStatus: biz.verificationStatus,
        }),
      });
      fetchAdminData();
    } catch (err) {
      console.warn("[Admin PATCH verification error]:", err);
    }
  };

  const handleApproveBusiness = async (bizId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_BUSINESS",
          businessId: bizId,
        }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin Approve Error]:", err);
    }
  };

  const handleUpdateDataStatus = async (bizId: string, targetDataStatus: "DEMO" | "RESEARCHED" | "VERIFIED") => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_DATA_STATUS",
          businessId: bizId,
          dataStatus: targetDataStatus,
        }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin PATCH dataStatus error]:", err);
    }
  };

  const handleArchiveBusiness = async (bizId: string) => {
    if (!confirm("Are you sure you want to archive this business?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ARCHIVE_BUSINESS",
          businessId: bizId,
        }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin Archive error]:", err);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz) return;
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EDIT_BUSINESS",
          businessId: editingBiz.id,
          name: editingBiz.name,
          category: editingBiz.category,
          phone: editingBiz.phone,
          cell: editingBiz.location?.cell,
          sector: editingBiz.location?.sector,
          district: editingBiz.location?.district,
          priceRangeMin: editingBiz.priceRangeMin,
          priceRangeMax: editingBiz.priceRangeMax,
          dataStatus: editingBiz.dataStatus,
        }),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingBiz(null);
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin Save Edit Error]:", err);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newBizForm,
        ...(adminSmartLocation ? {
          province: adminSmartLocation.province,
          district: adminSmartLocation.district,
          sector: adminSmartLocation.sector,
          cell: adminSmartLocation.cell,
          provinceId: adminSmartLocation.provinceId,
          districtId: adminSmartLocation.districtId,
          sectorId: adminSmartLocation.sectorId,
          cellId: adminSmartLocation.cellId,
          localAreaId: adminSmartLocation.localAreaId,
          nearestLandmark: adminSmartLocation.nearestLandmark,
          streetName: adminSmartLocation.streetName,
          nearbyPlace: adminSmartLocation.nearbyPlace,
          locationDescription: adminSmartLocation.locationDescription,
          latitude: adminSmartLocation.latitude,
          longitude: adminSmartLocation.longitude,
          locationSource: adminSmartLocation.locationSource,
          locationAccuracy: adminSmartLocation.locationAccuracy,
          locationVerificationStatus: adminSmartLocation.locationVerificationStatus,
        } : {}),
      };

      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewBizForm({
          name: "",
          nameRw: "",
          category: "food_restaurant",
          phone: "+250 780 000 0",
          province: "Kigali City",
          district: "Gasabo",
          sector: "Kacyiru",
          cell: "Kamutwa",
          addressNote: "",
          priceRangeMin: 1000,
          priceRangeMax: 15000,
          dataStatus: "DEMO",
          products: [{ name: "", priceMin: 1000, priceMax: 5000, unit: "item" }],
        });
        setAdminSmartLocation(null);
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin Create Biz Error]:", err);
    }
  };

  const handleResolveReport = async (reportId: string, status: "RESOLVED" | "DISMISSED") => {
    try {
      await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESOLVE_REPORT", reportId, status }),
      });
      fetchAdminData();
    } catch (err) {
      console.warn("[Admin PATCH report error]:", err);
    }
  };

  // Geographic cascading options
  const activeProvinceObj = geoTree.find((p) => p.name.toLowerCase().includes(selectedProvince.toLowerCase()) || p.code.toLowerCase() === selectedProvince.toLowerCase());
  const availableDistricts = activeProvinceObj ? activeProvinceObj.districts : geoTree.flatMap((p) => p.districts || []);
  const activeDistrictObj = availableDistricts.find((d: any) => d.name.toLowerCase() === selectedDistrict.toLowerCase());
  const availableSectors = activeDistrictObj ? activeDistrictObj.sectors : availableDistricts.flatMap((d: any) => d.sectors || []);
  const activeSectorObj = availableSectors.find((s: any) => s.name.toLowerCase() === selectedSector.toLowerCase());
  const availableCells = activeSectorObj ? activeSectorObj.cells : [];

  // Filter businesses
  const filteredBusinesses = businesses.filter((b) => {
    // Search match
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      b.name.toLowerCase().includes(q) ||
      (b.location?.community || (b as any).cell || "").toLowerCase().includes(q) ||
      (b.category || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Lifecycle filter
    if (lifecycleFilter === "DEMO" && (b as any).dataStatus !== "DEMO") return false;
    if (lifecycleFilter === "RESEARCHED" && (b as any).dataStatus !== "RESEARCHED") return false;
    if (lifecycleFilter === "VERIFIED" && (b as any).dataStatus !== "VERIFIED") return false;
    if (lifecycleFilter === "SELF_REGISTERED" && (b as any).source !== "SELF_REGISTERED") return false;
    if (lifecycleFilter === "DUPLICATES" && !(b as any).isPotentialDuplicate) return false;

    // Location verification status filter
    if (locationVerificationFilter === "GPS_CAPTURED" && (b as any).locationVerificationStatus !== "AGENT_CAPTURED") return false;
    if (locationVerificationFilter === "AGENT_VERIFIED" && (b as any).locationVerificationStatus !== "AGENT_VERIFIED") return false;
    if (locationVerificationFilter === "UNVERIFIED" && (b as any).locationVerificationStatus !== "UNVERIFIED" && (b as any).verificationStatus !== "UNVERIFIED") return false;

    // Geographic filters
    if (selectedDistrict !== "all" && b.location?.district.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
    if (selectedSector !== "all" && b.location?.sector.toLowerCase() !== selectedSector.toLowerCase()) return false;
    if (selectedCell !== "all" && b.location?.cell.toLowerCase() !== selectedCell.toLowerCase()) return false;

    return true;
  });

  const isPermittedAdmin = user?.role === "SUPER_ADMIN" || user?.role === "COMMUNITY_ADMIN" || user?.role === "MODERATOR";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Role Notice if Not Admin */}
      {!isPermittedAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold text-sm text-amber-900">
                Viewing in {user?.role.replace("_", " ") || "Guest"} Mode
              </div>
              <div className="text-xs text-amber-700">
                Switch to Super Admin to test administrative geographic data progression and database modifications.
              </div>
            </div>
          </div>
          <button
            onClick={() => switchDemoRole("SUPER_ADMIN")}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
          >
            Switch to Super Admin
          </button>
        </div>
      )}

      {/* Top Banner with Real Neon PostgreSQL Counters */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-elevated mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-600 text-white">
              <Shield className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {user?.role.replace("_", " ") || "SUPER ADMIN"} CONSOLE • NEON POSTGRESQL
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black">
            {t.admin.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            {t.admin.subtitle} Manage verified community commerce and sample test dataset across Rwanda.
          </p>
        </div>

        {/* Real DB Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <div className="text-slate-400 font-medium">Total Listed</div>
            <div className="text-xl font-bold text-white">{metrics.totalBusinesses} Businesses</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <div className="text-amber-400 font-medium">DEMO Samples</div>
            <div className="text-xl font-bold text-amber-400">{metrics.demoCount} Samples</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <div className="text-emerald-400 font-medium">Ground Verified</div>
            <div className="text-xl font-bold text-emerald-400">{metrics.verifiedDataCount} Verified</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <div className="text-blue-400 font-medium">Products / Services</div>
            <div className="text-xl font-bold text-blue-400">{metrics.totalProducts} ({metrics.estimatedProductsCount} Est.)</div>
          </div>
        </div>
      </div>

      {/* National Geographic Hierarchy Coverage Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-4 rounded-2xl border border-emerald-800/40 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">Rwanda Nationwide Administrative Hierarchy Active</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full uppercase">
                7-Tier Architecture
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              <strong>{metrics.totalProvinces} Provinces</strong> • <strong>{metrics.totalDistricts} Official Districts (100% Covered)</strong> • <strong>{metrics.totalSectors} Sectors</strong> • <strong>{metrics.totalCells} Cells</strong> • <strong>{metrics.totalLocalAreas} Discovery Landmarks</strong> (MINAGRI KG 569 St, Biryogo, etc.)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {metrics.potentialDuplicatesCount > 0 && (
            <button
              onClick={() => setLifecycleFilter("DUPLICATES")}
              className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{metrics.potentialDuplicatesCount} Possible Duplicates</span>
            </button>
          )}
          <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-semibold text-emerald-300">
            {metrics.agentCount} Community Agents
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: "businesses", label: t.admin.tabs.businesses, count: businesses.length, icon: StoreIcon },
          { id: "claims", label: "Ownership Claims", count: claims.filter((c) => c.status === "PENDING").length, icon: HeartHandshake },
          { id: "sms", label: "SMS Queue & Status", count: smsMessages.length, icon: Smartphone },
          { id: "history", label: "Price & Change Audits", count: changeHistories.length, icon: Activity },
          { id: "captures", label: t.admin.tabs.ocrCaptures, count: captures.length, icon: FileText },
          { id: "reports", label: t.admin.tabs.moderation, count: reports.length, icon: AlertTriangle },
          { id: "demands", label: t.admin.tabs.demand, count: demands.length, icon: TrendingUp },
          { id: "audit", label: "Audit & Governance", count: auditLogs.length, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Businesses Tab */}
      {activeTab === "businesses" && (
        <div className="space-y-4">
          
          {/* Controls Bar: Search + Add Business + Refresh */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by business name, category, cell, sector..."
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Business / Sample</span>
              </button>
              <button
                onClick={fetchAdminData}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh database records"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* 5-Level Cascading Geographic Filters */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nationwide 5-Level Geographic Drill-Down</span>
              </div>
              {(selectedProvince !== "all" || selectedDistrict !== "all" || selectedSector !== "all" || selectedCell !== "all") && (
                <button
                  onClick={() => {
                    setSelectedProvince("all");
                    setSelectedDistrict("all");
                    setSelectedSector("all");
                    setSelectedCell("all");
                  }}
                  className="text-[11px] text-emerald-700 hover:underline font-semibold"
                >
                  Reset Geographic Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {/* Province Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Province (5)</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedDistrict("all");
                    setSelectedSector("all");
                    setSelectedCell("all");
                  }}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  <option value="all">All Provinces (5)</option>
                  <option value="KIGALI">City of Kigali</option>
                  <option value="NORTH">Northern Province</option>
                  <option value="SOUTH">Southern Province</option>
                  <option value="EAST">Eastern Province</option>
                  <option value="WEST">Western Province</option>
                </select>
              </div>

              {/* District Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">District (30)</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedSector("all");
                    setSelectedCell("all");
                  }}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  <option value="all">All Districts ({availableDistricts.length})</option>
                  {availableDistricts.map((d: any) => (
                    <option key={d.id || d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sector ({availableSectors.length})</label>
                <select
                  value={selectedSector}
                  onChange={(e) => {
                    setSelectedSector(e.target.value);
                    setSelectedCell("all");
                  }}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  <option value="all">All Sectors ({availableSectors.length})</option>
                  {availableSectors.map((s: any) => (
                    <option key={s.id || s.code} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cell Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cell ({availableCells.length})</label>
                <select
                  value={selectedCell}
                  onChange={(e) => setSelectedCell(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
                  disabled={availableCells.length === 0}
                >
                  <option value="all">All Cells ({availableCells.length})</option>
                  {availableCells.map((c: any) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lifecycle & Location Status Filter Sub-Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "ALL", label: `All Businesses (${businesses.length})` },
                { id: "SELF_REGISTERED", label: `Self-Registered (${businesses.filter((b) => (b as any).source === "SELF_REGISTERED").length})` },
                { id: "DEMO", label: `Demo / Samples (${metrics.demoCount})` },
                { id: "RESEARCHED", label: `Researched (${metrics.researchedCount})` },
                { id: "VERIFIED", label: `Ground Verified (${metrics.verifiedDataCount})` },
                ...(metrics.potentialDuplicatesCount > 0 ? [{ id: "DUPLICATES", label: `⚠️ Duplicates (${metrics.potentialDuplicatesCount})` }] : []),
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLifecycleFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    lifecycleFilter === f.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Location Quality Filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Location:</span>
              {[
                { id: "all", label: "All" },
                { id: "GPS_CAPTURED", label: "📍 GPS" },
                { id: "AGENT_VERIFIED", label: "✓ Verified" },
                { id: "UNVERIFIED", label: "⚠️ Unverified" },
              ].map((lf) => (
                <button
                  key={lf.id}
                  onClick={() => setLocationVerificationFilter(lf.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    locationVerificationFilter === lf.id
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Business Records List */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing <strong>{filteredBusinesses.length}</strong> of {businesses.length} records</span>
              <span>Sorted by latest updates</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredBusinesses.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No businesses matching the selected geographic or lifecycle filters.
                </div>
              ) : (
                filteredBusinesses.map((biz) => {
                  const comp = calculateLocationCompleteness(biz);
                  return (
                  <div key={biz.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        <img src={biz.coverImage} alt={biz.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/business/${biz.id}`} className="font-bold text-slate-900 text-sm hover:text-emerald-700 truncate">
                            {biz.name}
                          </Link>
                          <VerificationBadge status={biz.verificationStatus} />
                          <DataStatusBadge status={(biz as any).dataStatus} />
                          
                          {(biz as any).status === "PENDING" && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                              PENDING APPROVAL
                            </span>
                          )}

                          {/* Location Completeness Pill */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            comp.level === "EXCELLENT" ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                            comp.level === "GOOD" ? "bg-blue-50 text-blue-800 border-blue-300" :
                            comp.level === "FAIR" ? "bg-amber-50 text-amber-800 border-amber-300" :
                            "bg-slate-50 text-slate-600 border-slate-200"
                          }`} title={comp.missingRecommendations.join(", ") || "Location complete"}>
                            📍 {comp.score}% {comp.level}
                          </span>

                          {(biz as any).locationAccuracy ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                              GPS ±{(biz as any).locationAccuracy}m
                            </span>
                          ) : null}

                          {(biz as any).isPotentialDuplicate && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Possible Duplicate
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">{biz.categoryDisplay || biz.category}</span>
                          {(biz as any).nearestLandmark ? (
                            <span> • <strong className="text-emerald-800 bg-emerald-50/80 px-1.5 py-0.2 rounded">📍 {(biz as any).nearestLandmark}</strong></span>
                          ) : null}
                          <span> • {(biz as any).localArea?.name || `${biz.location?.cell}, ${biz.location?.sector}`} • {biz.location?.district} District</span>
                          <span> • Phone: <span className="font-mono text-slate-700">{biz.phone}</span></span>
                          {(biz as any).priceRangeMin && (biz as any).priceRangeMax && (
                            <span className="ml-2 text-amber-700 font-semibold">
                              (Est. {(biz as any).priceRangeMin.toLocaleString()} - {(biz as any).priceRangeMax.toLocaleString()} RWF)
                            </span>
                          )}
                        </div>
                        {(biz as any).products && (biz as any).products.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-slate-600">
                            <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                            {(biz as any).products.slice(0, 3).map((p: any, idx: number) => (
                              <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                                {p.name} {p.priceMin && p.priceMax ? `(${p.priceMin.toLocaleString()}–${p.priceMax.toLocaleString()} RWF)` : `(${p.price?.toLocaleString()} RWF)`}
                              </span>
                            ))}
                            {(biz as any).products.length > 3 && (
                              <span className="text-slate-400">+{((biz as any).products.length - 3)} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center flex-wrap shrink-0">
                      {/* Quick Approval for Self-Registered Businesses */}
                      {(biz as any).status === "PENDING" && (
                        <button
                          onClick={() => handleApproveBusiness(biz.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Approve business and publish to public MOSA"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Publish</span>
                        </button>
                      )}

                      {/* Lifecycle Progression Buttons */}
                      {(biz as any).dataStatus === "DEMO" && (
                        <>
                          <button
                            onClick={() => handleUpdateDataStatus(biz.id, "RESEARCHED")}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold transition-colors"
                            title="Promote to field researched status"
                          >
                            &rarr; Researched
                          </button>
                          <button
                            onClick={() => handleUpdateDataStatus(biz.id, "VERIFIED")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                            title="Certify as ground-verified"
                          >
                            ✓ Promote to Verified
                          </button>
                        </>
                      )}

                      {(biz as any).dataStatus === "RESEARCHED" && (
                        <>
                          <button
                            onClick={() => handleUpdateDataStatus(biz.id, "VERIFIED")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                          >
                            ✓ Certify Verified
                          </button>
                          <button
                            onClick={() => handleUpdateDataStatus(biz.id, "DEMO")}
                            className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 text-[10px] font-medium transition-colors"
                          >
                            Revert to Demo
                          </button>
                        </>
                      )}

                      {(biz as any).dataStatus === "VERIFIED" && (
                        <button
                          onClick={() => handleUpdateDataStatus(biz.id, "DEMO")}
                          className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 text-[10px] font-medium transition-colors"
                          title="Reset back to demo sample record"
                        >
                          Reset to Demo
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingBiz(biz);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-colors"
                        title="Edit Business Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleArchiveBusiness(biz.id)}
                        className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                        title="Archive Business"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        href={`/business/${biz.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                      >
                        View Live
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      )}

      {/* Captures Tab */}
      {activeTab === "captures" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Physical OCR Extracted Records ({captures.length})
          </h3>
          <div className="space-y-4">
            {captures.map((cap) => (
              <div key={cap.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{cap.businessName || "Local Merchant"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase">
                      {cap.documentType}
                    </span>
                    <span className="text-[10px] text-slate-400">Agent: {cap.agentName}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Extracted {cap.extractedItems?.length || 0} line items • Total: {cap.extractedTotal?.toLocaleString() || 0} RWF
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    {cap.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Community Moderation Queue ({reports.length})
          </h3>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No open moderation reports in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{rep.businessName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                        {rep.reason}
                      </span>
                    </div>
                    <p className="text-slate-600">{rep.details}</p>
                  </div>

                  {rep.status === "OPEN" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveReport(rep.id, "RESOLVED")}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, "DISMISSED")}
                        className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Demand Signals Tab */}
      {activeTab === "demands" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Aggregated Community Search Demands ({demands.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {demands.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">"{d.queryTerm}"</div>
                  <div className="text-slate-500">{d.category} • {d.cell || "All Cells"}, {d.sector}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-600">{d.searchCount} searches</div>
                  <div className="text-[10px] text-slate-400">{d.activeBusinessesCount} existing listings</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">
              PostgreSQL Immutable Audit Trail ({auditLogs.length})
            </h3>
            <span className="text-xs text-slate-500 font-medium">Permanent Event Log</span>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px] uppercase">
                      {log.action}
                    </span>
                    <span className="font-medium text-slate-800">{log.entityType}: {log.entityId}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Actor: {log.actor?.name || "System"} ({log.actor?.role || "SYSTEM"}) • {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ownership Claims Tab */}
      {activeTab === "claims" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Business Ownership Claims Queue ({claims.length})</h3>
              <p className="text-xs text-slate-500">
                Proprietors claiming existing business profiles. Approving binds account ownership and grants Business Dashboard control.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              {claims.filter((c) => c.status === "PENDING").length} Pending Review
            </span>
          </div>

          {claims.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No ownership claims submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {claims.map((claim) => (
                <div key={claim.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{claim.businessName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          claim.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : claim.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>

                    <div className="text-slate-600 flex flex-wrap items-center gap-2">
                      <span>Location: <strong>{claim.businessLocation}</strong></span>
                      <span>•</span>
                      <span>Registered Phone: <code>{claim.businessPhone}</code></span>
                      <span>•</span>
                      <span>Claimant Phone: <code>{claim.claimPhone}</code></span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Claimant: <strong>{claim.claimantName}</strong> ({new Date(claim.claimedAt).toLocaleString()})
                    </div>
                    {claim.verificationNotes && (
                      <div className="text-[11px] text-slate-400 italic">Notes: {claim.verificationNotes}</div>
                    )}
                  </div>

                  {claim.status === "PENDING" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveClaim(claim.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                      >
                        Approve Ownership
                      </button>
                      <button
                        onClick={() => handleRejectClaim(claim.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SMS Queue & Carrier Status Tab */}
      {activeTab === "sms" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">SMS Notification Dispatch Logs ({smsMessages.length})</h3>
              <p className="text-xs text-slate-500">
                Real-time delivery status of transactional SMS messages across Rwanda telecom networks (MTN, Airtel).
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Carrier Status: <strong>{process.env.NEXT_PUBLIC_SMS_CONFIGURED === "true" ? "CONNECTED" : "CONFIGURATION REQUIRED (Africa's Talking)"}</strong>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <strong>Production Architecture Principle:</strong> MOSA never produces fake delivery confirmations. If <code>AFRICAS_TALKING_API_KEY</code> is not provided in environment variables, dispatch is recorded as <code>CONFIGURATION_REQUIRED</code> with the rendered multilingual message.
          </div>

          {smsMessages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No SMS notifications logged in database yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {smsMessages.map((msg) => (
                <div key={msg.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{msg.recipientPhone}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {msg.templateId} ({msg.language})
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          msg.status === "DELIVERED" || msg.status === "SENT"
                            ? "bg-emerald-100 text-emerald-800"
                            : msg.status === "CONFIGURATION_REQUIRED"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>

                    <p className="text-slate-700 bg-white p-2 rounded-xl border border-slate-100 font-mono text-[11px]">
                      "{msg.messageBody}"
                    </p>

                    <div className="text-[10px] text-slate-400">
                      Entity: {msg.businessName} • Provider: {msg.provider}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono self-end sm:self-center shrink-0">
                    {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deep Change History & Price Audits Tab */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base">Network-Wide Business Change History & Audits ({changeHistories.length})</h3>
            <p className="text-xs text-slate-500">
              Audit log tracking price adjustments (e.g. 3,000 &rarr; 3,500 RWF), profile updates, and keep-alive confirmations.
            </p>
          </div>

          {changeHistories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No business changes recorded in history yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {changeHistories.map((h) => (
                <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{h.businessName}</span>
                      <span className="text-[10px] text-slate-400">({h.businessCell})</span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-100 text-emerald-800">
                        {h.action}
                      </span>
                    </div>

                    <div className="text-slate-600">
                      Field: <code className="bg-slate-100 px-1 py-0.2 rounded">{h.fieldChanged}</code>
                      {h.previousValue && (
                        <span> Old: <span className="line-through text-slate-400">{h.previousValue}</span> &rarr; </span>
                      )}
                      <strong> New: {h.newValue}</strong>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Actor: {h.actorName} ({h.actorRole}) • Source: {h.source}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono self-end sm:self-center">
                    {new Date(h.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add New Business / Sample */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">Add Business / Demo Sample Record</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Business Name (EN/RW)</label>
                  <input
                    type="text"
                    required
                    value={newBizForm.name}
                    onChange={(e) => setNewBizForm({ ...newBizForm, name: e.target.value })}
                    placeholder="e.g. Kacyiru Modern Bakery"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newBizForm.category}
                    onChange={(e) => setNewBizForm({ ...newBizForm, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number (Demo designated)</label>
                  <input
                    type="text"
                    required
                    value={newBizForm.phone}
                    onChange={(e) => setNewBizForm({ ...newBizForm, phone: e.target.value })}
                    placeholder="+250 780 000 0XX (Demo)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Data Status</label>
                  <select
                    value={newBizForm.dataStatus}
                    onChange={(e) => setNewBizForm({ ...newBizForm, dataStatus: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-amber-700"
                  >
                    <option value="DEMO">DEMO (Synthetic Sample)</option>
                    <option value="RESEARCHED">RESEARCHED (Field In-Progress)</option>
                    <option value="VERIFIED">VERIFIED (Audited on Ground)</option>
                  </select>
                </div>
              </div>

              {/* Smart Location & Ground Discovery Form */}
              <div className="pt-2 border-t border-slate-100">
                <SmartLocationForm
                  businessName={newBizForm.name}
                  businessCategory={newBizForm.category}
                  onChange={(data) => setAdminSmartLocation(data)}
                  existingBusinesses={businesses.map((b) => ({
                    id: b.id,
                    name: b.name,
                    latitude: b.location?.coordinates?.lat ?? b.latitude ?? 0,
                    longitude: b.location?.coordinates?.lng ?? b.longitude ?? 0,
                    category: b.category,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price Min (RWF)</label>
                  <input
                    type="number"
                    value={newBizForm.priceRangeMin}
                    onChange={(e) => setNewBizForm({ ...newBizForm, priceRangeMin: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price Max (RWF)</label>
                  <input
                    type="number"
                    value={newBizForm.priceRangeMax}
                    onChange={(e) => setNewBizForm({ ...newBizForm, priceRangeMax: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Business */}
      {isEditModalOpen && editingBiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">Edit Business Record</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={editingBiz.name}
                  onChange={(e) => setEditingBiz({ ...editingBiz, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingBiz.phone}
                    onChange={(e) => setEditingBiz({ ...editingBiz, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Data Lifecycle Status</label>
                  <select
                    value={editingBiz.dataStatus}
                    onChange={(e) => setEditingBiz({ ...editingBiz, dataStatus: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-emerald-800"
                  >
                    <option value="DEMO">DEMO (Synthetic Sample)</option>
                    <option value="RESEARCHED">RESEARCHED (Field In-Progress)</option>
                    <option value="VERIFIED">VERIFIED (Audited on Ground)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimated Min Price (RWF)</label>
                  <input
                    type="number"
                    value={editingBiz.priceRangeMin || 0}
                    onChange={(e) => setEditingBiz({ ...editingBiz, priceRangeMin: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimated Max Price (RWF)</label>
                  <input
                    type="number"
                    value={editingBiz.priceRangeMax || 0}
                    onChange={(e) => setEditingBiz({ ...editingBiz, priceRangeMax: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
