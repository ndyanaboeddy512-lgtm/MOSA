"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, 
  ShieldCheck, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Image as ImageIcon, 
  Eye, 
  History, 
  Sparkles, 
  ExternalLink,
  MessageCircle,
  RotateCcw
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    role: string;
  } | null;
  metadata?: string | null;
}

interface PlatformSettingsState {
  id: string;
  platformName: string;
  platformNameRw: string;
  tagline: string;
  taglineRw: string;
  shortDescription: string;
  shortDescriptionRw: string;
  logoUrl: string;
  faviconUrl: string;
  heroBannerUrl: string;
  officialEmail: string;
  officialPhone: string;
  officialWhatsapp: string;
  officialAddress: string;
  officialAddressRw: string;
  supportedLanguages: string;
  operatingHours: string;
  operatingHoursRw: string;
  socialLinks: {
    twitter: string;
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  brandAssets: {
    secondaryLogoUrl?: string;
    brandColor?: string;
  };
  copyrightText: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

const DEFAULT_FORM_STATE: PlatformSettingsState = {
  id: "default",
  platformName: "MOSA",
  platformNameRw: "MOSA",
  tagline: "Neighborhood Commerce & Authentic Price Intelligence",
  taglineRw: "Urubuga rw'Ubucuruzi bw'Ibiciro by'Ukuri mu Rwanda",
  shortDescription: "Rwanda's Community Commerce Discovery Network",
  shortDescriptionRw: "Urusobe rw'Ikoranabuhanga ry'Ubucuruzi n'Ibiciro by'Ukuri mu Rwanda",
  logoUrl: "",
  faviconUrl: "",
  heroBannerUrl: "",
  officialEmail: "contact@mosa.rw",
  officialPhone: "+250 788 000 000",
  officialWhatsapp: "+250 788 000 000",
  officialAddress: "Kigali, Rwanda • Nyarugenge • Nyamirambo Pilot Hub",
  officialAddressRw: "Kigali, u Rwanda • Nyarugenge • Ihuriro rya Nyamirambo",
  supportedLanguages: "rw,en,fr,sw",
  operatingHours: "Monday - Saturday: 08:00 - 18:00 CAT",
  operatingHoursRw: "Kuwa Mbere - Kuwa Gatandatu: 08:00 - 18:00 CAT",
  socialLinks: {
    twitter: "https://twitter.com",
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    youtube: "",
  },
  brandAssets: {
    brandColor: "#059669",
  },
  copyrightText: "MOSA Network (Rwanda). Built for sustainable, ethical community discovery.",
  updatedBy: null,
  updatedAt: null,
};

const LANGUAGE_OPTIONS = [
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼", required: true },
  { code: "en", label: "English", flag: "🇬🇧", required: false },
  { code: "fr", label: "Français", flag: "🇫🇷", required: false },
  { code: "sw", label: "Kiswahili", flag: "🇹🇿", required: false },
];

export function PlatformIdentityTab({ user }: { user: any }) {
  const [formData, setFormData] = useState<PlatformSettingsState>(DEFAULT_FORM_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditLogEntry[]>([]);
  const [previewTab, setPreviewTab] = useState<"navbar" | "contact" | "footer">("navbar");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platform-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          let parsedSocial = DEFAULT_FORM_STATE.socialLinks;
          try {
            if (typeof data.settings.socialLinks === "string") {
              parsedSocial = { ...DEFAULT_FORM_STATE.socialLinks, ...JSON.parse(data.settings.socialLinks) };
            } else if (typeof data.settings.socialLinks === "object" && data.settings.socialLinks !== null) {
              parsedSocial = { ...DEFAULT_FORM_STATE.socialLinks, ...data.settings.socialLinks };
            }
          } catch {}

          let parsedBrand = DEFAULT_FORM_STATE.brandAssets;
          try {
            if (typeof data.settings.brandAssets === "string") {
              parsedBrand = { ...DEFAULT_FORM_STATE.brandAssets, ...JSON.parse(data.settings.brandAssets) };
            } else if (typeof data.settings.brandAssets === "object" && data.settings.brandAssets !== null) {
              parsedBrand = { ...DEFAULT_FORM_STATE.brandAssets, ...data.settings.brandAssets };
            }
          } catch {}

          setFormData({
            id: data.settings.id || "default",
            platformName: data.settings.platformName || DEFAULT_FORM_STATE.platformName,
            platformNameRw: data.settings.platformNameRw || DEFAULT_FORM_STATE.platformNameRw,
            tagline: data.settings.tagline || DEFAULT_FORM_STATE.tagline,
            taglineRw: data.settings.taglineRw || DEFAULT_FORM_STATE.taglineRw,
            shortDescription: data.settings.shortDescription || DEFAULT_FORM_STATE.shortDescription,
            shortDescriptionRw: data.settings.shortDescriptionRw || DEFAULT_FORM_STATE.shortDescriptionRw,
            logoUrl: data.settings.logoUrl || "",
            faviconUrl: data.settings.faviconUrl || "",
            heroBannerUrl: data.settings.heroBannerUrl || "",
            officialEmail: data.settings.officialEmail || DEFAULT_FORM_STATE.officialEmail,
            officialPhone: data.settings.officialPhone || DEFAULT_FORM_STATE.officialPhone,
            officialWhatsapp: data.settings.officialWhatsapp || DEFAULT_FORM_STATE.officialWhatsapp,
            officialAddress: data.settings.officialAddress || DEFAULT_FORM_STATE.officialAddress,
            officialAddressRw: data.settings.officialAddressRw || DEFAULT_FORM_STATE.officialAddressRw,
            supportedLanguages: data.settings.supportedLanguages || DEFAULT_FORM_STATE.supportedLanguages,
            operatingHours: data.settings.operatingHours || DEFAULT_FORM_STATE.operatingHours,
            operatingHoursRw: data.settings.operatingHoursRw || DEFAULT_FORM_STATE.operatingHoursRw,
            socialLinks: parsedSocial,
            brandAssets: parsedBrand,
            copyrightText: data.settings.copyrightText || DEFAULT_FORM_STATE.copyrightText,
            updatedBy: data.settings.updatedBy || null,
            updatedAt: data.settings.updatedAt || null,
          });
        }
        if (Array.isArray(data.recentAudits)) {
          setRecentAudits(data.recentAudits);
        }
      }
    } catch (err) {
      console.error("[PlatformIdentityTab] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLanguageToggle = (langCode: string) => {
    if (langCode === "rw") return; // Kinyarwanda is required
    const current = formData.supportedLanguages.split(",").map((l) => l.trim().toLowerCase());
    let next: string[];
    if (current.includes(langCode)) {
      next = current.filter((l) => l !== langCode);
    } else {
      next = [...current, langCode];
    }
    if (!next.includes("rw")) next.unshift("rw");
    setFormData((prev) => ({ ...prev, supportedLanguages: next.join(",") }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to save platform identity settings." });
      } else {
        setFeedback({ type: "success", text: "MOSA Platform Identity & Controls saved and audited successfully!" });
        // Dispatch event for instant multi-component re-rendering
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("mosa_platform_settings_updated"));
        }
        fetchSettings();
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to restore MOSA Platform Identity to default settings? This action will be audited.")) {
      return;
    }
    setResetting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/platform-settings", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to restore defaults." });
      } else {
        setFeedback({ type: "success", text: "Platform identity restored to default settings." });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("mosa_platform_settings_updated"));
        }
        fetchSettings();
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Network error while resetting." });
    } finally {
      setResetting(false);
    }
  };

  const activeLangList = formData.supportedLanguages.split(",").map((l) => l.trim().toLowerCase());

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-card">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading MOSA Platform Identity & Controls...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting to Neon PostgreSQL live settings repository</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                MOSA Core Governance
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs text-emerald-300 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Live Neon Persistence
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              MOSA Platform Identity & Controls
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Centrally configure MOSA branding, official contact channels, localized taglines, and public identity controls.
              Every modification is securely validated, persisted in PostgreSQL, and logged in the immutable audit registry.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting || saving}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Reset all branding values to original MOSA defaults"
            >
              {resetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
              <span>Restore Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || resetting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Platform Changes</span>
            </button>
          </div>
        </div>

        {/* Metadata Footer bar */}
        {formData.updatedAt && (
          <div className="relative z-10 mt-6 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Last updated: {new Date(formData.updatedAt).toLocaleString()}</span>
              {formData.updatedBy && (
                <span className="text-slate-300 font-medium">by {formData.updatedBy}</span>
              )}
            </div>
            <div className="text-[11px] text-emerald-400">
              ✓ Active across Navbar, Footer, and Platform Metadata
            </div>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Form Editor & Live Preview */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Config Panels (8 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Section 1: Core Brand & Localized Names */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Brand Identity & Localized Names</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Section A</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Platform Name (English / Global) <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.platformName}
                  onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. MOSA"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Platform Name (Kinyarwanda)
                </label>
                <input
                  type="text"
                  value={formData.platformNameRw}
                  onChange={(e) => setFormData({ ...formData, platformNameRw: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. MOSA"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline (English)
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Neighborhood Commerce & Authentic Price Intelligence"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline (Kinyarwanda)
                </label>
                <input
                  type="text"
                  value={formData.taglineRw}
                  onChange={(e) => setFormData({ ...formData, taglineRw: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Urubuga rw'Ubucuruzi bw'Ibiciro by'Ukuri mu Rwanda"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short Description (English)
                </label>
                <textarea
                  rows={2}
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Rwanda's Community Commerce Discovery Network..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short Description (Kinyarwanda)
                </label>
                <textarea
                  rows={2}
                  value={formData.shortDescriptionRw}
                  onChange={(e) => setFormData({ ...formData, shortDescriptionRw: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Urusobe rw'Ikoranabuhanga ry'Ubucuruzi..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Visual Assets & Branding */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Visual Assets & Logos</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Section B</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official MOSA Logo URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="https://.../logo.png (Leave empty to use default gradient shield)"
                  />
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: "" })}
                      className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Rendered across top navigation, mobile drawer, footer, and verification certificates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Favicon URL
                  </label>
                  <input
                    type="url"
                    value={formData.faviconUrl}
                    onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="/icon-192.png or https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hero Banner Asset URL
                  </label>
                  <input
                    type="url"
                    value={formData.heroBannerUrl}
                    onChange={(e) => setFormData({ ...formData, heroBannerUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="https://.../banner.jpg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Official Contact & Headquarters */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Official Contact & Headquarters</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Section C</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Official Email</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.officialEmail}
                  onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="contact@mosa.rw"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Official Telephone</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.officialPhone}
                  onChange={(e) => setFormData({ ...formData, officialPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="+250 788 000 000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Official WhatsApp</span>
                </label>
                <input
                  type="text"
                  value={formData.officialWhatsapp}
                  onChange={(e) => setFormData({ ...formData, officialWhatsapp: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="+250 788 000 000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Headquarters Address (EN)</span>
                </label>
                <input
                  type="text"
                  value={formData.officialAddress}
                  onChange={(e) => setFormData({ ...formData, officialAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Kigali, Rwanda • Nyarugenge • Nyamirambo Pilot Hub"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Headquarters Address (RW)</span>
                </label>
                <input
                  type="text"
                  value={formData.officialAddressRw}
                  onChange={(e) => setFormData({ ...formData, officialAddressRw: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Kigali, u Rwanda • Nyarugenge • Ihuriro rya Nyamirambo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Operating Hours (EN)</span>
                </label>
                <input
                  type="text"
                  value={formData.operatingHours}
                  onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Monday - Saturday: 08:00 - 18:00 CAT"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Operating Hours (RW)</span>
                </label>
                <input
                  type="text"
                  value={formData.operatingHoursRw}
                  onChange={(e) => setFormData({ ...formData, operatingHoursRw: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Kuwa Mbere - Kuwa Gatandatu: 08:00 - 18:00 CAT"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Platform Localization Controls */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Supported Languages & Regional Controls</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Section D</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Active Platform Languages (Visible in Public Switcher)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isActive = activeLangList.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageToggle(lang.code)}
                      disabled={lang.required}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        isActive
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                      } ${lang.required ? "cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{lang.flag}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isActive ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}>
                          {isActive ? "ACTIVE" : "DISABLED"}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold">{lang.label}</div>
                        <div className="text-[10px] text-slate-500">
                          {lang.required ? "National Core (Required)" : "Optional Switcher"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Disabling a language removes it immediately from public navigation while preserving internal translation assets.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Copyright Notice
              </label>
              <input
                type="text"
                value={formData.copyrightText}
                onChange={(e) => setFormData({ ...formData, copyrightText: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                placeholder="MOSA Network (Rwanda). Built for sustainable, ethical community discovery."
              />
            </div>
          </div>

          {/* Section 5: Official Social Channels */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Official Social Channels</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Section E</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">X (Twitter) URL</label>
                <input
                  type="url"
                  value={formData.socialLinks.twitter}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, twitter: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="https://twitter.com/mosa_rw"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Facebook URL</label>
                <input
                  type="url"
                  value={formData.socialLinks.facebook}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, facebook: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="https://facebook.com/mosarwanda"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={formData.socialLinks.instagram}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, instagram: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="https://instagram.com/mosa.rw"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.socialLinks.linkedin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, linkedin: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="https://linkedin.com/company/mosa-network"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Mockup Preview & Audit Trail (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Live Preview Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4 sticky top-24">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-slate-900 text-sm">Live Preview</h4>
              </div>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewTab("navbar")}
                  className={`px-2 py-1 rounded-md transition-all ${
                    previewTab === "navbar" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Navbar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("contact")}
                  className={`px-2 py-1 rounded-md transition-all ${
                    previewTab === "contact" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Contact
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("footer")}
                  className={`px-2 py-1 rounded-md transition-all ${
                    previewTab === "footer" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500"
                  }`}
                >
                  Footer
                </button>
              </div>
            </div>

            {/* Preview Display */}
            {previewTab === "navbar" && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Top Header Preview
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo Preview"
                        className="w-9 h-9 rounded-xl object-contain border border-slate-200 bg-white p-0.5"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "";
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-700 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {formData.platformName ? formData.platformName.charAt(0) : "M"}
                      </div>
                    )}
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 leading-none">
                        {formData.platformName || "MOSA"}
                      </div>
                      <div className="text-[9px] text-slate-500 font-semibold tracking-wide mt-0.5">
                        {formData.tagline || "RWANDA DISCOVERY"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-[9px] font-bold">
                    {activeLangList.map((code) => (
                      <span
                        key={code}
                        className={`px-1.5 py-0.5 rounded ${
                          code === "rw" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500"
                        }`}
                      >
                        {code.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {previewTab === "contact" && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Official Communication Channels
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-mono font-bold">{formData.officialEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-mono font-bold">{formData.officialPhone}</span>
                  </div>
                  {formData.officialWhatsapp && (
                    <div className="flex items-center gap-2 text-slate-700">
                      <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-mono">{formData.officialWhatsapp} (WhatsApp)</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-slate-600 pt-1 border-t border-slate-100">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{formData.officialAddress}</span>
                  </div>
                </div>
              </div>
            )}

            {previewTab === "footer" && (
              <div className="p-4 bg-slate-900 rounded-2xl text-slate-300 space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Footer Banner Preview
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                      {formData.platformName ? formData.platformName.charAt(0) : "M"}
                    </div>
                    <span className="font-bold text-sm text-white">{formData.platformName}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                    {formData.shortDescription || formData.tagline}
                  </p>
                  <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                    © {new Date().getFullYear()} {formData.copyrightText}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button in Sidebar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || resetting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save All Platform Changes</span>
              </button>
            </div>

            {/* Audit Log Box */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Audit Trail</span>
                </h5>
                <span className="text-[10px] text-slate-400">PostgreSQL Immutable</span>
              </div>

              {recentAudits.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No recent platform configuration audits recorded.</p>
              ) : (
                <div className="space-y-2">
                  {recentAudits.slice(0, 3).map((audit) => {
                    let meta: any = null;
                    try {
                      if (audit.metadata) meta = JSON.parse(audit.metadata);
                    } catch {}
                    return (
                      <div
                        key={audit.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {audit.action.replace("PLATFORM_IDENTITY_", "")}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(audit.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="text-slate-600 text-[10px]">
                          By: <span className="font-semibold text-slate-700">{audit.actor?.name || "Administrator"}</span>
                          {meta?.updatedFields && (
                            <span className="ml-1 text-slate-400">({meta.updatedFields.length} fields)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
