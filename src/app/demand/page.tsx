"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { store } from "@/lib/store";
import { CommunityDemandSignal } from "@/types";
import { 
  TrendingUp, 
  Sparkles, 
  MapPin, 
  ArrowRight, 
  ShieldAlert, 
  Lightbulb, 
  Search, 
  CheckCircle2,
  Users
} from "lucide-react";

export default function DemandRadarPage() {
  const { lang, t } = useLanguage();
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [selectedCell, setSelectedCell] = useState("all");

  useEffect(() => {
    let list = store.getDemands();
    if (selectedCell !== "all") {
      list = list.filter((d) => d.cell.toLowerCase().includes(selectedCell.toLowerCase()));
    }
    setDemands(list);
  }, [selectedCell]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Hero Radar Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-elevated mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/40 text-amber-100 text-xs font-bold backdrop-blur-md">
            <TrendingUp className="w-4 h-4 text-amber-300" />
            <span>{t.demandRadar.gapAlert}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black">
            {t.demandRadar.title}
          </h1>

          <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
            {t.demandRadar.subtitle}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-xs space-y-1.5 shrink-0 max-w-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <Lightbulb className="w-4 h-4" />
            <span>Privacy-Safe Aggregation</span>
          </div>
          <p className="text-amber-100/80 leading-relaxed text-[11px]">
            Zero personal search histories are exposed. Only aggregate neighborhood demand trends are calculated to assist local micro-entrepreneurs.
          </p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar py-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
          {lang === "rw" ? "Aka Gace:" : "Filter Cell:"}
        </span>
        {[
          { id: "all", label: lang === "rw" ? "Utugari Twose" : "All Cells" },
          { id: "biryogo", label: "Biryogo" },
          { id: "mumena", label: "Mumena" },
          { id: "rwezamenyo", label: "Rwezamenyo" },
        ].map((cell) => (
          <button
            key={cell.id}
            onClick={() => setSelectedCell(cell.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCell === cell.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {cell.label}
          </button>
        ))}
      </div>

      {/* Demand Signals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {demands.map((item, idx) => {
          const query = lang === "rw" ? item.queryTermRw : item.queryTerm;
          const desc = lang === "rw" ? item.descriptionRw : item.description;

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card hover:shadow-elevated transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {item.cell}, Nyamirambo
                  </span>

                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-wider uppercase ${
                      item.opportunityScore === "VERY_HIGH"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    ★ {item.opportunityScore.replace("_", " ")} OPPORTUNITY
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-slate-900 text-lg group-hover:text-amber-600 transition-colors">
                    "{query}"
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{desc}</p>
                </div>

                {/* Demand vs Supply Metric Bar */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      {t.demandRadar.searchesThisWeek}
                    </div>
                    <div className="text-xl font-black text-amber-600 mt-0.5">
                      {item.searchCount}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      {t.demandRadar.availableShops}
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">
                      {item.activeBusinessesCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Updated: {item.updatedAt}
                </span>

                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  <span>{lang === "rw" ? "Reba ababikora" : "View providers"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Value Loop for Local Entrepreneurs */}
      <div className="bg-emerald-50 rounded-3xl p-6 sm:p-8 border border-emerald-200">
        <h3 className="font-black text-emerald-950 text-lg mb-2">
          {t.demandRadar.economicInsight}
        </h3>
        <p className="text-xs sm:text-sm text-emerald-900/80 max-w-3xl leading-relaxed">
          {lang === "rw"
            ? "Ubu bushakashatsi bwerekana ibyo abaturage b'i Nyamirambo bari gushaka ariko amaduka ahari akaba adahagije. Niba uri umukanishi, umudozi, cyangwa umucuruzi w'ibikoresho, aya ni amahirwe yo kwagura ibicuruzwa byawe."
            : "When community demand significantly exceeds local supply, MOSA surfaces this reverse-information signal to encourage local micro-enterprises to stock missing goods, expand services, or recruit specialized artisans."}
        </p>
      </div>

    </div>
  );
}
