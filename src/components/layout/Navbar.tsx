"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth, DEMO_USERS } from "@/lib/auth-context";
import { useLocation } from "@/lib/location-context";
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
  ChevronDown,
  LogOut,
  LogIn
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { user, switchDemoRole, logout } = useAuth();
  const isDemoEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH === "true";
  const { displayLabel, openSelector } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const navLinks = [
    { href: "/", label: t.nav.home, icon: Compass },
    { href: "/explore", label: t.nav.explore, icon: Search },
    { href: "/demand", label: t.nav.whatPeopleNeed, icon: TrendingUp },
    { href: "/register-business", label: t.common.registerBusinessBtn, icon: Store },
  ];

  // Role portal links
  const rolePortals: Record<Role, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
    COMMUNITY_AGENT: { href: "/owner/dashboard", label: t.nav.ownerPortal, icon: Store },
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
              onClick={openSelector}
              className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full transition-all shadow-xs"
              title="Change active discovery community"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{displayLabel}</span>
              <ChevronDown className="w-3 h-3 text-emerald-600" />
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
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
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            {/* Direct Self-Serve Business Registration CTA */}
            <Link
              href="/register-business"
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs hover:shadow-emerald-600/20 transition-all"
              title="Register your business on MOSA"
            >
              <Store className="w-3.5 h-3.5 text-emerald-200" />
              <span>
                {t.common.registerBusinessBtn}
              </span>
            </Link>

            {/* 4-Language Switcher (Visible on >= sm screens) */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(
                [
                  { code: "rw", label: "RW", flag: "🇷🇼", title: "Kinyarwanda" },
                  { code: "en", label: "EN", flag: "🇬🇧", title: "English" },
                  { code: "fr", label: "FR", flag: "🇫🇷", title: "Français" },
                  { code: "sw", label: "SW", flag: "🇹🇿", title: "Kiswahili" },
                ] as const
              ).map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  title={l.title}
                  className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-bold rounded-md transition-all ${
                    lang === l.code
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Demo Persona Switcher / User Profile (Visible on >= sm screens) */}
            {isDemoEnabled ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-xs transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="max-w-[100px] truncate font-semibold">
                    {user?.name.split(" ")[0] || "Persona"}
                  </span>
                  <span className="hidden md:inline px-1.5 py-0.5 bg-slate-100 text-[10px] rounded text-slate-700 uppercase">
                    {user?.role.replace("_", " ")}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Persona Switcher Dropdown */}
                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      {t.nav.switchRole}
                    </div>
                    {(Object.keys(DEMO_USERS) as Role[])
                      .filter((r) => r !== "COMMUNITY_AGENT")
                      .map((role) => {
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
            ) : user ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-xs transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="max-w-[120px] truncate font-semibold">
                    {user.name.split(" ")[0]}
                  </span>
                  <span className="hidden md:inline px-1.5 py-0.5 bg-slate-100 text-[10px] rounded text-slate-700 uppercase font-bold">
                    {user.role.replace("_", " ")}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.phone}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                        {user.role.replace("_", " ")}
                      </span>
                    </div>

                    {activePortal && (
                      <Link
                        href={activePortal.href}
                        onClick={() => setRoleDropdownOpen(false)}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <activePortal.icon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{activePortal.label}</span>
                      </Link>
                    )}

                    <div className="p-1 border-t border-slate-100">
                      <button
                        onClick={async () => {
                          setRoleDropdownOpen(false);
                          await logout();
                        }}
                        className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors"
                >
                  {t.nav.login}
                </Link>
              </div>
            )}

            {/* Mobile menu toggle button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg max-h-[85vh] overflow-y-auto">
          {/* Location Selector */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Zone: <strong>{displayLabel}</strong></span>
            </div>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                openSelector();
              }}
              className="text-emerald-600 font-semibold px-2 py-1 bg-white rounded border border-emerald-200 shrink-0 hover:bg-emerald-50"
            >
              Change
            </button>
          </div>

          {/* Mobile Language Switcher */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Language / Ururimi:
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { code: "rw", label: "RW 🇷🇼" },
                  { code: "en", label: "EN 🇬🇧" },
                  { code: "fr", label: "FR 🇫🇷" },
                  { code: "sw", label: "SW 🇹🇿" },
                ] as const
              ).map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`py-1.5 text-xs font-bold rounded-md transition-all text-center ${
                    lang === l.code
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Persona Switcher / Auth State */}
          {isDemoEnabled ? (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Demo Role / Umwirondoro:</span>
                <span className="text-[10px] text-emerald-700 font-bold uppercase">{user?.role.replace("_", " ")}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(DEMO_USERS) as Role[])
                  .filter((r) => r !== "COMMUNITY_AGENT")
                  .map((role) => {
                  const persona = DEMO_USERS[role];
                  const isCurrent = user?.role === role;
                  return (
                    <button
                      key={role}
                      onClick={() => {
                        switchDemoRole(role);
                      }}
                      className={`p-2 text-left rounded-lg text-xs transition-colors border ${
                        isCurrent
                          ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-900"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="truncate font-medium">{persona.name.split(" ")[0]}</div>
                      <div className="text-[10px] text-slate-500 truncate">{role.replace("_", " ")}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : user ? (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">{user.name}</div>
                <div className="text-[10px] text-slate-500">{user.phone} • <span className="font-semibold text-emerald-700">{user.role.replace("_", " ")}</span></div>
              </div>
              <button
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await logout();
                }}
                className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-emerald-800 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.nav.login}</span>
              </Link>
            </div>
          )}

          {/* Nav Links */}
          <div className="space-y-1 pt-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-600" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Direct Self-Serve Registration in Mobile Drawer */}
            <Link
              href="/register-business"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 shadow-xs"
            >
              <Store className="w-4 h-4 text-emerald-600" />
              <span>{t.common.registerBusinessBtn}</span>
            </Link>

            {/* Role Portal Link */}
            {activePortal && (
              <Link
                href={activePortal.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-900 border border-amber-200/80 mt-2"
              >
                <activePortal.icon className="w-4 h-4 text-amber-600" />
                <span>{activePortal.label}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
