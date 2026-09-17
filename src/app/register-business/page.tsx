"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
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
  Layers
} from "lucide-react";

const CATEGORIES = [
  { 
    id: "food_restaurant", 
    labelEn: "Restaurants, Cafes & Milk Bars", 
    labelRw: "Resitora, Amasoko n'Amata",
    labelFr: "Restaurants, Cafés & Bars Laitiers",
    labelSw: "Migahawa, Kahawa & Maziwa Safi"
  },
  { 
    id: "agriculture_produce", 
    labelEn: "Agro-Produce & Agro-Veterinary", 
    labelRw: "Umusaruro w'Ubuhinzi n'Amatungo",
    labelFr: "Produits Agricoles & Agro-Vétérinaire",
    labelSw: "Mazao ya Kilimo & Mifugo"
  },
  { 
    id: "tailor_crafts", 
    labelEn: "Tailors, Crafts & Fashion", 
    labelRw: "Abadozi, Imitako n'Imyenda",
    labelFr: "Tailleurs, Artisanat & Mode",
    labelSw: "Mafundi Nguo, Sanaa & Mitindo"
  },
  { 
    id: "phone_electronics", 
    labelEn: "Phone Repair & Electronics", 
    labelRw: "Gusana Telefone n'Ibyuma",
    labelFr: "Réparation Téléphones & Électronique",
    labelSw: "Ukarabati wa Simu & Vifaa"
  },
  { 
    id: "salon_barber", 
    labelEn: "Salons & Barbershops", 
    labelRw: "Kogosha no Gutunganya Imisatsi",
    labelFr: "Salons de Coiffure & Barbiers",
    labelSw: "Saluni & Vinyozi"
  },
  { 
    id: "mechanic_repair", 
    labelEn: "Mechanics & Motorcycle Spares", 
    labelRw: "Abakanishi n'Ibyuma bya Moto",
    labelFr: "Mécaniciens & Pièces Détachées Moto",
    labelSw: "Mafundi Gereji & Vipuri vya Pikipiki"
  },
  { 
    id: "hardware_construction", 
    labelEn: "Hardware & Construction", 
    labelRw: "Ibyuma by'Ubwubatsi (Quincaillerie)",
    labelFr: "Quincaillerie & Matériaux de Construction",
    labelSw: "Vifaa vya Ujenzi & Hardware"
  },
  { 
    id: "pharmacy_health", 
    labelEn: "Pharmacies & Health Care", 
    labelRw: "Farumasi n'Ubuvuzi bw'Ibanze",
    labelFr: "Pharmacies & Soins de Santé",
    labelSw: "Duka la Dawa & Afya"
  },
  { 
    id: "shop_retail", 
    labelEn: "Grocery & Retail Alimentations", 
    labelRw: "Amaduka y'Ibiribwa n'Ubucuruzi",
    labelFr: "Épicerie & Commerces de Détail",
    labelSw: "Maduka ya Rejareja & Vyakula"
  },
  { 
    id: "services", 
    labelEn: "Public, Irembo & Secretarial Services", 
    labelRw: "Irembo, Serivisi na Biro",
    labelFr: "Services Publics, Irembo & Secrétariat",
    labelSw: "Huduma za Umma, Irembo & Sekretarieti"
  },
];

