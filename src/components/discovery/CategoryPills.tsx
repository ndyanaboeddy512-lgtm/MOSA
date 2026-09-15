"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";
import { 
  Scissors, 
  Shirt, 
  Coffee, 
  Smartphone, 
  Wrench, 
  ShoppingBag, 
  Apple, 
  Palette, 
  Sparkles,
  LayoutGrid
} from "lucide-react";

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryPills({ selectedCategory, onSelectCategory }: CategoryPillsProps) {
  const { lang, t } = useLanguage();

  const categories = [
    { id: "all", label: t.categories.all, icon: LayoutGrid },
    { id: "salon_barber", label: t.categories.salon_barber, icon: Scissors },
    { id: "tailor_crafts", label: t.categories.tailor_crafts, icon: Shirt },
    { id: "food_restaurant", label: t.categories.food_restaurant, icon: Coffee },
    { id: "phone_electronics", label: t.categories.phone_electronics, icon: Smartphone },
    { id: "mechanic_repair", label: t.categories.mechanic_repair, icon: Wrench },
    { id: "shop_retail", label: t.categories.shop_retail, icon: ShoppingBag },
    { id: "agriculture_produce", label: t.categories.agriculture_produce, icon: Apple },
    { id: "art_culture", label: t.categories.art_culture, icon: Palette },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar py-1">
      {categories.map((cat) => {
        const Icon = cat.icon;
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
            <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-emerald-700"}`} />
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
