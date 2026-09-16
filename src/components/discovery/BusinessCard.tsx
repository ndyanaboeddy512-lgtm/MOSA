"use client";

import React from "react";
import Link from "next/link";
import { Business } from "@/types";
import { useLanguage } from "@/lib/i18n";
import { store } from "@/lib/store";
import { VerificationBadge, DataStatusBadge } from "@/components/common/Badge";
import { MapPin, Phone, MessageCircle, Clock, ChevronRight, Tag } from "lucide-react";

interface BusinessCardProps {
  business: Business;
}

export function BusinessCard({ business }: BusinessCardProps) {
  const { lang, t } = useLanguage();

  const handleContactClick = (e: React.MouseEvent, type: "phone" | "whatsapp") => {
    e.stopPropagation();
    store.trackContactClick(business.id);
  };

  const displayName = lang === "rw" && business.nameRw ? business.nameRw : business.name;
  const displayCategory = lang === "rw" && business.categoryDisplayRw ? business.categoryDisplayRw : business.categoryDisplay;
  const locationLabel = (business as any).localArea?.name || (business as any).addressNote || (business as any).cell || (business as any).sector || "Rwanda";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card hover:shadow-elevated transition-all duration-200 flex flex-col group">
      {/* Cover Image & Status Badges */}
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        <img
          src={business.coverImage || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60"}
          alt={displayName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <VerificationBadge status={business.verificationStatus} size="sm" />
            <DataStatusBadge status={business.dataStatus} size="sm" />
          </div>
          
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
              business.isOpenNow
                ? "bg-emerald-500/90 text-white"
                : "bg-slate-800/80 text-slate-200"
            }`}
          >
            {business.isOpenNow ? t.common.openNow : t.common.closedNow}
          </span>
        </div>

        {/* Featured Offer Banner if present */}
        {business.featuredOffer && (
          <div className="absolute bottom-2 left-3 right-3 bg-amber-500/95 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center justify-between shadow-sm">
            <span className="truncate">
              {lang === "rw" ? business.featuredOffer.titleRw : business.featuredOffer.title}
            </span>
            <span className="bg-slate-950 text-amber-400 text-[10px] px-1.5 py-0.5 rounded uppercase shrink-0 ml-1">
              {business.featuredOffer.discount}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {displayCategory}
            </span>
            <span className="flex items-center gap-1 text-slate-500 max-w-[50%] truncate" title={locationLabel}>
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate font-medium">{locationLabel}</span>
            </span>
          </div>

          <Link href={`/business/${business.id}`} className="block">
            <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors leading-snug">
              {displayName}
            </h3>
          </Link>

          <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
            {lang === "rw" && business.descriptionRw ? business.descriptionRw : business.description}
          </p>

          {/* Estimated Price Range Banner for DEMO records */}
          {business.priceRangeMin && business.priceRangeMax && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              <Tag className="w-3 h-3 text-amber-700 shrink-0" />
              <span className="text-[11px] font-semibold">
                {lang === "rw" ? "Igiciro Giteganyijwe:" : "Estimated Range:"}{" "}
                <strong>{business.priceRangeMin.toLocaleString()} – {business.priceRangeMax.toLocaleString()} Frw</strong>
              </span>
            </div>
          )}

          {/* Sample Prices */}
          {business.products && business.products.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{business.dataStatus === "DEMO" ? (lang === "rw" ? "Ibiciro Biteganyijwe" : "Sample Estimated Prices") : (lang === "rw" ? "Ibiciro Byemejwe" : "Sample Verified Prices")}</span>
                {business.dataStatus === "DEMO" && (
                  <span className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-bold">ESTIMATED</span>
                )}
              </div>
              <div className="space-y-1">
                {business.products.slice(0, 2).map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 truncate pr-2">
                      {lang === "rw" && prod.nameRw ? prod.nameRw : prod.name}
                    </span>
                    <span className="font-bold text-slate-900 shrink-0">
                      {prod.isEstimated || prod.priceType === "ESTIMATED" ? "~" : ""}
                      {prod.priceMin && prod.priceMax
                        ? `${prod.priceMin.toLocaleString()} - ${prod.priceMax.toLocaleString()} Frw`
                        : `${prod.price.toLocaleString()} Frw`}
                      {(prod.isEstimated || prod.priceType === "ESTIMATED") && <span className="text-[10px] text-slate-500 ml-1 font-normal">(Est.)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                onClick={(e) => handleContactClick(e, "phone")}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title={`${t.common.call} ${displayName}`}
              >
                <Phone className="w-4 h-4 text-slate-700" />
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp}?text=Muraho,%20nabonye%20ubucuruzi%20bwanyu%20kuri%20MOSA.`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleContactClick(e, "whatsapp")}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                title={`${t.common.whatsapp} ${displayName}`}
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
              </a>
            )}
          </div>

          <Link
            href={`/business/${business.id}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <span>{t.common.details}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
