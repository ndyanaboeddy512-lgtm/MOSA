"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useLocation } from "@/lib/location-context";
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
      } catch (err) {
        console.error("Failed to load businesses:", err);
      }
      setBusinesses([]);
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
      
      {/* Hero Section - Spatial Discovery Focal Centerpiece */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-16 sm:pt-24 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8">
        {/* Subtle architectural ambient aura */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.12),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        
        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          
          {/* Top Community Hub Badge - Interactive Selector */}
          <div className="flex items-center justify-center">
            <button
              onClick={openSelector}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold backdrop-blur-md transition-all shadow-xs hover:border-white/20 group cursor-pointer"
              title="Change active discovery location"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </span>
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="tracking-wide">
                {lang === "rw" ? "Agace k'Ibanze:" : "Active Discovery Hub:"}{" "}
                <strong className="text-white underline decoration-amber-400/80 decoration-2 font-bold">{displayLabel}</strong>
              </span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-200 font-bold ml-1 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                {lang === "rw" ? "Hindura" : "Switch"} ▾
              </span>
            </button>
          </div>

          {/* Master Oversized Headline */}
          <div className="space-y-4">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-emerald-400/90">
              {lang === "rw" ? "Uruhererekane rw'Ubucuruzi bw'u Rwanda" : "Verifiable Ground-Level Commerce"}
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight max-w-4xl mx-auto leading-[1.05] text-white">
              {t.hero.headline}
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal pt-2">
              {t.hero.subheadline}
            </p>
          </div>

          {/* Single Striking Visual Focal Portal (Natural Language Search Bar) */}
          <div className="pt-2 max-w-3xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white rounded-2xl sm:rounded-full p-2 sm:p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] flex flex-col sm:flex-row items-center gap-2 text-slate-950 border border-white/20 transition-all focus-within:ring-2 focus-within:ring-amber-400/60"
            >
              <div className="flex items-center gap-3 px-3 sm:px-4 w-full sm:flex-1">
                <Search className="w-5 h-5 text-emerald-800 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.common.searchPlaceholder}
                  className="w-full py-2.5 text-sm sm:text-base outline-none bg-transparent placeholder:text-slate-400 text-slate-950 font-medium"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-7 py-3.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl sm:rounded-full shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:scale-[1.02]"
              >
                <span>{t.common.searchBtn}</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </form>

            {/* Natural Language Prompt Suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 pt-3">
              <span className="font-semibold text-slate-300">
                {lang === "rw" ? "Gerageza gushakisha:" : "Inquiries:"}
              </span>
              {[
                { rw: "Amaduka y'imbuto Kimironko", en: "fruit shops in Kimironko" },
                { rw: "Gusana telefone hafi ya MINAGRI", en: "phone repair near MINAGRI" },
                { rw: "Abadozi b'i Kacyiru", en: "tailors in Kacyiru" },
                { rw: "Resitora z'i Nyamirambo", en: "restaurants in Nyamirambo" },
              ].map((query, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const val = lang === "rw" ? query.rw : query.en;
                    setSearchQuery(val);
                    router.push(`/search?q=${encodeURIComponent(val)}`);
                  }}
                  className="hover:text-amber-400 text-slate-400 transition-colors underline decoration-slate-700 underline-offset-4 cursor-pointer"
                >
                  "{lang === "rw" ? query.rw : query.en}"
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/explore"
              className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-transform active:scale-95 flex items-center gap-2"
            >
              <span>{t.common.exploreBtn}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/register-business"
              className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold text-xs sm:text-sm backdrop-blur-md transition-all flex items-center gap-2"
            >
              <Store className="w-4 h-4 text-emerald-300" />
              <span>{lang === "rw" ? "Andika Ubucuruzi Bwawe" : "Register Your Business"}</span>
            </Link>
            <Link
              href="/owner/dashboard"
              className="px-5 py-3 rounded-full text-slate-400 hover:text-white font-medium text-xs sm:text-sm transition-colors"
            >
              {lang === "rw" ? "Ibiro by'Ubucuruzi (Login)" : "Owner Portal (Login)"}
            </Link>
          </div>

        </div>
      </section>

      {/* Main Interactive Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 space-y-8">
        
        {/* Real-time Demand Ticker */}
        <DemandTicker />

        {/* Active Geographic Discovery Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-extrabold text-slate-950 text-base sm:text-lg tracking-tight">
                  {currentSector === "all" ? "All Rwanda (Ahantu Hose)" : displayLabel}
                </h3>
                {currentSector === "Kacyiru" && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    New Expansion Sector
                  </span>
                )}
                <span className="text-xs bg-slate-100 text-slate-600 px-3 py-0.5 rounded-full font-semibold">
                  {businesses.length} {lang === "rw" ? "amaduka n'abanyamyuga" : "local businesses"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
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
                className="text-xs font-semibold px-4 py-2 rounded-full border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                Switch to Nyamirambo
              </button>
            ) : (
              <button
                onClick={() => setSector("Kacyiru")}
                className="text-xs font-semibold px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
              >
                Switch to Kacyiru
              </button>
            )}
            <button
              onClick={openSelector}
              className="text-xs font-bold px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white transition-colors cursor-pointer"
            >
              {lang === "rw" ? "Hitamo Ahandi" : "All Locations"} ▾
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <CategoryPills
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategoryChange}
          />
        </div>

        {/* The Discovery Feed */}
        <DiscoveryFeed businesses={businesses} />

        {/* Section: Self-Serve Business Registration Guide & Value Proposition */}
        <section className="mt-24 pt-16 border-t border-slate-200/80">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === "rw" ? "Uburyo Bworoshye bwo Kwiyandikisha" : "Simple Self-Serve Registration"}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              {lang === "rw" ? "Uko Wandika Ubucuruzi Bwawe Kuri MOSA" : "Put Your Business on MOSA in 4 Simple Steps"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2.5 max-w-xl mx-auto leading-relaxed">
              {lang === "rw"
                ? "Nta kiguzi cy'ubuhuza, nta tekinike ikomeye isabwa. Umucuruzi wese ashobora kugaragara ku ikarita y'agace ke mu minota 2 gusa."
                : "Zero intermediary fees, no complex technical skills needed. Any local shopkeeper, tailor, or artisan can get discovered in just 2 minutes."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="w-9 h-9 rounded-2xl bg-slate-950 text-amber-400 font-extrabold text-xs flex items-center justify-center mb-5 shadow-xs">
                  01
                </div>
                <h4 className="font-bold text-slate-950 text-lg mb-2 tracking-tight">
                  {lang === "rw" ? "Umwirondoro w'Ubucuruzi" : "Business Details"}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === "rw"
                    ? "Andika izina ry'iduka, icyiciro ukoreramo, izina ryawe na nimero ya telefone yo guhamagaraho."
                    : "Enter your shop name, category, your name, and your direct Rwanda mobile number for customers."}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {lang === "rw" ? "Izina • Icyiciro • Telefone" : "Name • Category • Phone"}
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-emerald-300/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between ring-2 ring-emerald-500/10 hover:border-emerald-400 transition-all">
              <div>
                <div className="w-9 h-9 rounded-2xl bg-emerald-800 text-amber-300 font-extrabold text-xs flex items-center justify-center mb-5 shadow-xs">
                  02
                </div>
                <h4 className="font-bold text-slate-950 text-lg mb-2 tracking-tight flex items-center gap-1.5">
                  <span>{lang === "rw" ? "Aho Mubarizwa" : "Smart Location"}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === "rw"
                    ? "Hitamo Intara, Akarere, Umurenge, Akagari n'ikimenyetso kizwi cyane kiri hafi (Landmark)."
                    : "Select Province, District, Sector, Cell, and a recognizable landmark so visitors never get lost."}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                {lang === "rw" ? "Agace • Ikimenyetso • Icyerekezo" : "Sector • Landmark • Directions"}
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="w-9 h-9 rounded-2xl bg-slate-950 text-amber-400 font-extrabold text-xs flex items-center justify-center mb-5 shadow-xs">
                  03
                </div>
                <h4 className="font-bold text-slate-950 text-lg mb-2 tracking-tight">
                  {lang === "rw" ? "Ibicuruzwa n'Ibiciro" : "Products & Prices"}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === "rw"
                    ? "Shyiraho ibicuruzwa cyangwa serivisi z'ingenzi utanga n'ibiciro byazo bisobanutse mu Mafanga y'u Rwanda."
                    : "List your signature items and transparent selling prices in RWF to build instant consumer trust."}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] uppercase font-bold tracking-wider text-amber-800">
                {lang === "rw" ? "Ibiciro Nyabyo • RWF" : "Honest Catalog • RWF"}
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="w-9 h-9 rounded-2xl bg-slate-950 text-amber-400 font-extrabold text-xs flex items-center justify-center mb-5 shadow-xs">
                  04
                </div>
                <h4 className="font-bold text-slate-950 text-lg mb-2 tracking-tight">
                  {lang === "rw" ? "Guhuza n'Abakiliya" : "Direct Connection"}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === "rw"
                    ? "Abakiriya bakubona ako kanya baguhamagare cyangwa bakwandikire kuri WhatsApp nta kiguzi cy'ubuhuza."
                    : "Neighborhood shoppers find you instantly and contact you directly via call or WhatsApp."}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {lang === "rw" ? "WhatsApp • Guhamagara • Nta Kiguzi" : "WhatsApp • Direct Call • 0% Commission"}
              </div>
            </div>

          </div>

          {/* Interactive CTA Banner for Business Registration */}
          <div className="mt-16 bg-slate-950 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_60%)] pointer-events-none" />
            <div className="space-y-3 relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 text-amber-400 text-[11px] font-bold uppercase tracking-[0.2em]">
                <Store className="w-4 h-4" />
                <span>{lang === "rw" ? "Gura No Kugurisha Mu Gace Kanyu" : "Grow Your Local Customer Base"}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {lang === "rw"
                  ? "Witeguye kwakira abakiliya benshi bo mu gace k'iwanyu?"
                  : "Ready to attract more neighborhood shoppers to your shop?"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {lang === "rw"
                  ? "Andika ubucuruzi bwawe ku buntu kuri MOSA maze winjire no mu biro by'umucuruzi (Owner Portal) byo gukurikirana ibicuruzwa n'imari yawe."
                  : "Register your business for free on MOSA and unlock your Private Business Owner Portal to manage inventory, wholesale costs, and margins."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3.5 shrink-0 w-full sm:w-auto relative z-10">
              <Link
                href="/register-business"
                className="px-7 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm text-center shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <Store className="w-4 h-4" />
                <span>{lang === "rw" ? "Andika Ubucuruzi Ubu" : "Register Business Now"}</span>
              </Link>
              <Link
                href="/explore"
                className="px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-xs sm:text-sm text-center backdrop-blur-md transition-all"
              >
                {t.common.exploreBtn}
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
