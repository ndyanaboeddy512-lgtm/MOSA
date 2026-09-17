"use client";

import React, { useState, useEffect } from "react";
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
  Info,
  Crosshair,
  Navigation,
  Compass,
  ExternalLink,
} from "lucide-react";
import { MosaMap } from "@/components/discovery/MosaMap";
import { calculateLocationCompleteness, getGoogleMapsDirectionsUrl } from "@/lib/location-quality";

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

  const [activeTab, setActiveTab] = useState<
    "overview" | "profile" | "location" | "hours" | "catalog" | "offers" | "assistant" | "history" | "reminders" | "account"
  >("overview");

  const [business, setBusiness] = useState<Business | null>(null);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [confirmationStatus, setConfirmationStatus] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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
    category: "",
    subCategory: "",
    phone: "",
    whatsapp: "",
    sector: "",
    cell: "",
    addressNote: "",
    isOpenNow: true,
  });

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
            category: data.business.category || "",
            subCategory: data.business.subCategory || "",
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
        setSaveSuccessMsg(
          lang === "rw"
            ? "Umwirondoro wavuguruwe neza kandi wahise ugaragara ku rubuga rwa MOSA!"
            : "Profile successfully updated and instantly synchronized to the public website!"
        );
        setTimeout(() => setSaveSuccessMsg(""), 4000);
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
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                business.isOpenNow
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {business.isOpenNow ? "● " + t.common.openNow : "○ " + t.common.closedNow}
            </span>
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
            onClick={() => setAddProductModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === "rw" ? "Ongeraho Igicuruzwa" : "Add Item"}</span>
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
            <span>{lang === "rw" ? "Reba ku Rubuga" : "View Live Public Page"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Navigation Tabs Bar (Scrollable on small mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 text-xs font-bold">
        {[
          { key: "overview", label: lang === "rw" ? "Incamake" : "Overview", icon: Layers },
          { key: "profile", label: lang === "rw" ? "Umwirondoro" : "Profile", icon: Store },
          { key: "location", label: lang === "rw" ? "Aho Mubarizwa" : "Location & Directions", icon: MapPin },
          { key: "hours", label: lang === "rw" ? "Amasaha" : "Opening Hours", icon: Clock },
          { key: "catalog", label: lang === "rw" ? "Ibicuruzwa" : "Catalogue & Prices", icon: Tag, count: business.products.length },
          { key: "offers", label: lang === "rw" ? "Poromosiyo" : "Special Offers", icon: Calendar },
          { key: "assistant", label: "MOSA AI Assistant", icon: Sparkles },
          { key: "history", label: lang === "rw" ? "Amateka y'Impinduka" : "Change History", icon: History },
          { key: "reminders", label: lang === "rw" ? "Ubutumwa" : "Smart Reminders", icon: Bell, count: reminders.length },
          { key: "account", label: lang === "rw" ? "Umutekano" : "Account & Security", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === "overview" && (
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
                  onClick={() => setActiveTab("profile")}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
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
                          onClick={() => setActiveTab(rec.actionTab)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 text-xs transition-colors shrink-0 flex items-center gap-1 self-start sm:self-center"
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
                onClick={() => setActiveTab("offers")}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              >
                Manage Offers
              </button>
            </div>
          )}

        </div>
      )}

      {/* TAB CONTENT: 2. PROFILE & LOCATION */}
      {activeTab === "profile" && (
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Primary Category</label>
                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Public</span>
              </div>
              <input
                type="text"
                value={profileForm.category}
                onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                required
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Subcategory / Speciality</label>
                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">Public</span>
              </div>
              <input
                type="text"
                value={profileForm.subCategory}
                onChange={(e) => setProfileForm({ ...profileForm, subCategory: e.target.value })}
                placeholder="e.g. iPhone Screen Replacement, Dreadlocks"
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
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
                onClick={() => setActiveTab("location")}
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

      {/* TAB CONTENT: LOCATION & DIRECTIONS */}
      {activeTab === "location" && (
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
              onClick={() => setActiveTab("overview")}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
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

      {/* TAB CONTENT: 3. OPENING HOURS */}
      {activeTab === "hours" && (
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

      {/* TAB CONTENT: 4. CATALOGUE & SERVICES */}
      {activeTab === "catalog" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{lang === "rw" ? "Ibicuruzwa na Serivisi" : "Product & Service Catalogue"}</h3>
              <p className="text-xs text-slate-500">
                Updating a price updates the real database and automatically propagates to the public website without redeploying.
              </p>
            </div>

            <button
              onClick={() => setAddProductModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === "rw" ? "Ongeraho Igicuruzwa" : "Add New Item"}</span>
            </button>
          </div>

          {business.products.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-3">
              <Tag className="w-8 h-8 mx-auto text-slate-300" />
              <p>No products or services listed yet. Add your first item to build customer trust.</p>
              <button
                onClick={() => setAddProductModalOpen(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs"
              >
                Add First Item
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {business.products.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{item.name}</span>
                      {item.isEstimated && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ~ Estimated
                        </span>
                      )}
                      {!item.isAvailable && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          Out of Stock
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

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-black text-slate-900">
                        {item.priceType === "RANGE" && item.priceMin && item.priceMax
                          ? `${item.priceMin.toLocaleString()} – ${item.priceMax.toLocaleString()} Frw`
                          : `${item.price.toLocaleString()} Frw`}
                      </div>
                      <div className="text-[10px] text-slate-400">Verified in PostgreSQL</div>
                    </div>

                    <div className="flex items-center gap-1.5">
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
                          });
                          setEditProductModalOpen(true);
                        }}
                        className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Price & Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

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

      {/* TAB CONTENT: 5. SPECIAL OFFERS */}
      {activeTab === "offers" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{lang === "rw" ? "Ibyiciro By'Igorora na Poromosiyo" : "Neighborhood Special Offers"}</h3>
              <p className="text-xs text-slate-500">
                Publish time-limited discounts and neighborhood incentives that display prominently on your public page.
              </p>
            </div>

            <button
              onClick={() => setPostOfferModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Tag className="w-4 h-4" />
              <span>Post New Offer</span>
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
              <p>No active special offers. Post a weekend special or first-time customer discount to drive foot traffic.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 6. MOSA AI ASSISTANT */}
      {activeTab === "assistant" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900">MOSA Intelligent Business Assistant</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Type natural instructions (e.g. <em>"We repair iPhones and Samsung phones. Screen replacement starts from 25,000."</em>).
              The AI structures your catalogue and translations without inventing facts, requiring your final confirmation.
            </p>
          </div>

          <form onSubmit={handleAssistantSubmit} className="space-y-3">
            <textarea
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              placeholder="e.g. We do standard haircuts for 2000 Frw and beard styling from 1000 Frw. Open everyday except Sunday."
              rows={4}
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-300 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>AI will never invent prices or facts not provided by you.</span>
              </span>

              <button
                type="submit"
                disabled={assistantLoading}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{assistantLoading ? "Processing..." : "Structure with AI"}</span>
              </button>
            </div>
          </form>

          {/* Assistant Proposals */}
          {assistantProposals.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Proposed Structured Items</h4>
                <span className="text-xs text-purple-600 font-semibold">{assistantDisclaimer}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assistantProposals.map((prop, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-sm">{prop.name}</span>
                      <span className="font-black text-slate-900 bg-white px-2 py-1 rounded-lg border border-purple-200">
                        {prop.priceType === "RANGE" ? `${prop.priceMin} – ${prop.priceMax} RWF` : `${prop.price} RWF`}
                      </span>
                    </div>

                    <p className="text-slate-600">{prop.description}</p>

                    <div className="text-[11px] text-slate-500">
                      <strong>RW:</strong> {prop.nameRw} • <strong>Category:</strong> {prop.category}
                    </div>

                    <button
                      onClick={() => handleAcceptProposal(prop)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
                    >
                      Confirm & Add to Live Catalogue
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 7. CHANGE HISTORY & AUDIT */}
      {activeTab === "history" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Audit Trail & Business Change History</h3>
            <p className="text-xs text-slate-500">
              Every meaningful price change, profile edit, and confirmation is permanently recorded in PostgreSQL.
            </p>
          </div>

          {historyList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No recent changes recorded yet for this business.
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
      )}

      {/* TAB CONTENT: 8. SMART REMINDERS & DEMAND */}
      {activeTab === "reminders" && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Database-Derived Smart Reminders</h3>
              <p className="text-xs text-slate-500">
                Actionable alerts generated automatically from actual database conditions (missing prices, confirmation dates).
              </p>
            </div>

            {reminders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>All database conditions are healthy! No active operational alerts.</span>
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
                          if (tabMatch && tabMatch[1]) setActiveTab(tabMatch[1] as any);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold border border-slate-300 text-xs shrink-0 self-start sm:self-center"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Local Demand Signals in Category */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Local Demand Radar in Your Category</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demands.slice(0, 4).map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>"{d.queryTerm}"</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {d.opportunityScore}
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

      {/* TAB CONTENT: 9. ACCOUNT & SECURITY */}
      {activeTab === "account" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Account Security & Language Preferences</h3>
            <p className="text-xs text-slate-500">
              Manage your credentials, preferred language, and verified proprietor identity.
            </p>
          </div>

          {accountMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-semibold">
              {accountMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Preferred Dashboard Language</span>
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
                    className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
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

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-purple-600" />
                <span>Change Password</span>
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

    </div>
  );
}
