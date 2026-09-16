"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useLocation } from "@/lib/location-context";
import { store } from "@/lib/store";
import { CommunityDemandSignal } from "@/types";

export function DemandTicker() {
  const { lang, t } = useLanguage();
  const { currentSector } = useLocation();
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function loadDemands() {
      try {
        const queryUrl = currentSector && currentSector !== "all" 
          ? `/api/demand?sector=${encodeURIComponent(currentSector)}` 
          : "/api/demand";
        const res = await fetch(queryUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.demands && data.demands.length > 0) {
            setDemands(data.demands);
            return;
          }
        }
      } catch {}
      const list = store.getDemands();
      setDemands(list);
    }
    loadDemands();

    const interval = setInterval(() => {
      setDemands((prev) => {
        if (prev.length > 0) {
          setCurrentIndex((idx) => (idx + 1) % prev.length);
        }
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentSector]);

  if (demands.length === 0) return null;

  const current = demands[currentIndex] || demands[0];
  if (!current) return null;
  const query = lang === "rw" ? (current.queryTermRw || current.queryTerm) : (current.queryTerm || current.queryTermRw);
  const sectorName = currentSector === "all" ? "Rwanda" : currentSector;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10 border border-amber-300/40 rounded-2xl p-3 sm:p-4 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-amber-900">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>
              {lang === "rw"
                ? `Ibyo Abaturage Bari Gushaka muri ${sectorName}:`
                : `Current Neighborhood Demand in ${sectorName}:`}
            </span>
          </div>
          <div className="text-slate-800 font-medium mt-0.5">
            <span className="font-bold text-slate-900 underline decoration-amber-400">"{query}"</span>
            <span className="text-slate-500 ml-1.5">
              ({current.searchCount} {lang === "rw" ? "abashakishije" : "searches this week"} • {current.activeBusinessesCount} {lang === "rw" ? "amaduka abifite" : "listed shops"})
            </span>
          </div>
        </div>
      </div>

      <Link
        href="/demand"
        className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 shrink-0 bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg border border-amber-200 transition-all self-start sm:self-center"
      >
        <span>{lang === "rw" ? "Reba Ibirushaho" : "View Demand Radar"}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
