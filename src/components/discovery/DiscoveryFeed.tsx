"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Business } from "@/types";
import { useLanguage } from "@/lib/i18n";
import { BusinessCard } from "./BusinessCard";
import { 
  Sparkles, 
  Tag, 
  FileText, 
  HelpCircle, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Compass
} from "lucide-react";

interface DiscoveryFeedProps {
  businesses: Business[];
}

export function DiscoveryFeed({ businesses }: DiscoveryFeedProps) {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"all" | "gems" | "offers" | "digitized" | "open">("all");

  // Filters
  const hiddenGems = businesses.filter((b) => b.priceRange === "LOW" || b.verificationStatus === "AGENT_VERIFIED");
  const localOffers = businesses.filter((b) => !!b.featuredOffer);
  const freshlyDigitized = businesses.filter((b) => Array.isArray(b.products) && b.products.some((p) => p.extractedFrom === "RECEIPT" || p.extractedFrom === "PRICE_BOARD"));
  const openNow = businesses.filter((b) => b.isOpenNow);

  const getFilteredList = () => {
    switch (activeTab) {
      case "gems":
        return hiddenGems;
      case "offers":
        return localOffers;
      case "digitized":
        return freshlyDigitized;
      case "open":
        return openNow;
      default:
        return businesses;
    }
  };

  const displayedBusinesses = getFilteredList();

  return (
    <div className="space-y-6">
      
      {/* Discovery Feed Section Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Compass className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {t.discoveryFeed.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.discoveryFeed.subtitle}
          </p>
        </div>

        {/* Discovery Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: "all", label: t.discoveryFeed.tabs.all, count: businesses.length },
            { id: "gems", label: t.discoveryFeed.tabs.newGems, count: hiddenGems.length },
            { id: "offers", label: t.discoveryFeed.tabs.offers, count: localOffers.length },
            { id: "digitized", label: t.discoveryFeed.tabs.recentOcr, count: freshlyDigitized.length },
            { id: "open", label: t.common.openNow, count: openNow.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Discovery Prompt Cards (Curiosity & Utility) */}
      {activeTab === "all" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Hidden Local Micro-Enterprises */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-2xl p-4 border border-emerald-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === "rw" ? "Ubukorikori bw'i Nyamirambo" : "Nyamirambo Crafts"}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                {lang === "rw" ? "Amaduka 3 ushobora kuba utari uzi ko ahari" : "3 businesses you may not know about"}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {lang === "rw"
                  ? "Reba abanyabukorikori baboha uduseke tw'umwimerere na za salo zigezweho ziri hafi yawe."
                  : "From traditional Agaseke weavers at Maison des Jeunes to expert phone microsoldering in Biryogo."}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("gems")}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950"
            >
              <span>{lang === "rw" ? "Kora kuri ibyo bucuruzi" : "View hidden gems"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Fresh Physical Data Capture */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl p-4 border border-amber-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span>{lang === "rw" ? "Ibiciro Byashyizweho Vuba" : "Digitized From Paper"}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                {lang === "rw" ? "Amamenyu n'inyemezabwishyu byemejwe" : "Physical price lists converted to digital"}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {lang === "rw"
                  ? "Abakozi b'umuryango bafashe amafoto y'ibyapa by'ibiciro bya salo n'utubari tw'amata bashyira mu ikoranabuhanga."
                  : "Fresh boiled cow milk, tailor hems, and motorcycle maintenance prices verified directly on the ground."}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("digitized")}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950"
            >
              <span>{lang === "rw" ? "Reba ibiciro byose" : "Browse verified price lists"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Reverse Market Opportunity */}
          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-2xl p-4 border border-purple-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-800 text-xs font-bold uppercase tracking-wider mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{lang === "rw" ? "Icyuho mu Bucuruzi" : "Local Opportunity"}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                {lang === "rw" ? "Ibyo abaturage bakeneye kurusha ibihari" : "High resident demand, few providers"}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {lang === "rw"
                  ? "Abaturage benshi bashakishije abanyamashanyarazi n'abadozi b'ikubitiro muri iki cyumweru."
                  : "38 searches for phone screen repair with only 2 certified shops in Biryogo. Check the demand radar."}
              </p>
            </div>
            <Link
              href="/demand"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-800 hover:text-purple-950"
            >
              <span>{lang === "rw" ? "Fungura Demand Radar" : "Explore Demand Radar"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      )}

      {/* Grid of Business Cards */}
      {displayedBusinesses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">
            {lang === "rw" ? "Nta bucuruzi buhuye n'iki cyiciro bubonetse" : "No businesses found in this discovery view"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {lang === "rw"
              ? "Kora ku yandi magambo cyangwa uhindure akayunguruzo kugira ngo ubone ubucuruzi bukorera muri aka gace."
              : "Try switching tabs or resetting category filters to view other neighborhood micro-enterprises."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayedBusinesses.map((biz) => (
            <BusinessCard key={biz.id} business={biz} />
          ))}
        </div>
      )}
    </div>
  );
}
