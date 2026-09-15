"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { Business, PhysicalCaptureRecord, ModerationReport, CommunityDemandSignal } from "@/types";
import { VerificationBadge } from "@/components/common/Badge";
import { 
  Shield, 
  Users, 
  Store, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles
} from "lucide-react";

export default function AdminPanelPage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"businesses" | "captures" | "reports" | "demands">("businesses");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [captures, setCaptures] = useState<PhysicalCaptureRecord[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setBusinesses(store.getBusinesses());
    setCaptures(store.getCaptures());
    setReports(store.getReports());
    setDemands(store.getDemands());
  }, []);

  const handleToggleVerification = (bizId: string) => {
    const biz = store.getBusinessById(bizId);
    if (!biz) return;
    const newStatus = biz.verificationStatus === "HIGH_CONFIDENCE" ? "AGENT_VERIFIED" : "HIGH_CONFIDENCE";
    store.updateBusinessVerification(bizId, newStatus);
    setBusinesses([...store.getBusinesses()]);
  };

  const handleResolveReport = (reportId: string, status: "RESOLVED" | "DISMISSED") => {
    store.updateReportStatus(reportId, status);
    setReports([...store.getReports()]);
  };

  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.location.community.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-elevated mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-600 text-white">
              <Shield className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              {user?.role.replace("_", " ") || "SUPER ADMIN"} CONSOLE
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black">
            {t.admin.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            {t.admin.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs shrink-0">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <div className="text-slate-400 font-medium">Total Listed</div>
            <div className="text-xl font-bold text-white">{businesses.length} Businesses</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <div className="text-slate-400 font-medium">Reports Queue</div>
            <div className="text-xl font-bold text-amber-400">{reports.length} Open</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: "businesses", label: t.admin.tabs.businesses, count: businesses.length, icon: Store },
          { id: "captures", label: t.admin.tabs.ocrCaptures, count: captures.length, icon: FileText },
          { id: "reports", label: t.admin.tabs.moderation, count: reports.length, icon: AlertTriangle },
          { id: "demands", label: t.admin.tabs.demand, count: demands.length, icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Businesses Tab */}
      {activeTab === "businesses" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search businesses by name or community..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <span className="text-xs text-slate-500">
              Showing {filteredBusinesses.length} of {businesses.length} businesses
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase font-semibold text-[10px]">
                  <th className="py-2.5">Business</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Location</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5">Items</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3">
                      <Link href={`/business/${b.id}`} className="font-bold text-slate-900 hover:text-emerald-700">
                        {b.name}
                      </Link>
                      <div className="text-[10px] text-slate-400">{b.phone}</div>
                    </td>
                    <td className="py-3 text-slate-600">{b.categoryDisplay}</td>
                    <td className="py-3 text-slate-600">{b.location.community}, {b.location.cell}</td>
                    <td className="py-3">
                      <VerificationBadge status={b.verificationStatus} size="sm" />
                    </td>
                    <td className="py-3 text-slate-700 font-bold">{b.products.length}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleToggleVerification(b.id)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {b.verificationStatus === "HIGH_CONFIDENCE" ? "Downgrade" : "Promote Trust"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Captures Tab */}
      {activeTab === "captures" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            OCR & Physical Evidence Captures ({captures.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {captures.map((cap) => (
              <div key={cap.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-900">{cap.businessName}</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    ✓ {cap.status}
                  </span>
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Agent: {cap.agentName} • Type: {cap.documentType} • Total: {cap.extractedTotal?.toLocaleString() || 0} Frw
                </div>
                <div className="text-[10px] text-slate-400">
                  Customer Phone & Card Data: Automatically Redacted (Safe Evidence Storage)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation Queue Tab */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Community Reports & Moderation Queue
          </h3>

          {reports.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <span>All clear! No pending community flags.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((rep) => (
                <div key={rep.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{rep.businessName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-red-100 text-red-800">
                        {rep.reason}
                      </span>
                    </div>
                    <p className="text-slate-600">{rep.details}</p>
                    <div className="text-[10px] text-slate-400">Reported by: {rep.reportedBy} • Status: {rep.status}</div>
                  </div>

                  {rep.status === "OPEN" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveReport(rep.id, "RESOLVED")}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, "DISMISSED")}
                        className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Demand Signals Tab */}
      {activeTab === "demands" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Aggregated Community Search Demands
          </h3>
          <div className="divide-y divide-slate-100">
            {demands.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">"{d.queryTerm}"</div>
                  <div className="text-slate-500">{d.description}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-600">{d.searchCount} searches</div>
                  <div className="text-[10px] text-slate-400">{d.activeBusinessesCount} existing listings</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
