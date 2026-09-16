"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useLocation } from "@/lib/location-context";
import { store } from "@/lib/store";
import { Business } from "@/types";
import { DemandTicker } from "@/components/discovery/DemandTicker";
import { CategoryPills } from "@/components/discovery/CategoryPills";
import { DiscoveryFeed } from "@/components/discovery/DiscoveryFeed";
import { 
  Search, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  Camera, 
  ShieldCheck, 
  HeartHandshake, 
  Users,
  Store,
  CheckCircle2,
  FileSpreadsheet,
  ChevronDown,
  Globe
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { currentSector, currentCell, currentLocalArea, displayLabel, openSelector, setSector, setFullLocation, resetLocation } = useLocation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (currentSector && currentSector !== "all") params.set("sector", currentSector);
        if (currentCell) params.set("cell", currentCell);
        if (currentLocalArea) params.set("community", currentLocalArea);
        
        const res = await fetch(`/api/businesses?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.businesses) {
            setBusinesses(data.businesses);
            return;
          }
        }
      } catch {}
      const list = store.getBusinesses({ category: selectedCategory });
      setBusinesses(list);
    }
    loadBusinesses();
  }, [selectedCategory, currentSector, currentCell, currentLocalArea]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
  };

  return (
    <div className="min-h-screen pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background decorative pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fde047_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          
          {/* Top Community Hub Badge - Interactive Selector */}
          <button
            onClick={openSelector}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-800/90 hover:bg-emerald-700/90 border border-emerald-500/50 text-emerald-100 text-xs font-semibold backdrop-blur-md transition-all shadow-lg hover:scale-105 group cursor-pointer"
            title="Change active discovery location"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>
              {lang === "rw" ? "Agace k'Ibanze:" : "Active Community Hub:"}{" "}
              <strong className="text-white underline decoration-amber-400 decoration-2 font-bold">{displayLabel}</strong>
            </span>
            <span className="text-[10px] bg-emerald-950/70 px-2 py-0.5 rounded-full text-emerald-300 font-bold ml-1 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
              {lang === "rw" ? "Hindura Agace" : "Switch Hub"} ▾
            </span>
          </button>

          {/* Master Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            {t.hero.headline}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
            {t.hero.subheadline}
          </p>

          {/* Natural Language Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-3xl mx-auto bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-center gap-2 text-slate-900 border border-emerald-400/30"
          >
            <div className="flex items-center gap-2 px-3 w-full sm:flex-1">
              <Search className="w-5 h-5 text-emerald-700 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.common.searchPlaceholder}
                className="w-full py-2.5 text-sm sm:text-base outline-none bg-transparent placeholder:text-slate-500 text-slate-900 font-medium"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>{t.common.searchBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Natural Language Prompt Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-emerald-200/90 pt-1">
            <span className="font-semibold text-amber-300">
              {lang === "rw" ? "Gerageza gushakisha:" : "Popular inquiries:"}
            </span>
            {[
              { rw: "Gusana telefone Cosmos", en: "Phone repair Cosmos" },
              { rw: "Kogosha i Biryogo", en: "Haircut Biryogo" },
              { rw: "Umudozi w'ibitenge", en: "Kitenge tailor" },
              { rw: "Amata meza ya Kivugiza", en: "Fresh milk Kivugiza" },
            ].map((query, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const val = lang === "rw" ? query.rw : query.en;
                  setSearchQuery(val);
                  router.push(`/search?q=${encodeURIComponent(val)}`);
                }}
                className="bg-emerald-800/60 hover:bg-emerald-700/80 px-2.5 py-1 rounded-full border border-emerald-600/40 text-emerald-100 transition-colors"
              >
                "{lang === "rw" ? query.rw : query.en}"
              </button>
            ))}
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/explore"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-transform active:scale-95"
            >
              {t.common.exploreBtn}
            </Link>
            <Link
              href="/agent/capture"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm backdrop-blur-md transition-all flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4 text-emerald-300" />
              <span>{lang === "rw" ? "Fata Ifoto y'Inyemezabwishyu" : "Capture Physical Data"}</span>
            </Link>
            <Link
              href="/owner/dashboard"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm backdrop-blur-md transition-all"
            >
              {t.common.registerBusinessBtn}
            </Link>
          </div>

          {/* Community Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-emerald-700/50 max-w-4xl mx-auto text-left">
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">120+</div>
              <div className="text-xs text-emerald-200/80 font-medium">{t.hero.stats.businesses}</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">18</div>
              <div className="text-xs text-emerald-200/80 font-medium">{t.hero.stats.agents}</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">450+</div>
              <div className="text-xs text-emerald-200/80 font-medium">{t.hero.stats.services}</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">6</div>
              <div className="text-xs text-emerald-200/80 font-medium">{t.hero.stats.communities}</div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Interactive Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        
        {/* Real-time Demand Ticker */}
        <DemandTicker />

        {/* Active Geographic Discovery Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  {currentSector === "all" ? "All Rwanda (Ahantu Hose)" : displayLabel}
                </h3>
                {currentSector === "Kacyiru" && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                    New Expansion Sector
                  </span>
                )}
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
                  {businesses.length} {lang === "rw" ? "amaduka n'abanyamyuga" : "local businesses"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentSector === "Kacyiru"
                  ? (lang === "rw" ? "Uruhererekane rwa Kacyiru: MINAGRI (KG 569 St), Kamutwa, Kibaza na Kamatamu" : "Kacyiru Sector (Gasabo) · Featuring MINAGRI Area (KG 569 St), Kamutwa, Kibaza & Kamatamu")
                  : currentSector === "Nyamirambo"
                  ? (lang === "rw" ? "Uruhererekane rwa Nyamirambo: Biryogo, Cosmos, Tapi Rouge, Mumena na Cyivugiza" : "Nyamirambo Sector (Nyarugenge) · Featuring Biryogo Car-Free Zone, Cosmos & Tapi Rouge")
                  : (lang === "rw" ? "Irembo ry'ubucuruzi bwo mu bice bitandukanye by'u Rwanda" : "Discovering verified neighborhood commerce across Rwanda")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentSector === "Kacyiru" ? (
              <button
                onClick={() => setSector("Nyamirambo")}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 transition-colors"
              >
                Switch to Nyamirambo
              </button>
            ) : (
              <button
                onClick={() => setSector("Kacyiru")}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
              >
                Switch to Kacyiru
              </button>
            )}
            <button
              onClick={openSelector}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              {lang === "rw" ? "Hitamo Ahandi" : "All Locations"} ▾
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs mb-8">
          <CategoryPills
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategoryChange}
          />
        </div>

        {/* The Discovery Feed */}
        <DiscoveryFeed businesses={businesses} />

        {/* Section: The Chinese Mechanism Adapted for Rwanda (Physical -> Digital Loop) */}
        <section className="mt-20 pt-12 border-t border-slate-200">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === "rw" ? "Uburyo MOSA Ikora" : "MOSA Core System"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t.agentConcept.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              {lang === "rw"
                ? "Nta mucuruzi usabwa kuba umuhanga mu ikoranabuhanga. Abakozi b'Umuryango bafata ibimenyetso biri ku butaka bakabikuramo amakuru yizewe."
                : "Micro-business owners don't need digital marketing skills. Community Agents turn ordinary paper, chalkboard menus, and receipts into structured digital catalogs."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center mb-4">
                01
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1.5">
                  {t.agentConcept.step1Title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.agentConcept.step1Desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                Chalkboard • Paper • Signs
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-card flex flex-col justify-between relative overflow-hidden ring-2 ring-emerald-500/20">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center mb-4">
                02
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1.5 flex items-center gap-1.5">
                  <span>{t.agentConcept.step2Title}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.agentConcept.step2Desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700">
                Mobile Capture • Verified Presence
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center mb-4">
                03
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1.5">
                  {t.agentConcept.step3Title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.agentConcept.step3Desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-amber-700">
                OCR • AI Structuring • RWF Prices
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card flex flex-col justify-between relative overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center mb-4">
                04
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base mb-1.5">
                  {t.agentConcept.step4Title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.agentConcept.step4Desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-800">
                Direct WhatsApp & Call • Zero Intermediary Fees
              </div>
            </div>

          </div>

          {/* Interactive CTA Banner for Community Agents */}
          <div className="mt-10 bg-gradient-to-r from-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>{lang === "rw" ? "Kora Nka Agent w'Umuryango" : "Become a Certified Community Agent"}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">
                {lang === "rw"
                  ? "Fasha kugaragaza ubucuruzi bw'agace k'iwanyu maze uhembwe."
                  : "Map out your neighborhood's hidden businesses and earn ethical recognition."}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl">
                {lang === "rw"
                  ? "Abakozi b'umuryango bafata amafoto y'inyemezabwishyu n'amamenyu, bagasura amaduka ku butaka, kandi bakayafasha kubona abakiliya baturutse mu gace."
                  : "Certified scouts verify physical locations, capture printed menus & receipts with OCR, and unlock immediate digital visibility for neighborhood micro-shops."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
              <Link
                href="/agent/capture"
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm text-center shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>{lang === "rw" ? "Fata Ifoto Ubu" : "Test Data Capture"}</span>
              </Link>
              <Link
                href="/agent/dashboard"
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs sm:text-sm text-center backdrop-blur-xs transition-all"
              >
                {t.nav.agentPortal}
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
