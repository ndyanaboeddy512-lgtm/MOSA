"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";
import { CANONICAL_TAXONOMY } from "@/lib/taxonomy";
import { 
  ShoppingBag,
  Shirt,
  Utensils,
  Wine,
  Hotel,
  Scissors,
  HeartPulse,
  Palette,
  PartyPopper,
  Wrench,
  HardHat,
  Home,
  Sparkles,
  Truck,
  Briefcase,
  Landmark,
  GraduationCap,
  Cpu,
  Sprout,
  Factory,
  Shield,
  Printer,
  Baby,
  LayoutGrid
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag,
  Shirt,
  Utensils,
  Wine,
  Hotel,
  Scissors,
  HeartPulse,
  Palette,
  PartyPopper,
  Wrench,
  HardHat,
  Home,
  Sparkles,
  Truck,
  Briefcase,
  Landmark,
  GraduationCap,
  Cpu,
  Sprout,
  Factory,
  Shield,
  Printer,
  Baby,
};

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryPills({ selectedCategory, onSelectCategory }: CategoryPillsProps) {
  const { lang, t } = useLanguage();

  const getLabel = (item: any) => {
    if (lang === "rw") return item.nameRw || item.name;
    if (lang === "fr") return item.nameFr || item.name;
    if (lang === "sw") return item.nameSw || item.name;
    return item.name;
  };

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
      {/* "All" button */}
      <button
        onClick={() => onSelectCategory("all")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
          selectedCategory === "all"
            ? "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900"
            : "bg-slate-50 text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:bg-white hover:text-slate-950"
        }`}
      >
        <LayoutGrid className={`w-3.5 h-3.5 ${selectedCategory === "all" ? "text-amber-400" : "text-slate-500"}`} />
        <span className="tracking-tight">{t.categories.all || "All Categories"}</span>
      </button>

      {/* Dynamic Canonical Categories */}
      {CANONICAL_TAXONOMY.map((cat) => {
        const IconComponent = ICON_MAP[cat.icon] || ShoppingBag;
        const isSelected = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              isSelected
                ? "bg-slate-950 text-white shadow-sm ring-1 ring-slate-900"
                : "bg-slate-50 text-slate-700 border border-slate-200/80 hover:border-slate-300 hover:bg-white hover:text-slate-950"
            }`}
          >
            <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-emerald-700"}`} />
            <span className="tracking-tight">{getLabel(cat)}</span>
          </button>
        );
      })}
    </div>
  );
}
