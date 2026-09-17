"use client";

import React, { useState } from "react";
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
  ExternalLink
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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Step 1: Business Identity & Owner Account
  const [formData, setFormData] = useState({
    name: "",
    nameRw: "",
    category: "shop_retail",
    description: "",
    ownerName: "",
    phone: "",
    whatsapp: "",
    password: "",
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

  // Step 3: Initial Catalog Items (Optional)
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

  const validateStep1 = () => {
    setErrorMsg(null);
    if (!formData.name.trim()) {
      setErrorMsg(t.registration.errors.nameRequired);
      return false;
    }
    if (!formData.ownerName.trim()) {
      setErrorMsg(t.registration.errors.ownerRequired);
      return false;
    }
    if (!formData.phone.trim()) {
      setErrorMsg(t.registration.errors.phoneRequired);
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrorMsg(t.registration.errors.passwordMin);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setErrorMsg(null);
    if (!locationData.nearestLandmark.trim()) {
      setErrorMsg(t.registration.errors.landmarkRequired);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const validProducts = products
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          price: Number(p.price) || 0,
        }));

      const payload = {
        name: formData.name.trim(),
        nameRw: formData.nameRw.trim() || formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
        password: formData.password,
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
        throw new Error(data.error || "Failed to register business");
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

        {/* Multi-Step Progress Tracker */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            
            {/* Step 1 Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 1 
                  ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" 
                  : step > 1 
                  ? "bg-emerald-500 text-white" 
                  : "bg-slate-100 text-slate-500"
              }`}>
                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${step === 1 ? "text-slate-900" : "text-slate-500"}`}>
                {t.registration.step1}
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-3 bg-slate-200" />

            {/* Step 2 Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 2 
                  ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" 
                  : step > 2 
                  ? "bg-emerald-500 text-white" 
                  : "bg-slate-100 text-slate-500"
              }`}>
                {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : "2"}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${step === 2 ? "text-slate-900" : "text-slate-500"}`}>
                {t.registration.step2}
              </span>
            </div>

            <div className="h-0.5 flex-1 mx-3 bg-slate-200" />

            {/* Step 3 Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 3 
                  ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100" 
                  : "bg-slate-100 text-slate-500"
              }`}>
                3
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${step === 3 ? "text-slate-900" : "text-slate-500"}`}>
                {t.registration.step3}
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
              {t.registration.successSubtitle}
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
                  {/* Business Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.businessNameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.registration.businessNamePlaceholder}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.categoryLabel}
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getCategoryLabel(c)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Owner Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.ownerNameLabel}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder={t.registration.ownerNamePlaceholder}
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.phoneLabel}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder={t.registration.phonePlaceholder || "0788 123 456"}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {t.registration.phoneHint}
                    </span>
                  </div>

                  {/* WhatsApp Number (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.whatsappLabel}
                    </label>
                    <div className="relative">
                      <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        placeholder={formData.phone || "0788 123 456"}
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Account Password */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.passwordLabel}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        placeholder={t.registration.passwordHint}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {t.registration.passwordHint}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.registration.descLabel}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={t.registration.descPlaceholder}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
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

            {/* STEP 3: INITIAL CATALOG PRODUCTS & SUBMIT */}
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
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="w-32 sm:w-40">
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Price (RWF)"
                            value={prod.price}
                            onChange={(e) => handleProductChange(idx, "price", e.target.value)}
                            className="w-full px-3 py-2 pr-10 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none focus:border-emerald-500"
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

                {/* Summary Recap Box */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2 text-emerald-950">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t.registration.whatYouGetTitle}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] leading-relaxed">
                    <li>{t.registration.whatYouGet1}</li>
                    <li>{t.registration.whatYouGet2}</li>
                    <li>{t.registration.whatYouGet3}</li>
                  </ul>
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
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t.registration.submittingBtn}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.registration.submitBtn}</span>
                      </>
                    )}
                  </button>
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
