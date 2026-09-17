"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { ShieldCheck, HeartHandshake, MapPin, Sparkles } from "lucide-react";

export function Footer() {
  const { lang, t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Brand & Mission Statement */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                M
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">MOSA</span>
            </div>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              {t.common.appFullName}
            </p>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              {lang === "rw"
                ? "MOSA igamije gushyira ahagaragara ubukungu buto bwo mu midugudu no mu tugari tw'u Rwanda, ifasha abacuruzi kwiyandikisha no kuboneka ku buryo bworoshye."
                : "A Community Commerce Discovery Network bridging Rwanda's vibrant physical micro-economies and digital discovery, empowering local merchants to register and grow."}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Kigali, Rwanda • Nyarugenge • Nyamirambo Pilot Hub</span>
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
          <p>© {new Date().getFullYear()} MOSA Network (Rwanda). Built for sustainable, ethical community discovery.</p>
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
