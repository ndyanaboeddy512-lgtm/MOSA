"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useLocation } from "@/lib/location-context";
import { Business } from "@/types";
import { BusinessCard } from "@/components/discovery/BusinessCard";
import { CategoryPills } from "@/components/discovery/CategoryPills";
import { MosaMap } from "@/components/discovery/MosaMap";
import { 
  Compass, 
  MapPin, 
  Map, 
  List, 
  SlidersHorizontal, 
  Sparkles, 
  Phone,
  ShieldCheck,
  ChevronRight,
  Filter,
  Store
} from "lucide-react";

export default function ExplorePage() {
  const { lang, t } = useLanguage();
  const { currentSector, currentCell, currentLocalArea, displayLabel, openSelector, setSector, setCell } = useLocation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDataStatus, setSelectedDataStatus] = useState<"all" | "VERIFIED" | "DEMO">("all");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [selectedPin, setSelectedPin] = useState<Business | null>(null);

  // Compute available cells based on active sector
  const cellsBySector: Record<string, { id: string; label: string }[]> = {
    Kacyiru: [
      { id: "all", label: lang === "rw" ? "Utugari Twose tw'i Kacyiru" : "All Kacyiru Cells" },
      { id: "kamutwa", label: "Kamutwa (MINAGRI)" },
      { id: "kibaza", label: "Kibaza" },
      { id: "kamatamu", label: "Kamatamu" },
    ],
    Nyamirambo: [
      { id: "all", label: lang === "rw" ? "Utugari Twose tw'i Nyamirambo" : "All Nyamirambo Cells" },
      { id: "biryogo", label: "Biryogo" },
      { id: "rwezamenyo", label: "Rwezamenyo" },
      { id: "mumena", label: "Mumena" },
      { id: "cyivugiza", label: "Cyivugiza" },
    ],
  };

  const currentCellsList = cellsBySector[currentSector] || [
    { id: "all", label: lang === "rw" ? "Utugari Twose" : "All Cells" },
  ];

  useEffect(() => {
    async function loadBusinesses() {
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (currentSector && currentSector !== "all") params.set("sector", currentSector);
        if (currentCell) params.set("cell", currentCell);
        if (selectedDataStatus !== "all") params.set("dataStatus", selectedDataStatus);

        const res = await fetch(`/api/businesses?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.businesses) {
            setBusinesses(data.businesses);
            if (!selectedPin || !data.businesses.find((b: Business) => b.id === selectedPin.id)) {
              setSelectedPin(data.businesses[0] || null);
            }
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load businesses:", err);
      }
      setBusinesses([]);
    }
    loadBusinesses();
  }, [selectedCategory, currentSector, currentCell, selectedDataStatus]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {lang === "rw"
                ? `Vumbura Ubucuruzi bwo muri ${currentSector === "all" ? "Rwanda" : currentSector}`
                : `Explore ${currentSector === "all" ? "Rwanda" : currentSector} Businesses`}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {currentSector === "Kacyiru"
              ? (lang === "rw"
                  ? "Ubucuruzi bwo muri Kacyiru (Gasabo): ahazwi cyane ahegereye MINAGRI ku muhanda KG 569 St, Kamutwa, Kibaza na Kamatamu."
                  : "Verified & demo micro-enterprises across Kacyiru Sector (Gasabo): Kamutwa, MINAGRI Area (KG 569 St), Kibaza & Kamatamu.")
              : (lang === "rw"
                  ? "Reba amaduka, amagaraje, ubudozi, n'utubari tw'amata twose twemejwe n'Abakozi b'Umuryango."
                  : "Discover neighborhood enterprises, tailors, salons, milk bars, and artisans across active cells.")}
          </p>
        </div>

        {/* Community & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openSelector}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-colors shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>{displayLabel}</span>
            <span className="text-[10px] text-emerald-600">▾</span>
          </button>

          <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-4 h-4" />
              <span>{lang === "rw" ? "Urutonde" : "Grid"}</span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "map"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Map className="w-4 h-4" />
              <span>{lang === "rw" ? "Ikarita" : "Map"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-4 mb-8">
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <CategoryPills
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />
        </div>

        {/* Cells & Data Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
          {/* Cells Filter */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              {lang === "rw" ? "Akagari:" : "Cell:"}
            </span>
            {currentCellsList.map((c) => {
              const isActive = (c.id === "all" && !currentCell) || (currentCell && currentCell.toLowerCase() === c.id.toLowerCase());
              return (
                <button
                  key={c.id}
                  onClick={() => setCell(c.id === "all" ? null : c.label.split(" ")[0])}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Data Lifecycle Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase mr-1">
              Status:
            </span>
            {(
              [
                { id: "all", label: "All Records" },
                { id: "VERIFIED", label: "Verified Only" },
                { id: "DEMO", label: "Demo Samples" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedDataStatus(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedDataStatus === s.id
                    ? s.id === "DEMO"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-emerald-700 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map View Mode */}
      {viewMode === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Interactive Map Visualizer */}
          <div className="lg:col-span-2">
            <MosaMap
              center={
                selectedPin
                  ? {
                      lat: selectedPin.location?.coordinates?.lat ?? selectedPin.latitude,
                      lng: selectedPin.location?.coordinates?.lng ?? selectedPin.longitude,
                    }
                  : currentSector === "Kacyiru"
                  ? { lat: -1.942, lng: 30.088 }
                  : { lat: -1.981, lng: 30.046 }
              }
              zoom={currentSector === "all" ? 12 : 15}
              pins={businesses.map((biz) => ({
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
                const b = businesses.find((x) => x.id === pin.id);
                if (b) setSelectedPin(b);
              }}
              heightClassName="min-h-[500px]"
              showDirectionsButton={true}
            />
          </div>

          {/* Selected Pin Details Sidebar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-card flex flex-col justify-between">
            {selectedPin ? (
              <div className="space-y-4">
                <div className="relative h-44 rounded-2xl overflow-hidden">
                  <img
                    src={selectedPin.coverImage}
                    alt={selectedPin.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-xs">
                      {selectedPin.categoryDisplay}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lang === "rw" && selectedPin.nameRw ? selectedPin.nameRw : selectedPin.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{selectedPin.location?.community || (selectedPin as any).cell || "Nyamirambo"}, {selectedPin.location?.cell || (selectedPin as any).cell || "Nyamirambo"}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {lang === "rw" && selectedPin.descriptionRw ? selectedPin.descriptionRw : selectedPin.description}
                  </p>
                </div>

                {/* Sample items */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {lang === "rw" ? "Ibiciro Byemejwe" : "Verified Price List"}
                  </div>
                  <div className="space-y-1.5">
                    {selectedPin.products.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 truncate">{p.name}</span>
                        <span className="font-bold text-slate-900">{p.price.toLocaleString()} Frw</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                  {selectedPin.phone && (
                    <a
                      href={`tel:${selectedPin.phone}`}
                      className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold text-center transition-colors"
                    >
                      {t.common.call}
                    </a>
                  )}
                  {selectedPin.whatsapp && (
                    <a
                      href={`https://wa.me/${selectedPin.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center transition-colors"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs">
                Select a pin on the map to preview business details.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Grid View Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {businesses.map((biz) => (
            <BusinessCard key={biz.id} business={biz} />
          ))}
        </div>
      )}

      {/* Merchant Self-Registration Callout Banner */}
      <div className="mt-12 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center justify-center sm:justify-start gap-2">
            <Store className="w-5 h-5 text-emerald-600" />
            <span>{lang === "rw" ? "Ucuruza muri aka gace? Ntiwirengagize abakiliya!" : "Do you run a shop or service in this area?"}</span>
          </h3>
          <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
            {lang === "rw"
              ? "Andika ubucuruzi bwawe ku buntu kuri MOSA kugira ngo abaturage bo mu murenge wawe bakubone bidasabye ubuhuza."
              : "Register your business directly on MOSA for free discovery across your sector without commission fees."}
          </p>
        </div>
        <Link
          href="/register-business"
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <Store className="w-4 h-4 text-emerald-200" />
          <span>{lang === "rw" ? "Andika Ubucuruzi Bwawe" : "Register Your Business"}</span>
        </Link>
      </div>
    </div>
  );
}
