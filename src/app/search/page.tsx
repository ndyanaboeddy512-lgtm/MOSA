"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { Business } from "@/types";
import { BusinessCard } from "@/components/discovery/BusinessCard";
import { VerificationBadge } from "@/components/common/Badge";
import { MosaMap } from "@/components/discovery/MosaMap";
import { parseSearchQuery, ParsedSearchQuery } from "@/lib/search-nlp";
import { getGoogleMapsDirectionsUrl } from "@/lib/location-quality";
import { 
  Search, 
  MapPin, 
  Filter, 
  SlidersHorizontal, 
  Sparkles, 
  HelpCircle, 
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Map as MapIcon,
  List as ListIcon,
  Navigation,
  Phone,
  ChevronRight,
  DollarSign,
  Compass,
  ExternalLink,
  ShieldCheck
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
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedPin, setSelectedPin] = useState<Business | null>(null);
  const [nlpIntent, setNlpIntent] = useState<ParsedSearchQuery | null>(null);

  useEffect(() => {
    async function loadSearch() {
      if (initialQuery) {
        setQuery(initialQuery);
        const localParsed = parseSearchQuery(initialQuery);
        setNlpIntent(localParsed);

        try {
          const params = new URLSearchParams();
          params.set("search", initialQuery);
          if (openNowOnly) params.set("openNowOnly", "true");
          if (selectedCell !== "all") params.set("community", selectedCell);
          const res = await fetch(`/api/businesses?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            if (data.nlpParsed) {
              setNlpIntent(data.nlpParsed);
            }
            if (data.businesses) {
              let list: Business[] = data.businesses;
              if (verifiedOnly) list = list.filter((b) => b.verificationStatus !== "UNVERIFIED");
              setResults(list);
              if (list.length > 0) {
                setSelectedPin(list[0]);
              }
              return;
            }
          }
        } catch (err) {
          console.error("Failed to search businesses:", err);
        }
        setResults([]);
      } else {
        setNlpIntent(null);
        try {
          const res = await fetch("/api/businesses");
          if (res.ok) {
            const data = await res.json();
            if (data.businesses) {
              setResults(data.businesses);
              if (data.businesses.length > 0) {
                setSelectedPin(data.businesses[0]);
              }
              return;
            }
          }
        } catch (err) {
          console.error("Failed to load default businesses:", err);
        }
        setResults([]);
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

  const hasNlpDetails = nlpIntent && (
    nlpIntent.matchedLandmark ||
    nlpIntent.matchedSector ||
    nlpIntent.matchedCell ||
    nlpIntent.detectedCategory ||
    nlpIntent.priceMax
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      
      {/* Search Header */}
      <div className="space-y-4 pb-6 border-b border-slate-200/80">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.common.back}</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-slate-950 text-amber-400">
                <Search className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-emerald-800">
                {lang === "rw" ? "Gushakisha Ubucuruzi" : "Spatial Search"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.1]">
              {initialQuery
                ? `${lang === "rw" ? "Ibisubizo bya" : "Results for"} "${initialQuery}"`
                : lang === "rw"
                ? "Ishakisha rishingiye ku byo ukeneye"
                : "Natural Language Need Discovery"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {results.length} {lang === "rw" ? "ubucuruzi bubonetse muri aka gace" : "verified micro-enterprises found"}
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
            <div className="relative flex items-center bg-white rounded-full border border-slate-200/80 p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-slate-950">
              <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.common.searchPlaceholder}
                className="w-full pl-3 pr-20 py-2 bg-transparent text-xs sm:text-sm text-slate-950 placeholder:text-slate-400 outline-none font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all shrink-0 cursor-pointer"
              >
                {t.common.searchBtn}
              </button>
            </div>
          </form>
        </div>

        {/* NLP Parsed Query Pills */}
        {hasNlpDetails && (
          <div className="p-4 bg-slate-50 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-wrap items-center gap-2.5 text-xs mt-4">
            <div className="flex items-center gap-1.5 font-bold text-slate-950 text-xs mr-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{lang === "rw" ? "Ibyasobanuwe:" : "Understood Intent:"}</span>
            </div>

            {nlpIntent.cleanQuery && (
              <span className="px-3 py-1 bg-white rounded-full border border-slate-200/80 font-medium text-slate-800 flex items-center gap-1.5 shadow-2xs">
                <Search className="w-3 h-3 text-slate-400" />
                <span>{nlpIntent.cleanQuery}</span>
              </span>
            )}

            {nlpIntent.detectedCategory && (
              <span className="px-3 py-1 bg-slate-950 text-white rounded-full font-bold flex items-center gap-1 shadow-2xs">
                <span>{nlpIntent.detectedCategory.replace(/_/g, " ").toUpperCase()}</span>
              </span>
            )}

            {nlpIntent.matchedLandmark && (
              <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                <MapPin className="w-3 h-3 text-amber-600" />
                <span>Near: {nlpIntent.matchedLandmark}</span>
              </span>
            )}

            {(nlpIntent.matchedSector || nlpIntent.matchedCell) && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200/80 rounded-full font-semibold flex items-center gap-1 shadow-2xs">
                <Compass className="w-3 h-3 text-emerald-600" />
                <span>
                  {nlpIntent.matchedSector}
                  {nlpIntent.matchedCell ? ` / ${nlpIntent.matchedCell}` : ""}
                </span>
              </span>
            )}

            {nlpIntent.priceMax && (
              <span className="px-3 py-1 bg-purple-50 text-purple-900 border border-purple-200/80 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                <DollarSign className="w-3 h-3 text-purple-600" />
                <span>Under {nlpIntent.priceMax.toLocaleString()} Frw</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter & View Mode Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang === "rw" ? "Akayunguruzo:" : "Filters:"}</span>
          </span>

          {/* Open Now toggle */}
          <button
            onClick={() => setOpenNowOnly(!openNowOnly)}
            className={`px-3.5 py-1.5 rounded-full font-semibold border transition-all cursor-pointer ${
              openNowOnly
                ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
            }`}
          >
            {t.common.openNow}
          </button>

          {/* Verified Only toggle */}
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`px-3.5 py-1.5 rounded-full font-semibold border transition-all cursor-pointer ${
              verifiedOnly
                ? "bg-slate-950 text-white border-slate-950 shadow-xs"
                : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
            }`}
          >
            ✓ {lang === "rw" ? "Ibyemejwe Gusa" : "Verified Only"}
          </button>

          {/* Cell Selector */}
          <select
            value={selectedCell}
            onChange={(e) => setSelectedCell(e.target.value)}
            className="px-3.5 py-1.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200/80 font-semibold outline-none cursor-pointer"
          >
            <option value="all">{lang === "rw" ? "Utugari Twose (All Cells)" : "All Cells"}</option>
            <option value="kamutwa">Kamutwa (Kacyiru)</option>
            <option value="kibaza">Kibaza (Kacyiru)</option>
            <option value="biryogo">Biryogo (Nyamirambo)</option>
            <option value="rwezamenyo">Rwezamenyo (Nyamirambo)</option>
            <option value="mumena">Mumena (Nyamirambo)</option>
            <option value="cyivugiza">Cyivugiza (Nyamirambo)</option>
          </select>
        </div>

        {/* View Mode Toggle: Grid vs Map */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/80">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>{lang === "rw" ? "Urutonde" : "Grid"}</span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                viewMode === "map"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === "rw" ? "Ikarita" : "Interactive Map"}</span>
            </button>
          </div>
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
              ? "Ishakisha ryawe ryanditswe muri Demand Radar. Abakozi b'Umuryango bashobora kubona ko iki gicuruzwa gikenewe."
              : "Your search has been logged to the Community Demand Radar so local agents and entrepreneurs can see unmet neighborhood demand."}
          </p>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2 text-left">
            <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === "rw"
                ? `Icyuho: Igicuruzwa cyangwa serivisi "${query}" yanditswe mu byo abaturage bakeneye.`
                : `Logged as unmet opportunity: "${query}" added to Rwanda local economic intelligence.`}
            </span>
          </div>
        </div>
      ) : viewMode === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive MosaMap */}
          <div className="lg:col-span-2">
            <MosaMap
              center={
                selectedPin
                  ? {
                      lat: selectedPin.location?.coordinates?.lat ?? selectedPin.latitude,
                      lng: selectedPin.location?.coordinates?.lng ?? selectedPin.longitude,
                    }
                  : { lat: -1.944, lng: 30.061 }
              }
              zoom={14}
              pins={results.map((biz) => ({
                id: biz.id,
                name: lang === "rw" && biz.nameRw ? biz.nameRw : biz.name,
                nameRw: biz.nameRw,
                category: biz.category,
                categoryDisplay: biz.categoryDisplay,
                latitude: biz.location?.coordinates?.lat ?? biz.latitude,
                longitude: biz.location?.coordinates?.lng ?? biz.longitude,
                nearestLandmark: biz.nearestLandmark || biz.location?.nearestLandmark || biz.localArea?.name || biz.addressNote,
                isVerified: biz.verificationStatus === "AGENT_VERIFIED" || biz.dataStatus === "VERIFIED",
                priceSnippet: biz.products?.[0] ? `${biz.products[0].name}: ${biz.products[0].price.toLocaleString()} Frw` : undefined,
                coverImage: biz.coverImage,
              }))}
              selectedPinId={selectedPin?.id}
              onSelectPin={(pin) => {
                const found = results.find((b) => b.id === pin.id);
                if (found) setSelectedPin(found);
              }}
              heightClassName="h-[480px] sm:h-[580px] rounded-2xl"
              showDirectionsButton={true}
              interactive={true}
            />
          </div>

          {/* Selected Pin Details Sidebar */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>{lang === "rw" ? "Ubucuruzi Bwatoranyijwe" : "Selected Business on Map"}</span>
              </span>
              <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                {results.length} pins
              </span>
            </div>

            {selectedPin ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {selectedPin.logo && (
                      <img
                        src={selectedPin.logo}
                        alt={selectedPin.name}
                        className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 shadow-2xs shrink-0 p-1"
                      />
                    )}
                    <div>
                      <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full mb-1">
                        {selectedPin.categoryDisplay || selectedPin.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {lang === "rw" && selectedPin.nameRw ? selectedPin.nameRw : selectedPin.name}
                      </h3>
                    </div>
                  </div>
                  <VerificationBadge status={selectedPin.verificationStatus} />
                </div>

                {/* Nearest Landmark & Hierarchy */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        {lang === "rw" ? "Aho bwegereye:" : "Nearest Landmark / Area:"}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedPin.nearestLandmark || selectedPin.location?.nearestLandmark || selectedPin.addressNote || "Near center"}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 pl-5">
                    {selectedPin.location?.sector || selectedPin.sector}, {selectedPin.location?.cell || selectedPin.cell}
                  </div>
                </div>

                {/* Human Navigation Description */}
                {(selectedPin.locationDescription || selectedPin.location?.locationDescription) && (
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 flex items-start gap-2">
                    <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{selectedPin.locationDescription || selectedPin.location?.locationDescription}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={getGoogleMapsDirectionsUrl({
                      lat: selectedPin.location?.coordinates?.lat ?? selectedPin.latitude,
                      lng: selectedPin.location?.coordinates?.lng ?? selectedPin.longitude,
                      name: selectedPin.name,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{lang === "rw" ? "Kwerekeza" : "Directions"}</span>
                  </a>

                  <Link
                    href={`/business/${selectedPin.id}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    <span>{lang === "rw" ? "Reba Byose" : "Full Profile"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Quick list of other search results */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 max-h-72 overflow-y-auto space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2">
                {lang === "rw" ? "Ahandi Habonetse" : "Other Results"}
              </span>
              {results.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => setSelectedPin(biz)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                    selectedPin?.id === biz.id
                      ? "bg-emerald-50 text-emerald-950 font-bold border border-emerald-200"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="truncate font-semibold">{biz.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {biz.nearestLandmark || biz.location?.cell || biz.cell}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {results.map((biz, idx) => (
            <BusinessCard
              key={biz.id}
              business={biz}
              variant={idx === 0 ? "featured" : "standard"}
            />
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
