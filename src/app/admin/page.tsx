"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  X,
  ShieldCheck,
  FileCheck,
  Edit3,
  MessageCircle,
  ExternalLink,
  Layers,
  ShieldAlert,
  Eye,
  Video,
  Film,
  Play,
  Megaphone,
  Send,
  Calendar,
  Clock,
  Archive,
  CheckSquare,
  Square,
  BellRing
} from "lucide-react";
import { SmartLocationForm, SmartLocationFormData } from "@/components/location/SmartLocationForm";
import { calculateLocationCompleteness } from "@/lib/location-quality";
import { RWANDA_HIERARCHY } from "@/lib/rwanda-geo";
import {
  CANONICAL_TAXONOMY,
  ALL_MAIN_CATEGORIES,
  ALL_SUBCATEGORIES,
  ALL_BUSINESS_TYPES,
  formatCategoryClassification,
  getCategoryHierarchy,
} from "@/lib/taxonomy";

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
  itemsRequiringAttention?: number;
  flaggedMediaCount?: number;
  flaggedProductsCount?: number;
  businessesRequiringReview?: number;
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
    "overview" | "verification" | "businesses" | "moderation" | "users" | "ecosystem" | "settings" | "intelligence" | "pending_applications" | "claims" | "sms" | "history" | "captures" | "reports" | "demands" | "audit" | "announcements"
  >("overview");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [smsMessages, setSmsMessages] = useState<any[]>([]);
  const [changeHistories, setChangeHistories] = useState<any[]>([]);
  const [captures, setCaptures] = useState<PhysicalCaptureRecord[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Partner Announcements Automation state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementStats, setAnnouncementStats] = useState<{
    total: number;
    sent: number;
    scheduled: number;
    drafts: number;
    archived: number;
    totalReach: number;
  }>({
    total: 0,
    sent: 0,
    scheduled: 0,
    drafts: 0,
    archived: 0,
    totalReach: 0,
  });
  const [announcementEstimates, setAnnouncementEstimates] = useState<{
    allOwnersCount: number;
    byCategory: Record<string, number>;
    byDistrict: Record<string, number>;
  }>({
    allOwnersCount: 0,
    byCategory: {},
    byDistrict: {},
  });
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(false);
  const [announcementFilter, setAnnouncementFilter] = useState<"ALL" | "SENT" | "SCHEDULED" | "DRAFT" | "ARCHIVED">("ALL");
  const [announcementSearch, setAnnouncementSearch] = useState("");

  // Announcement Modal State
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    titleRw: "",
    message: "",
    messageRw: "",
    targetType: "ALL" as "ALL" | "CATEGORY" | "LOCATION" | "SELECTED_BUSINESSES",
    targetCategory: "",
    targetDistrict: "",
    targetBusinessIds: [] as string[],
    action: "SEND_NOW" as "SEND_NOW" | "SCHEDULE" | "DRAFT",
    scheduledAt: "",
  });
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [announcementActionMsg, setAnnouncementActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [businessSearchInModal, setBusinessSearchInModal] = useState("");

  // 3-Tier Category & Intelligence Filter State
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>("all");
  const [locationCategoryBreakdown, setLocationCategoryBreakdown] = useState<Record<string, any>>({});
  const [categorySummary, setCategorySummary] = useState<Record<string, any>>({});
  
  // Application review & decision state
  const [reviewingBiz, setReviewingBiz] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "CORRECTIONS" | "REJECT" | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isActionSubmitting, setIsActionSubmitting] = useState<boolean>(false);

  // Content Moderation & On-Demand Inspection State
  const [moderationOpenReports, setModerationOpenReports] = useState<any[]>([]);
  const [moderationFlaggedMedia, setModerationFlaggedMedia] = useState<any[]>([]);
  const [moderationUpdates, setModerationUpdates] = useState<any[]>([]);
  const [moderationOpportunities, setModerationOpportunities] = useState<any[]>([]);
  const [moderationFilter, setModerationFilter] = useState<"ALL" | "VIDEO" | "PHOTO" | "PRODUCT" | "UPDATE" | "OPPORTUNITY">("ALL");
  const [inspectingBizContent, setInspectingBizContent] = useState<any | null>(null);
  const [isInspectingLoading, setIsInspectingLoading] = useState(false);
  const [activePreviewVideo, setActivePreviewVideo] = useState<any | null>(null);
  const [moderationActionModal, setModerationActionModal] = useState<{
    open: boolean;
    action: string;
    targetId: string;
    targetType: string;
    title: string;
  } | null>(null);
  const [moderationActionReason, setModerationActionReason] = useState("");

  // Users & Roles state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

  // Settings & Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Rwanda districts list for announcement targeting
  const rwandaDistricts = useMemo(() => {
    try {
      return Object.values(RWANDA_HIERARCHY).flatMap((p) =>
        Object.values(p.districts).map((d) => ({
          name: d.name,
          nameRw: d.nameRw,
          province: p.name,
        }))
      ).sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }, []);

  // Category list for announcement targeting
  const categoryList = useMemo(() => {
    return Object.values(ALL_MAIN_CATEGORIES);
  }, []);

  // Estimated reach calculation for announcement modal
  const estimatedReachCount = useMemo(() => {
    if (announcementForm.targetType === "ALL") {
      return announcementEstimates.allOwnersCount || businesses.filter((b) => (b as any).owner).length;
    }
    if (announcementForm.targetType === "CATEGORY") {
      if (!announcementForm.targetCategory) return 0;
      return announcementEstimates.byCategory?.[announcementForm.targetCategory] || businesses.filter((b) => (b.category === announcementForm.targetCategory || b.mainCategory === announcementForm.targetCategory) && (b as any).owner).length;
    }
    if (announcementForm.targetType === "LOCATION") {
      if (!announcementForm.targetDistrict) return 0;
      return announcementEstimates.byDistrict?.[announcementForm.targetDistrict] || businesses.filter((b) => b.location?.district === announcementForm.targetDistrict && (b as any).owner).length;
    }
    if (announcementForm.targetType === "SELECTED_BUSINESSES") {
      return announcementForm.targetBusinessIds.length;
    }
    return 0;
  }, [announcementForm.targetType, announcementForm.targetCategory, announcementForm.targetDistrict, announcementForm.targetBusinessIds, announcementEstimates, businesses]);
  
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
        if (data.locationCategoryBreakdown) setLocationCategoryBreakdown(data.locationCategoryBreakdown);
        if (data.categorySummary) setCategorySummary(data.categorySummary);
        if (data.businesses && data.businesses.length > 0) {
          setBusinesses(data.businesses.map((b: any) => ({
            id: b.id,
            name: b.name,
            nameRw: b.nameRw || b.name,
            category: b.category,
            categoryDisplay: b.categoryDisplay,
            mainCategory: b.mainCategory || b.category,
            subCategory: b.subCategory,
            businessType: b.businessType,
            businessTypeDisplay: b.businessTypeDisplay,
            businessTypeDisplayRw: b.businessTypeDisplayRw,
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
            owner: b.owner || null,
            createdAt: b.createdAt,
            verifications: b.verifications || [],
            media: b.media || [],
            updates: b.updates || [],
          })));
        }
        if (data.captures && data.captures.length > 0) setCaptures(data.captures);
        if (data.reports && data.reports.length > 0) setReports(data.reports);
        if (data.demands && data.demands.length > 0) setDemands(data.demands);
        if (data.claims) setClaims(data.claims);
        if (data.smsMessages) setSmsMessages(data.smsMessages);
        if (data.changeHistories) setChangeHistories(data.changeHistories);
        fetchAnnouncements().catch(() => {});
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
    fetchUsersList();
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setIsAnnouncementsLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
        if (data.stats) setAnnouncementStats(data.stats);
        if (data.estimates) setAnnouncementEstimates(data.estimates);
      }
    } catch (err) {
      console.warn("[Admin Announcements Load Error]:", err);
    } finally {
      setIsAnnouncementsLoading(false);
    }
  };

  const handleOpenCreateAnnouncementModal = () => {
    setEditingAnnouncementId(null);
    setAnnouncementForm({
      title: "",
      titleRw: "",
      message: "",
      messageRw: "",
      targetType: "ALL",
      targetCategory: "",
      targetDistrict: "",
      targetBusinessIds: [],
      action: "SEND_NOW",
      scheduledAt: "",
    });
    setAnnouncementActionMsg(null);
    setAnnouncementModalOpen(true);
  };

  const handleOpenEditAnnouncementModal = (ann: any) => {
    setEditingAnnouncementId(ann.id);
    let bizIds: string[] = [];
    if (ann.targetBusinessIds) {
      try {
        bizIds = typeof ann.targetBusinessIds === "string" ? JSON.parse(ann.targetBusinessIds) : ann.targetBusinessIds;
      } catch {
        bizIds = ann.targetBusinessIds.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    setAnnouncementForm({
      title: ann.title || "",
      titleRw: ann.titleRw || "",
      message: ann.message || "",
      messageRw: ann.messageRw || "",
      targetType: ann.targetType || "ALL",
      targetCategory: ann.targetCategory || "",
      targetDistrict: ann.targetDistrict || "",
      targetBusinessIds: bizIds,
      action: ann.status === "SCHEDULED" ? "SCHEDULE" : "DRAFT",
      scheduledAt: ann.scheduledAt ? new Date(ann.scheduledAt).toISOString().slice(0, 16) : "",
    });
    setAnnouncementActionMsg(null);
    setAnnouncementModalOpen(true);
  };

  const handleSubmitAnnouncement = async (actionOverride?: "SEND_NOW" | "SCHEDULE" | "DRAFT") => {
    const finalAction = actionOverride || announcementForm.action;
    if (!announcementForm.title.trim()) {
      setAnnouncementActionMsg({ type: "error", text: "Please provide an announcement title." });
      return;
    }
    if (!announcementForm.message.trim()) {
      setAnnouncementActionMsg({ type: "error", text: "Please provide an announcement message." });
      return;
    }
    if (finalAction === "SCHEDULE" && !announcementForm.scheduledAt) {
      setAnnouncementActionMsg({ type: "error", text: "Please specify a scheduled date and time." });
      return;
    }
    if (announcementForm.targetType === "CATEGORY" && !announcementForm.targetCategory) {
      setAnnouncementActionMsg({ type: "error", text: "Please select a target business category." });
      return;
    }
    if (announcementForm.targetType === "LOCATION" && !announcementForm.targetDistrict) {
      setAnnouncementActionMsg({ type: "error", text: "Please select a target district." });
      return;
    }
    if (announcementForm.targetType === "SELECTED_BUSINESSES" && announcementForm.targetBusinessIds.length === 0) {
      setAnnouncementActionMsg({ type: "error", text: "Please select at least one business." });
      return;
    }

    setAnnouncementSubmitting(true);
    setAnnouncementActionMsg(null);
    try {
      if (editingAnnouncementId) {
        const res = await fetch("/api/admin/announcements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            announcementId: editingAnnouncementId,
            action: finalAction === "SEND_NOW" ? "SEND_NOW" : "UPDATE",
            title: announcementForm.title,
            titleRw: announcementForm.titleRw,
            message: announcementForm.message,
            messageRw: announcementForm.messageRw,
            targetType: announcementForm.targetType,
            targetCategory: announcementForm.targetCategory,
            targetDistrict: announcementForm.targetDistrict,
            targetBusinessIds: announcementForm.targetBusinessIds,
            scheduledAt: announcementForm.scheduledAt || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update announcement");
        setAnnouncementActionMsg({ type: "success", text: data.message || "Announcement updated successfully" });
        setTimeout(() => {
          setAnnouncementModalOpen(false);
          fetchAnnouncements();
        }, 1200);
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...announcementForm,
            action: finalAction,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create announcement");
        setAnnouncementActionMsg({ type: "success", text: data.message || "Announcement saved successfully" });
        setTimeout(() => {
          setAnnouncementModalOpen(false);
          fetchAnnouncements();
        }, 1200);
      }
    } catch (err: any) {
      setAnnouncementActionMsg({ type: "error", text: err.message || "Error processing announcement" });
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const handleSendNowDirect = async (ann: any) => {
    if (!confirm(`Are you sure you want to dispatch "${ann.title}" immediately to all targeted business owners?`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: ann.id, action: "SEND_NOW" }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Announcement dispatched successfully!");
        fetchAnnouncements();
      } else {
        alert(data.error || "Failed to dispatch announcement");
      }
    } catch (err) {
      alert("Error dispatching announcement");
    }
  };

  const handleArchiveDirect = async (ann: any) => {
    if (!confirm(`Archive announcement "${ann.title}"?`)) return;
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: ann.id, action: "ARCHIVE" }),
      });
      if (res.ok) fetchAnnouncements();
    } catch (err) {
      console.warn("Archive error:", err);
    }
  };

  const handleDeleteAnnouncementDirect = async (ann: any) => {
    if (!confirm(`Delete announcement "${ann.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/announcements?id=${ann.id}`, { method: "DELETE" });
      if (res.ok) fetchAnnouncements();
    } catch (err) {
      console.warn("Delete error:", err);
    }
  };

  const fetchUsersList = async () => {
    setIsUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?role=${userRoleFilter}&q=${encodeURIComponent(userSearchTerm)}`);
      const data = await res.json();
      if (data.success && data.users) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.warn("[Admin Users Load Error]:", err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        fetchUsersList();
      }
    } catch (err) {
      console.warn("Error updating user role:", err);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      if (res.ok) {
        fetchUsersList();
      }
    } catch (err) {
      console.warn("Error toggling user status:", err);
    }
  };

  const handleSuspendBusiness = async (bizId: string) => {
    if (!confirm("Are you sure you want to suspend this business?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUSPEND_BUSINESS", businessId: bizId }),
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.warn("Suspend business error:", err);
    }
  };

  const handleUnsuspendBusiness = async (bizId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNSUSPEND_BUSINESS", businessId: bizId }),
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.warn("Unsuspend business error:", err);
    }
  };

  const handleDeleteBusiness = async (bizId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_BUSINESS", businessId: bizId }),
      });
      if (res.ok) fetchAdminData();
    } catch (err) {
      console.warn("Delete business error:", err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMsg(null);
    if (!currentPassword || !newPassword) {
      setPasswordChangeMsg({ type: "error", text: "Please enter current and new password." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordChangeMsg({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPasswordChangeLoading(true);
    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordChangeMsg({ type: "error", text: data.error || "Failed to change password." });
      } else {
        setPasswordChangeMsg({ type: "success", text: "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordChangeMsg({ type: "error", text: err.message || "Network error changing password." });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

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

  const handleVerifyAndApprove = async (bizId: string, notes?: string) => {
    setIsActionSubmitting(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_BUSINESS",
          businessId: bizId,
          notes: notes || "Business verified and approved by MOSA Admin.",
        }),
      });
      if (res.ok) {
        setReviewingBiz(null);
        setReviewAction(null);
        setAdminNotes("");
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin Approve Error]:", err);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleRequestCorrections = async (bizId: string, notes: string) => {
    if (!notes.trim()) {
      alert("Please specify the corrections or revisions required for the business owner.");
      return;
    }
    setIsActionSubmitting(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST_CORRECTIONS",
          businessId: bizId,
          notes: notes.trim(),
        }),
      });
      if (res.ok) {
        setReviewingBiz(null);
        setReviewAction(null);
        setAdminNotes("");
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin Request Corrections Error]:", err);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleRejectBusiness = async (bizId: string, reason?: string) => {
    setIsActionSubmitting(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT_BUSINESS",
          businessId: bizId,
          notes: reason || "Did not meet verification criteria.",
        }),
      });
      if (res.ok) {
        setReviewingBiz(null);
        setReviewAction(null);
        setAdminNotes("");
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin Reject Error]:", err);
    } finally {
      setIsActionSubmitting(false);
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
      fetchModerationData();
    } catch (err) {
      console.warn("[Admin PATCH report error]:", err);
    }
  };

  const fetchModerationData = async () => {
    try {
      const res = await fetch("/api/admin/moderation");
      if (res.ok) {
        const d = await res.json();
        setModerationOpenReports(d.openReports || []);
        setModerationFlaggedMedia(d.flaggedMedia || []);
        setModerationUpdates(d.updates || []);
        setModerationOpportunities(d.opportunities || []);
      }
    } catch (err) {
      console.error("Failed to load moderation data:", err);
    }
  };

  const handleInspectBusinessContent = async (businessId: string) => {
    setIsInspectingLoading(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/content`);
      if (res.ok) {
        const d = await res.json();
        setInspectingBizContent(d);
      }
    } catch (err) {
      console.error("Failed to inspect business content:", err);
    } finally {
      setIsInspectingLoading(false);
    }
  };

  const handleExecuteModerationAction = async (action: string, targetId: string, reason?: string) => {
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetId, reason }),
      });
      if (res.ok) {
        fetchModerationData();
        fetchAdminData();
        if (inspectingBizContent?.business?.id) {
          handleInspectBusinessContent(inspectingBizContent.business.id);
        }
        setModerationActionModal(null);
        setModerationActionReason("");
      }
    } catch (err) {
      console.error("Moderation action failed:", err);
    }
  };

  // Geographic cascading options
  const activeProvinceObj = geoTree.find((p) => p.name.toLowerCase().includes(selectedProvince.toLowerCase()) || p.code.toLowerCase() === selectedProvince.toLowerCase());
  const availableDistricts = activeProvinceObj ? activeProvinceObj.districts : geoTree.flatMap((p) => p.districts || []);
  const activeDistrictObj = availableDistricts.find((d: any) => d.name.toLowerCase() === selectedDistrict.toLowerCase());
  const availableSectors = activeDistrictObj ? activeDistrictObj.sectors : availableDistricts.flatMap((d: any) => d.sectors || []);
  const activeSectorObj = availableSectors.find((s: any) => s.name.toLowerCase() === selectedSector.toLowerCase());
  const availableCells = activeSectorObj ? activeSectorObj.cells : [];

  // Cascading Category Options for Admin Filtering
  const activeAdminMainObj = CANONICAL_TAXONOMY.find((m) => m.id === selectedMainCategory);
  const availableAdminSubcategories = activeAdminMainObj ? activeAdminMainObj.subcategories : [];
  const activeAdminSubObj = availableAdminSubcategories.find((s) => s.id === selectedSubCategory);
  const availableAdminBusinessTypes = activeAdminSubObj ? activeAdminSubObj.types : [];

  // Dynamic Location Category Breakdown (falls back to runtime computation from businesses state)
  const computedLocationBreakdown = useMemo(() => {
    if (locationCategoryBreakdown && Object.keys(locationCategoryBreakdown).length > 0) {
      return locationCategoryBreakdown;
    }
    const breakdown: Record<string, any> = {};
    for (const b of businesses) {
      const sector = b.location?.sector || (b as any).sector || "Unspecified";
      if (!breakdown[sector]) {
        breakdown[sector] = {
          sector,
          district: b.location?.district || (b as any).district || "Gasabo",
          province: b.location?.province || (b as any).province || "Kigali City",
          total: 0,
          categories: {},
          subCategories: {},
          businessTypes: {},
          cells: {},
        };
      }
      const item = breakdown[sector];
      item.total += 1;
      const cat = (b as any).mainCategory || b.category || "retail";
      item.categories[cat] = (item.categories[cat] || 0) + 1;
      if ((b as any).subCategory) {
        item.subCategories[(b as any).subCategory] = (item.subCategories[(b as any).subCategory] || 0) + 1;
      }
      const bt = (b as any).businessType || (b as any).businessTypeDisplay || b.category || "general";
      item.businessTypes[bt] = (item.businessTypes[bt] || 0) + 1;
      const cell = b.location?.cell || (b as any).cell;
      if (cell) {
        item.cells[cell] = (item.cells[cell] || 0) + 1;
      }
    }
    return breakdown;
  }, [businesses, locationCategoryBreakdown]);

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

    // 3-Tier Category filters
    if (selectedMainCategory !== "all") {
      const bMain = (b as any).mainCategory || b.category;
      if (bMain !== selectedMainCategory) return false;
    }
    if (selectedSubCategory !== "all") {
      const bSub = (b as any).subCategory;
      if (bSub !== selectedSubCategory) return false;
    }
    if (selectedBusinessType !== "all") {
      const bType = (b as any).businessType;
      if (bType !== selectedBusinessType) return false;
    }

    return true;
  });

  const isPermittedAdmin = user?.role === "SUPER_ADMIN" || user?.role === "COMMUNITY_ADMIN" || user?.role === "MODERATOR";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Role Notice if Not Admin */}
      {!isPermittedAdmin && (
        process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH === "true" ? (
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
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <div className="font-bold text-sm text-rose-900">
                  Restricted Administrative Console
                </div>
                <div className="text-xs text-rose-700">
                  Administrative actions require authenticated staff credentials.
                </div>
              </div>
            </div>
            <Link
              href="/auth/login"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 text-center"
            >
              Staff Sign In
            </Link>
          </div>
        )
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

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            MOSA COMMAND CENTER
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium">
            Platform Administration &amp; Business Verification
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

      {/* Platform Content Integrity & Governance Indicator Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">Content Moderation & Ecosystem Governance</h4>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                System-Wide Authority
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Business owners independently manage products, prices, and showcase videos. Main Command Center monitors platform integrity without cluttering the overview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attention Required</div>
              <div className="text-base font-black text-purple-700">
                {((metrics as any).itemsRequiringAttention ?? (moderationOpenReports.length + moderationFlaggedMedia.length)) || 0} items
              </div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flagged Media</div>
              <div className="text-base font-black text-amber-600">
                {((metrics as any).flaggedMediaCount ?? moderationFlaggedMedia.length) || 0}
              </div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Reports</div>
              <div className="text-base font-black text-rose-600">
                {((metrics as any).openReportsCount ?? moderationOpenReports.length) || 0}
              </div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Review Needed</div>
              <div className="text-base font-black text-slate-800">
                {((metrics as any).businessesRequiringReview) || 0}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              fetchModerationData();
              setActiveTab("moderation");
            }}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Shield className="w-4 h-4" />
            <span>Open Moderation Console</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: "overview", label: "Overview", count: null, icon: Activity },
          { 
            id: "verification", 
            label: "Business Verification", 
            count: businesses.filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION").length, 
            icon: ShieldCheck,
            highlight: businesses.filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION").length > 0
          },
          { id: "businesses", label: "Businesses", count: businesses.length, icon: StoreIcon },
          { 
            id: "announcements", 
            label: "Partner Announcements", 
            count: announcements.filter((a) => a.status === "SENT" || a.status === "SCHEDULED").length, 
            icon: Megaphone,
            highlight: announcements.filter((a) => a.status === "SCHEDULED").length > 0
          },
          { 
            id: "moderation", 
            label: "Content Moderation", 
            count: (moderationOpenReports.length + moderationFlaggedMedia.length), 
            icon: Film 
          },
          { id: "users", label: "Users & Roles", count: usersList.length, icon: Users },
          { 
            id: "ecosystem", 
            label: "Rwanda Ecosystem", 
            count: Object.keys(computedLocationBreakdown).length, 
            icon: Globe 
          },
          { id: "settings", label: "Settings & Security", count: null, icon: Lock },
          { id: "claims", label: "Ownership Claims", count: claims.filter((c) => c.status === "PENDING").length, icon: HeartHandshake },
          { id: "sms", label: "SMS Queue", count: smsMessages.length, icon: Smartphone },
          { id: "history", label: "Price Audits", count: changeHistories.length, icon: Activity },
          { id: "captures", label: "OCR Captures", count: captures.length, icon: FileText },
          { id: "reports", label: "Reports", count: reports.length, icon: AlertTriangle },
          { id: "demands", label: "Demands", count: demands.length, icon: TrendingUp },
          { id: "audit", label: "Audit & Governance", count: auditLogs.length, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || 
            (tab.id === "verification" && activeTab === "pending_applications") ||
            (tab.id === "ecosystem" && activeTab === "intelligence");

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-emerald-700 text-white" : tab.highlight ? "bg-amber-100 text-amber-900 font-black" : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Businesses</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{metrics.totalBusinesses}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Across {metrics.totalDistricts} official districts</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <StoreIcon className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ground Verified</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{metrics.verifiedDataCount}</h3>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Physical agent validated</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Verification</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">
                  {businesses.filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION").length}
                </h3>
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Awaiting admin review</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moderation Queue</p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">
                  {moderationOpenReports.length + moderationFlaggedMedia.length}
                </h3>
                <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Flagged media &amp; reports</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-white">Administrator Quick Actions</h4>
              <p className="text-xs text-slate-400 mt-0.5">Rapidly jump to essential platform governance centers.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab("verification")}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Businesses ({businesses.filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION").length})</span>
              </button>
              <button
                onClick={() => setActiveTab("moderation")}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Film className="w-4 h-4" />
                <span>Moderate Content</span>
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Manage Users</span>
              </button>
              <button
                onClick={() => setActiveTab("businesses")}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <StoreIcon className="w-4 h-4" />
                <span>All Businesses ({businesses.length})</span>
              </button>
            </div>
          </div>

          {/* Dual Panel: Verification Spotlight + Governance Audit Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Pending Verification Queue */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-slate-900 text-sm">Applications Requiring Verification</h4>
                </div>
                <button
                  onClick={() => setActiveTab("verification")}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  View All ({businesses.filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION").length})
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {businesses.filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION").length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                  🎉 No pending verifications. All registered businesses are up to date!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {businesses
                    .filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION")
                    .slice(0, 4)
                    .map((biz: any) => (
                      <div key={biz.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs text-slate-900 truncate">{biz.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800">
                              {biz.status === "PENDING" ? "PENDING" : "CORRECTIONS"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {biz.location?.district} • {biz.phone} • {biz.categoryDisplay || biz.category}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setReviewingBiz(biz);
                            setReviewAction(null);
                            setAdminNotes("");
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shrink-0 cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Right: Recent Audit & Activity Trail */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-700" />
                  <h4 className="font-bold text-slate-900 text-sm">Recent Administrative Activity</h4>
                </div>
                <button
                  onClick={() => setActiveTab("audit")}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  Full Audit Log
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                  No administrative events recorded recently.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{log.action.replace("ADMIN_", "").replace(/_/g, " ")}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-600">
                            {log.entityType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Actor: {log.actor?.name || "System Administrator"} ({log.actor?.role || "SUPER_ADMIN"})
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

            {/* 3-Tier Canonical Category Filters */}
            <div className="pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3-Tier Category & Commercial Domain Drill-Down</span>
                </div>
                {(selectedMainCategory !== "all" || selectedSubCategory !== "all" || selectedBusinessType !== "all") && (
                  <button
                    onClick={() => {
                      setSelectedMainCategory("all");
                      setSelectedSubCategory("all");
                      setSelectedBusinessType("all");
                    }}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold"
                  >
                    Reset Category Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Main Sector Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    1. Main Sector
                  </label>
                  <select
                    value={selectedMainCategory}
                    onChange={(e) => {
                      setSelectedMainCategory(e.target.value);
                      setSelectedSubCategory("all");
                      setSelectedBusinessType("all");
                    }}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
                  >
                    <option value="all">All Sectors ({CANONICAL_TAXONOMY.length})</option>
                    {CANONICAL_TAXONOMY.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    2. Commercial Domain / Subcategory
                  </label>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => {
                      setSelectedSubCategory(e.target.value);
                      setSelectedBusinessType("all");
                    }}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
                    disabled={availableAdminSubcategories.length === 0}
                  >
                    <option value="all">All Subcategories ({availableAdminSubcategories.length})</option>
                    {availableAdminSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Business Type Select */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    3. Specific Business Type
                  </label>
                  <select
                    value={selectedBusinessType}
                    onChange={(e) => setSelectedBusinessType(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:border-emerald-500 font-medium"
                    disabled={availableAdminBusinessTypes.length === 0}
                  >
                    <option value="all">All Business Types ({availableAdminBusinessTypes.length})</option>
                    {availableAdminBusinessTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                      {/* Actions for Self-Registered Businesses Awaiting Verification / Revisions */}
                      {((biz as any).status === "PENDING" || (biz as any).status === "NEEDS_CORRECTION") && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setReviewingBiz(biz);
                              setReviewAction(null);
                              setAdminNotes("");
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Review complete application details"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                          <button
                            onClick={() => handleVerifyAndApprove(biz.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Verify business and publish to public MOSA"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify</span>
                          </button>
                        </div>
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
                        onClick={() => handleInspectBusinessContent(biz.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Inspect Content & Assets (Videos, Photos, Catalog, Reports)"
                      >
                        <Film className="w-3.5 h-3.5 text-purple-600" />
                        <span>Inspect Assets</span>
                      </button>

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

                      {biz.status === "SUSPENDED" ? (
                        <button
                          onClick={() => handleUnsuspendBusiness(biz.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                          title="Restore / Unsuspend Business"
                        >
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspendBusiness(biz.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                          title="Suspend Business"
                        >
                          Suspend
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteBusiness(biz.id, biz.name)}
                        className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                        title="Permanently Delete Business"
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

      {/* Location & Category Intelligence Tab */}
      {(activeTab === "ecosystem" || activeTab === "intelligence") && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>MOSA Intelligence Engine</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>Nationwide Location & Category Intelligence</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Automated cross-tabulation and density mapping of micro-businesses by administrative location (Sector & Cell) and structured 3-tier canonical taxonomy (Sector → Subcategory → Business Type).
                </p>
              </div>
              <button
                onClick={fetchAdminData}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors self-start sm:self-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
                <span>Refresh Metrics</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Sectors Monitored</span>
                <span className="text-2xl font-black text-slate-900">{Object.keys(computedLocationBreakdown).length}</span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Official Administrative Sectors</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Classified Establishments</span>
                <span className="text-2xl font-black text-emerald-700">{businesses.length}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">100% Normalized in PostgreSQL</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Economic Sectors</span>
                <span className="text-2xl font-black text-slate-900">{CANONICAL_TAXONOMY.length}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Tier 1 Macro Categories</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Business Types</span>
                <span className="text-2xl font-black text-slate-900">{Object.keys(ALL_BUSINESS_TYPES).length}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Tier 3 Specific Types</span>
              </div>
            </div>
          </div>

          {/* Sector-by-Sector Breakdown Cards */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Location Cluster Analysis (Sector → Categories → Types)</span>
            </h4>

            {Object.keys(computedLocationBreakdown).length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500">
                No location aggregation records found.
              </div>
            ) : (
              Object.entries(computedLocationBreakdown).map(([sectorName, data]: [string, any]) => (
                <div key={sectorName} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  
                  {/* Sector Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          <span>{sectorName} Sector</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold font-mono">
                            {data.total} Businesses
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          {data.province || "Kigali City"} Province • {data.district || "Nyarugenge"} District
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDistrict(data.district || "all");
                        setSelectedSector(sectorName);
                        setActiveTab("businesses");
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-center"
                    >
                      <span>Explore {sectorName} Directory</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Category Breakdown (e.g. Kacyiru: Salons: 32, Food & Groceries: 47, Restaurants: 21...) */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Dominant Sectors & Domains ({Object.keys(data.categories || {}).length} categories)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(data.categories || {}).map(([catKey, count]: [string, any]) => {
                        const catDef = ALL_MAIN_CATEGORIES[catKey];
                        return (
                          <div 
                            key={catKey} 
                            onClick={() => {
                              setSelectedSector(sectorName);
                              setSelectedMainCategory(catKey);
                              setActiveTab("businesses");
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs transition-colors cursor-pointer"
                            title={`Filter ${sectorName} businesses in ${catDef?.name || catKey}`}
                          >
                            <span className="font-semibold text-slate-700">{catDef?.name || catKey.replace(/_/g, " ")}:</span>
                            <span className="font-bold text-emerald-800 px-1.5 py-0.5 rounded-md bg-emerald-100 font-mono text-xs">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Business Types Breakdown */}
                  {data.businessTypes && Object.keys(data.businessTypes).length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Specific Business Types Breakdown
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(data.businessTypes).map(([typeKey, count]: [string, any]) => {
                          const typeDef = ALL_BUSINESS_TYPES[typeKey];
                          return (
                            <div key={typeKey} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs">
                              <span className="text-slate-700 font-medium">
                                {typeDef?.name || typeKey.replace(/_/g, " ")}:
                              </span>
                              <strong className="text-emerald-900 font-bold font-mono">{count}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cell Breakdown */}
                  {data.cells && Object.keys(data.cells).length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Administrative Cells Distribution
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(data.cells).map(([cellName, count]: [string, any]) => (
                          <div 
                            key={cellName} 
                            onClick={() => {
                              setSelectedSector(sectorName);
                              setSelectedCell(cellName);
                              setActiveTab("businesses");
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 transition-colors cursor-pointer"
                            title={`Filter businesses in ${cellName} cell`}
                          >
                            <span>{cellName}:</span>
                            <strong className="font-mono font-bold text-slate-900">{count}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pending Applications Tab */}
      {(activeTab === "verification" || activeTab === "pending_applications") && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <span>Pending Verification Applications</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Self-registered businesses awaiting admin ground verification, review, or revisions.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              {businesses.filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION").length} in queue
            </span>
          </div>

          <div className="space-y-3">
            {businesses.filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION").length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                🎉 No pending applications! All registered businesses have been processed.
              </div>
            ) : (
              businesses
                .filter((b: any) => b.status === "PENDING" || b.status === "NEEDS_CORRECTION")
                .map((biz: any) => (
                  <div
                    key={biz.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-slate-900">{biz.name}</span>
                        {biz.status === "PENDING" ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                            Pending Verification
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                            Corrections Requested
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-semibold">
                          {biz.categoryDisplay || biz.category}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-0.5">
                        <div>
                          <strong>Owner:</strong> {biz.owner?.name || "Self-Registered Owner"} • <span className="font-mono text-slate-800">{biz.phone}</span>
                        </div>
                        <div>
                          <strong>Location:</strong> {biz.nearestLandmark ? `Near ${biz.nearestLandmark}` : "No landmark specified"} • {biz.location?.cell}, {biz.location?.sector}, {biz.location?.district}
                        </div>
                        {biz.products && biz.products.length > 0 && (
                          <div className="text-[11px] text-slate-500 pt-0.5">
                            Products ({biz.products.length}): {biz.products.slice(0, 3).map((p: any) => `${p.name} (${p.price?.toLocaleString()} RWF)`).join(", ")}
                            {biz.products.length > 3 && ` +${biz.products.length - 3} more`}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center flex-wrap">
                      <button
                        onClick={() => {
                          setReviewingBiz(biz);
                          setReviewAction(null);
                          setAdminNotes("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Review Application</span>
                      </button>
                      <button
                        onClick={() => handleVerifyAndApprove(biz.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verify & Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          setReviewingBiz(biz);
                          setReviewAction("CORRECTIONS");
                          setAdminNotes("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Request Corrections</span>
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Moderation Tab: Platform Integrity & Content Governance */}
      {activeTab === "moderation" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-slate-900 text-lg">Platform Content Moderation & Integrity</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Governance center for short business showcase videos (≤ 60s), storefront photos, and community complaints.
                  Business owners independently manage their content, while administrators retain underlying authority to enforce commercial rules and community safety.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchModerationData();
                    fetchAdminData();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Queue</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: "ALL", label: "All Items", count: moderationOpenReports.length + moderationFlaggedMedia.length + moderationUpdates.length + moderationOpportunities.length },
                { id: "VIDEO", label: "Short Videos", count: moderationFlaggedMedia.filter(m => m.mediaType === "VIDEO").length },
                { id: "PHOTO", label: "Photos", count: moderationFlaggedMedia.filter(m => m.mediaType === "IMAGE").length },
                { id: "PRODUCT", label: "Reports", count: moderationOpenReports.length },
                { id: "UPDATE", label: "Updates", count: moderationUpdates.length },
                { id: "OPPORTUNITY", label: "Opportunities", count: moderationOpportunities.length },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setModerationFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    moderationFilter === f.id
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    moderationFilter === f.id ? "bg-purple-700 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Flagged Showcase Videos & Media */}
          {(moderationFilter === "ALL" || moderationFilter === "VIDEO" || moderationFilter === "PHOTO") && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Flagged Business Media & Videos ({
                      moderationFilter === "ALL" 
                        ? moderationFlaggedMedia.length 
                        : moderationFlaggedMedia.filter(m => m.mediaType === (moderationFilter === "VIDEO" ? "VIDEO" : "IMAGE")).length
                    })
                  </h4>
                </div>
              </div>

              {moderationFlaggedMedia.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No flagged media requiring moderation. All videos and photos comply with MOSA commercial standards.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moderationFlaggedMedia
                    .filter(m => moderationFilter === "ALL" || m.mediaType === (moderationFilter === "VIDEO" ? "VIDEO" : "IMAGE"))
                    .map((media) => (
                      <div
                        key={media.id}
                        className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 flex items-center justify-center">
                              {media.mediaType === "VIDEO" ? (
                                <>
                                  <div className="w-full h-full flex items-center justify-center bg-purple-950 text-purple-300">
                                    <Video className="w-6 h-6" />
                                  </div>
                                  <button
                                    onClick={() => setActivePreviewVideo(media)}
                                    className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                                  >
                                    <Play className="w-4 h-4 ml-0.5 fill-slate-900" />
                                  </button>
                                  {media.durationSec && (
                                    <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-black/80 text-white">
                                      {media.durationSec}s
                                    </span>
                                  )}
                                </>
                              ) : (
                                <img
                                  src={media.url}
                                  alt="Flagged media"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  media.mediaType === "VIDEO" ? "bg-purple-100 text-purple-800" : "bg-emerald-100 text-emerald-800"
                                }`}>
                                  {media.mediaType}
                                </span>
                                {media.topic && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                                    {media.topic}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                  {media.moderationStatus}
                                </span>
                              </div>

                              <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-2">
                                {media.caption || "No caption provided"}
                              </p>

                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                <span className="font-bold text-slate-700">{media.business?.name || "Unknown Business"}</span>
                                <span>•</span>
                                <span>{media.business?.sector || "Rwanda"}</span>
                              </div>
                            </div>
                          </div>

                          {media.moderationReason && (
                            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                              Flag Note: {media.moderationReason}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                          <button
                            onClick={() => handleInspectBusinessContent(media.businessId)}
                            className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Owner</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExecuteModerationAction("APPROVE_MEDIA", media.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setModerationActionModal({
                                open: true,
                                action: "REMOVE_MEDIA",
                                targetId: media.id,
                                targetType: "MEDIA",
                                title: `Remove ${media.mediaType === "VIDEO" ? "Video" : "Photo"} from Public MOSA`,
                              })}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Open User Reports */}
          {(moderationFilter === "ALL" || moderationFilter === "PRODUCT") && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Open Community Reports ({moderationOpenReports.length})
                  </h4>
                </div>
              </div>

              {moderationOpenReports.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No open user reports filed. Community data accuracy is intact.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {moderationOpenReports.map((report) => (
                    <div
                      key={report.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-900">
                            {report.business?.name || "Reported Business"}
                          </span>
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                            {report.reason?.replace(/_/g, " ") || "Complaint"}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                            Target: {report.targetType || "BUSINESS"}
                          </span>
                        </div>

                        {report.details && (
                          <p className="text-xs text-slate-600 italic">
                            &ldquo;{report.details}&rdquo;
                          </p>
                        )}

                        <div className="text-[11px] text-slate-400">
                          Reported: {new Date(report.createdAt).toLocaleString()} • Contact: {report.contactPhone || "Anonymous"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {report.businessId && (
                          <button
                            onClick={() => handleInspectBusinessContent(report.businessId)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Film className="w-3.5 h-3.5 text-purple-600" />
                            <span>Inspect Assets</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleExecuteModerationAction("DISMISS_REPORT", report.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Business Updates Moderation */}
          {(moderationFilter === "ALL" || moderationFilter === "UPDATE") && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Business Updates & Announcements ({moderationUpdates.length})
                  </h4>
                </div>
              </div>

              {moderationUpdates.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No business updates posted yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {moderationUpdates.map((update: any) => (
                    <div key={update.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{update.title}</span>
                          {update.titleRw && <span className="text-xs text-slate-400">({update.titleRw})</span>}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                            {update.type?.replace(/_/g, " ")}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            (update.status === "ACTIVE" && update.moderationStatus !== "REMOVED")
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {(update.status === "ACTIVE" && update.moderationStatus !== "REMOVED") ? "Active / Public" : "Deactivated"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{update.content}</p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="font-semibold text-slate-600">{update.business?.name || "Business"}</span>
                          <span>•</span>
                          <span>{update.business?.sector || "Rwanda"}</span>
                          <span>•</span>
                          <span>Posted {new Date(update.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {update.businessId && (
                          <button
                            onClick={() => handleInspectBusinessContent(update.businessId)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        )}
                        {(update.status === "ACTIVE" && update.moderationStatus !== "REMOVED") ? (
                          <button
                            onClick={() => setModerationActionModal({
                              open: true,
                              action: "REMOVE_UPDATE",
                              targetId: update.id,
                              targetType: "UPDATE",
                              title: `Deactivate Update: ${update.title}`,
                            })}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExecuteModerationAction("APPROVE_UPDATE", update.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Business Opportunities Moderation */}
          {(moderationFilter === "ALL" || moderationFilter === "OPPORTUNITY") && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Business Opportunities & Hiring ({moderationOpportunities.length})
                  </h4>
                </div>
              </div>

              {moderationOpportunities.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No business opportunities posted yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {moderationOpportunities.map((opp: any) => (
                    <div key={opp.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{opp.title}</span>
                          {opp.titleRw && <span className="text-xs text-slate-400">({opp.titleRw})</span>}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                            {opp.type?.replace(/_/g, " ")}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            opp.status === "OPEN"
                              ? "bg-emerald-100 text-emerald-800"
                              : opp.status === "PAUSED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {opp.status}
                          </span>
                          {opp._count?.inquiries > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              {opp._count.inquiries} Applicants
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{opp.description}</p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-600">{opp.business?.name || "Business"}</span>
                          {opp.compensation && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-semibold">{opp.compensation}</span>
                            </>
                          )}
                          {opp.deadline && (
                            <>
                              <span>•</span>
                              <span>Deadline: {new Date(opp.deadline).toLocaleDateString()}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Posted {new Date(opp.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {opp.businessId && (
                          <button
                            onClick={() => handleInspectBusinessContent(opp.businessId)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        )}
                        {opp.status !== "CLOSED" ? (
                          <button
                            onClick={() => setModerationActionModal({
                              open: true,
                              action: "REMOVE_OPPORTUNITY",
                              targetId: opp.id,
                              targetType: "OPPORTUNITY",
                              title: `Close Opportunity: ${opp.title}`,
                            })}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExecuteModerationAction("APPROVE_OPPORTUNITY", opp.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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

      {/* Users & Roles Management Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Users &amp; Roles Management</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage platform access, assign administrator or agent privileges, and supervise user accounts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchUsersList}
                disabled={isUsersLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUsersLoading ? "animate-spin" : ""}`} />
                <span>Refresh Users</span>
              </button>
              <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                {usersList.length} Accounts
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone number..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") fetchUsersList(); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="COMMUNITY_ADMIN">COMMUNITY_ADMIN</option>
                <option value="COMMUNITY_AGENT">COMMUNITY_AGENT</option>
                <option value="BUSINESS_OWNER">BUSINESS_OWNER</option>
                <option value="CUSTOMER">CUSTOMER</option>
              </select>
              <button
                onClick={fetchUsersList}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>

          {/* Users Table */}
          {isUsersLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              Loading platform accounts...
            </div>
          ) : usersList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No users matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">User &amp; Identity</th>
                    <th className="py-3 px-3">Contact Details</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Platform Activity</th>
                    <th className="py-3 px-3">Joined</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                            {u.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            {u.mustChangePassword && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                Temp Password
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          {u.email && <div className="text-slate-800 font-mono text-[11px]">{u.email}</div>}
                          {u.phone && <div className="text-slate-500 font-mono text-[11px]">{u.phone}</div>}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="COMMUNITY_ADMIN">COMMUNITY_ADMIN</option>
                          <option value="COMMUNITY_AGENT">COMMUNITY_AGENT</option>
                          <option value="BUSINESS_OWNER">BUSINESS_OWNER</option>
                          <option value="CUSTOMER">CUSTOMER</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === "ACTIVE" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {u.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {u._count?.businessesOwned ? `${u._count.businessesOwned} businesses` : "0 businesses"}
                        {u._count?.captures ? ` • ${u._count.captures} captures` : ""}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status || "ACTIVE")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            u.status === "SUSPENDED"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          }`}
                        >
                          {u.status === "SUSPENDED" ? "Activate" : "Suspend"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings & Security Tab */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Change Administrator Password */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                <span>Change Administrator Password</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your administrative credentials. Enforces bcrypt 12-round salted hashing.
              </p>
            </div>

            {passwordChangeMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                passwordChangeMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {passwordChangeMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{passwordChangeMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password (min 8 characters)</label>
                <input
                  type="password"
                  required
                  placeholder="Enter strong new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={passwordChangeLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {passwordChangeLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>

          {/* Card 2: Current Administrator Session & Security Architecture */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Active Administrator Session</h4>
                  <p className="text-xs text-slate-500">Currently authenticated staff profile</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Account Name:</span>
                  <span className="font-bold text-slate-900">{user?.name || "System Administrator"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Staff Email / Phone:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {user?.phone?.includes("@") ? user.phone : "admin@mosa.rw"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Authority Role:</span>
                  <span className="font-mono font-bold text-emerald-700">{user?.role || "SUPER_ADMIN"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Environment:</span>
                  <span className="font-bold text-slate-700">Neon PostgreSQL (Production)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to sign out of the MOSA Command Center?")) {
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/admin/login";
                    }
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Sign Out of Command Center
                </button>
              </div>
            </div>

            {/* Platform Safeguards */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">Platform Safeguards Active</h4>
              </div>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Strict Server-Side RBAC: Customer and Business Owner roles are completely denied access to /admin.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Tenant Isolation: Business owners only see their own metrics and can never manipulate other records.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Mandatory First-Login Password Change enforced for all newly provisioned administrators.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Partner Announcements Automation Tab */}
      {activeTab === "announcements" && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Megaphone className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">Partner Announcements Automation</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
                      Live Broadcast
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Broadcast official announcements, governance directives, and operational notices to business owners across Rwanda.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchAnnouncements}
                disabled={isAnnouncementsLoading}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnnouncementsLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleOpenCreateAnnouncementModal}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Announcement</span>
              </button>
            </div>
          </div>

          {/* Metric KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{announcementStats.total}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">All announcements</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-card">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Dispatched</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{announcementStats.sent}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Delivered to inboxes</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-card">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Scheduled</div>
              <div className="text-2xl font-black text-blue-700 mt-1">{announcementStats.scheduled}</div>
              <div className="text-[10px] text-blue-600 mt-0.5">Pending auto-dispatch</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-card">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Drafts</div>
              <div className="text-2xl font-black text-amber-700 mt-1">{announcementStats.drafts}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Unsent compositions</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archived</div>
              <div className="text-2xl font-black text-slate-600 mt-1">{announcementStats.archived}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Past communications</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-card">
              <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Total Reach</div>
              <div className="text-2xl font-black text-purple-700 mt-1">{announcementStats.totalReach}</div>
              <div className="text-[10px] text-purple-600 mt-0.5">Owner deliveries</div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
              {(["ALL", "SENT", "SCHEDULED", "DRAFT", "ARCHIVED"] as const).map((filter) => {
                const count = filter === "ALL" ? announcements.length : announcements.filter((a) => a.status === filter).length;
                const isActive = announcementFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setAnnouncementFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <span>{filter === "ALL" ? "All Announcements" : filter.charAt(0) + filter.slice(1).toLowerCase()}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-slate-700 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={announcementSearch}
                onChange={(e) => setAnnouncementSearch(e.target.value)}
                placeholder="Search announcements..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Announcements List */}
          <div className="space-y-3">
            {announcements
              .filter((a) => {
                if (announcementFilter !== "ALL" && a.status !== announcementFilter) return false;
                if (!announcementSearch.trim()) return true;
                const q = announcementSearch.toLowerCase();
                return (
                  a.title?.toLowerCase().includes(q) ||
                  a.titleRw?.toLowerCase().includes(q) ||
                  a.message?.toLowerCase().includes(q) ||
                  a.targetType?.toLowerCase().includes(q) ||
                  a.targetCategory?.toLowerCase().includes(q) ||
                  a.targetDistrict?.toLowerCase().includes(q)
                );
              })
              .length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">No announcements found</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {announcementFilter === "ALL"
                      ? "Create your first partner announcement to communicate directly with business owners."
                      : `No announcements matching filter "${announcementFilter}".`}
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateAnnouncementModal}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Announcement</span>
                </button>
              </div>
            ) : (
              announcements
                .filter((a) => {
                  if (announcementFilter !== "ALL" && a.status !== announcementFilter) return false;
                  if (!announcementSearch.trim()) return true;
                  const q = announcementSearch.toLowerCase();
                  return (
                    a.title?.toLowerCase().includes(q) ||
                    a.titleRw?.toLowerCase().includes(q) ||
                    a.message?.toLowerCase().includes(q) ||
                    a.targetType?.toLowerCase().includes(q) ||
                    a.targetCategory?.toLowerCase().includes(q) ||
                    a.targetDistrict?.toLowerCase().includes(q)
                  );
                })
                .map((ann) => {
                  const isSent = ann.status === "SENT";
                  const isScheduled = ann.status === "SCHEDULED";
                  const isDraft = ann.status === "DRAFT";
                  const isArchived = ann.status === "ARCHIVED";

                  let targetLabel = "All Business Owners";
                  if (ann.targetType === "CATEGORY") {
                    targetLabel = `Category: ${ALL_MAIN_CATEGORIES[ann.targetCategory]?.name || ann.targetCategory || "Selected Category"}`;
                  } else if (ann.targetType === "LOCATION") {
                    targetLabel = `District: ${ann.targetDistrict || "Selected District"}`;
                  } else if (ann.targetType === "SELECTED_BUSINESSES") {
                    let count = 0;
                    try {
                      count = JSON.parse(ann.targetBusinessIds || "[]").length;
                    } catch {
                      count = (ann.targetBusinessIds || "").split(",").filter(Boolean).length;
                    }
                    targetLabel = `Specific: ${count} Selected Businesses`;
                  }

                  return (
                    <div
                      key={ann.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isSent && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              DISPATCHED
                            </span>
                          )}
                          {isScheduled && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600" />
                              SCHEDULED
                            </span>
                          )}
                          {isDraft && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Edit3 className="w-3 h-3 text-amber-600" />
                              DRAFT
                            </span>
                          )}
                          {isArchived && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                              <Archive className="w-3 h-3 text-slate-500" />
                              ARCHIVED
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-slate-500" />
                            {targetLabel}
                          </span>

                          <span className="text-[10px] text-slate-400 font-mono">
                            Created {new Date(ann.createdAt).toLocaleDateString()} {new Date(ann.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {(isDraft || isScheduled) && (
                            <button
                              onClick={() => handleSendNowDirect(ann)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Send Now</span>
                            </button>
                          )}
                          {(isDraft || isScheduled) && (
                            <button
                              onClick={() => handleOpenEditAnnouncementModal(ann)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                          {!isArchived && (
                            <button
                              onClick={() => handleArchiveDirect(ann)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                              title="Archive"
                            >
                              <Archive className="w-3 h-3" />
                            </button>
                          )}
                          {(isDraft || isArchived) && (
                            <button
                              onClick={() => handleDeleteAnnouncementDirect(ann)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-black text-slate-900 text-base">{ann.title}</h4>
                        {ann.titleRw && (
                          <div className="text-xs font-semibold text-slate-500 italic mt-0.5">
                            {ann.titleRw}
                          </div>
                        )}
                        <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {ann.message}
                        </p>
                        {ann.messageRw && (
                          <p className="text-xs text-slate-600 italic mt-1 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            {ann.messageRw}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        <div className="flex items-center gap-3">
                          {ann.author && (
                            <span>Author: <strong className="text-slate-700">{ann.author.name}</strong> ({ann.author.role})</span>
                          )}
                          {isSent && (
                            <span className="text-emerald-700 font-bold">
                              ✓ Dispatched to {ann.totalRecipients} business owner(s) on {ann.sentAt ? new Date(ann.sentAt).toLocaleString() : "N/A"}
                            </span>
                          )}
                          {isScheduled && ann.scheduledAt && (
                            <span className="text-blue-700 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Auto-dispatch scheduled for {new Date(ann.scheduledAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Modal: Partner Announcement Creation & Editing */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Megaphone className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {editingAnnouncementId ? "Edit Partner Announcement" : "Create Partner Announcement"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Broadcast official notifications to targeted business owner dashboards in PostgreSQL.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnnouncementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {announcementActionMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold mt-4 ${
                  announcementActionMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {announcementActionMsg.text}
              </div>
            )}

            <div className="space-y-4 pt-4 text-xs">
              {/* Title Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Announcement Title (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    placeholder="e.g. Critical Platform Verification Update"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Title (Kinyarwanda) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={announcementForm.titleRw}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, titleRw: e.target.value })}
                    placeholder="e.g. Iteganyamikorere rishya rya MOSA"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Message Fields */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Announcement Message (English) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  placeholder="Type the full official announcement message that business owners will see in their dashboard..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:outline-emerald-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Message (Kinyarwanda) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={announcementForm.messageRw}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, messageRw: e.target.value })}
                  placeholder="Andika ubutumwa mu Kinyarwanda (niba bibonetse)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:outline-emerald-500 leading-relaxed"
                />
              </div>

              {/* Targeting Options */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-black text-slate-900 block text-xs">
                  Target Audience / Abagenerwa
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "ALL", label: "All Business Owners", desc: "Broadcast across all registered businesses" },
                    { id: "CATEGORY", label: "By Business Category", desc: "Filter by sector (e.g. Retail, Food, Services)" },
                    { id: "LOCATION", label: "By Rwanda District", desc: "Target specific geographic district" },
                    { id: "SELECTED_BUSINESSES", label: "Selected Businesses", desc: "Pick individual businesses manually" },
                  ].map((target) => {
                    const isSelected = announcementForm.targetType === target.id;
                    return (
                      <button
                        type="button"
                        key={target.id}
                        onClick={() => setAnnouncementForm({ ...announcementForm, targetType: target.id as any })}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                          <span>{target.label}</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{target.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-selectors depending on targetType */}
                {announcementForm.targetType === "CATEGORY" && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 mt-2">
                    <label className="font-bold text-slate-700 block text-xs">Select Category</label>
                    <select
                      value={announcementForm.targetCategory}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, targetCategory: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:outline-emerald-500"
                    >
                      <option value="">-- Choose Category --</option>
                      {categoryList.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.nameRw})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {announcementForm.targetType === "LOCATION" && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 mt-2">
                    <label className="font-bold text-slate-700 block text-xs">Select Rwanda District</label>
                    <select
                      value={announcementForm.targetDistrict}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, targetDistrict: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:outline-emerald-500"
                    >
                      <option value="">-- Choose District --</option>
                      {rwandaDistricts.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name} District ({d.province})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {announcementForm.targetType === "SELECTED_BUSINESSES" && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 block text-xs">
                        Select Businesses ({announcementForm.targetBusinessIds.length} selected)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (announcementForm.targetBusinessIds.length === businesses.length) {
                            setAnnouncementForm({ ...announcementForm, targetBusinessIds: [] });
                          } else {
                            setAnnouncementForm({ ...announcementForm, targetBusinessIds: businesses.map((b) => b.id) });
                          }
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:underline"
                      >
                        {announcementForm.targetBusinessIds.length === businesses.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={businessSearchInModal}
                      onChange={(e) => setBusinessSearchInModal(e.target.value)}
                      placeholder="Search businesses by name, sector, or category..."
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-xl bg-white p-2">
                      {businesses
                        .filter((b) => {
                          if (!businessSearchInModal.trim()) return true;
                          const q = businessSearchInModal.toLowerCase();
                          return b.name.toLowerCase().includes(q) || (b.category || "").toLowerCase().includes(q) || (b.location?.district || "").toLowerCase().includes(q);
                        })
                        .map((b) => {
                          const isChecked = announcementForm.targetBusinessIds.includes(b.id);
                          return (
                            <label
                              key={b.id}
                              className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAnnouncementForm({
                                        ...announcementForm,
                                        targetBusinessIds: [...announcementForm.targetBusinessIds, b.id],
                                      });
                                    } else {
                                      setAnnouncementForm({
                                        ...announcementForm,
                                        targetBusinessIds: announcementForm.targetBusinessIds.filter((id) => id !== b.id),
                                      });
                                    }
                                  }}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-semibold text-slate-800">{b.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {b.categoryDisplay || b.category} • {b.location?.district || "Rwanda"}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Live Estimated Audience Banner */}
                <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-purple-900 font-bold">
                    <Users className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Estimated Audience Reach:</span>
                  </div>
                  <div className="text-sm font-black text-purple-700 bg-white px-2.5 py-0.5 rounded-lg border border-purple-200 shadow-xs">
                    ~{estimatedReachCount} business owner(s)
                  </div>
                </div>
              </div>

              {/* Delivery Timing */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-black text-slate-900 block text-xs">
                  Delivery Action / Igikorwa
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "SEND_NOW", label: "Send Now", desc: "Dispatch immediately to inboxes" },
                    { id: "SCHEDULE", label: "Schedule", desc: "Automatic delivery at future date" },
                    { id: "DRAFT", label: "Save Draft", desc: "Keep draft without sending" },
                  ].map((act) => {
                    const isSelected = announcementForm.action === act.id;
                    return (
                      <button
                        type="button"
                        key={act.id}
                        onClick={() => setAnnouncementForm({ ...announcementForm, action: act.id as any })}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                          <span>{act.label}</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{act.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {announcementForm.action === "SCHEDULE" && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5 mt-2">
                    <label className="font-bold text-blue-900 block text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Select Dispatch Date & Time</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={announcementForm.scheduledAt}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, scheduledAt: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:outline-blue-500"
                    />
                    <p className="text-[10px] text-blue-600">
                      MOSA will automatically deliver notifications to targeted business owners as soon as this time is reached.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  disabled={announcementSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitAnnouncement()}
                  disabled={announcementSubmitting}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-xs transition cursor-pointer ${
                    announcementForm.action === "SEND_NOW"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : announcementForm.action === "SCHEDULE"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  } ${announcementSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {announcementSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {announcementForm.action === "SEND_NOW" && <Send className="w-3.5 h-3.5" />}
                  {announcementForm.action === "SCHEDULE" && <Clock className="w-3.5 h-3.5" />}
                  {announcementForm.action === "DRAFT" && <Edit3 className="w-3.5 h-3.5" />}
                  <span>
                    {announcementSubmitting
                      ? "Processing..."
                      : announcementForm.action === "SEND_NOW"
                      ? "Send Announcement Now"
                      : announcementForm.action === "SCHEDULE"
                      ? "Schedule Announcement"
                      : "Save Announcement Draft"}
                  </span>
                </button>
              </div>
            </div>
          </div>
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

      {/* Modal: Review Business Application & Verification Decision */}
      {reviewingBiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    reviewingBiz.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : reviewingBiz.status === "NEEDS_CORRECTION"
                      ? "bg-amber-100 text-amber-800"
                      : reviewingBiz.status === "PENDING"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100 text-slate-800"
                  }`}>
                    {reviewingBiz.status === "NEEDS_CORRECTION" ? "Needs Correction" : reviewingBiz.status || "Pending Verification"}
                  </span>
                  <span className="text-xs font-medium text-slate-400">ID: {reviewingBiz.id.slice(0, 8)}...</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">{reviewingBiz.name}</h3>
                <p className="text-xs text-slate-500 capitalize">{reviewingBiz.category?.replace(/_/g, " ")} • Registered {new Date(reviewingBiz.createdAt).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => {
                  setReviewingBiz(null);
                  setReviewAction(null);
                  setAdminNotes("");
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5">
              {/* Left Column: Application Details (7 cols) */}
              <div className="md:col-span-7 space-y-4 text-xs">
                {/* Owner Information */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Business Owner & Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Owner Name</span>
                      <span className="font-bold">{reviewingBiz.owner?.name || reviewingBiz.ownerName || "Micro-Business Owner"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone</span>
                      <span className="font-mono font-bold text-slate-900">{reviewingBiz.phone || "None"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">WhatsApp</span>
                      <span className="font-mono text-slate-800">{reviewingBiz.whatsapp || reviewingBiz.phone || "Same as Phone"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Claim / Registration Status</span>
                      <span className="font-semibold text-emerald-700">{reviewingBiz.isClaimed ? "Owner Claimed" : "Owner Registered"}</span>
                    </div>
                  </div>
                  {reviewingBiz.description && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Description</span>
                      <p className="text-slate-600 mt-0.5">{reviewingBiz.description}</p>
                    </div>
                  )}
                </div>

                {/* 3-Tier Classification */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    Structured Category Classification
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">1. Main Sector</span>
                      <span className="font-bold text-slate-900">
                        {ALL_MAIN_CATEGORIES[reviewingBiz.mainCategory || reviewingBiz.category]?.name || reviewingBiz.category}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">2. Subcategory</span>
                      <span className="font-medium text-slate-800">
                        {ALL_SUBCATEGORIES[reviewingBiz.subCategory]?.name || reviewingBiz.subCategory || "General"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">3. Business Type</span>
                      <span className="font-bold text-emerald-700">
                        {ALL_BUSINESS_TYPES[reviewingBiz.businessType]?.name || reviewingBiz.businessTypeDisplay || reviewingBiz.businessType || "Standard"}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60 flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <span>Taxonomy ID:</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-700">
                      {reviewingBiz.mainCategory || reviewingBiz.category} &rarr; {reviewingBiz.subCategory || "n/a"} &rarr; {reviewingBiz.businessType || "n/a"}
                    </span>
                  </div>
                </div>

                {/* Smart Location */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Smart Location & Ground Discovery
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Province / District</span>
                      <span className="font-medium">{reviewingBiz.location?.province || reviewingBiz.province || "Kigali City"} / {reviewingBiz.location?.district || reviewingBiz.district || "Nyarugenge"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sector / Cell</span>
                      <span className="font-medium">{reviewingBiz.location?.sector || reviewingBiz.sector} / {reviewingBiz.location?.cell || reviewingBiz.cell}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nearest Landmark</span>
                      <span className="font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                        📍 {reviewingBiz.nearestLandmark || reviewingBiz.location?.nearestLandmark || "Not Specified"}
                      </span>
                    </div>
                    {(reviewingBiz.location?.addressNote || reviewingBiz.locationDescription) && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Walking Directions</span>
                        <p className="text-slate-700 italic mt-0.5">{reviewingBiz.location?.addressNote || reviewingBiz.locationDescription}</p>
                      </div>
                    )}
                    <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">GPS Coordinates:</span>
                      <span className="font-mono text-slate-800 font-bold">
                        {reviewingBiz.location?.coordinates?.lat?.toFixed(5) || reviewingBiz.latitude?.toFixed(5) || "-1.98100"}, {reviewingBiz.location?.coordinates?.lng?.toFixed(5) || reviewingBiz.longitude?.toFixed(5) || "30.04600"}
                      </span>
                      {reviewingBiz.location?.accuracy && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ±{Math.round(reviewingBiz.location.accuracy)}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Offerings Catalogue */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      Offerings & Products ({reviewingBiz.products?.length || 0})
                    </h4>
                  </div>
                  {reviewingBiz.products && reviewingBiz.products.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {reviewingBiz.products.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                          <span className="font-medium text-slate-800">{p.name}</span>
                          <span className="font-bold text-emerald-700 font-mono">
                            {p.price > 0 ? `${p.price.toLocaleString()} RWF` : "Price on Request"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No specific products submitted.</p>
                  )}
                </div>

                {/* Photo Preview if available */}
                {reviewingBiz.coverImage && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-2">Storefront / Visual Reference</span>
                    <img
                      src={reviewingBiz.coverImage}
                      alt={reviewingBiz.name}
                      className="w-full h-36 object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}

                {/* Media & Showcase Assets (Photos & Videos) */}
                {reviewingBiz.media && reviewingBiz.media.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-purple-600" />
                      Submitted Media &amp; Showcase ({reviewingBiz.media.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {reviewingBiz.media.map((m: any, idx: number) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video">
                          {m.mediaType === "VIDEO" ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <video src={m.url} className="w-full h-full object-cover" controls preload="metadata" />
                              <span className="absolute top-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded font-bold">
                                VIDEO
                              </span>
                            </div>
                          ) : (
                            <img src={m.url} alt={m.caption || "Business media"} className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Past Notes & Decision Action Panel (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                {/* Past Verification / Correction History */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mb-2">
                    <History className="w-4 h-4 text-slate-600" />
                    Verification History
                  </h4>
                  {reviewingBiz.verifications && reviewingBiz.verifications.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {reviewingBiz.verifications.map((v: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 capitalize text-[11px]">{v.type?.replace(/_/g, " ")}</span>
                            <span className="text-[10px] text-slate-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                          </div>
                          {v.notes && <p className="text-slate-600 text-[11px]">{v.notes}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No prior verification records for this business.</p>
                  )}
                </div>

                {/* Verification Decision Panel */}
                <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500/30 shadow-sm space-y-3">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Admin Verification Decision
                  </h4>
                  <p className="text-xs text-slate-500">
                    Review the ground accuracy of this micro-business before publishing to the live discovery engine.
                  </p>

                  {/* Decision Selector Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction("APPROVE")}
                      className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                        reviewAction === "APPROVE"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction("CORRECTIONS")}
                      className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                        reviewAction === "CORRECTIONS"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      Corrections
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction("REJECT")}
                      className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                        reviewAction === "REJECT"
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>

                  {/* Contextual Form according to selected action */}
                  {reviewAction === "APPROVE" && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-xs font-bold text-slate-800 block">
                        Approval Notes & Audit Log (Optional)
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="e.g. Ground location verified via landmark. Approved for public discovery."
                        rows={2}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
                      />
                      <button
                        type="button"
                        disabled={isActionSubmitting}
                        onClick={() => handleVerifyAndApprove(reviewingBiz.id, adminNotes)}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isActionSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Confirm & Publish Business
                      </button>
                    </div>
                  )}

                  {reviewAction === "CORRECTIONS" && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-xs font-bold text-amber-900 block">
                        Correction Instructions for Owner (Required) *
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="e.g. Please provide a more specific landmark and clarify your opening hours or prices."
                        rows={3}
                        required
                        className="w-full p-2.5 rounded-xl border border-amber-300 text-xs bg-amber-50/50 focus:bg-white focus:border-amber-500"
                      />
                      <button
                        type="button"
                        disabled={isActionSubmitting || !adminNotes.trim()}
                        onClick={() => handleRequestCorrections(reviewingBiz.id, adminNotes)}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isActionSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                        Send Correction Request to Owner
                      </button>
                    </div>
                  )}

                  {reviewAction === "REJECT" && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-xs font-bold text-rose-900 block">
                        Reason for Rejection (Required) *
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="e.g. Fraudulent submission or duplicate business entity."
                        rows={3}
                        required
                        className="w-full p-2.5 rounded-xl border border-rose-300 text-xs bg-rose-50/50 focus:bg-white focus:border-rose-500"
                      />
                      <button
                        type="button"
                        disabled={isActionSubmitting || !adminNotes.trim()}
                        onClick={() => handleRejectBusiness(reviewingBiz.id, adminNotes)}
                        className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isActionSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Confirm Rejection
                      </button>
                    </div>
                  )}

                  {!reviewAction && (
                    <p className="text-xs text-slate-400 italic text-center py-2">
                      Select an action above to proceed with verification.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN VIDEO PREVIEW PLAYER */}
      {activePreviewVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-sm">{activePreviewVideo.caption || "Business Showcase Video"}</span>
              </div>
              <button
                onClick={() => setActivePreviewVideo(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video
                controls
                autoPlay
                src={activePreviewVideo.url}
                className="w-full h-full object-contain"
              >
                Your browser does not support HTML5 video.
              </video>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                {activePreviewVideo.topic && (
                  <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-semibold uppercase">
                    {activePreviewVideo.topic}
                  </span>
                )}
                {activePreviewVideo.durationSec && (
                  <span>Duration: {activePreviewVideo.durationSec}s (max 60s)</span>
                )}
              </div>
              <div>
                Status: <span className="font-bold text-emerald-400">{activePreviewVideo.moderationStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MODERATION ACTION CONFIRMATION & REASON */}
      {moderationActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-900 text-sm">{moderationActionModal.title}</h3>
              </div>
              <button
                onClick={() => {
                  setModerationActionModal(null);
                  setModerationActionReason("");
                }}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Specify the moderation violation reason. This will be recorded in the persistent Audit Log and delivered as an official notification to the business owner.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Removal / Action</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Video exceeds 60s maximum limit, or content is unrelated to commercial business operations."
                value={moderationActionReason}
                onChange={(e) => setModerationActionReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setModerationActionModal(null);
                  setModerationActionReason("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteModerationAction(
                  moderationActionModal.action,
                  moderationActionModal.targetId,
                  moderationActionReason.trim() || "Policy compliance removal"
                )}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ON-DEMAND BUSINESS CONTENT INSPECTION DRAWER */}
      {inspectingBizContent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-black text-slate-900">{inspectingBizContent.business.name}</h3>
                  <VerificationBadge status={inspectingBizContent.business.verificationStatus} />
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                    {inspectingBizContent.business.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  On-demand content inspection: {inspectingBizContent.business.location?.sector || inspectingBizContent.business.sector}, {inspectingBizContent.business.location?.cell || inspectingBizContent.business.cell} • Phone: {inspectingBizContent.business.phone}
                </p>
              </div>

              <button
                onClick={() => setInspectingBizContent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Short Showcase Videos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-600" />
                  <h4 className="font-bold text-sm text-slate-800">
                    Short Business Showcase Videos ({inspectingBizContent.videos?.length || 0})
                  </h4>
                </div>
              </div>

              {(!inspectingBizContent.videos || inspectingBizContent.videos.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 text-center">
                  No short videos uploaded by this business.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {inspectingBizContent.videos.map((vid: any) => (
                    <div
                      key={vid.id}
                      className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between p-3 space-y-2"
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                        <Video className="w-8 h-8 text-purple-300/70" />
                        <button
                          onClick={() => setActivePreviewVideo(vid)}
                          className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Play className="w-4 h-4 ml-0.5 fill-slate-900" />
                        </button>
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-black/80 text-white">
                            {vid.durationSec}s
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-600 text-white uppercase">
                            {vid.topic}
                          </span>
                        </div>
                        <span className={`absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          vid.moderationStatus === "APPROVED" ? "bg-emerald-600 text-white" : vid.moderationStatus === "REMOVED" ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                        }`}>
                          {vid.moderationStatus}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                        {vid.caption || "Showcase clip"}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                        <span className="text-[10px] text-slate-400">{vid.viewsCount || 0} views</span>
                        <div className="flex items-center gap-1.5">
                          {vid.moderationStatus !== "APPROVED" && (
                            <button
                              onClick={() => handleExecuteModerationAction("APPROVE_MEDIA", vid.id)}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {vid.moderationStatus !== "REMOVED" && (
                            <button
                              onClick={() => setModerationActionModal({
                                open: true,
                                action: "REMOVE_MEDIA",
                                targetId: vid.id,
                                targetType: "MEDIA",
                                title: "Remove Video from Public Website",
                              })}
                              className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Photos */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-800">
                    Storefront & Gallery Photos ({inspectingBizContent.photos?.length || 0})
                  </h4>
                </div>
              </div>

              {(!inspectingBizContent.photos || inspectingBizContent.photos.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 text-center">
                  No photos uploaded by this business.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {inspectingBizContent.photos.map((photo: any) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-xl border border-slate-200 overflow-hidden aspect-square bg-slate-100"
                    >
                      <img src={photo.url} alt="Photo" className="w-full h-full object-cover" />
                      {photo.isCover && (
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-black">
                          Cover
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-white text-xs">
                        <span className="text-[10px] font-semibold line-clamp-2">{photo.caption || "No caption"}</span>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleExecuteModerationAction("APPROVE_MEDIA", photo.id)}
                            className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]"
                          >
                            Keep
                          </button>
                          <button
                            onClick={() => setModerationActionModal({
                              open: true,
                              action: "REMOVE_MEDIA",
                              targetId: photo.id,
                              targetType: "MEDIA",
                              title: "Remove Photo from Public Gallery",
                            })}
                            className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Products & Services */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-800">
                    Products & Catalogue Items ({inspectingBizContent.products?.length || 0})
                  </h4>
                </div>
              </div>

              {(!inspectingBizContent.products || inspectingBizContent.products.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 text-center">
                  No products in catalogue.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {inspectingBizContent.products.map((p: any) => (
                    <div key={p.id} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.name}</span>
                          {p.isService && (
                            <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                              Service
                            </span>
                          )}
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                            {p.category || "General"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.price?.toLocaleString()} RWF • Status: {p.isAvailable ? "In Stock" : "Unavailable"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.moderationStatus === "REMOVED" ? (
                          <button
                            onClick={() => handleExecuteModerationAction("APPROVE_PRODUCT", p.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => setModerationActionModal({
                              open: true,
                              action: "REMOVE_PRODUCT",
                              targetId: p.id,
                              targetType: "PRODUCT",
                              title: `Remove Product "${p.name}"`,
                            })}
                            className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-[11px] cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Business Updates */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Business Updates ({inspectingBizContent.business?.updates?.length || 0})</span>
              </h4>
              {(!inspectingBizContent.business?.updates || inspectingBizContent.business.updates.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No updates published by this business.</p>
              ) : (
                <div className="space-y-2">
                  {inspectingBizContent.business.updates.map((u: any) => (
                    <div key={u.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{u.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase bg-emerald-100 text-emerald-800">
                            {u.type}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            (u.status === "ACTIVE" && u.moderationStatus !== "REMOVED") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {(u.status === "ACTIVE" && u.moderationStatus !== "REMOVED") ? "Active" : "Deactivated"}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] line-clamp-1 mt-0.5">{u.content}</p>
                      </div>
                      <div className="shrink-0">
                        {(u.status === "ACTIVE" && u.moderationStatus !== "REMOVED") ? (
                          <button
                            onClick={() => handleExecuteModerationAction("REMOVE_UPDATE", u.id, "Deactivated from owner inspection")}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-[11px] cursor-pointer"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExecuteModerationAction("APPROVE_UPDATE", u.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Business Opportunities */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-blue-600" />
                <span>Opportunities & Hiring ({inspectingBizContent.business?.opportunities?.length || 0})</span>
              </h4>
              {(!inspectingBizContent.business?.opportunities || inspectingBizContent.business.opportunities.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No business opportunities posted by this business.</p>
              ) : (
                <div className="space-y-2">
                  {inspectingBizContent.business.opportunities.map((opp: any) => (
                    <div key={opp.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{opp.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase bg-blue-100 text-blue-800">
                            {opp.type}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            opp.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                          }`}>
                            {opp.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] line-clamp-1 mt-0.5">{opp.description}</p>
                      </div>
                      <div className="shrink-0">
                        {opp.status !== "CLOSED" ? (
                          <button
                            onClick={() => handleExecuteModerationAction("REMOVE_OPPORTUNITY", opp.id, "Closed from owner inspection")}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-[11px] cursor-pointer"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExecuteModerationAction("APPROVE_OPPORTUNITY", opp.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Community Reports */}
            {inspectingBizContent.reports && inspectingBizContent.reports.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-sm text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Reports Filed Against This Business ({inspectingBizContent.reports.length})</span>
                </h4>
                <div className="space-y-2">
                  {inspectingBizContent.reports.map((rep: any) => (
                    <div key={rep.id} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-900">{rep.reason}</span>
                        <span className="text-[10px] text-rose-600">{new Date(rep.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-700">{rep.details || "No details provided"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
