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
    <div className="space-y-8">
      
      {/* Discovery Feed Section Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-slate-950 text-amber-400">
              <Compass className="w-4 h-4" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              {t.discoveryFeed.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t.discoveryFeed.subtitle}
          </p>
        </div>

        {/* Discovery Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:border-slate-300 hover:bg-white hover:text-slate-950"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? "bg-slate-800 text-amber-300" : "bg-slate-200/70 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Discovery Prompt Cards (Curiosity & Utility) */}
      {activeTab === "all" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Hidden Local Micro-Enterprises */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-slate-300 transition-all group">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === "rw" ? "Ubukorikori bw'i Nyamirambo" : "Nyamirambo Crafts"}</span>
              </div>
              <h4 className="font-bold text-slate-950 text-base tracking-tight leading-snug group-hover:text-emerald-800 transition-colors">
                {lang === "rw" ? "Amaduka 3 ushobora kuba utari uzi ko ahari" : "3 businesses you may not know about"}
              </h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {lang === "rw"
                  ? "Reba abanyabukorikori baboha uduseke tw'umwimerere na za salo zigezweho ziri hafi yawe."
                  : "From traditional Agaseke weavers at Maison des Jeunes to expert phone microsoldering in Biryogo."}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("gems")}
              className="mt-4 pt-3 border-t border-slate-100 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <span>{lang === "rw" ? "Kora kuri ibyo bucuruzi" : "View hidden gems"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </div>

          {/* Card 2: Fresh Physical Data Capture */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-slate-300 transition-all group">
            <div>
              <div className="flex items-center gap-2 text-amber-800 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>{lang === "rw" ? "Ibiciro Byashyizweho Vuba" : "Digitized From Paper"}</span>
              </div>
              <h4 className="font-bold text-slate-950 text-base tracking-tight leading-snug group-hover:text-amber-800 transition-colors">
                {lang === "rw" ? "Amamenyu n'inyemezabwishyu byemejwe" : "Physical price lists converted to digital"}
              </h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {lang === "rw"
                  ? "Abakozi b'umuryango bafashe amafoto y'ibyapa by'ibiciro bya salo n'utubari tw'amata bashyira mu ikoranabuhanga."
                  : "Fresh boiled cow milk, tailor hems, and motorcycle maintenance prices verified directly on the ground."}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("digitized")}
              className="mt-4 pt-3 border-t border-slate-100 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-amber-800 transition-colors cursor-pointer"
            >
              <span>{lang === "rw" ? "Reba ibiciro byose" : "Browse verified price lists"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </div>

          {/* Card 3: Reverse Market Opportunity */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-slate-300 transition-all group">
            <div>
              <div className="flex items-center gap-2 text-slate-800 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
                <span>{lang === "rw" ? "Icyuho mu Bucuruzi" : "Local Opportunity"}</span>
              </div>
              <h4 className="font-bold text-slate-950 text-base tracking-tight leading-snug group-hover:text-slate-800 transition-colors">
                {lang === "rw" ? "Ibyo abaturage bakeneye kurusha ibihari" : "High resident demand, few providers"}
              </h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {lang === "rw"
                  ? "Abaturage benshi bashakishije abanyamashanyarazi n'abadozi b'ikubitiro muri iki cyumweru."
                  : "38 searches for phone screen repair with only 2 certified shops in Biryogo. Check the demand radar."}
              </p>
            </div>
            <Link
              href="/demand"
              className="mt-4 pt-3 border-t border-slate-100 inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-emerald-800 transition-colors"
            >
              <span>{lang === "rw" ? "Fungura Demand Radar" : "Explore Demand Radar"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
            </Link>
          </div>

        </div>
      )}

      {/* Editorial Composition of Business Cards */}
      {displayedBusinesses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-950 text-base">
            {lang === "rw" ? "Nta bucuruzi buhuye n'iki cyiciro bubonetse" : "No businesses found in this discovery view"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {lang === "rw"
              ? "Kora ku yandi magambo cyangwa uhindure akayunguruzo kugira ngo ubone ubucuruzi bukorera muri aka gace."
              : "Try switching tabs or resetting category filters to view other neighborhood micro-enterprises."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {displayedBusinesses.map((biz, idx) => (
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
