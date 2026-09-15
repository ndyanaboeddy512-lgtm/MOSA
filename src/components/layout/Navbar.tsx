"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth, DEMO_USERS } from "@/lib/auth-context";
import { Role } from "@/types";
import { 
  Compass, 
  Search, 
  TrendingUp, 
  Award, 
  Briefcase, 
  Store, 
  Shield, 
  MapPin, 
  Globe, 
  UserCheck, 
  Menu, 
  X,
  Camera,
  ChevronDown
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { user, switchDemoRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState("Biryogo, Nyamirambo");

  const navLinks = [
    { href: "/", label: t.nav.home, icon: Compass },
    { href: "/explore", label: t.nav.explore, icon: Search },
    { href: "/demand", label: t.nav.whatPeopleNeed, icon: TrendingUp },
    { href: "/community/missions", label: t.nav.missions, icon: Award },
  ];

  // Role portal links
  const rolePortals: Record<Role, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
    COMMUNITY_AGENT: { href: "/agent/dashboard", label: t.nav.agentPortal, icon: Briefcase },
    BUSINESS_OWNER: { href: "/owner/dashboard", label: t.nav.ownerPortal, icon: Store },
    SUPER_ADMIN: { href: "/admin", label: t.nav.admin, icon: Shield },
    MODERATOR: { href: "/admin", label: "Moderation", icon: Shield },
    COMMUNITY_ADMIN: { href: "/admin", label: "Sector Admin", icon: Shield },
    CUSTOMER: { href: "/explore", label: t.nav.explore, icon: Search },
  };

  const activePortal = user ? rolePortals[user.role] : null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-700 to-amber-500 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-none">
                  MOSA
                </span>
                <span className="text-[10px] text-slate-700 font-semibold tracking-wide">
                  RWANDA DISCOVERY
                </span>
              </div>
            </Link>

            {/* Quick Community Indicator */}
            <button
              onClick={() => setCommunityModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{selectedCommunity}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Dedicated Role Portal Link */}
            {activePortal && user?.role !== "CUSTOMER" && (
              <Link
                href={activePortal.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(activePortal.href)
                    ? "bg-amber-100 text-amber-900 font-semibold"
                    : "text-amber-800 hover:bg-amber-50"
                }`}
              >
                <activePortal.icon className="w-4 h-4 text-amber-600" />
                <span>{activePortal.label}</span>
              </Link>
            )}
          </nav>

          {/* Right Action Items: Language Toggle & Persona Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Physical Capture CTA for Community Agents */}
            <Link
              href="/agent/capture"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-xs transition-colors"
              title="Capture receipt, menu, or price board"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">
                {lang === "rw" ? "Fata Ifoto" : "Capture Data"}
              </span>
            </Link>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setLang("rw")}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  lang === "rw"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                RW
              </button>
              <button
                onClick={() => setLang("en")}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  lang === "en"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                EN
              </button>
            </div>

            {/* Demo Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-xs transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="max-w-[110px] truncate font-semibold">
                  {user?.name.split(" ")[0] || "Persona"}
                </span>
                <span className="hidden sm:inline px-1.5 py-0.2 bg-slate-100 text-[10px] rounded text-slate-700 uppercase">
                  {user?.role.replace("_", " ")}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Persona Switcher Dropdown */}
              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    {lang === "rw" ? "Hitamo Umwirondoro wo Kugerageza" : "Switch Demo Perspective"}
                  </div>
                  {(Object.keys(DEMO_USERS) as Role[]).map((role) => {
                    const persona = DEMO_USERS[role];
                    const isCurrent = user?.role === role;
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          switchDemoRole(role);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                          isCurrent ? "bg-emerald-50/60 font-semibold text-emerald-900" : "text-slate-700"
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-900">{persona.name}</div>
                          <div className="text-[10px] text-slate-600">{role.replace("_", " ")} • {persona.community}</div>
                        </div>
                        {isCurrent && <UserCheck className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                  <div className="p-2 border-t border-slate-100">
                    <Link
                      href="/auth/login"
                      onClick={() => setRoleDropdownOpen(false)}
                      className="block text-center w-full py-1 text-xs text-slate-600 hover:text-emerald-700"
                    >
                      {t.nav.login} / Phone OTP
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-1 shadow-lg">
          <div className="py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Location: <strong>{selectedCommunity}</strong></span>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                setCommunityModalOpen(true);
              }}
              className="text-emerald-600 font-semibold"
            >
              Change
            </button>
          </div>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-5 h-5 text-emerald-600" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {activePortal && (
            <Link
              href={activePortal.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium bg-amber-50 text-amber-900 border border-amber-200/60 mt-2"
            >
              <activePortal.icon className="w-5 h-5 text-amber-600" />
              <span>{activePortal.label}</span>
            </Link>
          )}
        </div>
      )}

      {/* Community Selector Modal */}
      {communityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {lang === "rw" ? "Hitamo Agace k'Iwanyu" : "Select Local Community"}
                </h3>
              </div>
              <button
                onClick={() => setCommunityModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              {lang === "rw"
                ? "MOSA yibanda ku gace ukoreramo cyangwa utuyemo kugira ngo ikwereke ubucuruzi buhagaze hafi yawe."
                : "MOSA prioritizes businesses, services, and offers physically nearest to your community."}
            </p>

            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {[
                { name: "Biryogo Car-Free Zone", sector: "Nyamirambo, Nyarugenge", businesses: 24 },
                { name: "Cosmos & Commercial Center", sector: "Nyamirambo, Nyarugenge", businesses: 18 },
                { name: "Tapi Rouge & Maison des Jeunes", sector: "Nyamirambo, Nyarugenge", businesses: 14 },
                { name: "Kivugiza & Mumena Stadium", sector: "Nyamirambo, Nyarugenge", businesses: 12 },
                { name: "Kuri 40 (Mirongo Ine)", sector: "Nyamirambo, Nyarugenge", businesses: 16 },
                { name: "Kimironko Market Area", sector: "Kimironko, Gasabo", businesses: 9 },
              ].map((comm) => (
                <button
                  key={comm.name}
                  onClick={() => {
                    setSelectedCommunity(comm.name);
                    setCommunityModalOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                    selectedCommunity.includes(comm.name)
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{comm.name}</div>
                    <div className="text-xs text-slate-500">{comm.sector}</div>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {comm.businesses} {lang === "rw" ? "amaduka" : "businesses"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
