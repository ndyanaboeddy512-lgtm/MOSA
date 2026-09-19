"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Business, ProductItem, CommunityDemandSignal, BusinessHours } from "@/types";
import { VerificationBadge, DataStatusBadge } from "@/components/common/Badge";
import {
  Store,
  Eye,
  PhoneCall,
  Search,
  TrendingUp,
  Plus,
  Tag,
  Edit2,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  X,
  AlertTriangle,
  RefreshCw,
  Layers,
  Bell,
  History,
  Settings,
  ArrowRight,
  DollarSign,
  Calendar,
  MapPin,
  Globe,
  Check,
  Lock,
  Smartphone,
  Send,
  Trash2,
  Crosshair,
  Navigation,
  Compass,
  ExternalLink,
  Film,
  Video,
  Play,
  Image as ImageIcon,
  Info,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Receipt,
  Briefcase,
  Megaphone,
  Users,
  UserCheck,
} from "lucide-react";
import { MosaMap } from "@/components/discovery/MosaMap";
import { calculateLocationCompleteness, getGoogleMapsDirectionsUrl } from "@/lib/location-quality";
import { FinanceTab } from "@/components/owner/FinanceTab";
import { OperationsTab } from "@/components/owner/OperationsTab";
import {
  CANONICAL_TAXONOMY,
  ALL_MAIN_CATEGORIES,
  ALL_SUBCATEGORIES,
  ALL_BUSINESS_TYPES,
  getBusinessOperatingModel,
} from "@/lib/taxonomy";

const DAYS_OF_WEEK = [
  { day: "Monday", dayRw: "Kuwa Mbere" },
  { day: "Tuesday", dayRw: "Kuwa Kabiri" },
  { day: "Wednesday", dayRw: "Kuwa Gatatu" },
  { day: "Thursday", dayRw: "Kuwa Kane" },
  { day: "Friday", dayRw: "Kuwa Gatanu" },
  { day: "Saturday", dayRw: "Kuwa Gatandatu" },
  { day: "Sunday", dayRw: "Ku Cyumweru" },
];

