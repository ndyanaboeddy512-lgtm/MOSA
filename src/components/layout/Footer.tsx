"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { usePlatformSettings } from "@/lib/platform-context";
import { ShieldCheck, HeartHandshake, MapPin, Mail, Phone, MessageSquare } from "lucide-react";

export function Footer() {
  const { lang, t } = useLanguage();
  const { settings: platformSettings } = usePlatformSettings();

  const platformName = lang === "rw" ? (platformSettings.platformNameRw || platformSettings.platformName) : platformSettings.platformName;
  const address = lang === "rw" ? (platformSettings.officialAddressRw || platformSettings.officialAddress) : platformSettings.officialAddress;
  const description = lang === "rw"
    ? (platformSettings.shortDescriptionRw || platformSettings.taglineRw || "MOSA igamije gushyira ahagaragara ubukungu buto bwo mu midugudu no mu tugari tw'u Rwanda, ifasha abacuruzi kwiyandikisha no kuboneka ku buryo bworoshye.")
    : (platformSettings.shortDescription || platformSettings.tagline || "A Community Commerce Discovery Network bridging Rwanda's vibrant physical micro-economies and digital discovery, empowering local merchants to register and grow.");

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Brand & Mission Statement */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              {platformSettings.logoUrl ? (
                <img
                  src={platformSettings.logoUrl}
                  alt={platformName}
                  className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                  {platformName ? platformName.charAt(0) : "M"}
                </div>
              )}
              <span className="font-extrabold text-xl tracking-tight text-white">{platformName}</span>
            </div>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              {lang === "rw" ? (platformSettings.taglineRw || t.common.appFullName) : (platformSettings.tagline || t.common.appFullName)}
            </p>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              {description}
            </p>
            
            {/* Contact details */}
            <div className="space-y-1.5 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{address}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-0.5">
                {platformSettings.officialEmail && (
                  <a
                    href={`mailto:${platformSettings.officialEmail}`}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{platformSettings.officialEmail}</span>
                  </a>
                )}
                {platformSettings.officialPhone && (
                  <a
                    href={`tel:${platformSettings.officialPhone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{platformSettings.officialPhone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              {lang === "rw" ? "Urubuga" : "Platform"}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-emerald-400 transition-colors">
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link href="/explore" className="hover:text-emerald-400 transition-colors">
                  {t.nav.explore}
                </Link>
              </li>
              <li>
                <Link href="/demand" className="hover:text-emerald-400 transition-colors">
                  {t.nav.whatPeopleNeed}
                </Link>
              </li>
              <li>
                <Link href="/register-business" className="hover:text-emerald-400 transition-colors">
                  {lang === "rw" ? "Kwiyandikisha" : "Register Business"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Business & Operations */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              {lang === "rw" ? "Abacuruzi" : "For Merchants"}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>
                <Link href="/register-business" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === "rw" ? "Andika Ubucuruzi Bwawe" : "Register Your Business"}</span>
                </Link>
              </li>
              <li>
                <Link href="/owner/dashboard" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <HeartHandshake className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t.nav.ownerPortal}</span>
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-emerald-400 transition-colors">
                  {t.nav.admin}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Ethical Governance & Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {platformSettings.copyrightText || "MOSA Network (Rwanda). Built for sustainable, ethical community discovery."}</p>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-medium">✓ No Gambling • Zero Extractive Ads</span>
            <span>•</span>
            <span>Privacy-Protected Evidence</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
