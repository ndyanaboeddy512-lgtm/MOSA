"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { processDeviceUpload, isVideoMedia } from "@/lib/media-upload";
import { SmartLocationForm, SmartLocationFormData } from "@/components/location/SmartLocationForm";
import { 
  Store, 
  MapPin, 
  Tag, 
  Phone, 
  MessageCircle, 
  Lock, 
  User, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  FileCheck,
  Edit3,
  Image as ImageIcon,
  Compass,
  Layers,
  Video,
  FileText,
  Upload,
  Check,
  X,
  Camera
} from "lucide-react";
import {
  CANONICAL_TAXONOMY,
  ALL_MAIN_CATEGORIES,
  ALL_SUBCATEGORIES,
  ALL_BUSINESS_TYPES,
  validateCategoryHierarchy,
  formatCategoryClassification,
  getBusinessOperatingModel,
} from "@/lib/taxonomy";

export default function RegisterBusinessPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const getTaxonomyLabel = (item: { name: string; nameRw?: string; nameFr?: string; nameSw?: string } | null | undefined) => {
    if (!item) return "";
    if (lang === "rw" && item.nameRw) return item.nameRw;
    if (lang === "fr" && item.nameFr) return item.nameFr;
    if (lang === "sw" && item.nameSw) return item.nameSw;
    return item.name;
  };

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Step 1: Business Identity & Owner Account
  const [formData, setFormData] = useState({
    name: "",
    nameRw: "",
    mainCategory: "retail",
    subCategory: "food_groceries",
    businessType: "grocery_shop",
    category: "retail",
    description: "",
    ownerName: "",
    phone: "",
    hasDifferentWhatsapp: false,
    whatsapp: "",
    password: "",
    coverImage: "",
    certifyAccurate: false,
  });

  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      setErrorMsg(null);
      const processed = await processDeviceUpload(file);
      setFormData((prev) => ({ ...prev, coverImage: processed.url }));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process cover file.");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Dynamic Operating Model (Services vs Products vs Food & Dining)
  const operatingModel = useMemo(() => {
    return getBusinessOperatingModel(formData.mainCategory, formData.subCategory, formData.businessType);
  }, [formData.mainCategory, formData.subCategory, formData.businessType]);

  // Cascading Category Helpers
  const currentMain = useMemo(() => {
    return CANONICAL_TAXONOMY.find((m) => m.id === formData.mainCategory) || CANONICAL_TAXONOMY[0];
  }, [formData.mainCategory]);

  const availableSubcategories = useMemo(() => {
    return currentMain?.subcategories || [];
  }, [currentMain]);

  const currentSub = useMemo(() => {
    return availableSubcategories.find((s) => s.id === formData.subCategory) || availableSubcategories[0];
  }, [availableSubcategories, formData.subCategory]);

  const availableBusinessTypes = useMemo(() => {
    return currentSub?.types || [];
  }, [currentSub]);

  const currentType = useMemo(() => {
    return availableBusinessTypes.find((t) => t.id === formData.businessType) || availableBusinessTypes[0];
  }, [availableBusinessTypes, formData.businessType]);

  const handleMainCategoryChange = (mainId: string) => {
    const mainObj = CANONICAL_TAXONOMY.find((m) => m.id === mainId);
    const firstSub = mainObj?.subcategories[0];
    const firstType = firstSub?.types[0];
    setFormData((prev) => ({
      ...prev,
      mainCategory: mainId,
      category: mainId,
      subCategory: firstSub ? firstSub.id : "",
      businessType: firstType ? firstType.id : "",
    }));
    if (fieldErrors.category) {
      setFieldErrors((prev) => ({ ...prev, category: "" }));
    }
  };

  const handleSubCategoryChange = (subId: string) => {
    const subObj = availableSubcategories.find((s) => s.id === subId);
    const firstType = subObj?.types[0];
    setFormData((prev) => ({
      ...prev,
      subCategory: subId,
      businessType: firstType ? firstType.id : "",
    }));
    if (fieldErrors.category) {
      setFieldErrors((prev) => ({ ...prev, category: "" }));
    }
  };

  const handleBusinessTypeChange = (typeId: string) => {
    setFormData((prev) => ({
      ...prev,
      businessType: typeId,
    }));
    if (fieldErrors.category) {
      setFieldErrors((prev) => ({ ...prev, category: "" }));
    }
  };

  // Step 2: Location Data
  const [locationData, setLocationData] = useState<SmartLocationFormData>({
    province: "Kigali City",
    district: "Nyarugenge",
    sector: "Nyamirambo",
    cell: "Biryogo",
    nearestLandmark: "",
    streetName: "",
    nearbyPlace: "",
    locationDescription: "",
    latitude: -1.981,
    longitude: 30.046,
    locationSource: "OWNER_REPORTED",
    locationVerificationStatus: "UNVERIFIED",
  });

  // Step 3: Initial Catalog Items (Products & Services with Media & Mandatory Caption)
  const [products, setProducts] = useState<Array<{
    id: string;
    name: string;
    nameRw?: string;
    description?: string;
    isService: boolean;
    contactForPrice: boolean;
    price: string;
    priceMin?: string;
    priceMax?: string;
    priceType?: "FIXED" | "RANGE" | "ESTIMATED";
    unit?: string;
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO" | "FILE";
    mediaCaption?: string;
  }>>([]);

  // Active item draft form for Step 3
  const [itemDraft, setItemDraft] = useState({
    name: "",
    nameRw: "",
    description: "",
    isService: false,
    contactForPrice: false,
    price: "",
    priceMin: "",
    priceMax: "",
    priceType: "FIXED" as "FIXED" | "RANGE" | "ESTIMATED",
    unit: "item",
    mediaUrl: "",
    mediaType: "IMAGE" as "IMAGE" | "VIDEO" | "FILE",
    mediaCaption: "",
  });
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  const handleItemFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let detectedType: "IMAGE" | "VIDEO" | "FILE" = "IMAGE";
    if (file.type.startsWith("video/")) {
      detectedType = "VIDEO";
    } else if (file.type.startsWith("image/")) {
      detectedType = "IMAGE";
    } else {
      detectedType = "FILE";
    }

    if (file.size > 15 * 1024 * 1024) {
      setItemError(lang === "rw" ? "Dosiye irarenga 15MB. Hitamo idafite uburemere bwinshi." : "File exceeds 15MB limit. Please choose a smaller file or link a URL.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setItemDraft((prev) => ({
        ...prev,
        mediaUrl: result,
        mediaType: detectedType,
      }));
      setItemError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = () => {
    if (!itemDraft.name.trim()) {
      setItemError(lang === "rw" ? "Injiza izina ry'igicuruzwa cyangwa serivisi." : "Please enter the item or service name.");
      return;
    }

    // MANDATORY CAPTION ENFORCEMENT FOR UPLOADS
    if (itemDraft.mediaUrl.trim() && !itemDraft.mediaCaption.trim()) {
      setItemError(
        lang === "rw"
          ? "Ugomba gushyiraho ibisobanuro (caption) by'ifoto cyangwa videwo mbere yo kubika."
          : "A media caption is strictly required when uploading or attaching an image, file, or video."
      );
      return;
    }

    if (!itemDraft.contactForPrice && !itemDraft.price.trim() && itemDraft.priceType !== "RANGE") {
      setItemError(
        lang === "rw"
          ? "Injiza igiciro cyangwa uhitemo 'Baza Igiciro'."
          : "Please enter a price or select 'Contact for price'."
      );
      return;
    }

    const newItem = {
      id: editingItemIndex !== null ? products[editingItemIndex].id : `reg-prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: itemDraft.name.trim(),
      nameRw: itemDraft.nameRw.trim() || undefined,
      description: itemDraft.description.trim() || undefined,
      isService: Boolean(itemDraft.isService),
      contactForPrice: Boolean(itemDraft.contactForPrice),
      price: itemDraft.contactForPrice ? "0" : (itemDraft.price.trim() || "0"),
      priceMin: itemDraft.priceMin.trim() || undefined,
      priceMax: itemDraft.priceMax.trim() || undefined,
      priceType: itemDraft.contactForPrice ? "ESTIMATED" : itemDraft.priceType,
      unit: itemDraft.unit.trim() || (itemDraft.isService ? "service" : "item"),
      mediaUrl: itemDraft.mediaUrl.trim() || undefined,
      mediaType: itemDraft.mediaType,
      mediaCaption: itemDraft.mediaCaption.trim() || undefined,
    };

    if (editingItemIndex !== null) {
      const updated = [...products];
      updated[editingItemIndex] = newItem;
      setProducts(updated);
      setEditingItemIndex(null);
    } else {
      setProducts([...products, newItem]);
    }

    setItemDraft({
      name: "",
      nameRw: "",
      description: "",
      isService: operatingModel.isServiceDefault,
      contactForPrice: false,
      price: "",
      priceMin: "",
      priceMax: "",
      priceType: "FIXED",
      unit: operatingModel.model === "SERVICES" ? "service" : "item",
      mediaUrl: "",
      mediaType: "IMAGE",
      mediaCaption: "",
    });
    setItemError(null);
  };

  const handleEditItem = (index: number) => {
    const item = products[index];
    setItemDraft({
      name: item.name,
      nameRw: item.nameRw || "",
      description: item.description || "",
      isService: item.isService,
      contactForPrice: item.contactForPrice,
      price: item.price,
      priceMin: item.priceMin || "",
      priceMax: item.priceMax || "",
      priceType: item.priceType || "FIXED",
      unit: item.unit || "item",
      mediaUrl: item.mediaUrl || "",
      mediaType: (item.mediaType || "IMAGE") as "IMAGE" | "VIDEO" | "FILE",
      mediaCaption: item.mediaCaption || "",
    });
    setEditingItemIndex(index);
    setItemError(null);
  };

  const handleRemoveItem = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setItemDraft({
        name: "",
        nameRw: "",
        description: "",
        isService: operatingModel.isServiceDefault,
        contactForPrice: false,
        price: "",
        priceMin: "",
        priceMax: "",
        priceType: "FIXED",
        unit: operatingModel.model === "SERVICES" ? "service" : "item",
        mediaUrl: "",
        mediaType: "IMAGE",
        mediaCaption: "",
      });
    }
  };

  // Rwanda phone validator helper
  const isValidRwandaPhone = (num: string) => {
    const cleaned = num.replace(/\s+/g, "").replace(/-/g, "");
    return (
      /^(\+?250)?(78|79|72|73)\d{7}$/.test(cleaned) ||
      /^0(78|79|72|73)\d{7}$/.test(cleaned)
    );
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = t.registration.errors.nameRequired;
    }
    const catVal = validateCategoryHierarchy(formData.mainCategory, formData.subCategory, formData.businessType);
    if (!catVal.isValid) {
      errors.category = catVal.error || "Please select a valid 3-tier category hierarchy";
    }
    if (!formData.ownerName.trim()) {
      errors.ownerName = t.registration.errors.ownerRequired;
    }
    if (!formData.phone.trim()) {
      errors.phone = t.registration.errors.phoneRequired;
    } else if (!isValidRwandaPhone(formData.phone)) {
      errors.phone = "Enter a valid Rwandan mobile number (MTN 078/079 or Airtel 072/073)";
    }
    if (formData.hasDifferentWhatsapp) {
      if (!formData.whatsapp.trim()) {
        errors.whatsapp = "WhatsApp number is required when enabled";
      } else if (!isValidRwandaPhone(formData.whatsapp)) {
        errors.whatsapp = "Enter a valid Rwandan WhatsApp mobile number";
      }
    }
    if (!formData.password || formData.password.length < 6) {
      errors.password = t.registration.errors.passwordMin;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMsg("Please correct the highlighted fields before proceeding.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!locationData.province) errors.province = "Province is required";
    if (!locationData.district) errors.district = "District is required";
    if (!locationData.sector) errors.sector = "Sector is required";
    if (!locationData.cell) errors.cell = "Cell is required";
    if (!locationData.nearestLandmark || !locationData.nearestLandmark.trim()) {
      errors.nearestLandmark = (t.registration as any)?.errors?.landmarkRequired || "Nearest recognizable landmark is required";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMsg(
        lang === "rw"
          ? "Nyamuneka hitamo Akarere, Umurenge, Akagari kandi wandike ikimenyetso kigaragara cyo ku butaka (Landmark)."
          : "Please specify your district, sector, cell and nearest recognizable walking landmark."
      );
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    // If user has an active draft with name, validate and save
    if (itemDraft.name.trim()) {
      if (itemDraft.mediaUrl.trim() && !itemDraft.mediaCaption.trim()) {
        setItemError(
          lang === "rw"
            ? "Ugomba gushyiraho ibisobanuro (caption) by'ifoto cyangwa videwo mbere yo gukomeza."
            : "Media caption is strictly required when uploading or attaching an image, file, or video."
        );
        setErrorMsg(
          lang === "rw"
            ? "Ugomba gushyiraho ibisobanuro (caption) by'ifoto cyangwa videwo mbere yo gukomeza."
            : "Media caption is strictly required when uploading or attaching an image, file, or video."
        );
        return false;
      }
      handleSaveItem();
    }

    // Verify all products have required captions if media is attached
    for (const p of products) {
      if (p.mediaUrl && !p.mediaCaption?.trim()) {
        setErrorMsg(
          lang === "rw"
            ? `Ibisobanuro (caption) birakenewe ku kintu "${p.name}".`
            : `Media caption is strictly required for "${p.name}".`
        );
        return false;
      }
    }

    setErrorMsg(null);
    return true;
  };

  // Comprehensive Checklist for Final Submission
  const validationChecklist = useMemo(() => {
    return [
      {
        id: "name",
        label: "Business Name",
        valid: Boolean(formData.name.trim()),
        step: 1,
      },
      {
        id: "category",
        label: "Classification (Sector → Subcategory → Business Type)",
        valid: Boolean(formData.mainCategory && formData.subCategory && formData.businessType),
        step: 1,
      },
      {
        id: "owner",
        label: "Owner Name & Valid Phone",
        valid: Boolean(formData.ownerName.trim() && isValidRwandaPhone(formData.phone)),
        step: 1,
      },
      {
        id: "whatsapp",
        label: "WhatsApp Contact",
        valid: !formData.hasDifferentWhatsapp || isValidRwandaPhone(formData.whatsapp),
        step: 1,
      },
      {
        id: "password",
        label: "Account Password (min 6 chars)",
        valid: Boolean(formData.password && formData.password.length >= 6),
        step: 1,
      },
      {
        id: "admin_location",
        label: "Administrative Cell, Sector, District",
        valid: Boolean(locationData.province && locationData.district && locationData.sector && locationData.cell),
        step: 2,
      },
      {
        id: "landmark",
        label: "Nearest Recognizable Landmark",
        valid: Boolean(locationData.nearestLandmark.trim()),
        step: 2,
      },
      {
        id: "products",
        label: `${operatingModel.stepLabel} & Media Pricing`,
        valid: products.every((p) => {
          if (p.mediaUrl && !p.mediaCaption?.trim()) return false;
          if (p.name.trim()) return p.contactForPrice || Number(p.price) >= 0;
          return true;
        }),
        step: 3,
      },
    ];
  }, [formData, locationData, products, operatingModel]);

  const isAllValid = useMemo(() => {
    return validationChecklist.every((c) => c.valid);
  }, [validationChecklist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllValid) {
      setErrorMsg("Your application is incomplete. Please resolve missing required fields before submitting to MOSA Admin.");
      return;
    }
    if (!formData.certifyAccurate) {
      setErrorMsg("Please certify that the submitted business information is accurate.");
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      let effectiveProducts = [...products];
      if (itemDraft.name.trim()) {
        if (itemDraft.mediaUrl.trim() && !itemDraft.mediaCaption.trim()) {
          setErrorMsg(
            lang === "rw"
              ? "Ugomba gushyiraho ibisobanuro (caption) by'ifoto/videwo y'igicuruzwa mbere yo kubika."
              : "Media caption is strictly required for the item being added before submitting."
          );
          setSubmitting(false);
          return;
        }
        effectiveProducts.push({
          id: `reg-prod-${Date.now()}`,
          name: itemDraft.name.trim(),
          nameRw: itemDraft.nameRw.trim() || undefined,
          description: itemDraft.description.trim() || undefined,
          isService: Boolean(itemDraft.isService),
          contactForPrice: Boolean(itemDraft.contactForPrice),
          price: itemDraft.contactForPrice ? "0" : (itemDraft.price.trim() || "0"),
          priceMin: itemDraft.priceMin.trim() || undefined,
          priceMax: itemDraft.priceMax.trim() || undefined,
          priceType: itemDraft.contactForPrice ? "ESTIMATED" : itemDraft.priceType,
          unit: itemDraft.unit.trim() || (itemDraft.isService ? "service" : "item"),
          mediaUrl: itemDraft.mediaUrl.trim() || undefined,
          mediaType: itemDraft.mediaType,
          mediaCaption: itemDraft.mediaCaption.trim() || undefined,
        });
      }

      for (const p of effectiveProducts) {
        if (p.mediaUrl && !p.mediaCaption?.trim()) {
          setErrorMsg(`Caption is required for uploaded media on "${p.name}".`);
          setSubmitting(false);
          return;
        }
      }

      const validProducts = effectiveProducts
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          nameRw: p.nameRw?.trim() || p.name.trim(),
          description: p.description?.trim() || undefined,
          price: p.contactForPrice ? 0 : (Number(p.price) || 0),
          priceMin: p.priceMin ? Number(p.priceMin) : undefined,
          priceMax: p.priceMax ? Number(p.priceMax) : undefined,
          priceType: p.contactForPrice ? "ESTIMATED" : (p.priceType || (p.priceMin && p.priceMax ? "RANGE" : "FIXED")),
          unit: p.unit || (p.isService ? "service" : "item"),
          isService: Boolean(p.isService),
          contactForPrice: Boolean(p.contactForPrice),
          isEstimated: Boolean(p.contactForPrice),
          mediaUrl: p.mediaUrl?.trim() || undefined,
          mediaType: p.mediaType || "IMAGE",
          mediaCaption: p.mediaCaption?.trim() || undefined,
        }));

      const effectiveWhatsapp = formData.hasDifferentWhatsapp && formData.whatsapp.trim()
        ? formData.whatsapp.trim()
        : formData.phone.trim();

      const payload = {
        name: formData.name.trim(),
        nameRw: formData.nameRw.trim() || formData.name.trim(),
        category: formData.mainCategory,
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory,
        businessType: formData.businessType,
        description: formData.description.trim(),
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim(),
        whatsapp: effectiveWhatsapp,
        password: formData.password,
        coverImage: formData.coverImage.trim() || undefined,
        province: locationData.province,
        district: locationData.district,
        sector: locationData.sector,
        cell: locationData.cell,
        localArea: locationData.localAreaId,
        nearestLandmark: locationData.nearestLandmark,
        streetName: locationData.streetName,
        nearbyPlace: locationData.nearbyPlace,
        locationDescription: locationData.locationDescription,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        locationAccuracy: locationData.locationAccuracy,
        products: validProducts,
      };

      const res = await fetch("/api/businesses/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit business application");
      }

      setSuccess(true);
      if (data.user) {
        try {
          localStorage.setItem("mosa_user_session", JSON.stringify(data.user));
        } catch {}
      }
      setTimeout(() => {
        router.push(data.redirectUrl || "/owner/dashboard");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.registration.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.registration.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            {t.registration.subtitle}
          </p>
        </div>

        {/* 4-Step Progress Tracker */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            
            {/* Step 1 Indicator */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer ${
                  step === 1 
                    ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" 
                    : step > 1 
                    ? "bg-emerald-500 text-white" 
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </button>
              <span className={`text-xs font-bold hidden sm:inline ${step === 1 ? "text-slate-900" : "text-slate-500"}`}>
                {t.registration.step1}
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-slate-200" />

            {/* Step 2 Indicator */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer ${
                  step === 2 
                    ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" 
                    : step > 2 
                    ? "bg-emerald-500 text-white" 
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : "2"}
              </button>
              <span className={`text-xs font-bold hidden sm:inline ${step === 2 ? "text-slate-900" : "text-slate-500"}`}>
                {t.registration.step2}
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-slate-200" />

            {/* Step 3 Indicator */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1() && validateStep2()) {
                    setErrorMsg(null);
                    setStep(3);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer ${
                  step === 3 
                    ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" 
                    : step > 3 
                    ? "bg-emerald-500 text-white" 
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {step > 3 ? <CheckCircle2 className="w-4 h-4" /> : "3"}
              </button>
              <span className={`text-xs font-bold hidden sm:inline ${step === 3 ? "text-slate-900" : "text-slate-500"}`}>
                {lang === "rw" ? operatingModel.stepLabelRw : operatingModel.stepLabel}
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-2 bg-slate-200" />

            {/* Step 4 Indicator */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1() && validateStep2() && validateStep3()) setStep(4);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer ${
                  step === 4 
                    ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" 
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                4
              </button>
              <span className={`text-xs font-bold hidden sm:inline ${step === 4 ? "text-slate-900" : "text-slate-500"}`}>
                {t.registration.step4 || "Review & Submit"}
              </span>
            </div>

          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-semibold">{errorMsg}</div>
          </div>
        )}

        {/* Success Alert Box */}
        {success && (
          <div className="p-6 rounded-3xl bg-emerald-900 text-white border border-emerald-700 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black">
              {t.registration.successTitle}
            </h3>
            <p className="text-xs text-emerald-200 max-w-md mx-auto">
              Your application has been received and submitted to the MOSA Admin Command Center with status Pending Verification. Redirecting to your Private Owner Portal...
            </p>
            <div className="flex justify-center pt-2">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: BUSINESS IDENTITY & OWNER ACCOUNT */}
            {step === 1 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-emerald-600" />
                    <span>{t.registration.step1Title}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.registration.step1Desc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Business Name (Required) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.businessNameLabel} <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.registration.businessNamePlaceholder}
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-colors ${
                        fieldErrors.name ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-emerald-500"
                      }`}
                    />
                    {fieldErrors.name && (
                      <span className="text-xs text-rose-600 font-semibold mt-1 block">
                        {fieldErrors.name}
                      </span>
                    )}
                  </div>

                  {/* Kinyarwanda Name (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kinyarwanda Business Name <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Akabari k'Amata ka Biryogo"
                      value={formData.nameRw}
                      onChange={(e) => setFormData({ ...formData, nameRw: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* 3-Tier Structured Business Classification */}
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-emerald-200/60 pb-2.5">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          Structured Business Classification <span className="text-rose-600">*</span>
                        </span>
                        <p className="text-[11px] text-emerald-800/80 mt-0.5">
                          Categorize your business accurately into Main Sector, Domain, and Specific Business Type.
                        </p>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                        {formData.mainCategory} / {formData.subCategory} / {formData.businessType}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Tier 1: Main Sector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          1. Economic Sector <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={formData.mainCategory}
                          onChange={(e) => handleMainCategoryChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:border-emerald-500 outline-none bg-white shadow-xs"
                        >
                          {CANONICAL_TAXONOMY.map((m) => (
                            <option key={m.id} value={m.id}>
                              {getTaxonomyLabel(m)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tier 2: Subcategory */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          2. Subcategory / Domain <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={formData.subCategory}
                          onChange={(e) => handleSubCategoryChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:border-emerald-500 outline-none bg-white shadow-xs"
                        >
                          {availableSubcategories.map((s) => (
                            <option key={s.id} value={s.id}>
                              {getTaxonomyLabel(s)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tier 3: Specific Business Type */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          3. Specific Business Type <span className="text-rose-600">*</span>
                        </label>
                        <select
                          value={formData.businessType}
                          onChange={(e) => handleBusinessTypeChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:border-emerald-500 outline-none bg-white shadow-xs"
                        >
                          {availableBusinessTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {getTaxonomyLabel(t)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Live Breadcrumb Badge */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 pt-1 flex-wrap">
                      <span className="font-bold text-slate-500 text-[11px]">Selected:</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800 text-[11px]">
                        {getTaxonomyLabel(currentMain)}
                      </span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800 text-[11px]">
                        {getTaxonomyLabel(currentSub)}
                      </span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 font-bold text-emerald-900 text-[11px]">
                        {getTaxonomyLabel(currentType)}
                      </span>
                    </div>

                    {fieldErrors.category && (
                      <span className="text-xs text-rose-600 font-semibold mt-1 block">
                        {fieldErrors.category}
                      </span>
                    )}
                  </div>

                  {/* Owner Full Name (Required) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.ownerNameLabel} <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder={t.registration.ownerNamePlaceholder}
                        value={formData.ownerName}
                        onChange={(e) => {
                          setFormData({ ...formData, ownerName: e.target.value });
                          if (fieldErrors.ownerName) setFieldErrors({ ...fieldErrors, ownerName: "" });
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-colors ${
                          fieldErrors.ownerName ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-emerald-500"
                        }`}
                      />
                    </div>
                    {fieldErrors.ownerName && (
                      <span className="text-xs text-rose-600 font-semibold mt-1 block">
                        {fieldErrors.ownerName}
                      </span>
                    )}
                  </div>

                  {/* Phone Number (Required) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.phoneLabel} <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder={t.registration.phonePlaceholder || "0788 123 456"}
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: "" });
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-colors ${
                          fieldErrors.phone ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-emerald-500"
                        }`}
                      />
                    </div>
                    {fieldErrors.phone ? (
                      <span className="text-xs text-rose-600 font-semibold mt-1 block">
                        {fieldErrors.phone}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {t.registration.phoneHint}
                      </span>
                    )}
                  </div>

                  {/* Conditional WhatsApp Toggle */}
                  <div className="sm:col-span-2 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.hasDifferentWhatsapp}
                        onChange={(e) => setFormData({ ...formData, hasDifferentWhatsapp: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Use a different mobile number for WhatsApp customer orders
                      </span>
                    </label>
                  </div>

                  {/* Conditional WhatsApp Input */}
                  {formData.hasDifferentWhatsapp && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dedicated WhatsApp Number <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          required
                          placeholder="e.g., 0789 999 888"
                          value={formData.whatsapp}
                          onChange={(e) => {
                            setFormData({ ...formData, whatsapp: e.target.value });
                            if (fieldErrors.whatsapp) setFieldErrors({ ...fieldErrors, whatsapp: "" });
                          }}
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-colors ${
                            fieldErrors.whatsapp ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-emerald-500"
                          }`}
                        />
                      </div>
                      {fieldErrors.whatsapp && (
                        <span className="text-xs text-rose-600 font-semibold mt-1 block">
                          {fieldErrors.whatsapp}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Account Password (Required) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.passwordLabel} <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        placeholder={t.registration.passwordHint}
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium outline-none transition-colors ${
                          fieldErrors.password ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-emerald-500"
                        }`}
                      />
                    </div>
                    {fieldErrors.password ? (
                      <span className="text-xs text-rose-600 font-semibold mt-1 block">
                        {fieldErrors.password}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        {t.registration.passwordHint}
                      </span>
                    )}
                  </div>

                  {/* Description (Optional) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.descLabel}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={t.registration.descPlaceholder}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Step 1 Actions */}
                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) setStep(2);
                    }}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>{t.registration.continueToLocation}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SMART LOCATION FORM */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-6">
                  <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        <span>{t.registration.locationTitle}</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {t.registration.locationSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Embedded SmartLocationForm */}
                  <SmartLocationForm
                    initialValues={locationData}
                    businessName={formData.name}
                    businessCategory={formData.category}
                    errors={fieldErrors}
                    onChange={(updated) => {
                      setLocationData(updated);
                      if (fieldErrors.nearestLandmark && updated.nearestLandmark?.trim()) {
                        setFieldErrors((prev) => ({ ...prev, nearestLandmark: "" }));
                      }
                    }}
                  />

                  {/* Step 2 Inline Validation Alert */}
                  {errorMsg && step === 2 && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-bold">{errorMsg}</span>
                    </div>
                  )}

                  {/* Step 2 Actions */}
                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setStep(1);
                      }}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t.registration.backBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep2()) {
                          setErrorMsg(null);
                          setStep(3);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>{lang === "rw" ? operatingModel.continueBtnLabelRw : operatingModel.continueBtnLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: DYNAMIC CATALOG (SERVICES / PRODUCTS / MENU) & STOREFRONT MEDIA */}
            {step === 3 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-emerald-600" />
                      <span>{lang === "rw" ? "Ongeraho Ibicuruzwa na Serivisi" : "Add Products & Services"}</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {lang === "rw"
                        ? "Shyiraho ibicuruzwa cyangwa serivisi zawe ukoresheje ifoto/dosiye/videwo, izina, ibisobanuro n'igiciro. Buri foto cyangwa videwo igomba kugira ibisobanuro (caption)."
                        : "Add products or services with photos/files/videos, names, descriptions, and pricing. Every upload strictly requires a caption."}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    {operatingModel.model === "SERVICES" ? "Services-Based" : operatingModel.model === "FOOD_DINING" ? "Food & Dining" : "Product Retail"}
                  </span>
                </div>

                {/* Sub-form: Add / Edit Product or Service */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      {editingItemIndex !== null
                        ? (lang === "rw" ? "Vugurura Igicuruzwa / Serivisi" : "Edit Product / Service")
                        : (lang === "rw" ? "Ongeraho Igicuruzwa / Serivisi Bishya" : "Add New Product or Service")}
                    </span>
                    {editingItemIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemIndex(null);
                          setItemDraft({
                            name: "",
                            nameRw: "",
                            description: "",
                            isService: operatingModel.isServiceDefault,
                            contactForPrice: false,
                            price: "",
                            priceMin: "",
                            priceMax: "",
                            priceType: "FIXED",
                            unit: operatingModel.model === "SERVICES" ? "service" : "item",
                            mediaUrl: "",
                            mediaType: "IMAGE",
                            mediaCaption: "",
                          });
                          setItemError(null);
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel Edit</span>
                      </button>
                    )}
                  </div>

                  {itemError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{itemError}</span>
                    </div>
                  )}

                  {/* Toggle: Product vs Service */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Type:</span>
                    <button
                      type="button"
                      onClick={() => setItemDraft((prev) => ({ ...prev, isService: false, unit: "item" }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !itemDraft.isService
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      📦 Product (Igicuruzwa)
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemDraft((prev) => ({ ...prev, isService: true, unit: "service" }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        itemDraft.isService
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🛠️ Service (Serivisi)
                    </button>
                  </div>

                  {/* Item Names */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        placeholder={itemDraft.isService ? "e.g. Tailoring Suit, Phone Repair" : "e.g. Maize Flour 5kg, Leather Shoes"}
                        value={itemDraft.name}
                        onChange={(e) => {
                          setItemDraft({ ...itemDraft, name: e.target.value });
                          if (itemError) setItemError(null);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Name in Kinyarwanda <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kudoda Ikanzu, Ifu y'ibigori 5kg"
                        value={itemDraft.nameRw}
                        onChange={(e) => setItemDraft({ ...itemDraft, nameRw: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Description <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add details, materials, what is included, turnaround time, sizes..."
                      value={itemDraft.description}
                      onChange={(e) => setItemDraft({ ...itemDraft, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:border-emerald-500 outline-none resize-none"
                    />
                  </div>

                  {/* Pricing Mode */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pricing Details</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          checked={itemDraft.contactForPrice}
                          onChange={(e) =>
                            setItemDraft({
                              ...itemDraft,
                              contactForPrice: e.target.checked,
                              price: e.target.checked ? "0" : itemDraft.price,
                            })
                          }
                          className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          {lang === "rw" ? "Baza igiciro (Nta giciro gihamye)" : "Contact for price (No fixed price)"}
                        </span>
                      </label>
                    </div>

                    {!itemDraft.contactForPrice && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Pricing Mode</label>
                          <select
                            value={itemDraft.priceType}
                            onChange={(e) =>
                              setItemDraft({
                                ...itemDraft,
                                priceType: e.target.value as "FIXED" | "RANGE" | "ESTIMATED",
                              })
                            }
                            className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none"
                          >
                            <option value="FIXED">Fixed Exact Price</option>
                            <option value="RANGE">Price Range (Min - Max)</option>
                            <option value="ESTIMATED">Estimated Price (~)</option>
                          </select>
                        </div>

                        {itemDraft.priceType === "RANGE" ? (
                          <>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Min Price (RWF)</label>
                              <input
                                type="number"
                                placeholder="e.g. 2000"
                                value={itemDraft.priceMin}
                                onChange={(e) => setItemDraft({ ...itemDraft, priceMin: e.target.value })}
                                className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Price (RWF)</label>
                              <input
                                type="number"
                                placeholder="e.g. 5000"
                                value={itemDraft.priceMax}
                                onChange={(e) => setItemDraft({ ...itemDraft, priceMax: e.target.value })}
                                className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none"
                              />
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Price (RWF) *</label>
                            <div className="relative">
                              <input
                                type="number"
                                placeholder="e.g. 3500"
                                value={itemDraft.price}
                                onChange={(e) => setItemDraft({ ...itemDraft, price: e.target.value })}
                                className="w-full px-2.5 py-2 pr-12 rounded-xl bg-white border border-slate-200 text-xs font-bold outline-none"
                              />
                              <span className="text-[10px] text-slate-400 font-bold absolute right-2.5 top-2.5">
                                RWF
                              </span>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit</label>
                          <input
                            type="text"
                            placeholder={itemDraft.isService ? "e.g. service, hour" : "e.g. item, kg, pair"}
                            value={itemDraft.unit}
                            onChange={(e) => setItemDraft({ ...itemDraft, unit: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Media Upload & Required Caption */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Upload Photo, File or Video <span className="text-slate-400 font-normal">(Optional)</span></span>
                      </label>
                      {itemDraft.mediaUrl && (
                        <button
                          type="button"
                          onClick={() => setItemDraft({ ...itemDraft, mediaUrl: "", mediaCaption: "" })}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove Media</span>
                        </button>
                      )}
                    </div>

                    {!itemDraft.mediaUrl ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer transition-colors text-center">
                          <Upload className="w-5 h-5 text-emerald-600 mb-1" />
                          <span className="text-xs font-bold text-slate-800">
                            {lang === "rw" ? "Hitamo ifoto, dosiye cyangwa videwo" : "Choose Image, File or Video"}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, MP4 up to 15MB</span>
                          <input
                            type="file"
                            accept="image/*,video/*,.pdf"
                            onChange={handleItemFileUpload}
                            className="hidden"
                          />
                        </label>

                        <div className="flex flex-col justify-center space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600">Or Paste Media URL:</span>
                          <input
                            type="url"
                            placeholder="https://... (image, video or brochure link)"
                            value={itemDraft.mediaUrl}
                            onChange={(e) => setItemDraft({ ...itemDraft, mediaUrl: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Media Preview */}
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          {itemDraft.mediaType === "IMAGE" ? (
                            <img
                              src={itemDraft.mediaUrl}
                              alt="Item Preview"
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                            />
                          ) : itemDraft.mediaType === "VIDEO" ? (
                            <div className="w-16 h-16 rounded-lg bg-emerald-950 flex flex-col items-center justify-center text-emerald-400">
                              <Video className="w-6 h-6" />
                              <span className="text-[8px] font-bold mt-0.5">VIDEO</span>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-slate-200 flex flex-col items-center justify-center text-slate-700">
                              <FileText className="w-6 h-6" />
                              <span className="text-[8px] font-bold mt-0.5">FILE</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                              {itemDraft.mediaType} ATTACHED
                            </span>
                            <p className="text-[11px] text-slate-500 mt-1 truncate">
                              Media successfully attached. Enter mandatory caption below.
                            </p>
                          </div>
                        </div>

                        {/* MANDATORY CAPTION INPUT */}
                        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                          <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <span>Media Caption</span>
                              <span className="text-rose-600 font-extrabold">* (Required)</span>
                            </span>
                            <span className="text-[10px] font-normal text-amber-700">
                              {lang === "rw" ? "Birakenewe byanze bikunze" : "Mandatory for all uploads"}
                            </span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={
                              lang === "rw"
                                ? "Andika ibisobanuro birambuye by'iyi foto/videwo..."
                                : "Describe what this image/video shows (e.g. Front view of bespoke wedding suit)..."
                            }
                            value={itemDraft.mediaCaption}
                            onChange={(e) => {
                              setItemDraft({ ...itemDraft, mediaCaption: e.target.value });
                              if (itemError) setItemError(null);
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                          <p className="text-[10px] text-amber-800 mt-1">
                            This caption will remain permanently associated with this {itemDraft.mediaType.toLowerCase()} on your public business page.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add / Update Item Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveItem}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {editingItemIndex !== null
                          ? (lang === "rw" ? "Bika Impinduka" : "Save Changes to Item")
                          : (lang === "rw" ? "Ongeraho ku Rutonde" : "Add Product / Service to List")}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Items List (Show all added items) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>{lang === "rw" ? "Ibicuruzwa na Serivisi Byongeweho" : "Added Products & Services"} ({products.length})</span>
                    </h3>
                  </div>

                  {products.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      {lang === "rw"
                        ? "Nta gicuruzwa cyangwa serivisi birongerwaho. Uzuza ifishi iri haruguru maze ukande 'Ongeraho ku Rutonde'."
                        : "No products or services added yet. Fill out the form above and click 'Add Product / Service to List'."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {products.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200"
                        >
                          <div className="flex items-start gap-3">
                            {p.mediaUrl ? (
                              <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-slate-200 border border-slate-300">
                                {p.mediaType === "VIDEO" ? (
                                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-emerald-400">
                                    <Video className="w-5 h-5" />
                                  </div>
                                ) : p.mediaType === "FILE" ? (
                                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-600">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                ) : (
                                  <img src={p.mediaUrl} alt={p.name} className="w-full h-full object-cover" />
                                )}
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                                {idx + 1}
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 text-xs">{p.name}</span>
                                {p.nameRw && p.nameRw !== p.name && (
                                  <span className="text-[11px] text-slate-500 italic">({p.nameRw})</span>
                                )}
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                                  {p.isService ? "Service" : "Product"}
                                </span>
                              </div>

                              {p.description && (
                                <p className="text-[11px] text-slate-600 line-clamp-1">{p.description}</p>
                              )}

                              {p.mediaCaption && (
                                <p className="text-[10px] text-amber-800 italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                  Caption: &ldquo;{p.mediaCaption}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                            <div className="text-right">
                              {p.contactForPrice ? (
                                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                  {lang === "rw" ? "Baza igiciro" : "Contact for price"}
                                </span>
                              ) : p.priceType === "RANGE" && p.priceMin && p.priceMax ? (
                                <span className="text-xs font-black text-slate-900">
                                  {Number(p.priceMin).toLocaleString()} – {Number(p.priceMax).toLocaleString()} RWF
                                </span>
                              ) : (
                                <span className="text-xs font-black text-slate-900">
                                  {Number(p.price).toLocaleString()} RWF
                                </span>
                              )}
                              {!p.contactForPrice && p.unit && (
                                <span className="text-[10px] text-slate-400 block">/{p.unit}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditItem(idx)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Storefront Cover Media (Photo or Video) */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>Storefront Cover Media (Photo or Video) <span className="text-slate-400 font-normal">(Optional)</span></span>
                    </label>
                  </div>

                  <input
                    type="file"
                    ref={coverInputRef}
                    accept="image/*,video/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                    >
                      {uploadingCover ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{uploadingCover ? "Processing File..." : "Choose Photo / Video from Device"}</span>
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Or paste media URL..."
                        value={formData.coverImage}
                        onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-emerald-500 outline-none"
                      />
                      {formData.coverImage && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, coverImage: "" })}
                          className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {formData.coverImage ? (
                    <div className="relative aspect-[21/9] sm:aspect-[3/1] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-xs">
                      {isVideoMedia(formData.coverImage) ? (
                        <video
                          src={formData.coverImage}
                          controls
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={formData.coverImage}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border border-white/10">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{isVideoMedia(formData.coverImage) ? "Cover Video Selected" : "Cover Photo Selected"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Upload a photo of your shop or short showcase video. If left empty, a clean neutral MOSA fallback banner will be used.
                    </p>
                  )}
                </div>

                {/* Step 3 Actions */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setStep(2);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t.registration.backBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep3()) {
                        setErrorMsg(null);
                        setStep(4);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Review & Confirm</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & FINAL SUBMISSION */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-6">
                  
                  <div className="border-b border-slate-100 pb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Application Review</span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {t.registration.reviewTitle || "Review Your Application Before Submission"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.registration.reviewSubtitle || "Verify that all required information is accurate. An incomplete application cannot be submitted to MOSA Admin."}
                    </p>
                  </div>

                  {/* Summary Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Section 1: Business & Owner Identity */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-emerald-600" />
                          Identity & Account
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div><strong className="text-slate-900">Business:</strong> {formData.name}</div>
                        {formData.nameRw && <div><strong className="text-slate-900">Kinyarwanda:</strong> {formData.nameRw}</div>}
                        <div className="pt-1 pb-1 border-y border-slate-200/80 my-1 space-y-1 bg-white p-2 rounded-lg">
                          <div className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Classification Hierarchy:</div>
                          <div><span className="text-slate-500 font-medium">Sector:</span> <strong className="text-slate-900">{getTaxonomyLabel(currentMain)}</strong></div>
                          <div><span className="text-slate-500 font-medium">Domain:</span> <strong className="text-slate-900">{getTaxonomyLabel(currentSub)}</strong></div>
                          <div><span className="text-slate-500 font-medium">Type:</span> <strong className="text-emerald-700 font-bold">{getTaxonomyLabel(currentType)}</strong></div>
                          <div><span className="text-slate-500 font-medium">Model:</span> <strong className="text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{operatingModel.model}</strong></div>
                        </div>
                        <div><strong className="text-slate-900">Owner:</strong> {formData.ownerName}</div>
                        <div><strong className="text-slate-900">Phone:</strong> <span className="font-mono">{formData.phone}</span></div>
                        <div><strong className="text-slate-900">WhatsApp:</strong> <span className="font-mono">{formData.hasDifferentWhatsapp ? formData.whatsapp : formData.phone}</span></div>
                        {formData.description && (
                          <div className="text-[11px] text-slate-600 line-clamp-2 pt-1">
                            &quot;{formData.description}&quot;
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 2: Smart Ground Discovery Location */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-emerald-600" />
                          Ground Location
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div><strong className="text-slate-900">Province:</strong> {locationData.province}</div>
                        <div><strong className="text-slate-900">District & Sector:</strong> {locationData.district} &rarr; {locationData.sector}</div>
                        <div><strong className="text-slate-900">Cell:</strong> {locationData.cell}</div>
                        <div><strong className="text-slate-900">Landmark:</strong> {locationData.nearestLandmark || <span className="text-rose-600">Missing *</span>}</div>
                        {locationData.streetName && <div><strong className="text-slate-900">Street:</strong> {locationData.streetName}</div>}
                        {locationData.nearbyPlace && <div><strong className="text-slate-900">Nearby:</strong> {locationData.nearbyPlace}</div>}
                        <div className="pt-1 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                            GPS: {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (±{locationData.locationAccuracy || 5}m)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Catalogue Items (Dynamic Services vs Products vs Menu) */}
                    <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          Initial {lang === "rw" ? operatingModel.stepLabelRw : operatingModel.stepLabel} & Pricing
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      {products.filter((p) => p.name.trim()).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {products.filter((p) => p.name.trim()).map((p, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                              {p.mediaUrl && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                                  {p.mediaType === "VIDEO" ? (
                                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-emerald-400">
                                      <Video className="w-4 h-4" />
                                    </div>
                                  ) : p.mediaType === "FILE" ? (
                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-700">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <img src={p.mediaUrl} alt={p.name} className="w-full h-full object-cover" />
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-800">{p.name}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {p.isService ? "Service" : "Product"}
                                  </span>
                                </div>
                                {p.mediaCaption && (
                                  <p className="text-[10px] text-amber-800 italic truncate">Caption: &ldquo;{p.mediaCaption}&rdquo;</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {p.contactForPrice ? (
                                  <span className="font-bold text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Contact for price
                                  </span>
                                ) : (
                                  <span className="font-mono font-bold text-emerald-700">{Number(p.price).toLocaleString()} RWF</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          No initial {operatingModel.stepLabel.toLowerCase()} specified. You can add items later in your Private Owner Portal.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Readiness / Completeness Checklist */}
                  <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 space-y-3">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Application Completeness Checklist
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {validationChecklist.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs">
                          <div className="flex items-center gap-2">
                            {item.valid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span className={item.valid ? "text-slate-800 font-medium" : "text-rose-700 font-bold"}>
                              {item.label}
                            </span>
                          </div>
                          {!item.valid && (
                            <button
                              type="button"
                              onClick={() => setStep(item.step as any)}
                              className="text-[10px] font-bold text-rose-600 hover:underline"
                            >
                              Fix &rarr;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Required Owner Certification */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        required
                        checked={formData.certifyAccurate}
                        onChange={(e) => setFormData({ ...formData, certifyAccurate: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 mt-0.5"
                      />
                      <div className="text-xs text-slate-800 font-medium leading-relaxed">
                        <strong className="font-bold text-emerald-950 block mb-0.5">
                          Owner Declaration & Authorization:
                        </strong>
                        {t.registration.certifyLabel || "I certify that I am the business owner or manager and all information provided is accurate for verification."}
                      </div>
                    </label>
                  </div>

                  {/* Step 4 Actions */}
                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t.registration.backBtn}</span>
                    </button>
                    
                    <button
                      type="submit"
                      disabled={submitting || !isAllValid || !formData.certifyAccurate}
                      className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting to MOSA Admin...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t.registration.submitToAdminBtn || "Submit Application to MOSA Admin"}</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </div>
            )}

          </form>
        )}

        {/* Bottom Link for Existing Owners */}
        <div className="text-center text-xs text-slate-500">
          <span>{t.registration.alreadyRegistered} </span>
          <Link href="/auth/login" className="text-emerald-700 font-bold underline hover:text-emerald-800">
            {t.registration.loginLink}
          </Link>
        </div>

      </div>
    </div>
  );
}