export default function OwnerDashboardPage() {
  const { lang, setLang, t } = useLanguage();
  const { user } = useAuth();

  type Domain = "business" | "operations" | "finance" | "intelligence" | "communication" | "account";
  const [activeDomain, setActiveDomain] = useState<Domain>("business");
  const [businessSubTab, setBusinessSubTab] = useState<
    "overview" | "catalog" | "media" | "profile" | "location" | "hours" | "offers"
  >("overview");

  const [activeTab, setActiveTab] = useState<
    "overview" | "profile" | "location" | "hours" | "catalog" | "media" | "offers" | "assistant" | "history" | "reminders" | "account"
  >("overview");

  // 7 Core Task-Oriented Business Navigation Sections
  type OwnerSection = "overview" | "my_business" | "catalog" | "content" | "orders_bookings" | "notifications" | "settings";
  const [activeSection, setActiveSection] = useState<OwnerSection>("overview");
  const [myBusinessSubTab, setMyBusinessSubTab] = useState<"profile" | "location" | "hours">("profile");
  const [contentSubTab, setContentSubTab] = useState<"updates" | "opportunities" | "photos" | "videos" | "offers">("updates");
  const [advancedAccordionOpen, setAdvancedAccordionOpen] = useState(false);
  const [advancedSubTab, setAdvancedSubTab] = useState<"operations" | "finance">("operations");

  // Quick Price Modal State
  const [quickPriceModalOpen, setQuickPriceModalOpen] = useState(false);
  const [quickPriceProduct, setQuickPriceProduct] = useState<ProductItem | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState<number>(0);
  const [quickPriceSaving, setQuickPriceSaving] = useState(false);

  // Business Updates & Notices State
  const [updatesList, setUpdatesList] = useState<any[]>([]);
  const [addUpdateModalOpen, setAddUpdateModalOpen] = useState(false);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    type: "ANNOUNCEMENT",
    title: "",
    titleRw: "",
    content: "",
    contentRw: "",
    badge: "",
    validUntil: "",
    imageUrl: "",
  });

  // Business Opportunities & Openings State
  const [opportunitiesList, setOpportunitiesList] = useState<any[]>([]);
  const [addOppModalOpen, setAddOppModalOpen] = useState(false);
  const [oppSubmitting, setOppSubmitting] = useState(false);
  const [oppForm, setOppForm] = useState({
    type: "EMPLOYMENT",
    title: "",
    titleRw: "",
    description: "",
    descriptionRw: "",
    requirements: "",
    compensation: "",
    contactMethod: "WHATSAPP",
    contactValue: "",
    deadline: "",
  });

  // Business Journey Progress & Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [journeyData, setJourneyData] = useState<any>(null);

  const [business, setBusiness] = useState<Business | null>(null);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitSuccessMsg, setResubmitSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Media & Showcase Video State
  const [ownerMediaList, setOwnerMediaList] = useState<any[]>([]);
  const [isVerifiedForVideo, setIsVerifiedForVideo] = useState<boolean>(false);
  const [addVideoModalOpen, setAddVideoModalOpen] = useState<boolean>(false);
  const [addPhotoModalOpen, setAddPhotoModalOpen] = useState<boolean>(false);
  const [isMediaSubmitting, setIsMediaSubmitting] = useState<boolean>(false);
  const [previewVideo, setPreviewVideo] = useState<any | null>(null);
  const [videoForm, setVideoForm] = useState({
    url: "",
    caption: "",
    durationSec: 30,
    topic: "PRODUCTS",
    thumbnailUrl: "",
  });
  const [photoForm, setPhotoForm] = useState({
    url: "",
    caption: "",
    isCover: false,
  });

  // Modals
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [postOfferModalOpen, setPostOfferModalOpen] = useState(false);

  // Add/Edit Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    nameRw: "",
    description: "",
    price: 3000,
    priceMin: "",
    priceMax: "",
    priceType: "FIXED",
    unit: "service",
    category: "General",
    isAvailable: true,
    isEstimated: false,
    isService: false,
  });

  // Offer form state
  const [offerForm, setOfferForm] = useState({
    title: "",
    titleRw: "",
    discount: "20% OFF",
    description: "",
    validUntil: "2026-11-30",
  });

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    nameRw: "",
    description: "",
    descriptionRw: "",
    category: "retail",
    mainCategory: "retail",
    subCategory: "food_groceries",
    businessType: "grocery_shop",
    phone: "",
    whatsapp: "",
    sector: "",
    cell: "",
    addressNote: "",
    isOpenNow: true,
  });

  // Cascading Category Helpers for Owner Form
  const ownerMainCat = useMemo(() => {
    return CANONICAL_TAXONOMY.find((m) => m.id === profileForm.mainCategory) || CANONICAL_TAXONOMY[0];
  }, [profileForm.mainCategory]);

  const ownerAvailableSubcategories = useMemo(() => {
    return ownerMainCat?.subcategories || [];
  }, [ownerMainCat]);

  const ownerSubCat = useMemo(() => {
    return ownerAvailableSubcategories.find((s: any) => s.id === profileForm.subCategory) || ownerAvailableSubcategories[0];
  }, [ownerAvailableSubcategories, profileForm.subCategory]);

  const ownerAvailableBusinessTypes = useMemo(() => {
    return ownerSubCat?.types || [];
  }, [ownerSubCat]);

  const ownerBusinessType = useMemo(() => {
    return ownerAvailableBusinessTypes.find((t: any) => t.id === profileForm.businessType) || ownerAvailableBusinessTypes[0];
  }, [ownerAvailableBusinessTypes, profileForm.businessType]);

  const operatingModel = useMemo(() => {
    return getBusinessOperatingModel(
      business?.mainCategory || profileForm.mainCategory || (business as any)?.category,
      business?.subCategory || profileForm.subCategory,
      business?.businessType || profileForm.businessType
    );
  }, [business?.mainCategory, profileForm.mainCategory, (business as any)?.category, business?.subCategory, profileForm.subCategory, business?.businessType, profileForm.businessType]);

  // Location & Navigation Form state
  const [locationForm, setLocationForm] = useState({
    sector: "Nyamirambo",
    cell: "Biryogo",
    nearestLandmark: "",
    streetName: "",
    nearbyPlace: "",
    locationDescription: "",
    latitude: -1.981,
    longitude: 30.046,
    locationSource: "OWNER_DECLARED" as string,
    locationAccuracy: undefined as number | undefined,
    locationVerificationStatus: "UNVERIFIED" as string,
  });
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  // Opening Hours state
  const [hoursForm, setHoursForm] = useState<BusinessHours[]>([]);

  // AI Assistant state
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantProposals, setAssistantProposals] = useState<any[]>([]);
  const [assistantDisclaimer, setAssistantDisclaimer] = useState("");

  // Account Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [accountMsg, setAccountMsg] = useState("");
  const [accountErrorMsg, setAccountErrorMsg] = useState("");

  // Fetch Owner Data directly from Neon PostgreSQL
  const loadOwnerData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch("/api/owner/business");
      if (res.ok) {
        const data = await res.json();
        if (data.business) {
          setBusiness(data.business);
          setHealthReport(data.health);
          setConfirmationStatus(data.confirmationStatus);
          setReminders(data.reminders || []);

          // Sync local profile form
          setProfileForm({
            name: data.business.name || "",
            nameRw: data.business.nameRw || "",
            description: data.business.description || "",
            descriptionRw: data.business.descriptionRw || "",
            category: data.business.mainCategory || data.business.category || "retail",
            mainCategory: data.business.mainCategory || data.business.category || "retail",
            subCategory: data.business.subCategory || "food_groceries",
            businessType: data.business.businessType || "grocery_shop",
            phone: data.business.phone || "",
            whatsapp: data.business.whatsapp || "",
            sector: data.business.location?.sector || data.business.sector || "Nyamirambo",
            cell: data.business.location?.cell || data.business.cell || "Biryogo",
            addressNote: data.business.location?.addressNote || data.business.addressNote || "",
            isOpenNow: Boolean(data.business.isOpenNow),
          });

          // Sync location form
          setLocationForm({
            sector: data.business.location?.sector || data.business.sector || "Nyamirambo",
            cell: data.business.location?.cell || data.business.cell || "Biryogo",
            nearestLandmark: data.business.nearestLandmark || data.business.location?.nearestLandmark || "",
            streetName: data.business.streetName || data.business.location?.streetName || "",
            nearbyPlace: data.business.nearbyPlace || data.business.location?.nearbyPlace || "",
            locationDescription: data.business.locationDescription || data.business.location?.locationDescription || "",
            latitude: data.business.location?.coordinates?.lat ?? data.business.latitude ?? -1.981,
            longitude: data.business.location?.coordinates?.lng ?? data.business.longitude ?? 30.046,
            locationSource: data.business.locationSource || data.business.location?.source || "OWNER_DECLARED",
            locationAccuracy: data.business.locationAccuracy ?? data.business.location?.accuracy,
            locationVerificationStatus: data.business.locationVerificationStatus || data.business.location?.verificationStatus || "UNVERIFIED",
          });

          // Sync hours form
          if (Array.isArray(data.business.openingHours) && data.business.openingHours.length > 0) {
            setHoursForm(data.business.openingHours);
          } else {
            setHoursForm(
              DAYS_OF_WEEK.map((d) => ({
                day: d.day as any,
                dayRw: d.dayRw,
                open: "08:00",
                close: "20:00",
                isClosed: d.day === "Sunday",
              }))
            );
          }
        }
        setVerifications(data.verifications || []);
        setNotifications(data.notifications || []);
        if (data.business?.id) {
          await Promise.all([
            loadOwnerMedia(data.business.id),
            loadOwnerUpdates(data.business.id),
            loadOwnerOpportunities(data.business.id),
            loadOwnerAnalytics(data.business.id),
          ]);
        }
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to load owner data" }));
        setErrorMsg(err.error || "Failed to load owner business.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error reaching server.");
    } finally {
      setLoading(false);
    }
  };

  const loadOwnerMedia = async (businessId?: string) => {
    try {
      const url = businessId ? `/api/owner/media?businessId=${encodeURIComponent(businessId)}` : "/api/owner/media";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOwnerMediaList(data.media || []);
        setIsVerifiedForVideo(Boolean(data.isVerifiedForVideo));
      }
    } catch (err) {
      console.error("Failed to load owner media", err);
    }
  };

  const loadOwnerUpdates = async (bizId: string) => {
    try {
      const res = await fetch(`/api/owner/updates?businessId=${encodeURIComponent(bizId)}`);
      if (res.ok) {
        const d = await res.json();
        setUpdatesList(d.updates || []);
      }
    } catch (e) {
      console.error("Failed to load updates:", e);
    }
  };

  const loadOwnerOpportunities = async (bizId: string) => {
    try {
      const res = await fetch(`/api/owner/opportunities?businessId=${encodeURIComponent(bizId)}`);
      if (res.ok) {
        const d = await res.json();
        setOpportunitiesList(d.opportunities || []);
      }
    } catch (e) {
      console.error("Failed to load opportunities:", e);
    }
  };

  const loadOwnerAnalytics = async (bizId: string) => {
    try {
      const res = await fetch(`/api/owner/analytics?businessId=${encodeURIComponent(bizId)}`);
      if (res.ok) {
        const d = await res.json();
        setAnalyticsData(d.analytics || null);
        setJourneyData(d.journey || null);
      }
    } catch (e) {
      console.error("Failed to load analytics:", e);
    }
  };

  const handleCreateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !updateForm.title.trim() || !updateForm.content.trim()) return;
    setUpdateSubmitting(true);
    try {
      const res = await fetch("/api/owner/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          ...updateForm,
        }),
      });
      if (res.ok) {
        setAddUpdateModalOpen(false);
        setUpdateForm({
          type: "ANNOUNCEMENT",
          title: "",
          titleRw: "",
          content: "",
          contentRw: "",
          badge: "",
          validUntil: "",
          imageUrl: "",
        });
        await loadOwnerUpdates(business.id);
        await loadOwnerAnalytics(business.id);
      }
    } catch (e) {
      console.error("Failed to create update:", e);
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!business?.id || !confirm(lang === "rw" ? "Mwashaka gusiba iri tangazo?" : "Delete this update?")) return;
    try {
      const res = await fetch(`/api/owner/updates?id=${id}&businessId=${business.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadOwnerUpdates(business.id);
        await loadOwnerAnalytics(business.id);
      }
    } catch (e) {
      console.error("Failed to delete update:", e);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !oppForm.title.trim() || !oppForm.description.trim()) return;
    setOppSubmitting(true);
    try {
      const res = await fetch("/api/owner/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          ...oppForm,
        }),
      });
      if (res.ok) {
        setAddOppModalOpen(false);
        setOppForm({
          type: "EMPLOYMENT",
          title: "",
          titleRw: "",
          description: "",
          descriptionRw: "",
          requirements: "",
          compensation: "",
          contactMethod: "WHATSAPP",
          contactValue: "",
          deadline: "",
        });
        await loadOwnerOpportunities(business.id);
        await loadOwnerAnalytics(business.id);
      }
    } catch (e) {
      console.error("Failed to create opportunity:", e);
    } finally {
      setOppSubmitting(false);
    }
  };

  const handleUpdateOppStatus = async (id: string, status: string) => {
    if (!business?.id) return;
    try {
      const res = await fetch("/api/owner/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, businessId: business.id, status }),
      });
      if (res.ok) {
        await loadOwnerOpportunities(business.id);
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const handleDeleteOpportunity = async (id: string) => {
    if (!business?.id || !confirm(lang === "rw" ? "Mwashaka gusiba aya mahirwe?" : "Delete this opportunity?")) return;
    try {
      const res = await fetch(`/api/owner/opportunities?id=${id}&businessId=${business.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadOwnerOpportunities(business.id);
        await loadOwnerAnalytics(business.id);
      }
    } catch (e) {
      console.error("Failed to delete opportunity:", e);
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId: string, inquiryStatus: string) => {
    try {
      const res = await fetch("/api/owner/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId, inquiryStatus }),
      });
      if (res.ok && business?.id) {
        await loadOwnerOpportunities(business.id);
      }
    } catch (e) {
      console.error("Failed to update inquiry status:", e);
    }
  };

  // Live Storefront Open / Closed Toggle
  const handleToggleOpenNow = async () => {
    if (!business) return;
    const newStatus = !business.isOpenNow;
    try {
      setBusiness({ ...business, isOpenNow: newStatus });
      setProfileForm((prev) => ({ ...prev, isOpenNow: newStatus }));
      const res = await fetch("/api/owner/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          isOpenNow: newStatus,
        }),
      });
      if (res.ok) {
        setSaveSuccessMsg(
          lang === "rw"
            ? (newStatus ? "Ubucuruzi bwashyizwe ku rubuga ko BUKINGUYE!" : "Ubucuruzi bwashyizwe ku rubuga ko BUFUNZE!")
            : (newStatus ? "Storefront marked OPEN NOW on live public website!" : "Storefront marked CLOSED on live public website!")
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        setBusiness({ ...business, isOpenNow: !newStatus });
        setProfileForm((prev) => ({ ...prev, isOpenNow: !newStatus }));
        setErrorMsg("Failed to toggle storefront open/closed status.");
      }
    } catch (err: any) {
      setBusiness({ ...business, isOpenNow: !newStatus });
      setProfileForm((prev) => ({ ...prev, isOpenNow: !newStatus }));
      setErrorMsg(err.message || "Failed to toggle storefront open/closed status.");
    }
  };

  // 1-Click Instant Stock / Availability Toggle
  const handleToggleAvailability = async (item: ProductItem) => {
    if (!business) return;
    const newStatus = item.isAvailable === false;
    try {
      setBusiness({
        ...business,
        products: business.products.map((p) => (p.id === item.id ? { ...p, isAvailable: newStatus } : p)),
      });
      const res = await fetch("/api/owner/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          productId: item.id,
          isAvailable: newStatus,
        }),
      });
      if (res.ok) {
        setSaveSuccessMsg(
          lang === "rw"
            ? (newStatus ? `"${item.name}" yashyizwe ku rubuga ko ihari (In Stock)!` : `"${item.name}" yashyizwe ku rubuga ko yashize (Out of Stock)!`)
            : (newStatus ? `"${item.name}" marked IN STOCK on live website!` : `"${item.name}" marked OUT OF STOCK on live website!`)
        );
        setTimeout(() => setSaveSuccessMsg(""), 3500);
      } else {
        setBusiness({
          ...business,
          products: business.products.map((p) => (p.id === item.id ? { ...p, isAvailable: !newStatus } : p)),
        });
        setErrorMsg("Failed to update stock status.");
      }
    } catch (err: any) {
      setBusiness({
        ...business,
        products: business.products.map((p) => (p.id === item.id ? { ...p, isAvailable: !newStatus } : p)),
      });
      setErrorMsg(err.message || "Failed to update stock status.");
    }
  };

  // Quick Price Save Handler (minimal low-digital-literacy price modal)
  const handleQuickPriceSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !quickPriceProduct) return;
    try {
      setQuickPriceSaving(true);
      const res = await fetch("/api/owner/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          productId: quickPriceProduct.id,
          price: Number(quickPriceValue),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBusiness({
          ...business,
          products: business.products.map((p) => (p.id === quickPriceProduct.id ? { ...p, price: Number(quickPriceValue) } : p)),
        });
        setQuickPriceModalOpen(false);
        setQuickPriceProduct(null);
        setSaveSuccessMsg(
          lang === "rw"
            ? `Igiciro gishya cya ${Number(quickPriceValue).toLocaleString()} Frw cyabitswe muri PostgreSQL no ku rubuga!`
            : `Price for "${quickPriceProduct.name}" updated to ${Number(quickPriceValue).toLocaleString()} RWF in database and live website!`
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Failed to update price");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update price");
    } finally {
      setQuickPriceSaving(false);
    }
  };

  // Resubmit business application after revisions
  const handleResubmitApplication = async (notes?: string) => {
    if (!business) return;
    setIsResubmitting(true);
    try {
      const res = await fetch("/api/owner/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          action: "RESUBMIT_APPLICATION",
          resubmissionNotes: notes || "Application updated and resubmitted for verification.",
        }),
      });
      if (res.ok) {
        setResubmitSuccessMsg(
          lang === "rw"
            ? "Icyifuzo cyanyu cyakiriwe kandi cyongeye koherezwa k'ubuyobozi bwa MOSA."
            : "Your application has been resubmitted to MOSA Admin for verification!"
        );
        await loadOwnerData();
        setTimeout(() => setResubmitSuccessMsg(""), 6000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Failed to resubmit application.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error resubmitting application.");
    } finally {
      setIsResubmitting(false);
    }
  };

  // Mark notification as read
  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      const res = await fetch("/api/owner/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.warn("Mark notification read error:", err);
    }
  };

  // Fetch Change History
  const loadHistory = async (businessId: string) => {
    try {
      const res = await fetch(`/api/owner/history?businessId=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
      }
    } catch {}
  };

  // Fetch Demand Signals
  const loadDemands = async () => {
    try {
      const res = await fetch("/api/demand");
      if (res.ok) {
        const data = await res.json();
        setDemands(data.demands || []);
      }
    } catch {}
  };

  useEffect(() => {
    loadOwnerData();
    loadDemands();
  }, [user]);

  useEffect(() => {
    if (business && activeTab === "history") {
      loadHistory(business.id);
    }
  }, [activeTab, business]);

  // Handle 1-Click Confirmation ("Keep My Business Alive")
  const handleConfirmAlive = async () => {
    if (!business) return;
    try {
      const res = await fetch("/api/owner/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          action: "CONFIRM_ALIVE",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfirmationStatus({
          needsConfirmation: false,
          lastConfirmedAt: data.lastConfirmedAt,
          daysRemaining: business.confirmationIntervalDays || 60,
          daysSinceLastConfirmation: 0,
        });
        if (data.health) setHealthReport(data.health);
        setSaveSuccessMsg(
          lang === "rw"
            ? "Urakoze! Amakuru y'ubucuruzi bwawe yemejwe neza muri PostgreSQL."
            : "Confirmed! Your business information is verified fresh in the database."
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.warn("Confirmation error:", err);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    try {
      setLoading(true);
      const res = await fetch("/api/owner/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          ...profileForm,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business);
        setHealthReport(data.health);
        if (data.reviewRequired) {
          setSaveSuccessMsg(
            lang === "rw"
              ? "Impinduka mu byiciro by'ubucuruzi zoherejwe ku buyobozi bwa MOSA kugira ngo zemeze."
              : "Classification changes saved and submitted to MOSA Admin for re-verification."
          );
        } else {
          setSaveSuccessMsg(
            lang === "rw"
              ? "Umwirondoro wavuguruwe neza kandi wahise ugaragara ku rubuga rwa MOSA!"
              : "Profile successfully updated and instantly synchronized to the public website!"
          );
        }
        setTimeout(() => setSaveSuccessMsg(""), 5000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Update failed");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Handle Location & Directions Update
  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch("/api/owner/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          sector: locationForm.sector,
          cell: locationForm.cell,
          nearestLandmark: locationForm.nearestLandmark,
          streetName: locationForm.streetName,
          nearbyPlace: locationForm.nearbyPlace,
          locationDescription: locationForm.locationDescription,
          latitude: locationForm.latitude,
          longitude: locationForm.longitude,
          locationSource: locationForm.locationSource,
          locationAccuracy: locationForm.locationAccuracy,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business);
        setHealthReport(data.health);
        setSaveSuccessMsg(
          lang === "rw"
            ? "Aho ubucuruzi buherereye n'amabwiriza byabitswe neza kandi byahise bigaragara ku rubuga rwa MOSA!"
            : "Location details, landmarks, and navigation instructions saved and synchronized to the live website!"
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to update location");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update location");
    } finally {
      setLoading(false);
    }
  };

  // Handle Live GPS Capture
  const handleCaptureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage(lang === "rw" ? "GPS ntikora kuri iyi mushakisha" : "Geolocation is not supported by your browser");
      return;
    }

    setIsCapturingGps(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy);

        setLocationForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          locationSource: "OWNER_DECLARED",
          locationAccuracy: acc,
        }));
        setIsCapturingGps(false);
        setGpsMessage(
          lang === "rw"
            ? `Imyirondoro ya GPS yafashwe neza! (Ubusobanutse: ±${acc}m)`
            : `Live GPS captured successfully! (Accuracy: ±${acc}m)`
        );
        setTimeout(() => setGpsMessage(null), 5000);
      },
      (err) => {
        setIsCapturingGps(false);
        setGpsMessage(
          lang === "rw"
            ? `Ntabwo bishoboka gufata GPS: ${err.message}`
            : `Unable to acquire GPS: ${err.message}`
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Handle Opening Hours Update
  const handleHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    try {
      setLoading(true);
      const res = await fetch("/api/owner/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          openingHours: hoursForm,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business);
        setHealthReport(data.health);
        setSaveSuccessMsg(
          lang === "rw"
            ? "Amasaha yo gukora yavuguruwe neza muri PostgreSQL!"
            : "Operating hours successfully updated in PostgreSQL and visible publicly!"
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update hours");
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Product Submit
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !productForm.name.trim()) return;

    try {
      const res = await fetch("/api/owner/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          name: productForm.name,
          nameRw: productForm.nameRw || productForm.name,
          description: productForm.description,
          price: Number(productForm.price),
          priceMin: productForm.priceMin ? Number(productForm.priceMin) : undefined,
          priceMax: productForm.priceMax ? Number(productForm.priceMax) : undefined,
          priceType: productForm.priceType,
          unit: productForm.unit,
          category: productForm.category,
          isAvailable: productForm.isAvailable,
          isEstimated: productForm.isEstimated,
          isService: productForm.isService,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBusiness({
          ...business,
          products: [data.product, ...business.products],
        });
        if (data.health) setHealthReport(data.health);
        setAddProductModalOpen(false);
        setProductForm({
          name: "",
          nameRw: "",
          description: "",
          price: 3000,
          priceMin: "",
          priceMax: "",
          priceType: "FIXED",
          unit: "service",
          category: "General",
          isAvailable: true,
          isEstimated: false,
          isService: false,
        });
        setSaveSuccessMsg(
          lang === "rw"
            ? "Igicuruzwa cyongerewe neza kandi cyahise gishyirwa ku rubuga!"
            : "Product added to catalogue and instantly published on public business page!"
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add product");
    }
  };

  // Handle Edit Product (e.g. Price Change from 3,000 -> 3,500 RWF)
  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !selectedProduct) return;

    try {
      const res = await fetch("/api/owner/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          productId: selectedProduct.id,
          name: productForm.name,
          nameRw: productForm.nameRw,
          description: productForm.description,
          price: Number(productForm.price),
          priceMin: productForm.priceMin ? Number(productForm.priceMin) : null,
          priceMax: productForm.priceMax ? Number(productForm.priceMax) : null,
          priceType: productForm.priceType,
          unit: productForm.unit,
          isAvailable: productForm.isAvailable,
          isService: productForm.isService,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedProducts = business.products.map((p) => (p.id === data.product.id ? data.product : p));
        setBusiness({ ...business, products: updatedProducts });
        if (data.health) setHealthReport(data.health);
        setEditProductModalOpen(false);
        setSelectedProduct(null);
        setSaveSuccessMsg(
          lang === "rw"
            ? "Igiciro cyavuguruwe neza muri PostgreSQL no ku rubuga rusange!"
            : `Price for "${data.product.name}" updated to ${data.product.price} RWF in database and public website!`
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update product");
    }
  };

  // Handle Archive / Delete Product
  const handleArchiveProduct = async (productId: string) => {
    if (!business) return;
    if (!confirm(lang === "rw" ? "Uremeza ko ushaka gukura iki gicuruzwa kuri lisiti?" : "Archive this product from catalogue?")) return;

    try {
      const res = await fetch(`/api/owner/products?productId=${productId}&businessId=${business.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const remaining = business.products.filter((p) => p.id !== productId);
        setBusiness({ ...business, products: remaining });
        setSaveSuccessMsg(lang === "rw" ? "Igicuruzwa cyakuweho neza." : "Product archived from public catalogue.");
        setTimeout(() => setSaveSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.warn("Delete product error:", err);
    }
  };

  // Handle Add Short Showcase Video
  const handleAddVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !videoForm.url.trim()) return;

    try {
      setIsMediaSubmitting(true);
      setErrorMsg("");
      const res = await fetch("/api/owner/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          mediaType: "VIDEO",
          url: videoForm.url.trim(),
          caption: videoForm.caption.trim(),
          durationSec: Number(videoForm.durationSec) || 30,
          topic: videoForm.topic,
          thumbnailUrl: videoForm.thumbnailUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish video.");
      }

      setOwnerMediaList((prev) => [data.media, ...prev]);
      if (data.health) setHealthReport(data.health);
      setAddVideoModalOpen(false);
      setVideoForm({
        url: "",
        caption: "",
        durationSec: 30,
        topic: "PRODUCTS",
        thumbnailUrl: "",
      });
      setSaveSuccessMsg(
        lang === "rw"
          ? "Videwo ngufi y'ubucuruzi yashyizweho neza kandi yageze ku rubuga!"
          : "Business showcase video published successfully to your public mini-website!"
      );
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add video.");
    } finally {
      setIsMediaSubmitting(false);
    }
  };

  // Handle Add Photo
  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !photoForm.url.trim()) return;

    try {
      setIsMediaSubmitting(true);
      setErrorMsg("");
      const res = await fetch("/api/owner/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          mediaType: "IMAGE",
          url: photoForm.url.trim(),
          caption: photoForm.caption.trim(),
          isCover: photoForm.isCover,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add photo.");
      }

      setOwnerMediaList((prev) => [data.media, ...prev]);
      if (data.health) setHealthReport(data.health);
      setAddPhotoModalOpen(false);
      setPhotoForm({
        url: "",
        caption: "",
        isCover: false,
      });
      setSaveSuccessMsg(
        lang === "rw"
          ? "Ifoto y'ubucuruzi yongerewe neza!"
          : "Business photo added successfully to gallery!"
      );
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add photo.");
    } finally {
      setIsMediaSubmitting(false);
    }
  };

  // Handle Delete Media
  const handleDeleteMedia = async (mediaId: string) => {
    if (!business) return;
    if (!confirm(lang === "rw" ? "Uremeza ko ushaka gusiba iki kintu?" : "Are you sure you want to remove this media item?")) return;

    try {
      const res = await fetch(`/api/owner/media?mediaId=${mediaId}&businessId=${business.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete media.");
      }

      setOwnerMediaList((prev) => prev.filter((m) => m.id !== mediaId));
      if (data.health) setHealthReport(data.health);
      setSaveSuccessMsg(lang === "rw" ? "Ibyakuweho neza." : "Media item deleted successfully.");
      setTimeout(() => setSaveSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete media.");
    }
  };

  // Handle Post Special Offer
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !offerForm.title.trim()) return;

    try {
      const res = await fetch("/api/owner/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          title: offerForm.title,
          titleRw: offerForm.titleRw || offerForm.title,
          discount: offerForm.discount,
          description: offerForm.description,
          validUntil: offerForm.validUntil,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBusiness({
          ...business,
          featuredOffer: {
            id: data.offer.id,
            title: data.offer.title,
            titleRw: data.offer.titleRw,
            discount: data.offer.discount,
            validUntil: data.offer.validUntil,
          },
        });
        setPostOfferModalOpen(false);
        setOfferForm({ title: "", titleRw: "", discount: "20% OFF", description: "", validUntil: "2026-11-30" });
        setSaveSuccessMsg(
          lang === "rw"
            ? "Poromosiyo yashyizwe ku rubuga neza!"
            : "Neighborhood special offer published and live on your profile!"
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to publish offer");
    }
  };

  // Handle AI Assistant Prompt
  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim()) return;

    try {
      setAssistantLoading(true);
      const res = await fetch("/api/owner/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: assistantInput,
          existingCategory: business?.category,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAssistantProposals(data.proposals || []);
        setAssistantDisclaimer(data.disclaimer || "");
      }
    } catch (err: any) {
      console.warn("Assistant error:", err);
    } finally {
      setAssistantLoading(false);
    }
  };

  // Add proposal to live catalogue (owner confirmation)
  const handleAcceptProposal = async (proposal: any) => {
    if (!business) return;

    try {
      const res = await fetch("/api/owner/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          name: proposal.name,
          nameRw: proposal.nameRw,
          description: proposal.description,
          price: proposal.price,
          priceMin: proposal.priceMin,
          priceMax: proposal.priceMax,
          priceType: proposal.priceType,
          unit: proposal.unit,
          category: proposal.category,
          isAvailable: true,
          isEstimated: proposal.priceType !== "FIXED",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBusiness({
          ...business,
          products: [data.product, ...business.products],
        });
        if (data.health) setHealthReport(data.health);
        setAssistantProposals(assistantProposals.filter((p) => p !== proposal));
        setSaveSuccessMsg(
          lang === "rw"
            ? `Serivisi "${proposal.name}" yemejwe kandi yongewe muri PostgreSQL!`
            : `Service "${proposal.name}" confirmed and added to your active database catalogue!`
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.warn("Accept proposal error:", err);
    }
  };

  if (loading && !business) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">
          {lang === "rw" ? "Gufungura Icyicaro cy'Ubucuruzi..." : "Loading Business Owner Hub from PostgreSQL..."}
        </h2>
        <p className="text-xs text-slate-500">Connecting to Neon database cluster...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-black text-slate-900">
          {lang === "rw" ? "Nta bucuruzi bufitwe n'iyi konte" : "No Business Owned by This Account"}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {errorMsg ||
            (lang === "rw"
              ? "Ukeneye kwiyandikisha ku bucuruzi bwawe cyangwa kubanza kubwiyandikaho."
              : "You must claim an existing business profile or register a new one to access the Owner Dashboard.")}
        </p>
        <Link
          href="/explore"
          className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition-all"
        >
          {lang === "rw" ? "Shaka Ubucuruzi Bwawe (Explore & Claim)" : "Find & Claim Your Business"}
        </Link>
      </div>
    );
  }

  const displayName = lang === "rw" && business.nameRw ? business.nameRw : business.name;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Toast Notifications */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg("")} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-600 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Hub Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <Store className="w-5 h-5" />
            </span>
            <VerificationBadge status={business.verificationStatus} size="sm" />
            <DataStatusBadge status={business.dataStatus} size="sm" />
            <button
              onClick={handleToggleOpenNow}
              className={`text-xs font-black px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                business.isOpenNow
                  ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
              title="Click to toggle live storefront Open/Closed status on MOSA"
            >
              <span className={`w-2 h-2 rounded-full ${business.isOpenNow ? "bg-emerald-600 animate-pulse" : "bg-slate-400"}`} />
              <span>{business.isOpenNow ? (lang === "rw" ? "Bifunguye (Open Now)" : "Store: OPEN NOW") : (lang === "rw" ? "Bifunze (Closed)" : "Store: CLOSED")}</span>
              <span className="text-[10px] text-slate-400 font-normal">({lang === "rw" ? "kanda uhindure" : "click to change"})</span>
            </button>
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">{displayName}</h1>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {business.location?.community || business.location?.cell || "Nyamirambo"}, {business.location?.sector || "Nyamirambo"}, {business.location?.district || "Nyarugenge"}
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>{business.phone}</span>
            </span>
            <span>•</span>
            <span className="text-slate-400">
              {lang === "rw" ? "Icyiciro:" : "Category:"} {business.categoryDisplay}
            </span>
          </div>
        </div>

        {/* Global Quick CTAs */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setProductForm({
                ...productForm,
                isService: operatingModel.isServiceDefault,
                unit: operatingModel.model === "SERVICES" ? "service" : (operatingModel.model === "FOOD_DINING" ? "plate/portion" : "item"),
              });
              setAddProductModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === "rw" ? operatingModel.addBtnLabelRw : operatingModel.addBtnLabel}</span>
          </button>

          <button
            onClick={() => setPostOfferModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Tag className="w-4 h-4" />
            <span>{lang === "rw" ? "Tanga Poromosiyo" : "Post Offer"}</span>
          </button>

          <Link
            href={`/business/${business.id}`}
            target="_blank"
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>{t.owner.viewLiveBtn}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Pending Administrative Review Notice */}
      {(business as any).status === "PENDING" && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">
              {t.owner.pendingBannerTitle}
            </div>
            <p className="text-slate-600 text-xs">
              {t.owner.pendingBannerDesc}
            </p>
          </div>
        </div>
      )}

      {/* Corrections Requested Banner */}
      {(business as any).status === "NEEDS_CORRECTION" && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-500/40 text-slate-900 text-xs sm:text-sm space-y-3 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 shrink-0 mt-0.5 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-950 text-base">
                    {lang === "rw" ? "Gusubiramo Amakuru Birakenewe" : "Corrections Requested by MOSA Admin"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950">
                    Action Required
                  </span>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed">
                  {lang === "rw"
                    ? "Ubuyobozi bwa MOSA bwasuzumye icyifuzo cyanyu basanga hari amakuru agomba gukosorwa mbere y'uko cyemezwa ku mugaragaro. Nyamuneka vugurura amakuru ahari ikibazo (nko ku rubuga, ibiciro, cyangwa ikimenyetso cy'aho mukorera) maze ukande 'Ongera Wohereze'."
                    : "The MOSA verification team reviewed your business application and requested corrections. Please update the necessary details below (e.g. Landmark, Prices, or Profile) and click Resubmit."}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleResubmitApplication()}
              disabled={isResubmitting}
              className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isResubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{lang === "rw" ? "Ongera Wohereze Ubucuruzi" : "Resubmit for Verification"}</span>
            </button>
          </div>

          {/* Admin Feedback Box */}
          {verifications && verifications.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-amber-300 text-xs shadow-xs">
              <div className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                <span className="text-sm">💬</span>
                <span>{lang === "rw" ? "Ubutumwa bw'Umusuzumi wa MOSA (Admin Feedback):" : "Admin Verification Feedback:"}</span>
              </div>
              <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                {verifications.find((v: any) => v.type === "CORRECTIONS_REQUESTED")?.notes || verifications[0]?.notes || "Please review and complete your business information."}
              </p>
            </div>
          )}

          {resubmitSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{resubmitSuccessMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* 7 Task-Oriented Business Navigation Sections */}
      <div className="bg-white rounded-3xl border border-slate-200 p-2 sm:p-3 shadow-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { id: "overview", label: lang === "rw" ? "Incamake" : "Overview", sub: lang === "rw" ? "Ibikorwa by'uyu munsi" : "Status & Actions", icon: Layers },
            { id: "my_business", label: lang === "rw" ? "Ubucuruzi" : "My Business", sub: lang === "rw" ? "Umwirondoro & Ikarita" : "Profile, Map & Hours", icon: Store },
            { 
              id: "catalog", 
              label: operatingModel.model === "SERVICES" 
                ? (lang === "rw" ? "Serivisi" : "Services") 
                : (operatingModel.model === "FOOD_DINING" 
                    ? (lang === "rw" ? "Amenu" : "Menu & Dishes") 
                    : (lang === "rw" ? "Ibicuruzwa" : "Products")), 
              sub: operatingModel.model === "SERVICES"
                ? (lang === "rw" ? "Ibiciro bya serivisi" : "Prices & Offerings")
                : (lang === "rw" ? "Ibiciro & Ububiko" : "Prices & Stock"),
              icon: Tag, 
              count: business.products.length 
            },
            { id: "content", label: lang === "rw" ? "Amashusho" : "Content", sub: lang === "rw" ? "Amafoto & Videwo" : "Photos, Videos & Offers", icon: Film, count: ownerMediaList.length },
            { 
              id: "orders_bookings", 
              label: operatingModel.hasBookings 
                ? (lang === "rw" ? "Gahunda" : "Bookings") 
                : (lang === "rw" ? "Ibyatumijwe" : "Orders"), 
              sub: lang === "rw" ? "Kuri WhatsApp" : "Via WhatsApp", 
              icon: Smartphone 
            },
            { 
              id: "notifications", 
              label: lang === "rw" ? "Ubutumwa" : "Notifications", 
              sub: lang === "rw" ? "Ubuyobozi bwa MOSA" : "Admin Alerts & Demand", 
              icon: Bell, 
              count: notifications.filter((n) => !n.isRead).length + (business.status === "NEEDS_CORRECTION" ? 1 : 0) 
            },
            { id: "settings", label: lang === "rw" ? "Igenamiterere" : "Settings", sub: lang === "rw" ? "Konte n'Imari" : "Account & Tools", icon: Settings },
          ].map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id as any);
                  if (sec.id === "notifications") {
                    loadHistory(business.id);
                  }
                }}
                className={`p-3 rounded-2xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-md ring-2 ring-emerald-500/30"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-slate-500"}`} />
                  {typeof sec.count === "number" && sec.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {sec.count}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-black text-xs leading-tight">{sec.label}</div>
                  <div className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                    {sec.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: OVERVIEW */}
      {activeSection === "overview" && (
        <div className="space-y-6">
          
          {/* Keep My Business Alive Banner */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              confirmationStatus?.needsConfirmation
                ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-300 shadow-card"
                : "bg-white border-slate-200 shadow-card"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <HeartHandshake className={`w-5 h-5 ${confirmationStatus?.needsConfirmation ? "text-amber-600" : "text-emerald-600"}`} />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {lang === "rw" ? "Gahunda ya 'Keep My Business Alive'" : "Keep My Business Alive System"}
                  </h3>
                  {confirmationStatus?.needsConfirmation && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                      Action Required
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  {confirmationStatus?.needsConfirmation
                    ? lang === "rw"
                      ? `Hasize iminsi ${confirmationStatus?.daysSinceLastConfirmation || 60} mudasubiramo amakuru yanyu. Emeza ko ibiciro n'aho mukorera bikiri byo kugira ngo mukomeze kugaragara neza mu gace kanyu.`
                      : `Your business information hasn't been confirmed for ${confirmationStatus?.daysSinceLastConfirmation || 60} days. Confirming updates your freshness timestamp in PostgreSQL.`
                    : lang === "rw"
                    ? `Amakuru y'ubucuruzi bwawe aheruka kwemezwa: ${confirmationStatus?.lastConfirmedAt ? new Date(confirmationStatus.lastConfirmedAt).toLocaleDateString() : "Vuba"}. Asigaje iminsi ${confirmationStatus?.daysRemaining || 60} kugira ngo yongere kwemezwa.`
                    : `Your business information was confirmed on ${confirmationStatus?.lastConfirmedAt ? new Date(confirmationStatus.lastConfirmedAt).toLocaleDateString() : "recently"}. Next periodic check-in due in ${confirmationStatus?.daysRemaining || 60} days.`}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleConfirmAlive}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === "rw" ? "YEGO — Byose Ni Ukuri (Confirm All)" : "YES — Everything is Correct"}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSection("my_business");
                    setMyBusinessSubTab("profile");
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {lang === "rw" ? "Vugurura Amakuru" : "Update Info"}
                </button>
              </div>
            </div>
          </div>

          {/* Business Health Ring & Actionable Recommendations */}
          {healthReport && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Health Score Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {lang === "rw" ? "Igipimo cy'Ubwiza" : "Business Health Score"}
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        healthReport.grade === "EXCELLENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : healthReport.grade === "GOOD"
                          ? "bg-blue-100 text-blue-800"
                          : healthReport.grade === "FAIR"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {healthReport.grade}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900">{healthReport.score}%</span>
                    <span className="text-xs text-slate-400">/ 100% {lang === "rw" ? "byuzuye" : "complete"}</span>
                  </div>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        healthReport.score >= 80
                          ? "bg-emerald-500"
                          : healthReport.score >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${healthReport.score}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === "rw"
                    ? "Iki gipimo ntikigirira abakiriya akamaro gusa, ahubwo gifasha MOSA kumenyekanisha ubucuruzi bwawe ku isonga mu ishakiro."
                    : "Operational quality tool calculated from database completeness. Complete profiles rank higher in neighborhood discovery."}
                </p>
              </div>

              {/* Actionable Recommendations (2 Cols) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{lang === "rw" ? "Inama zo Kuzamura Ubucuruzi" : "Actionable Health Recommendations"}</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {healthReport.recommendations?.length || 0} {lang === "rw" ? "ibikeneye kuvugururwa" : "action items"}
                  </span>
                </div>

                {(!healthReport.recommendations || healthReport.recommendations.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span>{lang === "rw" ? "Umwirondoro wawe wuzuye 100%!" : "Your business profile is 100% complete and healthy!"}</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {healthReport.recommendations.slice(0, 3).map((rec: any) => (
                      <div
                        key={rec.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                rec.severity === "HIGH" ? "bg-red-500" : rec.severity === "MEDIUM" ? "bg-amber-500" : "bg-blue-500"
                              }`}
                            />
                            <span>{lang === "rw" ? rec.titleRw : rec.title}</span>
                          </div>
                          <p className="text-slate-500">{lang === "rw" ? rec.descriptionRw : rec.description}</p>
                        </div>

                        <button
                          onClick={() => {
                            if (rec.actionTab === "profile" || rec.actionTab === "location" || rec.actionTab === "hours") {
                              setActiveSection("my_business");
                              setMyBusinessSubTab(rec.actionTab);
                            } else if (rec.actionTab === "catalog") {
                              setActiveSection("catalog");
                            } else if (rec.actionTab === "media") {
                              setActiveSection("content");
                              setContentSubTab("photos");
                            } else if (rec.actionTab === "offers") {
                              setActiveSection("content");
                              setContentSubTab("offers");
                            } else {
                              setActiveSection("overview");
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 text-xs transition-colors shrink-0 flex items-center gap-1 self-start sm:self-center cursor-pointer"
                        >
                          <span>Fix</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Business Journey Progress (6 Progressive Stages) */}
          {journeyData && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {lang === "rw" ? "Urugendo rw'Iterambere ry'Ubucuruzi" : "Business Progress Journey"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === "rw"
                      ? "Inzira y'intambwe 6 igaragaza kwizerwa no gukomera k'ubucuruzi bwawe muri MOSA."
                      : "6-stage milestone tracker measuring commercial trust, completeness, and local discovery."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                    Stage {journeyData.currentStageIndex + 1} of 6: {journeyData.currentStage?.name}
                  </span>
                </div>
              </div>

              {/* Progress Stage Tracker Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {journeyData.stages?.map((stg: any) => {
                  const isPast = stg.isCompleted && !stg.isCurrent;
                  const isCurrent = stg.isCurrent;
                  return (
                    <div
                      key={stg.stage}
                      className={`p-3 rounded-2xl border text-xs transition-all ${
                        isCurrent
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                          : isPast
                          ? "bg-emerald-50/80 text-emerald-900 border-emerald-200/80"
                          : "bg-slate-50 text-slate-400 border-slate-200/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black uppercase ${isCurrent ? "text-emerald-100" : "text-slate-400"}`}>
                          Step {stg.stage}
                        </span>
                        {isPast ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        ) : null}
                      </div>
                      <div className="font-extrabold leading-tight">
                        {lang === "rw" && stg.nameRw ? stg.nameRw : stg.name}
                      </div>
                      <p className={`text-[10px] mt-1 line-clamp-2 ${isCurrent ? "text-emerald-100" : "text-slate-500"}`}>
                        {lang === "rw" && stg.descriptionRw ? stg.descriptionRw : stg.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Next Milestone Step Banner */}
              {journeyData.currentStage?.nextStep && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-transparent border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                      {lang === "rw" ? "Intambwe Ikurikira" : "Recommended Next Milestone Step"}
                    </span>
                    <p className="font-bold text-slate-800">
                      {lang === "rw" && journeyData.currentStage.nextStepRw
                        ? journeyData.currentStage.nextStepRw
                        : journeyData.currentStage.nextStep}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection("content");
                      setContentSubTab("updates");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shrink-0 self-start sm:self-center cursor-pointer shadow-xs"
                  >
                    {lang === "rw" ? "Kora Iki Gikorwa" : "Take Action"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Strictly Business-Owner Specific Progress & Operational Telemetry */}
          {analyticsData && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                        {lang === "rw" ? "Urugendo rw'Iterambere ry'Ubucuruzi Bwawe" : "How Your Business is Progressing on MOSA"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lang === "rw"
                          ? "Amakuru n'imibare by'ubucuruzi bwawe bwite. Nta makuru y'abandi bacuruzi ahagaragara."
                          : "Private to your business account. Real-time telemetry on customer inquiries, catalog reach, and milestone progress."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{lang === "rw" ? "100% Umwirondoro Wihariye" : "100% Private to Your Business"}</span>
                  </span>
                </div>
              </div>

              {/* 6-Card Core Performance Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Profile Views */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate">{lang === "rw" ? "Abasuye Umwirondoro" : "Profile Views"}</span>
                    <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{analyticsData.viewsCount || 0}</div>
                  <div className="text-[10px] text-slate-500 truncate">Total public impressions</div>
                </div>

                {/* 2. Product & Service Inquiries */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 space-y-1">
                  <div className="flex items-center justify-between text-xs text-indigo-900 font-semibold">
                    <span className="truncate">{lang === "rw" ? "Ibyabajijwe ku Bicicuruzwa" : "Item Inquiries"}</span>
                    <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-indigo-900">{analyticsData.productInquiriesCount || 0}</div>
                  <div className="text-[10px] text-indigo-700 truncate">Product & service clicks</div>
                </div>

                {/* 3. Total Customer Inquiries */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/70 space-y-1">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold">
                    <span className="truncate">{lang === "rw" ? "Ubutumwa bw'Abakiriya" : "Total Inquiries"}</span>
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900">{analyticsData.totalInquiries || 0}</div>
                  <div className="text-[10px] text-emerald-700 font-medium truncate">
                    {analyticsData.inquiriesLast30Days || 0} in last 30 days
                  </div>
                </div>

                {/* 4. Contact & WhatsApp Clicks */}
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/70 space-y-1">
                  <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
                    <span className="truncate">{lang === "rw" ? "Guhuza n'Abakiriya" : "Contact Clicks"}</span>
                    <PhoneCall className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-blue-900">{analyticsData.contactClicksCount || 0}</div>
                  <div className="text-[10px] text-blue-700 truncate">Calls, WhatsApp & maps</div>
                </div>

                {/* 5. Active Offerings in Catalog */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/70 space-y-1">
                  <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
                    <span className="truncate">{lang === "rw" ? "Ibicuruzwa Biriho" : "Active Items"}</span>
                    <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-amber-900">{analyticsData.totalProducts || 0}</div>
                  <div className="text-[10px] text-amber-700 truncate">
                    {analyticsData.inStockProducts || 0} in stock
                  </div>
                </div>

                {/* 6. Profile Completeness */}
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200/70 space-y-1">
                  <div className="flex items-center justify-between text-xs text-purple-900 font-semibold">
                    <span className="truncate">{lang === "rw" ? "Ubwuzuzanye" : "Completeness"}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-purple-900">{analyticsData.completenessPercentage || 0}%</div>
                  <div className="text-[10px] text-purple-700 font-medium truncate">
                    {analyticsData.missingFields?.length === 0 ? "Profile 100% complete" : `${analyticsData.missingFields?.length} items pending`}
                  </div>
                </div>
              </div>

              {/* Your Business Assets & Content Inventory */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
                  <span>{lang === "rw" ? "Umutungo n'Ibyashyizwe ku Mwirondoro Wanyu" : "Your Business Content & Catalog Assets"}</span>
                  <span className="text-[11px] font-bold text-slate-500 lowercase">
                    {business.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[11px]">{lang === "rw" ? "Ibicuruzwa" : "Physical Goods"}</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{analyticsData.productsCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[11px]">{lang === "rw" ? "Serivisi" : "Services Listed"}</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{analyticsData.servicesCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[11px]">{lang === "rw" ? "Amafoto y'Imbere" : "Gallery Photos"}</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{analyticsData.photoCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[11px]">{lang === "rw" ? "Videwo Z'Ubucuruzi" : "Showcase Videos"}</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{analyticsData.videoCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[11px]">{lang === "rw" ? "Amatangazo Mazima" : "Active Updates"}</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{analyticsData.activeUpdatesCount || 0}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[11px]">{lang === "rw" ? "Amahirwe y'Akazi" : "Open Listings"}</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">{analyticsData.openOpportunitiesCount || 0}</div>
                  </div>
                </div>
              </div>

              {/* Telemetry Breakdown by Channel & Recent Inquiries Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Channel Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>{lang === "rw" ? "Uburyo Abakiriya Bakugeraho" : "Customer Interaction Channels"}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Direct actions on your profile</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="flex items-center gap-2.5">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-slate-800">WhatsApp Direct Inquiries</span>
                      </span>
                      <span className="font-black text-slate-900">
                        {analyticsData.breakdownByType?.WHATSAPP_CLICK || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="flex items-center gap-2.5">
                        <PhoneCall className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-slate-800">Phone Calls Placed</span>
                      </span>
                      <span className="font-black text-slate-900">
                        {analyticsData.breakdownByType?.PHONE_CALL || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-slate-800">Booking & Appointment Requests</span>
                      </span>
                      <span className="font-black text-slate-900">
                        {analyticsData.breakdownByType?.BOOKING_REQUEST || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="flex items-center gap-2.5">
                        <Smartphone className="w-4 h-4 text-teal-600" />
                        <span className="font-medium text-slate-800">Order & Delivery Inquiries</span>
                      </span>
                      <span className="font-black text-slate-900">
                        {analyticsData.breakdownByType?.ORDER_INQUIRY || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="flex items-center gap-2.5">
                        <Navigation className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-slate-800">Directions & Google Maps Views</span>
                      </span>
                      <span className="font-black text-slate-900">
                        {analyticsData.breakdownByType?.DIRECTIONS_VIEW || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="flex items-center gap-2.5">
                        <Briefcase className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium text-slate-800">Opportunity & Job Responses</span>
                      </span>
                      <span className="font-black text-slate-900">
                        {analyticsData.breakdownByType?.OPPORTUNITY_RESPONSE || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Inquiries List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>{lang === "rw" ? "Ubutumwa bwaherutse kwakirwa" : "Recent Customer Interactions"}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Real-time event stream</span>
                  </h4>
                  {(!analyticsData.recentInquiries || analyticsData.recentInquiries.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                      <p className="font-bold text-slate-600">
                        {lang === "rw" ? "Nta bikorwa by'abakiriya birandikwa." : "No interaction events recorded yet."}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {lang === "rw" ? "Iyo abakiriya bakandye kuri WhatsApp cyangwa telefone, hano hagaragara ako kanya." : "When customers tap WhatsApp, call, or ask about catalog items, they will appear here."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {analyticsData.recentInquiries.map((evt: any) => (
                        <div
                          key={evt.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="truncate space-y-0.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{evt.itemName || evt.type.replace("_", " ")}</span>
                              {evt.itemPrice && (
                                <span className="text-emerald-700 font-black">
                                  ({evt.itemPrice.toLocaleString()} Frw)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Via {evt.channel.replace("_", " ").toLowerCase()} • {evt.type.replace("_", " ")}
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                            {new Date(evt.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Personalized Improvement Recommendations */}
              {analyticsData.recommendations && analyticsData.recommendations.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {lang === "rw" ? "Inama z'Ibikorwa Byakwihutisha Iterambere" : "Personalized Progress Recommendations"}
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {analyticsData.recommendations.length} action items
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analyticsData.recommendations.map((rec: any) => (
                      <div
                        key={rec.id}
                        className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/20 border border-slate-200 flex flex-col justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-slate-900">
                              {lang === "rw" && rec.titleRw ? rec.titleRw : rec.title}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                rec.priority === "HIGH"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] leading-relaxed">
                            {lang === "rw" && rec.descriptionRw ? rec.descriptionRw : rec.description}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (rec.actionSection) {
                              setActiveSection(rec.actionSection as any);
                            }
                            if (rec.actionSubtab) {
                              setContentSubTab(rec.actionSubtab as any);
                            }
                          }}
                          className="self-start px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{lang === "rw" && rec.actionLabelRw ? rec.actionLabelRw : rec.actionLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Everyday Task Shortcuts */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{lang === "rw" ? "Ibikorwa by'Uyu Munsi (Quick Tasks)" : "Everyday Business Actions"}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                onClick={() => {
                  setProductForm({
                    ...productForm,
                    isService: operatingModel.isServiceDefault,
                    unit: operatingModel.model === "SERVICES" ? "service" : (operatingModel.model === "FOOD_DINING" ? "plate/portion" : "item"),
                  });
                  setAddProductModalOpen(true);
                }}
                className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 text-left transition-all flex flex-col justify-between cursor-pointer group"
              >
                <Plus className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-extrabold text-xs">{lang === "rw" ? operatingModel.addBtnLabelRw : operatingModel.addBtnLabel}</div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">{lang === "rw" ? "Ongeraho vuba" : "Quick add"}</div>
                </div>
              </button>

              <button
                onClick={() => setActiveSection("catalog")}
                className="p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200/80 text-left transition-all flex flex-col justify-between cursor-pointer group"
              >
                <DollarSign className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-extrabold text-xs">{lang === "rw" ? "Hindura Ibiciro" : "Change Price"}</div>
                  <div className="text-[10px] text-amber-800 mt-0.5">{lang === "rw" ? "Kanda ku gicuruzwa" : "Select item"}</div>
                </div>
              </button>

              <button
                onClick={() => setActiveSection("catalog")}
                className="p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200/80 text-left transition-all flex flex-col justify-between cursor-pointer group"
              >
                <Tag className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-extrabold text-xs">{lang === "rw" ? "Gucunga Ububiko" : "Manage Stock"}</div>
                  <div className="text-[10px] text-blue-800 mt-0.5">{lang === "rw" ? "Birahari / Bishize" : "Stock toggle"}</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setActiveSection("content");
                  setContentSubTab("photos");
                  setAddPhotoModalOpen(true);
                }}
                className="p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200/80 text-left transition-all flex flex-col justify-between cursor-pointer group"
              >
                <ImageIcon className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-extrabold text-xs">{lang === "rw" ? "Amafoto Mashya" : "Add Photos"}</div>
                  <div className="text-[10px] text-purple-800 mt-0.5">{lang === "rw" ? "Aho mukorera" : "Storefront view"}</div>
                </div>
              </button>

              <button
                onClick={() => setPostOfferModalOpen(true)}
                className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-950 border border-rose-200/80 text-left transition-all flex flex-col justify-between cursor-pointer group"
              >
                <Tag className="w-5 h-5 text-rose-600 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-extrabold text-xs">{lang === "rw" ? "Tanga Poromosiyo" : "Post Offer"}</div>
                  <div className="text-[10px] text-rose-800 mt-0.5">{lang === "rw" ? "Igabanyirizwa" : "Special discount"}</div>
                </div>
              </button>

              <Link
                href={`/business/${business.id}`}
                target="_blank"
                className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300/80 text-left transition-all flex flex-col justify-between cursor-pointer group"
              >
                <ExternalLink className="w-5 h-5 text-slate-700 mb-2 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-extrabold text-xs">{lang === "rw" ? "Reba ku Rubuga" : "View Live Site"}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{lang === "rw" ? "Icyo abakiriya babona" : "Customer view"}</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Performance Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">{t.ownerDashboard.viewsMetric}</span>
                <Eye className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{business.viewsCount}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">Real visits on MOSA</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">{t.ownerDashboard.contactsMetric}</span>
                <PhoneCall className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{business.contactClicksCount}</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-1">Direct calls / WhatsApp</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">{t.ownerDashboard.searchesMetric}</span>
                <Search className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{business.searchAppearancesCount}</div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1">Discovery appearances</div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-card">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Active Products</span>
                <Tag className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{business.products.length}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">Prices in PostgreSQL</div>
            </div>
          </div>

          {/* Active Offer Banner if present */}
          {business.featuredOffer && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-amber-300 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  {business.featuredOffer.discount}
                </span>
                <h4 className="text-base font-extrabold text-slate-900">{business.featuredOffer.title}</h4>
                <p className="text-xs text-slate-500">Valid until {new Date(business.featuredOffer.validUntil).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => {
                  setActiveSection("content");
                  setContentSubTab("offers");
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Manage Offers
              </button>
            </div>
          )}

        </div>
      )}

      {/* SECTION 2: MY BUSINESS (PROFILE, LOCATION, HOURS) */}
      {activeSection === "my_business" && (
        <div className="space-y-6">
          {/* Sub-navigation for My Business */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
            {[
              { key: "profile", label: lang === "rw" ? "Umwirondoro & Nimero" : "Profile & Contacts", icon: Store },
              { key: "location", label: lang === "rw" ? "Aho Dukorera & Ikarita" : "Ground Location & Map", icon: MapPin },
              { key: "hours", label: lang === "rw" ? "Amasaha yo Gukora" : "Operating Hours", icon: Clock },
            ].map((sub) => {
              const Icon = sub.icon;
              const isActive = myBusinessSubTab === sub.key;
              return (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => setMyBusinessSubTab(sub.key as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {myBusinessSubTab === "profile" && (
            <form onSubmit={handleProfileSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">{lang === "rw" ? "Umwirondoro n'Aho Riherereye" : "Business Profile & Geographic Location"}</h3>
            <p className="text-xs text-slate-500">
              Approved changes immediately persist to Neon PostgreSQL and reflect on the public MOSA directory.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Business Name (Primary)</label>
                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Public</span>
              </div>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Name in Kinyarwanda</label>
                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Public</span>
              </div>
              <input
                type="text"
                value={profileForm.nameRw}
                onChange={(e) => setProfileForm({ ...profileForm, nameRw: e.target.value })}
                placeholder="e.g. Salo ya Biryogo"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 3-Tier Canonical Category Classification */}
            <div className="sm:col-span-2 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-emerald-200/60 pb-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    Structured 3-Tier Classification
                  </span>
                  <p className="text-[11px] text-emerald-800/80">
                    Classified in Rwanda Canonical Taxonomy (Sector → Domain → Establishment Type).
                  </p>
                </div>
                {business && (business.status === "ACTIVE" || business.verificationStatus === "HIGH_CONFIDENCE" || business.verificationStatus === "AGENT_VERIFIED") && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    Major sector change requires MOSA admin re-verification
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Main Sector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    1. Economic Sector <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={profileForm.mainCategory}
                    onChange={(e) => {
                      const newMain = e.target.value;
                      const mainObj = CANONICAL_TAXONOMY.find((m) => m.id === newMain);
                      const firstSub = mainObj?.subcategories[0];
                      const firstType = firstSub?.types[0];
                      setProfileForm({
                        ...profileForm,
                        mainCategory: newMain,
                        category: newMain,
                        subCategory: firstSub ? firstSub.id : "",
                        businessType: firstType ? firstType.id : "",
                      });
                    }}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CANONICAL_TAXONOMY.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Subcategory */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    2. Commercial Domain <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={profileForm.subCategory}
                    onChange={(e) => {
                      const newSub = e.target.value;
                      const subObj = ownerAvailableSubcategories.find((s: any) => s.id === newSub);
                      const firstType = subObj?.types[0];
                      setProfileForm({
                        ...profileForm,
                        subCategory: newSub,
                        businessType: firstType ? firstType.id : "",
                      });
                    }}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={ownerAvailableSubcategories.length === 0}
                  >
                    {ownerAvailableSubcategories.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Business Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    3. Establishment Type <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={profileForm.businessType}
                    onChange={(e) => {
                      setProfileForm({
                        ...profileForm,
                        businessType: e.target.value,
                      });
                    }}
                    className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={ownerAvailableBusinessTypes.length === 0}
                  >
                    {ownerAvailableBusinessTypes.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Breadcrumb Preview */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1 flex-wrap">
                <span className="font-bold text-slate-500">Classification:</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-800">
                  {ownerMainCat?.name}
                </span>
                <span className="text-slate-400">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-800">
                  {ownerSubCat?.name}
                </span>
                <span className="text-slate-400">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 font-bold text-emerald-900">
                  {ownerBusinessType?.name}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Proprietor Phone Number</label>
                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Public / SMS Alerts</span>
              </div>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                required
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">WhatsApp Contact</label>
                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Public</span>
              </div>
              <input
                type="tel"
                value={profileForm.whatsapp}
                onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                placeholder="+250 788 000 000"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Description (English)</label>
              <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Public</span>
            </div>
            <textarea
              value={profileForm.description}
              onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
              rows={3}
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Description (Kinyarwanda)</label>
              <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Public</span>
            </div>
            <textarea
              value={profileForm.descriptionRw}
              onChange={(e) => setProfileForm({ ...profileForm, descriptionRw: e.target.value })}
              rows={3}
              placeholder="Sobanura serivisi zanyu mu Kinyarwanda..."
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Location Hierarchy */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>7-Tier Geographic Location Hierarchy</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Sector</label>
                <input
                  type="text"
                  value={profileForm.sector}
                  onChange={(e) => setProfileForm({ ...profileForm, sector: e.target.value })}
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Cell</label>
                <input
                  type="text"
                  value={profileForm.cell}
                  onChange={(e) => setProfileForm({ ...profileForm, cell: e.target.value })}
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Local Area / Landmark Note</label>
                <input
                  type="text"
                  value={profileForm.addressNote}
                  onChange={(e) => setProfileForm({ ...profileForm, addressNote: e.target.value })}
                  placeholder="e.g. KG 569 St near MINAGRI"
                  className="w-full p-2.5 bg-white rounded-xl border border-slate-300 text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">
                  {lang === "rw" ? "Amerekezo n'Ikarita by'Ubucuruzi" : "Interactive Map, Nearest Landmark & Navigation"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMyBusinessSubTab("location")}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{lang === "rw" ? "Genzura Ikarita" : "Open Location & Map Tab"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profileForm.isOpenNow}
                onChange={(e) => setProfileForm({ ...profileForm, isOpenNow: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span className="text-xs font-bold text-slate-800">
                {lang === "rw" ? "Ubucuruzi burafunguye ubu (Open Right Now)" : "Currently Open for Customers"}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {loading ? "Saving to Database..." : lang === "rw" ? "Bika Impinduka zose" : "Save & Publish Changes"}
            </button>
          </div>
        </form>
      )}

      {myBusinessSubTab === "location" && (
        <form onSubmit={handleLocationSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <span>{lang === "rw" ? "Aho Mubarizwa n'Amabwiriza yo Kugera ku Bucuruzi" : "Location, Landmark & Human Navigation"}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                {lang === "rw"
                  ? "Mu Rwanda, abakiriya bamenya aho ubucuruzi buherereye binyuze mu birango bizwi n'amabwiriza y'inzira kuruta aderesi zanditse. Uzuza ibi bisabwa kugira ngo abaguzi bakubone vuba."
                  : "In Rwanda, local discovery depends on recognizable landmarks and physical navigation cues. Update your human reference points, landmarks, and GPS pin."}
              </p>
            </div>

            {/* Quality Score & Status Pills */}
            {(() => {
              const quality = calculateLocationCompleteness({
                latitude: locationForm.latitude,
                longitude: locationForm.longitude,
                locationAccuracy: locationForm.locationAccuracy,
                locationSource: locationForm.locationSource,
                locationVerificationStatus: locationForm.locationVerificationStatus,
                nearestLandmark: locationForm.nearestLandmark,
                locationDescription: locationForm.locationDescription,
              });

              return (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {lang === "rw" ? "Ubwiza bw'Aho Mubarizwa" : "Location Completeness"}
                    </span>
                    <span
                      className={`text-xs font-extrabold ${
                        quality.score >= 75
                          ? "text-emerald-700"
                          : quality.score >= 50
                          ? "text-blue-700"
                          : "text-amber-700"
                      }`}
                    >
                      {quality.score}% ({quality.level})
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Verification & Source Status */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">{lang === "rw" ? "Imiterere y'Iyemezwa:" : "Verification Status:"}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  locationForm.locationVerificationStatus === "AGENT_CAPTURED" ||
                  locationForm.locationVerificationStatus === "AGENT_VERIFIED" ||
                  locationForm.locationVerificationStatus === "BUSINESS_CONFIRMED"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {locationForm.locationVerificationStatus || "UNVERIFIED"}
              </span>

              <span className="text-slate-400">•</span>

              <span className="text-slate-600">
                {lang === "rw" ? "Inkomoko:" : "Source:"} <strong>{locationForm.locationSource || "OWNER_DECLARED"}</strong>
              </span>

              {locationForm.locationAccuracy && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">
                    {lang === "rw" ? "Ubusobanutse bwa GPS:" : "GPS Accuracy:"} <strong>±{locationForm.locationAccuracy}m</strong>
                  </span>
                </>
              )}
            </div>

            <a
              href={getGoogleMapsDirectionsUrl({
                lat: locationForm.latitude,
                lng: locationForm.longitude,
                name: business?.name || "Business",
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{lang === "rw" ? "Suzuma Inzira ya Google Maps" : "Test Live Directions Link"}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          {/* Administrative Hierarchy (Read/Quick Edit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                {lang === "rw" ? "Umurenge (Sector)" : "Sector"}
              </label>
              <input
                type="text"
                value={locationForm.sector}
                onChange={(e) => setLocationForm({ ...locationForm, sector: e.target.value })}
                required
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                {lang === "rw" ? "Akagari (Cell)" : "Cell"}
              </label>
              <input
                type="text"
                value={locationForm.cell}
                onChange={(e) => setLocationForm({ ...locationForm, cell: e.target.value })}
                required
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Human Reference Points */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>{lang === "rw" ? "Ikirango cy'Aho Mwegereye (Nearest Landmark) *" : "Nearest Landmark *"}</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  High Discovery Value
                </span>
              </div>
              <input
                type="text"
                value={locationForm.nearestLandmark}
                onChange={(e) => setLocationForm({ ...locationForm, nearestLandmark: e.target.value })}
                placeholder={
                  lang === "rw"
                    ? "urugero: Metero 50 inyuma ya Cosmos Junction, hafi y'Umusigiti w'Icyatsi"
                    : "e.g. 50m behind Cosmos Junction, opposite Green Mosque"
                }
                required
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === "rw"
                  ? "Koresha ahantu hazwi cyane (isoko, amasangano, umusigiti, kiliziya, sitasiyo)."
                  : "Use well-known local landmarks so search engines and neighborhood residents can locate you easily."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  {lang === "rw" ? "Izina ry'Umuhanda (Street Name - Optional)" : "Street / Road Name (Optional)"}
                </label>
                <input
                  type="text"
                  value={locationForm.streetName}
                  onChange={(e) => setLocationForm({ ...locationForm, streetName: e.target.value })}
                  placeholder="e.g. KG 569 St or KN 20 Ave"
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  {lang === "rw" ? "Ahantu Hazwi Byegereye (Nearby Place)" : "Nearby Well-Known Place"}
                </label>
                <input
                  type="text"
                  value={locationForm.nearbyPlace}
                  onChange={(e) => setLocationForm({ ...locationForm, nearbyPlace: e.target.value })}
                  placeholder="e.g. Opposite Inyange Milk Zone"
                  className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === "rw" ? "Amabwiriza y'Inzira (Physical Navigation Instructions) *" : "Human Navigation Directions *"}</span>
                </label>
                <span className="text-[10px] font-bold text-slate-500">Visible on Public Page</span>
              </div>
              <textarea
                value={locationForm.locationDescription}
                onChange={(e) => setLocationForm({ ...locationForm, locationDescription: e.target.value })}
                rows={3}
                placeholder={
                  lang === "rw"
                    ? "urugero: Injirira mu marembo y'ubururu afite ikimenyetso cya MTN, kora intambwe 10, umuryango wa 3 ku kuboko kw'iburyo."
                    : "e.g. Enter through the blue metal gate next to MTN kiosk, walk down the corridor, 3rd door on the right."
                }
                required
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === "rw"
                  ? "Ibi bituma umukiriya agera aho mukorera bitamugoye n'ubwo yaba ahageze bwa mbere."
                  : "Clear pedestrian navigation instructions make first-time visits effortless for your customers."}
              </p>
            </div>
          </div>

          {/* Interactive Map & GPS Acquisition */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-emerald-600" />
                  <span>{lang === "rw" ? "Ikarita n'Imyirondoro ya GPS" : "Interactive Map & Precise Coordinates"}</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === "rw"
                    ? "Kanda ku ikarita cyangwa ukurure agapini kugira ngo uhitemo neza aho umuryango w'ubucuruzi buherereye."
                    : "Drag the map pin or use the button below to update your GPS coordinates from your device."}
                </p>
              </div>

              {/* Capture Current GPS Button */}
              <button
                type="button"
                onClick={handleCaptureCurrentLocation}
                disabled={isCapturingGps}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Crosshair className={`w-3.5 h-3.5 text-emerald-400 ${isCapturingGps ? "animate-spin" : ""}`} />
                <span>
                  {isCapturingGps
                    ? lang === "rw"
                      ? "Gufata GPS..."
                      : "Acquiring GPS..."
                    : lang === "rw"
                    ? "Fata GPS ya Telefoni Yanjye"
                    : "Capture GPS from My Device"}
                </span>
              </button>
            </div>

            {gpsMessage && (
              <div className="p-2.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{gpsMessage}</span>
              </div>
            )}

            {/* Coordinates display */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Latitude</span>
                <span className="font-mono font-bold text-slate-800">{locationForm.latitude.toFixed(6)}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Longitude</span>
                <span className="font-mono font-bold text-slate-800">{locationForm.longitude.toFixed(6)}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Source</span>
                <span className="font-bold text-slate-800">{locationForm.locationSource}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Accuracy</span>
                <span className="font-bold text-slate-800">
                  {locationForm.locationAccuracy ? `±${locationForm.locationAccuracy}m` : "Manual"}
                </span>
              </div>
            </div>

            {/* Embedded MosaMap preview with draggable pin */}
            <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-xs">
              <MosaMap
                center={{ lat: locationForm.latitude, lng: locationForm.longitude }}
                zoom={16}
                draggablePin={true}
                draggableCoords={{ lat: locationForm.latitude, lng: locationForm.longitude }}
                onCoordinateChange={(newCoords) => {
                  setLocationForm((prev) => ({
                    ...prev,
                    latitude: Number(newCoords.lat.toFixed(6)),
                    longitude: Number(newCoords.lng.toFixed(6)),
                    locationSource: "OWNER_DECLARED",
                  }));
                }}
                accuracyRadiusMeters={locationForm.locationAccuracy}
                heightClassName="h-72 sm:h-80"
                showDirectionsButton={true}
                interactive={true}
              />
            </div>
            <p className="text-[11px] text-slate-500 italic">
              💡 {lang === "rw" ? "Inama: Ushobora gukanda ugakurura agapini ku ikarita ukakageza aho umuryango wanyu uri nyakuri." : "Tip: Drag the pin on the map to place it exactly above your shop or workshop entrance."}
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveSection("overview")}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {lang === "rw" ? "Reka / Subira Inyuma" : "Cancel"}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {loading
                  ? "Saving Location..."
                  : lang === "rw"
                  ? "Bika Aho Mubarizwa ku Rubuga"
                  : "Save & Synchronize Location"}
              </span>
            </button>
          </div>
        </form>
      )}

      {myBusinessSubTab === "hours" && (
        <form onSubmit={handleHoursSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">{lang === "rw" ? "Amasaha yo Gukora" : "Operating Hours Schedule"}</h3>
            <p className="text-xs text-slate-500">
              Clear opening hours increase customer confidence and contribute directly to your Business Health score.
            </p>
          </div>

          <div className="space-y-3">
            {hoursForm.map((h, index) => (
              <div
                key={h.day}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="w-36 font-bold text-slate-900 flex items-center gap-2">
                  <span>{lang === "rw" ? h.dayRw : h.day}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-slate-400">Open:</label>
                    <input
                      type="time"
                      value={h.open}
                      disabled={h.isClosed}
                      onChange={(e) => {
                        const updated = [...hoursForm];
                        updated[index].open = e.target.value;
                        setHoursForm(updated);
                      }}
                      className="p-1.5 bg-white rounded-lg border border-slate-300 font-mono text-xs outline-none disabled:opacity-50"
                    />
                  </div>

                  <span className="text-slate-400">-</span>

                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-slate-400">Close:</label>
                    <input
                      type="time"
                      value={h.close}
                      disabled={h.isClosed}
                      onChange={(e) => {
                        const updated = [...hoursForm];
                        updated[index].close = e.target.value;
                        setHoursForm(updated);
                      }}
                      className="p-1.5 bg-white rounded-lg border border-slate-300 font-mono text-xs outline-none disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={h.isClosed}
                      onChange={(e) => {
                        const updated = [...hoursForm];
                        updated[index].isClosed = e.target.checked;
                        setHoursForm(updated);
                      }}
                      className="accent-red-600 rounded"
                    />
                    <span className={h.isClosed ? "text-red-600" : ""}>Closed all day</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {lang === "rw" ? "Bika Amasaha yose" : "Save Operating Hours"}
            </button>
          </div>
        </form>
      )}
        </div>
      )}

      {/* SECTION 3: CATALOGUE (SERVICES / MENU / PRODUCTS) */}
      {activeSection === "catalog" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {operatingModel.model === "SERVICES"
                  ? (lang === "rw" ? "Serivisi n'Ibiciro" : "Services & Prices")
                  : (operatingModel.model === "FOOD_DINING"
                      ? (lang === "rw" ? "Amenu n'Ibyo Kurya" : "Menu & Offerings")
                      : (lang === "rw" ? "Ibicuruzwa n'Ububiko" : "Products & Stock"))}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === "rw"
                  ? "Vugurura ibiciro cyangwa imiterere y'ububiko ako kanya. Buri gicuruzwa gihita kibikwa muri PostgreSQL kikanagaragara ku rubuga rusange."
                  : "Update prices and stock availability in real time. Changes persist directly to Neon PostgreSQL and synchronize to your public mini-website."}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                  {business.products.length} {lang === "rw" ? "byose hamwe" : "total items"}
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                  {business.products.filter((p) => p.isAvailable !== false).length} {lang === "rw" ? "birahari (In Stock)" : "in stock"}
                </span>
                {business.products.some((p) => p.isAvailable === false) && (
                  <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full font-bold">
                    {business.products.filter((p) => p.isAvailable === false).length} {lang === "rw" ? "bishize (Out of Stock)" : "out of stock"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setShowAiAssistant(!showAiAssistant)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  showAiAssistant
                    ? "bg-purple-100 text-purple-800 border border-purple-300"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>{lang === "rw" ? "AI Assistant" : "AI Assistant"}</span>
              </button>

              <button
                onClick={() => {
                  setProductForm({
                    ...productForm,
                    isService: operatingModel.isServiceDefault,
                    unit: operatingModel.model === "SERVICES" ? "service" : (operatingModel.model === "FOOD_DINING" ? "plate/portion" : "item"),
                  });
                  setAddProductModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === "rw" ? operatingModel.addBtnLabelRw : operatingModel.addBtnLabel}</span>
              </button>
            </div>
          </div>

          {/* Collapsible AI Catalogue Assistant */}
          {showAiAssistant && (
            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    {lang === "rw" ? "AI Ikora Urutonde rw'Ibicuruzwa" : "AI Catalogue Builder"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiAssistant(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-600 text-[11px]">
                {lang === "rw"
                  ? "Andika amagambo asanzwe (urugero: 'Dukora imisatsi ya kizungu ku 2,000 Frw n'ubwanwa ku 1,000 Frw.'). AI irabigutunganyiriza nta guhimba ibiciro."
                  : "Type natural text (e.g. 'We offer beard trim for 1500 RWF and haircut for 3000 RWF'). The AI extracts items and prices for your approval."}
              </p>

              <form onSubmit={handleAssistantSubmit} className="space-y-3">
                <textarea
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder={lang === "rw" ? "Andika hano ibicuruzwa cyangwa serivisi n'ibiciro..." : "e.g. Standard haircut 2000 RWF, Beard trim 1000 RWF, Hair dye 5000 RWF"}
                  rows={3}
                  className="w-full p-3 bg-white rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>{lang === "rw" ? "AI ntizigera ihimba ibiciro utayihaye." : "AI will never invent prices not provided by you."}</span>
                  </span>

                  <button
                    type="submit"
                    disabled={assistantLoading}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{assistantLoading ? (lang === "rw" ? "Biri gutunganywa..." : "Processing...") : (lang === "rw" ? "Tunganya na AI" : "Structure with AI")}</span>
                  </button>
                </div>
              </form>

              {assistantProposals.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{lang === "rw" ? "Ibyabonetse:" : "Proposed Items:"}</span>
                    <span className="text-[10px] text-purple-700 font-semibold">{assistantDisclaimer}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {assistantProposals.map((prop, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-purple-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{prop.name}</span>
                          <span className="font-black text-slate-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs">
                            {prop.priceType === "RANGE" ? `${prop.priceMin} – ${prop.priceMax} RWF` : `${prop.price} RWF`}
                          </span>
                        </div>
                        {prop.description && <p className="text-slate-500 text-[11px]">{prop.description}</p>}
                        <button
                          type="button"
                          onClick={() => handleAcceptProposal(prop)}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          {lang === "rw" ? "Emeza Ongeraho" : "Confirm & Add to Catalogue"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {business.products.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-3">
              <Tag className="w-8 h-8 mx-auto text-slate-300" />
              <p>
                {lang === "rw"
                  ? "Nta kintu kirashyirwaho. Ongeraho ibyo mukora kugira ngo byubake icyizere ku bakiriya."
                  : "No items listed yet. Add your offerings to build trust with local customers."}
              </p>
              <button
                onClick={() => {
                  setProductForm({
                    ...productForm,
                    isService: operatingModel.isServiceDefault,
                    unit: operatingModel.model === "SERVICES" ? "service" : (operatingModel.model === "FOOD_DINING" ? "plate/portion" : "item"),
                  });
                  setAddProductModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs"
              >
                {lang === "rw" ? operatingModel.addBtnLabelRw : operatingModel.addBtnLabel}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {business.products.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{item.name}</span>
                      {item.isAvailable === false ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {lang === "rw" ? "Bishize (Out of Stock)" : "Out of Stock"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {lang === "rw" ? "Birahari" : "In Stock"}
                        </span>
                      )}
                      {item.isEstimated && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ~ Estimated
                        </span>
                      )}
                    </div>

                    {item.nameRw && item.nameRw !== item.name && (
                      <div className="text-xs text-slate-500 italic">{item.nameRw}</div>
                    )}

                    {item.description && <p className="text-xs text-slate-500">{item.description}</p>}

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Category: {item.category || "General"}</span>
                      <span>•</span>
                      <span>Unit: /{item.unit || "item"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-black text-slate-900">
                        {item.priceType === "RANGE" && item.priceMin && item.priceMax
                          ? `${item.priceMin.toLocaleString()} – ${item.priceMax.toLocaleString()} Frw`
                          : `${item.price.toLocaleString()} Frw`}
                      </div>
                      <div className="text-[10px] text-slate-400">Verified in PostgreSQL</div>
                    </div>

                    {/* Low-Digital-Literacy 1-Click Action Controls */}
                    <div className="flex items-center gap-1.5">
                      {/* 1-Click Stock Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          item.isAvailable !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        }`}
                        title={item.isAvailable !== false ? "Click to mark out of stock" : "Click to mark in stock"}
                      >
                        <span className={`w-2 h-2 rounded-full ${item.isAvailable !== false ? "bg-emerald-500" : "bg-red-500"}`} />
                        <span>
                          {item.isAvailable !== false
                            ? (lang === "rw" ? "Birahari" : "In Stock")
                            : (lang === "rw" ? "Bishize" : "Out of Stock")}
                        </span>
                      </button>

                      {/* Quick Price Change Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPriceProduct(item);
                          setQuickPriceValue(item.price);
                          setQuickPriceModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-slate-200/80"
                        title="Quick Price Change"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{lang === "rw" ? "Hindura Igiciro" : "Change Price"}</span>
                      </button>

                      {/* Full Edit Modal */}
                      <button
                        onClick={() => {
                          setSelectedProduct(item);
                          setProductForm({
                            name: item.name,
                            nameRw: item.nameRw || "",
                            description: item.description || "",
                            price: item.price,
                            priceMin: item.priceMin ? String(item.priceMin) : "",
                            priceMax: item.priceMax ? String(item.priceMax) : "",
                            priceType: item.priceType || "FIXED",
                            unit: item.unit || "service",
                            category: item.category || "General",
                            isAvailable: item.isAvailable,
                            isEstimated: Boolean(item.isEstimated),
                            isService: Boolean((item as any).isService),
                          });
                          setEditProductModalOpen(true);
                        }}
                        className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleArchiveProduct(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Archive Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: CONTENT (UPDATES, OPPORTUNITIES, PHOTOS, VIDEOS, OFFERS) */}
      {activeSection === "content" && (
        <div className="space-y-6">
          {/* Sub-tab Pills */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
            <button
              onClick={() => setContentSubTab("updates")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                contentSubTab === "updates"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>{lang === "rw" ? "Amatangazo" : "Updates & Bulletins"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  contentSubTab === "updates" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {updatesList.length}
              </span>
            </button>

            <button
              onClick={() => setContentSubTab("opportunities")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                contentSubTab === "opportunities"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>{lang === "rw" ? "Amahirwe n'Akazi" : "Hiring & Opportunities"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  contentSubTab === "opportunities" ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800"
                }`}
              >
                {opportunitiesList.length}
              </span>
            </button>

            <button
              onClick={() => setContentSubTab("photos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                contentSubTab === "photos"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{lang === "rw" ? "Amafoto y'Ubucuruzi" : "Storefront Photos"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  contentSubTab === "photos" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {ownerMediaList.filter((m) => m.mediaType === "IMAGE").length}
              </span>
            </button>

            <button
              onClick={() => setContentSubTab("videos")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                contentSubTab === "videos"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{lang === "rw" ? "Videwo Ngufi (≤ 60s)" : "Short Showcase Videos"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  contentSubTab === "videos" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"
                }`}
              >
                {ownerMediaList.filter((m) => m.mediaType === "VIDEO").length}
              </span>
            </button>

            <button
              onClick={() => setContentSubTab("offers")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                contentSubTab === "offers"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>{lang === "rw" ? "Poromosiyo n'Igorora" : "Special Offers"}</span>
              {business.featuredOffer && (
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              )}
            </button>
          </div>

          {/* Sub-tab 0: BUSINESS UPDATES & BULLETINS */}
          {contentSubTab === "updates" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lang === "rw" ? "Amatangazo n'Amakuru Mashya" : "Business Updates & Announcements"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === "rw"
                      ? "Tangaza ibicuruzwa bishya byageze mu iduka, impinduka muri serivisi, cyangwa ibindi wakira abakiriya."
                      : "Broadcast new arrivals, service modifications, temporary closures, and official notices."}
                  </p>
                </div>
                <button
                  onClick={() => setAddUpdateModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "rw" ? "Andika Itangazo Rishya" : "Publish Update"}</span>
                </button>
              </div>

              {updatesList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                  <Megaphone className="w-8 h-8 mx-auto text-slate-300" />
                  <p>
                    {lang === "rw"
                      ? "Nta tangazo rirashyirwaho. Tangaza amakuru mashya kugira ngo abakiriya bamenye ibigezweho."
                      : "No updates published yet. Inform your customers about new inventory, schedule changes, or notices."}
                  </p>
                  <button
                    onClick={() => setAddUpdateModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === "rw" ? "Tangaza Itangazo rya Mbere" : "Publish First Update"}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {updatesList.map((u) => (
                    <div
                      key={u.id}
                      className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                            {u.badge || u.type.replace("_", " ")}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm">
                          {lang === "rw" && u.titleRw ? u.titleRw : u.title}
                        </h4>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {lang === "rw" && u.contentRw ? u.contentRw : u.content}
                        </p>

                        {u.imageUrl && (
                          <img
                            src={u.imageUrl}
                            alt={u.title}
                            className="rounded-xl w-full h-32 object-cover border border-slate-200"
                          />
                        )}

                        {u.validUntil && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Expires: {new Date(u.validUntil).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end pt-2 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => handleDeleteUpdate(u.id)}
                          className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === "rw" ? "Siba" : "Delete"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab: HIRING & OPPORTUNITIES */}
          {contentSubTab === "opportunities" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lang === "rw" ? "Amahirwe y'Akazi n'Ubufatanye" : "Hiring, Supply & Business Partnerships"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === "rw"
                      ? "Shaka abakozi, abagemuzi b'ibicuruzwa, cyangwa abafatanyabikorwa bashya mu gace kanyu."
                      : "Post employment openings, supplier procurement requests, and collaborative business partnerships."}
                  </p>
                </div>
                <button
                  onClick={() => setAddOppModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "rw" ? "Shyiraho Itangazo Rishya" : "Post Opportunity"}</span>
                </button>
              </div>

              {opportunitiesList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                  <Briefcase className="w-8 h-8 mx-auto text-slate-300" />
                  <p>
                    {lang === "rw"
                      ? "Nta mahirwe y'akazi cyangwa ubufatanye aratangazwa. Tangaza umwanya w'akazi cyangwa ibyo ukeneye kugemurirwa."
                      : "No opportunities posted yet. Recruit local workers, request supplies, or find business partners."}
                  </p>
                  <button
                    onClick={() => setAddOppModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === "rw" ? "Tangaza Umwanya wa Mbere" : "Post First Opportunity"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {opportunitiesList.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                            {opp.type.replace("_", " ")}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              opp.status === "OPEN"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {opp.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateOppStatus(opp.id, opp.status === "OPEN" ? "CLOSED" : "OPEN")}
                            className="text-xs text-slate-600 hover:text-slate-900 font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer"
                          >
                            {opp.status === "OPEN" ? "Close/Pause" : "Re-open"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOpportunity(opp.id)}
                            className="text-xs text-red-600 hover:text-red-700 font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-base">
                          {lang === "rw" && opp.titleRw ? opp.titleRw : opp.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {lang === "rw" && opp.descriptionRw ? opp.descriptionRw : opp.description}
                        </p>
                      </div>

                      {(opp.compensation || opp.requirements) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200/70">
                          {opp.compensation && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Compensation</span>
                              <span className="font-semibold text-emerald-700">{opp.compensation}</span>
                            </div>
                          )}
                          {opp.requirements && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Requirements</span>
                              <span className="font-medium text-slate-700">{opp.requirements}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Applicant Inquiries List */}
                      <div className="pt-2 border-t border-slate-200/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Applicants & Responses ({opp.inquiries?.length || 0})</span>
                          </span>
                        </div>

                        {(!opp.inquiries || opp.inquiries.length === 0) ? (
                          <div className="p-3 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-100">
                            No responses received yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {opp.inquiries.map((inq: any) => (
                              <div
                                key={inq.id}
                                className="p-3 rounded-xl bg-white border border-slate-200/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 font-bold text-slate-900">
                                    <span>{inq.applicantName}</span>
                                    <span className="text-slate-400 font-normal font-mono">{inq.applicantPhone}</span>
                                    <span
                                      className={`text-[9px] font-black px-2 py-0.2 rounded-full ${
                                        inq.status === "NEW"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : inq.status === "CONTACTED"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {inq.status}
                                    </span>
                                  </div>
                                  {inq.message && <p className="text-slate-600 text-[11px]">{inq.message}</p>}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <a
                                    href={`https://wa.me/${inq.applicantPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                      `Muraho ${inq.applicantName}, nabonye ubusabe bwawe ku mwanya wa "${opp.title}" kuri MOSA.`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                  {inq.status === "NEW" && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateInquiryStatus(inq.id, "CONTACTED")}
                                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                                    >
                                      Mark Contacted
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 1: PHOTOS */}
          {contentSubTab === "photos" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lang === "rw" ? "Amafoto y'Ubucuruzi n'Ahantu Mukorera" : "Business Photos & Storefront Gallery"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === "rw"
                      ? "Shyiraho amafoto y'aho mukorera, ibyapa, n'ibicuruzwa kugira ngo abakiriya babone neza ubucuruzi bwawe."
                      : "Upload authentic photos of your entrance, workshop, display counters, and products to build immediate customer confidence."}
                  </p>
                </div>
                <button
                  onClick={() => setAddPhotoModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "rw" ? "Ongeraho Ifoto" : "Add Photo"}</span>
                </button>
              </div>

              {ownerMediaList.filter((m) => m.mediaType === "IMAGE").length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium text-slate-500">
                    {lang === "rw"
                      ? "Nta mafoto y'ubucuruzi urashyiraho. Ongeraho ifoto y'ahagana hanze cyangwa ibicuruzwa."
                      : "No photos uploaded yet. Add storefront or product photos to showcase your business."}
                  </p>
                  <button
                    onClick={() => setAddPhotoModalOpen(true)}
                    className="mt-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                  >
                    {lang === "rw" ? "Shyiraho Ifoto ya Mbere" : "Upload First Photo"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {ownerMediaList
                    .filter((m) => m.mediaType === "IMAGE")
                    .map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 aspect-square shadow-xs"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || "Business photo"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {photo.isCover && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shadow-xs">
                            Cover
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                          {photo.caption && (
                            <p className="text-[11px] text-white font-medium line-clamp-2 mb-1">
                              {photo.caption}
                            </p>
                          )}
                          <button
                            onClick={() => handleDeleteMedia(photo.id)}
                            className="self-end p-1.5 rounded-lg bg-red-600/90 hover:bg-red-700 text-white transition-colors cursor-pointer"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: VIDEOS */}
          {contentSubTab === "videos" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lang === "rw" ? "Videwo Ngufi z'Ubucuruzi (Munsi y'Amasegonda 60)" : "Short Business Showcase Videos (≤ 60s)"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === "rw"
                      ? "Videwo ngufi zerekana ibicuruzwa, ubuhanga mukoresha, cyangwa aho mukorera ku rubuga rwanyu rwa MOSA."
                      : "Short authentic video clips showing your products, craftsmanship, or facilities to boost community engagement."}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!isVerifiedForVideo) {
                      alert(
                        lang === "rw"
                          ? "Gushyiraho videwo bisaba ko ubucuruzi bwemejwe (Verified Status)."
                          : "Publishing short showcase videos requires a verified business status. Please complete verification first."
                      );
                      return;
                    }
                    setAddVideoModalOpen(true);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-sm ${
                    isVerifiedForVideo
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>{lang === "rw" ? "Shyiraho Videwo" : "Upload Short Video"}</span>
                </button>
              </div>

              {/* Verification Status Banner for Videos */}
              {!isVerifiedForVideo ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-amber-900">
                      {lang === "rw" ? "Uruhushya rwo gukoresha Videwo rurasaba Kwemezwa" : "Short Video Publishing Requires Business Verification"}
                    </div>
                    <div className="text-amber-700 mt-0.5 leading-relaxed">
                      {lang === "rw"
                        ? "Kugira ngo abakiriya bagirire icyizere amashusho abashukiraho, videwo ngufi zemererwa gusa ubucuruzi bwamaze kwemezwa (Agent Verified / High Confidence). Amafoto yo ashobora gukoreshwa igihe cyose."
                        : "To protect community trust and prevent unmoderated spam, showcase videos (≤ 60s) are unlocked once your business is agent-verified or high-confidence. Photos can still be uploaded anytime."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-900">
                      {lang === "rw" ? "Uruhushya rwa Videwo ruremewe" : "Verified Video Showcase Unlocked"}
                    </div>
                    <div className="text-emerald-700 mt-0.5 leading-relaxed">
                      {lang === "rw"
                        ? "Ubucuruzi bwawe buraremejwe! Urashobora gushyiraho videwo ngufi (munsi y'amasegonda 60) zigaragaza ibyo ukora, ibicuruzwa bishya cyangwa aho ukorera."
                        : "Your business is verified. You can publish authentic promotional clips (≤ 60 seconds) directly to your public mini-website."}
                    </div>
                  </div>
                </div>
              )}

              {/* Video List */}
              {ownerMediaList.filter((m) => m.mediaType === "VIDEO").length === 0 ? (
                <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2">
                  <Video className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium text-slate-500">
                    {lang === "rw"
                      ? "Nta videwo ngufi z'ubucuruzi urashyiraho. Shyiraho videwo y'isegonda 15-60 yerekana ibicuruzwa byawe!"
                      : "No short business videos published yet. Add a quick clip of your products, workshop, or services to engage local buyers."}
                  </p>
                  {isVerifiedForVideo && (
                    <button
                      onClick={() => setAddVideoModalOpen(true)}
                      className="mt-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                    >
                      {lang === "rw" ? "Shyiraho Videwo ya Mbere" : "Upload First Video"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownerMediaList
                    .filter((m) => m.mediaType === "VIDEO")
                    .map((video) => (
                      <div
                        key={video.id}
                        className="group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                      >
                        <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.caption || "Video thumbnail"}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-purple-900 to-slate-900">
                              <Video className="w-10 h-10 text-purple-300/60" />
                            </div>
                          )}
                          <button
                            onClick={() => setPreviewVideo(video)}
                            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                          >
                            <Play className="w-5 h-5 ml-0.5 fill-slate-900" />
                          </button>
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            {video.durationSec && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-black/75 text-white backdrop-blur-xs">
                                {video.durationSec}s
                              </span>
                            )}
                            {video.topic && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-600/90 text-white uppercase tracking-wider">
                                {video.topic}
                              </span>
                            )}
                          </div>
                          <div className="absolute bottom-2 right-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                video.moderationStatus === "APPROVED"
                                  ? "bg-emerald-500/90 text-white"
                                  : video.moderationStatus === "REMOVED"
                                  ? "bg-red-600/90 text-white"
                                  : "bg-amber-500/90 text-white"
                              }`}
                            >
                              {video.moderationStatus}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                              {video.caption || "Showcase video"}
                            </p>
                            {video.moderationReason && video.moderationStatus === "REMOVED" && (
                              <div className="mt-1 text-[11px] text-red-600 bg-red-50 p-1.5 rounded-lg">
                                Removal note: {video.moderationReason}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-400">
                              {video.viewsCount || 0} views
                            </span>
                            <button
                              onClick={() => handleDeleteMedia(video.id)}
                              className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 p-1 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 3: OFFERS */}
          {contentSubTab === "offers" && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lang === "rw" ? "Ibyiciro By'Igorora na Poromosiyo" : "Neighborhood Special Offers"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === "rw"
                      ? "Shyiraho igabanuka ry'ibiciro rimara igihe runaka rigaragara ku rubuga rwawe rw'abakiriya."
                      : "Publish time-limited discounts and neighborhood incentives that display prominently on your public mini-website."}
                  </p>
                </div>

                <button
                  onClick={() => setPostOfferModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                >
                  <Tag className="w-4 h-4" />
                  <span>{lang === "rw" ? "Shyiraho Poromosiyo" : "Post New Offer"}</span>
                </button>
              </div>

              {business.featuredOffer ? (
                <div className="p-6 rounded-3xl bg-amber-50 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded bg-amber-500 text-slate-950">
                      {business.featuredOffer.discount}
                    </span>
                    <span className="text-xs text-slate-500">
                      Valid Until: {new Date(business.featuredOffer.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900">{business.featuredOffer.title}</h4>
                  <p className="text-xs text-slate-600">{business.featuredOffer.description || "Neighborhood exclusive promotion."}</p>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>
                    {lang === "rw"
                      ? "Nta poromosiyo ifunguye muri aka kanya. Ongeraho igabanuka ry'ibiciro ry'impera z'icyumweru!"
                      : "No active special offers. Post a weekend special or first-time customer discount to drive foot traffic."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: ORDERS & BOOKINGS (WHATSAPP COMMERCE HUB) */}
      {activeSection === "orders_bookings" && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-2xl bg-emerald-100 text-emerald-700">
                  <MessageCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {operatingModel.hasBookings
                      ? (lang === "rw" ? "Kwakira Gahunda n'Ibyifuzo kuri WhatsApp" : "WhatsApp Appointments & Bookings Hub")
                      : (lang === "rw" ? "Kwakira Amatungo n'Ibicuruzwa kuri WhatsApp" : "Direct WhatsApp Orders & Inquiries Hub")}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === "rw"
                      ? "Uburyo abakiriya bakwandikira muri WhatsApp bavuye ku rubuga rwawe rwa MOSA, bitiriwe abahuza cyangwa amafaranga y'inyongera."
                      : "Direct merchant-to-customer commerce. Local customers click directly to your WhatsApp with pre-filled inquiries—zero platform fees and no middleman lock-in."}
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp Configuration Status Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {lang === "rw" ? "Nimero ya WhatsApp y'Ubucuruzi" : "Configured WhatsApp Business Number"}
                </div>
                <div className="text-base font-black text-slate-900 font-mono flex items-center gap-2">
                  <span>{business.whatsapp || business.phone || "No number configured"}</span>
                  {(business.whatsapp || business.phone) ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {lang === "rw" ? "Irakora" : "Active"}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">
                      {lang === "rw" ? "Ikenewe" : "Required"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === "rw"
                    ? "Abakiriya bose bakanda kuri buto yo gutumiza cyangwa kubika bahita boherezwa kuri iyi nimero."
                    : "All customer order and booking clicks from your public mini-website route to this WhatsApp."}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => {
                    setActiveSection("my_business");
                    setMyBusinessSubTab("profile");
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 transition cursor-pointer"
                >
                  {lang === "rw" ? "Hindura Nimero" : "Change Number"}
                </button>

                {Boolean(business.whatsapp || business.phone) && (
                  <a
                    href={`https://wa.me/${(business.whatsapp || business.phone || "").replace(/[^0-9]/g, "").replace(/^0/, "250")}?text=${encodeURIComponent(
                      operatingModel.hasBookings
                        ? `Muraho! Nabonye ${business.name} kuri MOSA. Nifuzaga kubaza gahunda ya serivisi.`
                        : `Muraho! Nabonye ${business.name} kuri MOSA. Nifuzaga gutumiza ibicuruzwa.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{lang === "rw" ? "Gerageza Ihuza (Test Link)" : "Test WhatsApp Link"}</span>
                  </a>
                )}
              </div>
            </div>

            {/* How It Works & Local Customer Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                  1
                </div>
                <h4 className="font-bold text-slate-900 text-xs">
                  {lang === "rw" ? "1. Umukiriya Abona Umwirondoro" : "1. Customer Discovers Item"}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === "rw"
                    ? "Umukiriya asura urubuga rwawe rwa MOSA, akareba ibiciro n'ibiri mu cyiciro cya 'Birahari' (In Stock)."
                    : "Neighborhood buyers browse your verified catalog, check live pricing and see what is currently in stock."}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                  2
                </div>
                <h4 className="font-bold text-slate-900 text-xs">
                  {lang === "rw" ? "2. Ikiganiro cya WhatsApp Kirafunguka" : "2. Instant WhatsApp Chat"}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === "rw"
                    ? "Umukiriya akanda kuri buto yo gutumiza, ubutumwa burimo izina ry'igicuruzwa n'igiciro bugahita bwandikwa muri WhatsApp."
                    : "Clicking 'Book' or 'Order' opens WhatsApp with the exact item name, quantity, and price pre-filled."}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-sm">
                  3
                </div>
                <h4 className="font-bold text-slate-900 text-xs">
                  {lang === "rw" ? "3. Kwishyurana no Guhererekanya" : "3. Direct MoMo / Cash Pay"}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {lang === "rw"
                    ? "Mwemeranywa ku gihe cyo kuza cyangwa gutanga ibicuruzwa. Umukiriya akwishyura ako kanya kuri MoMo cyangwa amafaranga mu ntoki."
                    : "Confirm the appointment or arrange pickup/delivery. You collect payment directly with 0% MOSA commission."}
                </p>
              </div>
            </div>

            {/* Practical Micro-Merchant Tips */}
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{lang === "rw" ? "Inama z'Ubucuruzi Bwihuse kuri WhatsApp" : "Best Practices for Rwandan WhatsApp Micro-Commerce"}</span>
              </div>
              <ul className="text-[11px] text-emerald-800 space-y-1.5 list-disc pl-5 leading-relaxed">
                <li>
                  <strong>{lang === "rw" ? "Subiza Vuba:" : "Respond Promptly:"}</strong>{" "}
                  {lang === "rw"
                    ? "Abakiriya bo mu gace kawe bakunda gusubizwa mu minota 10-15 mbere y'uko bahindukirira ahandi."
                    : "Try to answer within 10–15 minutes before the local customer contacts another merchant nearby."}
                </li>
                <li>
                  <strong>{lang === "rw" ? "Emeza Ibiriho:" : "Confirm Availability:"}</strong>{" "}
                  {lang === "rw"
                    ? "Niba igicuruzwa cyashize, koresha buto yo muri Catalogue ukande 'Bishize' kugira ngo abakiriya batiruka ubusa."
                    : "If an item runs out, toggle it to 'Out of Stock' in your Catalogue immediately so customers don't travel in vain."}
                </li>
                <li>
                  <strong>{lang === "rw" ? "Ibyapa Byo Ku Muhanda:" : "Provide Walking Landmarks:"}</strong>{" "}
                  {lang === "rw"
                    ? "Igihe umukiriya agana aho ukorera, mwibutse ibimenyetso byo hasi (urugero: 'Ku iduka ry'umweru riri hejuru y'ivuriro')."
                    : "Remind visiting customers of your walking landmarks (e.g., 'Across from the green pharmacy, gate #12')."}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: NOTIFICATIONS, REMINDERS & AUDIT HISTORY */}
      {activeSection === "notifications" && (
        <div className="space-y-6">
          {/* Official MOSA Notifications */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-600" />
                  <span>{lang === "rw" ? "Ubutumwa n'Ibyemezo bya MOSA" : "Official MOSA Notifications & Decisions"}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "rw"
                    ? "Ubutumwa bw'ingenzi buturuka ku buyobozi bwa MOSA, ibyemezo byo kwemeza ubucuruzi, n'isesengura ryabitswe muri PostgreSQL."
                    : "Official notifications, verification decisions, and operational updates stored in PostgreSQL."}
                </p>
              </div>
              {notifications.filter((n) => !n.isRead).length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                  {notifications.filter((n) => !n.isRead).length} New
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <span>{lang === "rw" ? "Nta butumwa bushya buhari muri aka kanya." : "No notifications in your inbox yet."}</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs transition ${
                      !n.isRead ? "bg-emerald-50/50 border-emerald-200 shadow-xs" : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                        )}
                        <span className="font-black text-slate-900 text-sm">{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{n.message}</p>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shrink-0 cursor-pointer"
                      >
                        {lang === "rw" ? "Bimenye" : "Mark as read"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Database-Derived Smart Reminders */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {lang === "rw" ? "Ibyibutso by'Ubucuruzi" : "Database-Derived Smart Reminders"}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "rw"
                  ? "Ibyibutso byikora bishingiye ku mimerere y'amakuru yawe muri database (ibiciro bibuze, kwemeza amakuru)."
                  : "Actionable alerts generated automatically from actual database conditions (missing prices, confirmation dates)."}
              </p>
            </div>

            {reminders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>{lang === "rw" ? "Amakuru yose ameze neza! Nta cyibutso kidasubijwe." : "All database conditions are healthy! No active operational alerts."}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div
                    key={r.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      r.severity === "URGENT"
                        ? "bg-red-50/60 border-red-200"
                        : r.severity === "WARNING"
                        ? "bg-amber-50/60 border-amber-200"
                        : "bg-blue-50/60 border-blue-200"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            r.severity === "URGENT" ? "bg-red-600 text-white" : "bg-amber-500 text-slate-950"
                          }`}
                        >
                          {r.severity}
                        </span>
                        <span>{lang === "rw" ? r.titleRw : r.title}</span>
                      </div>
                      <p className="text-slate-600">{lang === "rw" ? r.messageRw : r.message}</p>
                    </div>

                    {r.actionUrl && (
                      <button
                        onClick={() => {
                          const tabMatch = r.actionUrl.match(/tab=([a-z]+)/);
                          if (tabMatch && tabMatch[1]) {
                            const tab = tabMatch[1];
                            if (tab === "catalog") setActiveSection("catalog");
                            else if (tab === "profile" || tab === "location" || tab === "hours") {
                              setActiveSection("my_business");
                              setMyBusinessSubTab(tab as any);
                            } else if (tab === "media") {
                              setActiveSection("content");
                              setContentSubTab("photos");
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold border border-slate-300 text-xs shrink-0 self-start sm:self-center cursor-pointer"
                      >
                        {lang === "rw" ? "Gikemure" : "Resolve"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit History & Business Change Log */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {lang === "rw" ? "Amateka y'Ibyahinduwe ku Bucuruzi" : "Audit Trail & Business Change History"}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "rw"
                  ? "Buri gihindutse ku giciro, umwirondoro cyangwa amakuru bibikwa burundu muri PostgreSQL."
                  : "Every meaningful price change, profile edit, and confirmation is permanently recorded in PostgreSQL."}
              </p>
            </div>

            {historyList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {lang === "rw" ? "Nta mpanuka cyangwa impinduka zirandikwa kuri ubu bucuruzi." : "No recent changes recorded yet for this business."}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {historyList.map((item) => (
                  <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{item.action}</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {item.approvalStatus}
                        </span>
                        <span className="text-[10px] text-slate-400">via {item.source}</span>
                      </div>

                      <div className="text-slate-600">
                        Field: <code className="bg-slate-100 px-1 py-0.2 rounded">{item.fieldChanged}</code>
                        {item.previousValue && (
                          <span>
                            {" "}Old: <span className="line-through text-slate-400">{item.previousValue}</span> &rarr;{" "}
                          </span>
                        )}
                        <strong>New: {item.newValue}</strong>
                      </div>

                      <div className="text-[10px] text-slate-400">Actor: {item.actorName}</div>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono self-end sm:self-center">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Local Demand Radar */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>{lang === "rw" ? "Ibyifuzo By'Abakiriya muri aka Gace" : "Local Demand Radar in Your Category"}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demands.slice(0, 4).map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>"{d.queryTerm}"</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black">
                      Score: {d.opportunityScore}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">{d.description}</div>
                  <div className="text-[10px] text-slate-400">
                    {d.searchCount} searches in {d.cell}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: SETTINGS & ADVANCED OPERATIONS */}
      {activeSection === "settings" && (
        <div className="space-y-6">
          {/* Dashboard Settings & Account Security */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {lang === "rw" ? "Igenamiterere n'Umutekano wa Konti" : "Account Security & Language Preferences"}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "rw"
                  ? "Cunga ururimi ukoresha, umutekano w'ijambobanga, n'umwirondoro wa nyir'ubucuruzi."
                  : "Manage your credentials, preferred dashboard language, and verified proprietor identity."}
              </p>
            </div>

            {accountMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-semibold">
                {accountMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Language Preferences */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>{lang === "rw" ? "Ururimi Rukoreshwa" : "Preferred Dashboard Language"}</span>
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: "rw", label: "Kinyarwanda" },
                    { code: "en", label: "English" },
                    { code: "fr", label: "Français" },
                    { code: "sw", label: "Kiswahili" },
                  ].map((l) => (
                    <button
                      key={l.code}
                      onClick={async () => {
                        setLang(l.code as any);
                        await fetch("/api/auth/me", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ language: l.code }),
                        }).catch(() => {});
                        setAccountMsg(`Language updated to ${l.label}`);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        lang === l.code
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password Change */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>{lang === "rw" ? "Guhindura Ijambobanga" : "Change Password"}</span>
                </h4>

                {accountErrorMsg && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">
                    {accountErrorMsg}
                  </div>
                )}

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAccountMsg("");
                    setAccountErrorMsg("");

                    if (newPassword.length < 8) {
                      setAccountErrorMsg("New password must be at least 8 characters long.");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      setAccountErrorMsg("New password and confirmation do not match.");
                      return;
                    }

                    setPasswordLoading(true);
                    try {
                      const res = await fetch("/api/auth/password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ currentPassword, newPassword }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        setAccountMsg("Password updated successfully in PostgreSQL database.");
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      } else {
                        setAccountErrorMsg(data.error || "Failed to update password.");
                      }
                    } catch (err: any) {
                      setAccountErrorMsg(err.message || "Network error updating password.");
                    } finally {
                      setPasswordLoading(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Password</label>
                    <input
                      type="password"
                      placeholder="Enter current password (if set)"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Password (Min. 8 chars)</label>
                    <input
                      type="password"
                      placeholder="Enter new strong password"
                      minLength={8}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      minLength={8}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Expandable Accordion: Advanced Operations & Bookkeeping */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
            <button
              onClick={() => setAdvancedAccordionOpen(!advancedAccordionOpen)}
              className="w-full p-6 sm:p-7 flex items-center justify-between text-left hover:bg-slate-50/70 transition cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-slate-100 text-slate-700">
                    <Layers className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">
                      {lang === "rw" ? "Gucunga Imari & Ibikoresho Byimbitse (Advanced Bookkeeping)" : "Advanced Operations & Bookkeeping"}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {lang === "rw"
                        ? "Kwandika ibyaguzwe, ingano y'ibiri mu bubiko, kwinjiza amafaranga, no gukurikirana inyungu buri kwezi."
                        : "Optional advanced inventory tracking, purchase invoices, daily expenses, and monthly profitability estimates."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-4">
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                  {advancedAccordionOpen ? (lang === "rw" ? "Hisha" : "Collapse") : (lang === "rw" ? "Fungura" : "Expand")}
                </span>
                {advancedAccordionOpen ? (
                  <ChevronUp className="w-5 h-5 text-slate-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600" />
                )}
              </div>
            </button>

            {advancedAccordionOpen && (
              <div className="p-6 sm:p-8 pt-2 border-t border-slate-100 space-y-6">
                {/* Accordion Sub-tabs */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAdvancedSubTab("operations")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                      advancedSubTab === "operations"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>{lang === "rw" ? "Ububiko n'Ibikoresho" : "Inventory & Stock Levels"}</span>
                  </button>

                  <button
                    onClick={() => setAdvancedSubTab("finance")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                      advancedSubTab === "finance"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>{lang === "rw" ? "Igitabo cy'Imari (Bookkeeping)" : "Finance & Purchases"}</span>
                  </button>
                </div>

                {/* Embedded Component */}
                {advancedSubTab === "operations" && (
                  <OperationsTab
                    businessId={business.id}
                    products={business.products}
                    historyList={historyList}
                    lang={lang}
                    onRefresh={loadOwnerData}
                  />
                )}

                {advancedSubTab === "finance" && (
                  <FinanceTab
                    businessId={business.id}
                    lang={lang}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {addProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Product or Service Item</h3>
              <button onClick={() => setAddProductModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item / Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Fade Haircut, Phone Screen Replacement"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Name in Kinyarwanda (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Kogosha Imisatsi Neza"
                  value={productForm.nameRw}
                  onChange={(e) => setProductForm({ ...productForm, nameRw: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (RWF)</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pricing Type</label>
                  <select
                    value={productForm.priceType}
                    onChange={(e) => setProductForm({ ...productForm, priceType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                  >
                    <option value="FIXED">Fixed Exact Price</option>
                    <option value="ESTIMATED">Estimated Price (~)</option>
                    <option value="RANGE">Price Range (Min - Max)</option>
                  </select>
                </div>
              </div>

              {productForm.priceType === "RANGE" && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Min Price (RWF)</label>
                    <input
                      type="number"
                      placeholder="e.g. 2000"
                      value={productForm.priceMin}
                      onChange={(e) => setProductForm({ ...productForm, priceMin: e.target.value })}
                      className="w-full p-2 bg-white rounded-lg border border-slate-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Max Price (RWF)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={productForm.priceMax}
                      onChange={(e) => setProductForm({ ...productForm, priceMax: e.target.value })}
                      className="w-full p-2 bg-white rounded-lg border border-slate-300 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit / Measurement</label>
                  <input
                    type="text"
                    placeholder="e.g. service, item, kg, plate"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Grooming, Repair"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="addIsService"
                  checked={productForm.isService}
                  onChange={(e) => setProductForm({ ...productForm, isService: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="addIsService" className="font-bold text-slate-700 select-none cursor-pointer">
                  This item is a Service (barber, tailoring, electronics repair, etc.)
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Details on what this service or product includes..."
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold shadow-md hover:bg-emerald-700"
                >
                  Add to Live Catalogue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT (PRICE UPDATE) */}
      {editProductModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Edit Product / Update Price</h3>
              <button onClick={() => setEditProductModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (RWF)</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Old: {selectedProduct.price.toLocaleString()} RWF
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pricing Type</label>
                  <select
                    value={productForm.priceType}
                    onChange={(e) => setProductForm({ ...productForm, priceType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                  >
                    <option value="FIXED">Fixed Exact Price</option>
                    <option value="ESTIMATED">Estimated Price (~)</option>
                    <option value="RANGE">Price Range (Min - Max)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={productForm.isAvailable}
                  onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <label htmlFor="availCheck" className="font-bold text-slate-700 cursor-pointer">
                  Available in store now
                </label>
              </div>

              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="editIsService"
                  checked={productForm.isService}
                  onChange={(e) => setProductForm({ ...productForm, isService: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="editIsService" className="font-bold text-slate-700 select-none cursor-pointer">
                  This item is a Service (barber, tailoring, electronics repair, etc.)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold shadow-md hover:bg-emerald-700"
                >
                  Save & Publish Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK PRICE CHANGE (1-STEP MINIMAL) */}
      {quickPriceModalOpen && quickPriceProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "rw" ? "Hindura Igiciro vuba" : "Quick Price Change"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {quickPriceProduct.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setQuickPriceModalOpen(false);
                  setQuickPriceProduct(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickPriceSave} className="space-y-4 mt-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">{lang === "rw" ? "Igiciro cy'Ubu:" : "Current Price:"}</span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  {quickPriceProduct.price?.toLocaleString()} RWF
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5 text-sm">
                  {lang === "rw" ? "Igiciro Gishya (RWF)" : "New Price (RWF)"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min={0}
                    step={50}
                    autoFocus
                    value={quickPriceValue}
                    onChange={(e) => setQuickPriceValue(Number(e.target.value))}
                    className="w-full p-3.5 bg-slate-50 rounded-2xl border-2 border-emerald-500 text-xl font-black text-slate-900 font-mono outline-none focus:ring-4 focus:ring-emerald-100"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">
                    RWF
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {lang === "rw"
                    ? "Iki giciro gishya kigaragara ako kanya ku rubuga rwawe rusurwa n'abakiriya."
                    : "This updated price reflects immediately on your public customer website."}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickPriceModalOpen(false);
                    setQuickPriceProduct(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  {lang === "rw" ? "Reka" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={quickPriceSaving}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {quickPriceSaving
                    ? (lang === "rw" ? "Biri kubikwa..." : "Saving...")
                    : (lang === "rw" ? "Bika Igiciro" : "Save Price")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POST SPECIAL OFFER */}
      {postOfferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Publish Neighborhood Offer</h3>
              <button onClick={() => setPostOfferModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOfferSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Offer Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midweek 1500 Frw Haircut Special"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Discount Tag</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20% OFF, SAVE 1,000 RWF"
                  value={offerForm.discount}
                  onChange={(e) => setOfferForm({ ...offerForm, discount: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valid Until Date</label>
                <input
                  type="date"
                  required
                  value={offerForm.validUntil}
                  onChange={(e) => setOfferForm({ ...offerForm, validUntil: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPostOfferModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md"
                >
                  Publish Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SHORT SHOWCASE VIDEO */}
      {addVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "rw" ? "Gushyiraho Videwo Ngufi y'Ubucuruzi" : "Publish Short Business Video"}
                </h3>
              </div>
              <button
                onClick={() => setAddVideoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 leading-relaxed">
              <strong>Commercial Focus Only:</strong> Videos must be 60 seconds or less and strictly highlight your commercial activity (products, services, craft process, or facility). Unrelated social media clips or general entertainment will be removed by MOSA administrators.
            </div>

            <form onSubmit={handleAddVideoSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Video URL (Direct MP4, Cloudflare Stream, or Hosted Stream)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://assets.mosa.rw/videos/sample.mp4"
                  value={videoForm.url}
                  onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Caption / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh stock of fresh avocados from Musanze, New haircut fades"
                  value={videoForm.caption}
                  onChange={(e) => setVideoForm({ ...videoForm, caption: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Showcase Topic</label>
                  <select
                    value={videoForm.topic}
                    onChange={(e) => setVideoForm({ ...videoForm, topic: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                  >
                    <option value="PRODUCTS">Products Showcase</option>
                    <option value="SERVICES">Service Demonstration</option>
                    <option value="WORKSHOP">Workshop & Crafting</option>
                    <option value="NEW_ARRIVALS">New Arrivals / Stock</option>
                    <option value="OFFERS">Special Offer / Promotion</option>
                    <option value="FACILITY">Storefront & Facilities</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Seconds, Max 60s)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={videoForm.durationSec}
                    onChange={(e) => setVideoForm({ ...videoForm, durationSec: Math.min(60, Math.max(1, Number(e.target.value))) })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thumbnail Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={videoForm.thumbnailUrl}
                  onChange={(e) => setVideoForm({ ...videoForm, thumbnailUrl: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddVideoModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMediaSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isMediaSubmitting ? "Publishing..." : "Publish Video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BUSINESS PHOTO */}
      {addPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "rw" ? "Ongeraho Ifoto y'Ubucuruzi" : "Add Business Photo"}
                </h3>
              </div>
              <button
                onClick={() => setAddPhotoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Photo URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={photoForm.url}
                  onChange={(e) => setPhotoForm({ ...photoForm, url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Caption / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Front sign on RN15, Main display counter"
                  value={photoForm.caption}
                  onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                />
              </div>

              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="photoCoverCheck"
                  checked={photoForm.isCover}
                  onChange={(e) => setPhotoForm({ ...photoForm, isCover: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="photoCoverCheck" className="font-bold text-slate-700 select-none cursor-pointer">
                  Use as Primary Storefront Cover Photo
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddPhotoModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMediaSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isMediaSubmitting ? "Uploading..." : "Save Photo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIDEO PREVIEW PLAYER */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-sm">{previewVideo.caption || "Showcase Video Preview"}</span>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video
                controls
                autoPlay
                src={previewVideo.url}
                className="w-full h-full object-contain"
              >
                Your browser does not support HTML5 video.
              </video>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                {previewVideo.topic && (
                  <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-semibold uppercase">
                    {previewVideo.topic}
                  </span>
                )}
                {previewVideo.durationSec && (
                  <span>Duration: {previewVideo.durationSec}s (max 60s)</span>
                )}
              </div>
              <div>
                Status: <span className="font-bold text-emerald-400">{previewVideo.moderationStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH BUSINESS UPDATE */}
      {addUpdateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "rw" ? "Tangaza Amakuru Mashya / Itangazo" : "Publish Business Update"}
                </h3>
              </div>
              <button
                onClick={() => setAddUpdateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUpdate} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Ubwoko bw'Itangazo" : "Update Type"}
                  </label>
                  <select
                    value={updateForm.type}
                    onChange={(e) => setUpdateForm({ ...updateForm, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                  >
                    <option value="ANNOUNCEMENT">Announcement / Itangazo</option>
                    <option value="NEW_ARRIVAL">New Arrival / Ibyagezweho</option>
                    <option value="SERVICE_UPDATE">Service Update / Serivisi Nshya</option>
                    <option value="OFFER">Special Offer / Poromosiyo</option>
                    <option value="TEMPORARY_CLOSURE">Temporary Closure / Kufunga By'igihe Gito</option>
                    <option value="NOTICE">Notice / Imenyesha</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Ikirango ku Cyapa (Badge)" : "Badge Text (e.g. 20% OFF)"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NEW ARRIVAL, 20% OFF"
                    value={updateForm.badge}
                    onChange={(e) => setUpdateForm({ ...updateForm, badge: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Umutwe w'Itangazo (Mu Cyongereza)" : "Title (English)"} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh stock of Irish potatoes just arrived"
                  value={updateForm.title}
                  onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Umutwe w'Itangazo (Mu Kinyarwanda)" : "Title (Kinyarwanda)"}
                </label>
                <input
                  type="text"
                  placeholder="urugero: Ibirayi bishya bya Kinigi bimaze kugera mu bubiko"
                  value={updateForm.titleRw}
                  onChange={(e) => setUpdateForm({ ...updateForm, titleRw: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Ibisobanuro birambuye (Mu Cyongereza)" : "Content / Description (English)"} *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your announcement, new items, or service notice..."
                  value={updateForm.content}
                  onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Ibisobanuro birambuye (Mu Kinyarwanda)" : "Content / Description (Kinyarwanda)"}
                </label>
                <textarea
                  rows={2}
                  placeholder="Sobanura mu Kinyarwanda..."
                  value={updateForm.contentRw}
                  onChange={(e) => setUpdateForm({ ...updateForm, contentRw: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Itariki yo Kurangira" : "Valid Until Date"}
                  </label>
                  <input
                    type="date"
                    value={updateForm.validUntil}
                    onChange={(e) => setUpdateForm({ ...updateForm, validUntil: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Ifoto y'Itangazo (URL)" : "Image URL (Optional)"}
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={updateForm.imageUrl}
                    onChange={(e) => setUpdateForm({ ...updateForm, imageUrl: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddUpdateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {updateSubmitting ? "Publishing..." : "Publish Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POST BUSINESS OPPORTUNITY */}
      {addOppModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "rw" ? "Shyiraho Itangazo ry'Akazi cyangwa Ubufatanye" : "Post Business Opportunity"}
                </h3>
              </div>
              <button
                onClick={() => setAddOppModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Ubwoko bw'Amahirwe" : "Opportunity Type"}
                </label>
                <select
                  value={oppForm.type}
                  onChange={(e) => setOppForm({ ...oppForm, type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                >
                  <option value="EMPLOYMENT">Employment / Hiring / Akazi</option>
                  <option value="SUPPLIER_REQUEST">Supplier Request / Gushaka Abagemuzi</option>
                  <option value="PARTNERSHIP">Business Partnership / Ubufatanye</option>
                  <option value="COLLABORATION">Commercial Collaboration / Gufatanya</option>
                  <option value="OTHER">Other Opportunity / Ibindi</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Umutwe w'Itangazo (Mu Cyongereza)" : "Role / Opportunity Title (English)"} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seeking experienced Hair Stylist / Barber"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Umutwe w'Itangazo (Mu Kinyarwanda)" : "Title (Kinyarwanda)"}
                </label>
                <input
                  type="text"
                  placeholder="urugero: Turashaka umwogoshi w'inararibonye"
                  value={oppForm.titleRw}
                  onChange={(e) => setOppForm({ ...oppForm, titleRw: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Ibisobanuro by'Umwanya (Mu Cyongereza)" : "Job / Supply Description (English)"} *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the tasks, duties, or items you need supplied..."
                  value={oppForm.description}
                  onChange={(e) => setOppForm({ ...oppForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Ibisobanuro by'Umwanya (Mu Kinyarwanda)" : "Description (Kinyarwanda)"}
                </label>
                <textarea
                  rows={2}
                  placeholder="Sobanura mu Kinyarwanda..."
                  value={oppForm.descriptionRw}
                  onChange={(e) => setOppForm({ ...oppForm, descriptionRw: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Igihembo / Umushahara" : "Compensation / Pay"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 75,000 RWF / Month or Negotiable"
                    value={oppForm.compensation}
                    onChange={(e) => setOppForm({ ...oppForm, compensation: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Ibisabwa" : "Requirements / Skills"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1+ year salon experience"
                    value={oppForm.requirements}
                    onChange={(e) => setOppForm({ ...oppForm, requirements: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Uburyo bwo Kukubona" : "Contact Method"}
                  </label>
                  <select
                    value={oppForm.contactMethod}
                    onChange={(e) => setOppForm({ ...oppForm, contactMethod: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 font-semibold outline-none"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="PHONE">Phone Call</option>
                    <option value="IN_PERSON">In-Person Visit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Itariki ntarengwa" : "Application Deadline"}
                  </label>
                  <input
                    type="date"
                    value={oppForm.deadline}
                    onChange={(e) => setOppForm({ ...oppForm, deadline: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddOppModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={oppSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {oppSubmitting ? "Posting..." : "Post Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
