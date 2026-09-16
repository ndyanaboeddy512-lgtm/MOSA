"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { store } from "@/lib/store";
import { Business } from "@/types";
import { BusinessCard } from "@/components/discovery/BusinessCard";
import { VerificationBadge } from "@/components/common/Badge";
import { 
  Search, 
  MapPin, 
  Filter, 
  SlidersHorizontal, 
  Sparkles, 
  HelpCircle, 
  ArrowLeft,
  CheckCircle2,
  TrendingUp
} from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const { lang, t } = useLanguage();

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Business[]>([]);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedCell, setSelectedCell] = useState("all");

  useEffect(() => {
    async function loadSearch() {
      if (initialQuery) {
        setQuery(initialQuery);
        try {
          const params = new URLSearchParams();
          params.set("search", initialQuery);
          if (openNowOnly) params.set("openNowOnly", "true");
          if (selectedCell !== "all") params.set("community", selectedCell);
          const res = await fetch(`/api/businesses?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            if (data.businesses) {
              let list: Business[] = data.businesses;
              if (verifiedOnly) list = list.filter((b) => b.verificationStatus !== "UNVERIFIED");
              setResults(list);
              return;
            }
          }
        } catch {}

        let list = store.getBusinesses({ search: initialQuery });
        if (openNowOnly) list = list.filter((b) => b.isOpenNow);
        if (verifiedOnly) list = list.filter((b) => b.verificationStatus !== "UNVERIFIED");
        if (selectedCell !== "all") {
          list = list.filter((b) => (b.location?.cell || (b as any).cell || "").toLowerCase() === selectedCell.toLowerCase());
        }
        setResults(list);
      } else {
        try {
          const res = await fetch("/api/businesses");
          if (res.ok) {
            const data = await res.json();
            if (data.businesses) {
              setResults(data.businesses);
              return;
            }
          }
        } catch {}
        setResults(store.getBusinesses());
      }
    }
    loadSearch();
  }, [initialQuery, openNowOnly, verifiedOnly, selectedCell]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Search Header */}
      <div className="mb-6 space-y-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.common.back}</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <Search className="w-6 h-6 text-emerald-600" />
              <span>
                {initialQuery
                  ? `${lang === "rw" ? "Ibisubizo bya" : "Results for"} "${initialQuery}"`
                  : lang === "rw"
                  ? "Ishakisha rishingiye ku byo ukeneye"
                  : "Natural Language Need Discovery"}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {results.length} {lang === "rw" ? "ubucuruzi bubonetse muri" : "businesses found in"} Nyamirambo
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.common.searchPlaceholder}
                className="w-full pl-10 pr-24 py-2.5 bg-white rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {t.common.searchBtn}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs mb-8 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === "rw" ? "Akayunguruzo:" : "Filters:"}</span>
          </span>

          {/* Open Now toggle */}
          <button
            onClick={() => setOpenNowOnly(!openNowOnly)}
            className={`px-3 py-1.5 rounded-xl font-medium border transition-all ${
              openNowOnly
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {t.common.openNow}
          </button>

          {/* Verified Only toggle */}
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`px-3 py-1.5 rounded-xl font-medium border transition-all ${
              verifiedOnly
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            ✓ {lang === "rw" ? "Ibyemejwe Gusa" : "Verified Only"}
          </button>

          {/* Cell Selector */}
          <select
            value={selectedCell}
            onChange={(e) => setSelectedCell(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 font-medium outline-none"
          >
            <option value="all">{lang === "rw" ? "Utugari Twose (All Cells)" : "All Cells"}</option>
            <option value="biryogo">Biryogo</option>
            <option value="rwezamenyo">Rwezamenyo</option>
            <option value="mumena">Mumena</option>
            <option value="cyivugiza">Cyivugiza</option>
          </select>
        </div>

        {/* Natural Language Understanding explanation badge */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{lang === "rw" ? "Ishakisha ryumva Kinyarwanda & Icyongereza" : "Parses Kinyarwanda & English queries"}</span>
        </div>
      </div>

      {/* Results View */}
      {results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-base">
            {lang === "rw" ? "Nta bisubizo bibonetse kuri iri jambo" : "No exact matches found for your query"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            {lang === "rw"
              ? "Ishakisha ryawe ryanditswe muri Demand Radar. Abakozi b'Umuryango bashobora kubona ko iki gicuruzwa gikenewe i Nyamirambo."
              : "Your search has been logged to the Community Demand Radar so local agents and entrepreneurs can see unmet neighborhood demand."}
          </p>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2 text-left">
            <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === "rw"
                ? `Icyuho: Igicuruzwa cyangwa serivisi "${query}" yanditswe mu byo abaturage bakeneye.`
                : `Logged as unmet opportunity: "${query}" added to Nyamirambo economic intelligence.`}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {results.map((biz) => (
            <BusinessCard key={biz.id} business={biz} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
