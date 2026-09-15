"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { Business, PhysicalCaptureRecord } from "@/types";
import { VerificationBadge } from "@/components/common/Badge";
import { 
  ShieldCheck, 
  Briefcase, 
  Camera, 
  Plus, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  FileText, 
  Sparkles,
  Phone,
  ChevronRight,
  TrendingUp,
  X
} from "lucide-react";

export default function AgentDashboardPage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [captures, setCaptures] = useState<PhysicalCaptureRecord[]>([]);
  const [newBizModalOpen, setNewBizModalOpen] = useState(false);

  // New business form fields
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("salon_barber");
  const [bizPhone, setBizPhone] = useState("+250788");
  const [bizCommunity, setBizCommunity] = useState("Biryogo Car-Free Zone");
  const [bizCell, setBizCell] = useState("Biryogo");
  const [bizDescription, setBizDescription] = useState("");

  useEffect(() => {
    setBusinesses(store.getBusinesses());
    setCaptures(store.getCaptures());
  }, []);

  const handleRegisterBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) return;

    const categoryMap: Record<string, { display: string; displayRw: string }> = {
      salon_barber: { display: "Salons & Barbers", displayRw: "Za Salo & Kogosha" },
      tailor_crafts: { display: "Tailors & Craftsmen", displayRw: "Abadozi & Ubukorikori" },
      food_restaurant: { display: "Food & Milk Bars", displayRw: "Ibiryo & Amamata" },
      phone_electronics: { display: "Phone & Electronics Repair", displayRw: "Gusana Telefone & Ibikoresho" },
      mechanic_repair: { display: "Mechanics & Spares", displayRw: "Abakanishi & Ibyuma by'Ibinyabiziga" },
      shop_retail: { display: "Local Shops & Groceries", displayRw: "Amaduka & Ibiribwa" },
      agriculture_produce: { display: "Fresh Produce & Farmers", displayRw: "Umusaruro w'Ubuhinzi & Imboga" },
      art_culture: { display: "Art & Culture Centers", displayRw: "Ubuhanzi & Umuco" },
      services: { display: "Other Services", displayRw: "Izindi Serivisi" },
    };

    const newBiz = store.registerBusiness({
      name: bizName,
      category: bizCategory as any,
      categoryDisplay: categoryMap[bizCategory].display,
      categoryDisplayRw: categoryMap[bizCategory].displayRw,
      description: bizDescription || "Neighborhood local business registered on the ground by certified agent.",
      phone: bizPhone,
      location: {
        country: "Rwanda",
        province: "Kigali City",
        district: "Nyarugenge",
        sector: "Nyamirambo",
        cell: bizCell,
        community: bizCommunity,
        coordinates: { lat: -1.981, lng: 30.046 },
      },
      verificationStatus: "AGENT_VERIFIED",
      verificationDetails: {
        agentVerified: true,
        agentName: user?.name || "Emmanuel Hakizimana",
        agentVerifiedAt: new Date().toISOString().split("T")[0],
        locationConfirmed: true,
        ownerConfirmed: false,
        communityConfirmationsCount: 1,
        recentActivityDate: new Date().toISOString().split("T")[0],
      },
      photos: ["https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60"],
      coverImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=60",
      openingHours: [
        { day: "Monday", dayRw: "Kuwa Mbere", open: "08:00", close: "20:00", isClosed: false },
        { day: "Tuesday", dayRw: "Kuwa Kabiri", open: "08:00", close: "20:00", isClosed: false },
        { day: "Wednesday", dayRw: "Kuwa Gatatu", open: "08:00", close: "20:00", isClosed: false },
        { day: "Thursday", dayRw: "Kuwa Kane", open: "08:00", close: "20:00", isClosed: false },
        { day: "Friday", dayRw: "Kuwa Gatanu", open: "08:00", close: "20:00", isClosed: false },
        { day: "Saturday", dayRw: "Kuwa Gatandatu", open: "08:00", close: "21:00", isClosed: false },
        { day: "Sunday", dayRw: "Ku Cyumweru", open: "09:00", close: "18:00", isClosed: false },
      ],
      isOpenNow: true,
      priceRange: "LOW",
      products: [],
      createdByAgentId: user?.id || "agent-1",
    });

    setBusinesses([newBiz, ...businesses]);
    setNewBizModalOpen(false);
    setBizName("");
    setBizDescription("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-elevated mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-700/80 text-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {t.agentDashboard.assignedArea}: Biryogo & Cosmos (Nyamirambo)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black">
            {t.agentDashboard.welcome}, {user?.name.split(" ")[0] || "Emmanuel"}!
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl">
            {lang === "rw"
              ? "Inshingano yawe ni ukugenzura no gushyira mu ikoranabuhanga ubukungu bw'inzego z'ibanze muri Nyamirambo. Ubwiza bw'amakuru buruta ubwinshi bwayo."
              : "Your mission is to bridge Nyamirambo's physical micro-commerce into verified digital visibility. Agent quality and accuracy take priority over volume."}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setNewBizModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.agentDashboard.newBusiness}</span>
          </button>
          <Link
            href="/agent/capture"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs backdrop-blur-xs transition-all flex items-center gap-2"
          >
            <Camera className="w-4 h-4 text-emerald-300" />
            <span>{t.agentDashboard.captureData}</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t.agentDashboard.businessesDiscovered}</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{businesses.length}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Across 4 cells</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t.agentDashboard.dataCaptures}</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{captures.length}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">Receipts & Menus</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t.agentDashboard.qualityScore}</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">98.4%</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-1">Rank #1 in Sector</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Reputation Points</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">420 pts</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Certified Lead Scout</div>
        </div>
      </div>

      {/* Main Agent Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Discovered Businesses in Jurisdiction */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {lang === "rw" ? "Ubucuruzi Buri mu Gace Ushinzwe" : "Assigned Businesses in Nyamirambo"}
                </h3>
                <p className="text-xs text-slate-500">
                  Biryogo, Cosmos, and Tapi Rouge micro-enterprises
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                {businesses.length} active
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {businesses.map((biz) => (
                <div key={biz.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/business/${biz.id}`} className="font-bold text-slate-900 text-sm hover:text-emerald-700 transition-colors">
                        {biz.name}
                      </Link>
                      <VerificationBadge status={biz.verificationStatus} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{biz.categoryDisplay}</span>
                      <span>•</span>
                      <span>{biz.location.community}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{biz.products.length} products</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/agent/capture?biz=${biz.id}`}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Add receipt / menu capture"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Receipt</span>
                    </Link>
                    <Link
                      href={`/business/${biz.id}`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Digitized Physical Evidences */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Digitized Captures</span>
              </h3>
              <Link href="/agent/capture" className="text-xs font-bold text-emerald-600 hover:text-emerald-800">
                + Capture New
              </Link>
            </div>

            <div className="space-y-3">
              {captures.map((cap) => (
                <div key={cap.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{cap.businessName || "Document"}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ✓ {cap.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Type: {cap.documentType} • {cap.extractedItems.length} items • Total: {cap.extractedTotal?.toLocaleString() || 0} Frw
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Sanitized: Customer PII redacted for privacy
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Field Verification Route Guide */}
          <div className="bg-emerald-50/60 p-6 rounded-3xl border border-emerald-200 space-y-3">
            <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>Today's Ground Audit Route</span>
            </h4>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              Target areas for today: Biryogo Car-Free Zone and Cosmos. Focus on auditing handwritten chalkboard price lists for tailors and salons.
            </p>
          </div>
        </div>

      </div>

      {/* Register Business Modal */}
      {newBizModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>{lang === "rw" ? "Andika Ubucuruzi Bushya ku Butaka" : "Register New Local Business"}</span>
              </h3>
              <button
                onClick={() => setNewBizModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterBusiness} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Atelier de Couture Nyamirambo"
                  required
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={bizCategory}
                    onChange={(e) => setBizCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                  >
                    <option value="salon_barber">Salons & Barbers</option>
                    <option value="tailor_crafts">Tailors & Craftsmen</option>
                    <option value="food_restaurant">Food & Milk Bars</option>
                    <option value="phone_electronics">Phone & Electronics</option>
                    <option value="mechanic_repair">Mechanics & Spares</option>
                    <option value="shop_retail">Local Shops & Retail</option>
                    <option value="agriculture_produce">Fresh Produce</option>
                    <option value="art_culture">Art & Culture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cell (Akagari)</label>
                  <select
                    value={bizCell}
                    onChange={(e) => setBizCell(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                  >
                    <option value="Biryogo">Biryogo</option>
                    <option value="Rwezamenyo">Rwezamenyo</option>
                    <option value="Mumena">Mumena</option>
                    <option value="Cyivugiza">Cyivugiza</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Community / Area</label>
                  <input
                    type="text"
                    value={bizCommunity}
                    onChange={(e) => setBizCommunity(e.target.value)}
                    placeholder="e.g. Cosmos, Tapi Rouge"
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Services</label>
                <textarea
                  value={bizDescription}
                  onChange={(e) => setBizDescription(e.target.value)}
                  placeholder="Key services provided, landmarks, specialties..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewBizModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {lang === "rw" ? "Emeza Maze Byandikwe" : "Register Business"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