export default function RegisterBusinessPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const getCategoryLabel = (c: typeof CATEGORIES[0]) => {
    if (lang === "rw") return c.labelRw;
    if (lang === "fr") return c.labelFr;
    if (lang === "sw") return c.labelSw;
    return c.labelEn;
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
    category: "shop_retail",
    description: "",
    ownerName: "",
    phone: "",
    hasDifferentWhatsapp: false,
    whatsapp: "",
    password: "",
    coverImage: "",
    certifyAccurate: false,
  });

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

  // Step 3: Initial Catalog Items (Optional/Recommended)
  const [products, setProducts] = useState<Array<{ name: string; price: string }>>([
    { name: "", price: "" },
  ]);

  const handleProductChange = (index: number, field: "name" | "price", value: string) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const addProductRow = () => {
    if (products.length < 5) {
      setProducts([...products, { name: "", price: "" }]);
    }
  };

  const removeProductRow = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
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
    if (!formData.category) {
      errors.category = "Category is required";
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
    if (!locationData.nearestLandmark.trim()) {
      errors.nearestLandmark = t.registration.errors.landmarkRequired;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMsg("Please specify your district, sector, cell and nearest recognizable walking landmark.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    products.forEach((p, idx) => {
      if (p.name.trim() && (!p.price.trim() || isNaN(Number(p.price)) || Number(p.price) < 0)) {
        errors[`product_price_${idx}`] = "Valid price in RWF is required for this item";
      }
      if (!p.name.trim() && p.price.trim()) {
        errors[`product_name_${idx}`] = "Product name is required when price is entered";
      }
    });

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMsg("Please ensure all item names and prices are valid.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // Comprehensive Checklist for Final Submission
  const validationChecklist = useMemo(() => {
    return [
      {
        id: "name",
        label: "Business Name & Category",
        valid: Boolean(formData.name.trim() && formData.category),
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
        label: "Product Catalog Pricing (if specified)",
        valid: products.every((p) => {
          if (p.name.trim()) return Number(p.price) >= 0;
          if (p.price.trim()) return Boolean(p.name.trim());
          return true;
        }),
        step: 3,
      },
    ];
  }, [formData, locationData, products]);

  const isAllValid = useMemo(() => {
    return validationChecklist.every((c) => c.valid);
  }, [validationChecklist]);

  const selectedCategoryObj = useMemo(() => {
    return CATEGORIES.find((c) => c.id === formData.category) || CATEGORIES[0];
  }, [formData.category]);

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
      const validProducts = products
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          price: Number(p.price) || 0,
        }));

      const effectiveWhatsapp = formData.hasDifferentWhatsapp && formData.whatsapp.trim()
        ? formData.whatsapp.trim()
        : formData.phone.trim();

      const payload = {
        name: formData.name.trim(),
        nameRw: formData.nameRw.trim() || formData.name.trim(),
        category: formData.category,
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
                  if (validateStep1() && validateStep2()) setStep(3);
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
                {t.registration.step3}
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

                  {/* Category (Required) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.categoryLabel} <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-emerald-500 outline-none bg-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getCategoryLabel(c)}
                        </option>
                      ))}
                    </select>
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
                    onChange={(updated) => setLocationData(updated)}
                  />

                  {/* Step 2 Actions */}
                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t.registration.backBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep2()) setStep(3);
                      }}
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>{t.registration.continueToProducts}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: CATALOG PRODUCTS & STOREFRONT MEDIA */}
            {step === 3 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-card space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-600" />
                    <span>{t.registration.productsTitle}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.registration.productsSubtitle}
                  </p>
                </div>

                {/* Product Rows */}
                <div className="space-y-3">
                  {products.map((prod, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={t.registration.itemNamePlaceholder}
                          value={prod.name}
                          onChange={(e) => handleProductChange(idx, "name", e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl bg-white border text-xs font-semibold outline-none ${
                            fieldErrors[`product_name_${idx}`] ? "border-rose-400" : "border-slate-200 focus:border-emerald-500"
                          }`}
                        />
                      </div>
                      <div className="w-32 sm:w-40">
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Price (RWF)"
                            value={prod.price}
                            onChange={(e) => handleProductChange(idx, "price", e.target.value)}
                            className={`w-full px-3 py-2 pr-10 rounded-xl bg-white border text-xs font-semibold outline-none ${
                              fieldErrors[`product_price_${idx}`] ? "border-rose-400" : "border-slate-200 focus:border-emerald-500"
                            }`}
                          />
                          <span className="text-[10px] text-slate-400 font-bold absolute right-2.5 top-2.5">
                            RWF
                          </span>
                        </div>
                      </div>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProductRow(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {products.length < 5 && (
                    <button
                      type="button"
                      onClick={addProductRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.registration.addAnotherItem}</span>
                    </button>
                  )}
                </div>

                {/* Optional Storefront Cover Photo */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>Storefront or Workshop Photo URL <span className="text-slate-400 font-normal">(Optional)</span></span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-... (optional image link)"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Leave blank to use an automatic high-resolution category visual.
                  </p>
                </div>

                {/* Step 3 Actions */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t.registration.backBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep3()) setStep(4);
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
                        <div><strong className="text-slate-900">Category:</strong> {getCategoryLabel(selectedCategoryObj)}</div>
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
                        <div><strong className="text-slate-900">District/Sector:</strong> {locationData.district}, {locationData.sector}</div>
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

                    {/* Section 3: Catalogue Items */}
                    <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          Initial Products & Offerings
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {products.filter((p) => p.name.trim()).map((p, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs">
                              <span className="font-semibold text-slate-800">{p.name}</span>
                              <span className="font-mono font-bold text-emerald-700">{Number(p.price).toLocaleString()} RWF</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          No initial products specified. You can add items later in your Private Owner Portal.
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
