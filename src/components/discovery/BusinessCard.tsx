"use client";

import React from "react";
import Link from "next/link";
import { Business } from "@/types";
import { useLanguage } from "@/lib/i18n";
import { VerificationBadge, DataStatusBadge } from "@/components/common/Badge";
import { MapPin, Phone, MessageCircle, Clock, ChevronRight, Tag } from "lucide-react";

import { isVideoMedia, isLegacyBagPlaceholder } from "@/lib/media-upload";

interface BusinessCardProps {
  business: Business;
  variant?: "standard" | "featured";
  className?: string;
}

export function BusinessCard({ business, variant = "standard", className = "" }: BusinessCardProps) {
  const { lang, t } = useLanguage();
  const isFeatured = variant === "featured";

  const handleContactClick = (e: React.MouseEvent, type: "phone" | "whatsapp") => {
    e.stopPropagation();
    fetch(`/api/businesses/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactClick: true }),
    }).catch(() => {});
  };

  const displayName = lang === "rw" && business.nameRw ? business.nameRw : business.name;
  const displayCategory = lang === "rw" && business.categoryDisplayRw ? business.categoryDisplayRw : business.categoryDisplay;
  const locationLabel = (business as any).localArea?.name || (business as any).addressNote || (business as any).cell || (business as any).sector || "Rwanda";

  const hasValidCover = Boolean(business.coverImage && !isLegacyBagPlaceholder(business.coverImage));
  const isVideo = hasValidCover && isVideoMedia(business.coverImage);

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col ${isFeatured ? "md:flex-row md:col-span-2 lg:col-span-2 xl:col-span-2" : ""} group hover:-translate-y-1 ${className}`}>
      {/* Cover Media & Status Badges */}
      <div className={`relative ${isFeatured ? "aspect-[16/11] md:aspect-auto md:w-7/12 min-h-[260px] md:min-h-[340px]" : "aspect-[16/11] w-full"} bg-slate-950 overflow-hidden`}>
        {hasValidCover ? (
          isVideo ? (
            <video
              src={business.coverImage!}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <img
              src={business.coverImage!}
              alt={displayName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
          )
        ) : (
          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-center p-6 relative">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 font-bold text-2xl shadow-inner mb-2 group-hover:scale-105 transition-transform">
              {displayName ? displayName.charAt(0).toUpperCase() : "M"}
            </div>
            <span className="text-[10px] font-bold text-amber-400 tracking-[0.2em] uppercase">
              {displayCategory}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-1 flex-wrap pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            <VerificationBadge status={business.verificationStatus} size="sm" />
            <DataStatusBadge status={business.dataStatus} size="sm" />
          </div>
          
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs ${
              business.isOpenNow
                ? "bg-white/95 text-emerald-800 border border-emerald-200/50"
                : "bg-slate-950/80 text-slate-300 border border-white/10"
            }`}
          >
            {business.isOpenNow ? t.common.openNow : t.common.closedNow}
          </span>
        </div>

        {/* Featured Offer Banner if present */}
        {business.featuredOffer && (
          <div className="absolute bottom-3 left-3.5 right-3.5 bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center justify-between shadow-md">
            <span className="truncate tracking-tight">
              {lang === "rw" ? business.featuredOffer.titleRw : business.featuredOffer.title}
            </span>
            <span className="bg-slate-950 text-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ml-2">
              {business.featuredOffer.discount}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className={`p-5 sm:p-6 flex-1 flex flex-col justify-between ${isFeatured ? "md:w-5/12 md:p-8" : ""}`}>
        <div>
          {isFeatured && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>{lang === "rw" ? "Ubucuruzi Bw'Icyitegererezo" : "Featured Merchant Spotlight"}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-emerald-800 text-[11px] tracking-wider uppercase">
              {displayCategory}
            </span>
            <span className="flex items-center gap-1 text-slate-500 text-xs font-medium max-w-[55%] truncate" title={locationLabel}>
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </span>
          </div>

          <Link href={`/business/${business.id}`} className="block">
            <h3 className="font-bold text-slate-950 text-lg sm:text-xl group-hover:text-emerald-800 transition-colors tracking-tight leading-snug">
              {displayName}
            </h3>
          </Link>

          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {lang === "rw" && business.descriptionRw ? business.descriptionRw : business.description}
          </p>

          {/* Estimated Price Range Banner for DEMO records */}
          {business.priceRangeMin && business.priceRangeMax && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-800 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
              <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px] font-medium text-slate-600">
                {lang === "rw" ? "Igiciro Giteganyijwe:" : "Estimated Price:"}{" "}
                <strong className="text-slate-950 font-bold">{business.priceRangeMin.toLocaleString()} – {business.priceRangeMax.toLocaleString()} Frw</strong>
              </span>
            </div>
          )}

          {/* Sample Prices */}
          {business.products && business.products.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>{business.dataStatus === "DEMO" ? (lang === "rw" ? "Ibiciro Biteganyijwe" : "Sample Estimates") : (lang === "rw" ? "Ibiciro Byemejwe" : "Sample Verified Prices")}</span>
                {business.dataStatus === "DEMO" && (
                  <span className="text-[9px] text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded font-bold">ESTIMATED</span>
                )}
              </div>
              <div className="space-y-1.5">
                {business.products.slice(0, 2).map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-slate-600 truncate pr-2 text-xs">
                      {lang === "rw" && prod.nameRw ? prod.nameRw : prod.name}
                    </span>
                    <span className="font-bold text-slate-950 shrink-0 text-xs">
                      {prod.isEstimated || prod.priceType === "ESTIMATED" ? "~" : ""}
                      {prod.priceMin && prod.priceMax
                        ? `${prod.priceMin.toLocaleString()} - ${prod.priceMax.toLocaleString()} Frw`
                        : `${prod.price.toLocaleString()} Frw`}
                      {(prod.isEstimated || prod.priceType === "ESTIMATED") && <span className="text-[10px] text-slate-400 ml-1 font-normal">(Est.)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                onClick={(e) => handleContactClick(e, "phone")}
                className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition-colors"
                title={`${t.common.call} ${displayName}`}
              >
                <Phone className="w-3.5 h-3.5 text-slate-700" />
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp}?text=Muraho,%20nabonye%20ubucuruzi%20bwanyu%20kuri%20MOSA.`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleContactClick(e, "whatsapp")}
                className="p-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 text-emerald-800 transition-colors"
                title={`${t.common.whatsapp} ${displayName}`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
              </a>
            )}
          </div>

          <Link
            href={`/business/${business.id}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all group-hover:bg-emerald-800"
          >
            <span>{t.common.details}</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
