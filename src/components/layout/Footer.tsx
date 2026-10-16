"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { usePlatformSettings } from "@/lib/platform-context";
import { ShieldCheck, HeartHandshake, Mail, Phone, MessageSquare } from "lucide-react";

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const { lang, t } = useLanguage();
  const { settings: platformSettings } = usePlatformSettings();

  const platformName = lang === "rw" ? (platformSettings.platformNameRw || platformSettings.platformName) : platformSettings.platformName;
  const defaultDescEn = "An independent business discovery platform connecting verified local merchants, artisans, and enterprises worldwide with transparent pricing and verified locations.";
  const defaultDescRw = "MOSA igamije gushyira ahagaragara ubucuruzi n'abanyamyuga bo mu midugudu no mu mijyi ku isi hose, ifasha abacuruzi kwiyandikisha no kuboneka ku buryo bworoshye.";

  const rawDescription = lang === "rw"
    ? (platformSettings.shortDescriptionRw || platformSettings.taglineRw)
    : (platformSettings.shortDescription || platformSettings.tagline);

  const isOutdated = !rawDescription || /rwanda.*community commerce/i.test(rawDescription);
  const description = isOutdated ? (lang === "rw" ? defaultDescRw : defaultDescEn) : rawDescription;

  return (
    <footer className="bg-slate-950 text-slate-400 pt-16 sm:pt-20 pb-16 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-12 pb-14 border-b border-slate-900">
          
          {/* Brand & Editorial Mission Statement (3 cols on desktop) */}
          <div className="md:col-span-3 space-y-4 pr-0 lg:pr-10">
            <div className="flex items-center gap-3">
              {platformSettings.logoUrl ? (
                <img
                  src={platformSettings.logoUrl}
                  alt={platformName}
                  className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1 border border-white/10"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  {platformName ? platformName.charAt(0) : "M"}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-white">{platformName}</span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest">
                  Independent Business Discovery Platform
                </span>
              </div>
            </div>
            
            <p className="text-sm text-slate-400 max-w-lg leading-relaxed font-normal">
              {description}
            </p>
            
            {/* Digital contact channels */}
            <div className="pt-2 text-xs text-slate-400">
              <div className="flex flex-wrap items-center gap-5">
                {platformSettings.officialEmail && (
                  <a
                    href={`mailto:${platformSettings.officialEmail}`}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{platformSettings.officialEmail}</span>
                  </a>
                )}
                {platformSettings.officialPhone && (
                  <a
                    href={`tel:${platformSettings.officialPhone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{platformSettings.officialPhone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Platform Navigation */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-white uppercase tracking-widest">
              {lang === "rw" ? "Urubuga" : "Platform"}
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link href="/explore" className="hover:text-white transition-colors">
                  {t.nav.explore}
                </Link>
              </li>
              <li>
                <Link href="/demand" className="hover:text-white transition-colors">
                  {t.nav.whatPeopleNeed}
                </Link>
              </li>
              <li>
                <Link href="/register-business" className="hover:text-white transition-colors">
                  {lang === "rw" ? "Kwiyandikisha" : "Register Business"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Business & Operations */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-white uppercase tracking-widest">
              {lang === "rw" ? "Abacuruzi" : "For Merchants"}
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/register-business" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === "rw" ? "Andika Ubucuruzi Bwawe" : "Register Your Business"}</span>
                </Link>
              </li>
              <li>
                <Link href="/owner/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.nav.ownerPortal}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Ethical Governance & Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="tracking-wide">
            © 2026 MOSA Network. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              No Gambling • Zero Extractive Ads
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-400 text-[11px]">Privacy-Protected Evidence</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
