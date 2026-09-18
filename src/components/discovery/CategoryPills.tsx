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
    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar py-1">
      {/* "All" button */}
      <button
        onClick={() => onSelectCategory("all")}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
          selectedCategory === "all"
            ? "bg-emerald-700 text-white shadow-sm scale-102"
            : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <LayoutGrid className={`w-3.5 h-3.5 ${selectedCategory === "all" ? "text-white" : "text-emerald-700"}`} />
        <span>{t.categories.all || "All Categories"}</span>
      </button>

      {/* Dynamic Canonical Categories */}
      {CANONICAL_TAXONOMY.map((cat) => {
        const IconComponent = ICON_MAP[cat.icon] || ShoppingBag;
        const isSelected = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              isSelected
                ? "bg-emerald-700 text-white shadow-sm scale-102"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-emerald-700"}`} />
            <span>{getLabel(cat)}</span>
          </button>
        );
      })}
    </div>
  );
}
