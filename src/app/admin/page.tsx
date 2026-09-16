"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { Business, PhysicalCaptureRecord, ModerationReport, CommunityDemandSignal } from "@/types";
import { VerificationBadge, DataStatusBadge } from "@/components/common/Badge";
import { 
  Shield, 
  Users, 
  Store as StoreIcon, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  TrendingUp,
  Award,
  ChevronRight,
  Sparkles,
  History,
  RefreshCw,
  Lock,
  Globe,
  Tag
} from "lucide-react";

interface AdminAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; role: string } | null;
}

export default function AdminPanelPage() {
  const { lang, t } = useLanguage();
  const { user, switchDemoRole } = useAuth();

  const [activeTab, setActiveTab] = useState<"businesses" | "captures" | "reports" | "demands" | "audit">("businesses");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [captures, setCaptures] = useState<PhysicalCaptureRecord[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [metrics, setMetrics] = useState<{
    totalBusinesses: number;
    verifiedCount: number;
    unverifiedCount: number;
    demoCount?: number;
    researchedCount?: number;
    verifiedDataCount?: number;
    totalUsers: number;
    agentCount: number;
    openReportsCount: number;
    totalCaptures: number;
    totalSectors?: number;
    totalCells?: number;
  }>({
    totalBusinesses: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
    demoCount: 0,
    researchedCount: 0,
    verifiedDataCount: 0,
    totalUsers: 0,
    agentCount: 0,
    openReportsCount: 0,
    totalCaptures: 0,
    totalSectors: 6,
    totalCells: 12,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) setMetrics(data.metrics);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        if (data.businesses && data.businesses.length > 0) {
          // Format DB businesses or keep store format
          setBusinesses(data.businesses.map((b: any) => ({
            id: b.id,
            name: b.name,
            nameRw: b.nameRw || b.name,
            category: b.category,
            description: b.description || "",
            descriptionRw: b.descriptionRw || "",
            location: {
              district: b.district || "Nyarugenge",
              sector: b.sector || "Nyamirambo",
              cell: b.cell || "Biryogo",
              community: `${b.cell || "Biryogo"}, ${b.sector || "Nyamirambo"}`,
              coordinates: [b.latitude || -1.9706, b.longitude || 30.0444],
            },
            contactPhone: b.phone || "+250788000000",
            phone: b.phone || "+250788000000",
            verificationStatus: b.verificationStatus,
            dataStatus: b.dataStatus || "VERIFIED",
            source: b.source,
            localArea: b.localArea,
            isOpenNow: b.isOpenNow,
            rating: 4.8,
            reviewsCount: 12,
            coverImage: b.coverImage || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=60",
            priceRange: b.priceRange || "MODERATE",
            priceRangeMin: b.priceRangeMin,
            priceRangeMax: b.priceRangeMax,
            tags: [b.category],
            status: b.status,
          })));
        } else {
          setBusinesses(store.getBusinesses());
        }
        if (data.captures && data.captures.length > 0) setCaptures(data.captures);
        else setCaptures(store.getCaptures());

        if (data.reports && data.reports.length > 0) setReports(data.reports);
        else setReports(store.getReports());

        if (data.demands && data.demands.length > 0) setDemands(data.demands);
        else setDemands(store.getDemands());
      } else {
        // Fallback to local store
        setBusinesses(store.getBusinesses());
        setCaptures(store.getCaptures());
        setReports(store.getReports());
        setDemands(store.getDemands());
      }
    } catch {
      setBusinesses(store.getBusinesses());
      setCaptures(store.getCaptures());
      setReports(store.getReports());
      setDemands(store.getDemands());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleVerification = async (bizId: string) => {
    const biz = businesses.find((b) => b.id === bizId) || store.getBusinessById(bizId);
    if (!biz) return;
    const newStatus = biz.verificationStatus === "HIGH_CONFIDENCE" ? "AGENT_VERIFIED" : "HIGH_CONFIDENCE";

    // Update server PostgreSQL database
    try {
      await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_VERIFICATION",
          businessId: bizId,
          verificationStatus: biz.verificationStatus,
        }),
      });
    } catch (err) {
      console.warn("[Admin PATCH verification error]:", err);
    }

    // Update store and local state
    store.updateBusinessVerification(bizId, newStatus);
    setBusinesses(businesses.map((b) => (b.id === bizId ? { ...b, verificationStatus: newStatus } : b)));
    fetchAdminData();
  };

  const handleUpdateDataStatus = async (bizId: string, targetDataStatus: "DEMO" | "RESEARCHED" | "VERIFIED") => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_DATA_STATUS",
          businessId: bizId,
          dataStatus: targetDataStatus,
        }),
      });
      if (res.ok) {
        setBusinesses(businesses.map((b) => (b.id === bizId ? { ...b, dataStatus: targetDataStatus as any } : b)));
        fetchAdminData();
      }
    } catch (err) {
      console.warn("[Admin PATCH dataStatus error]:", err);
    }
  };

  const handleResolveReport = async (reportId: string, status: "RESOLVED" | "DISMISSED") => {
    try {
      await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESOLVE_REPORT",
          reportId,
          status,
        }),
      });
    } catch (err) {
      console.warn("[Admin PATCH report error]:", err);
    }

    store.updateReportStatus(reportId, status);
    setReports(reports.map((r) => (r.id === reportId ? { ...r, status } : r)));
  };

  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.location?.community || (b as any).cell || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isPermittedAdmin = user?.role === "SUPER_ADMIN" || user?.role === "COMMUNITY_ADMIN" || user?.role === "MODERATOR";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Role Check Notice if Not Admin */}
      {!isPermittedAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-bold text-sm text-amber-900">
                Viewing in {user?.role.replace("_", " ") || "Guest"} Mode
              </div>
              <div className="text-xs text-amber-700">
                To test administrator actions and database verification updates, switch to Super Admin or Community Admin.
              </div>
            </div>
          </div>
          <button
            onClick={() => switchDemoRole("SUPER_ADMIN")}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
          >
            Switch to Super Admin
          </button>
        </div>
      )}

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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs shrink-0">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <div className="text-slate-400 font-medium">Total Listed</div>
            <div className="text-xl font-bold text-white">{businesses.length} Businesses</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <div className="text-amber-400 font-medium">Demo / Synthetic</div>
            <div className="text-xl font-bold text-amber-400">{metrics.demoCount || 0} Samples</div>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 col-span-2 sm:col-span-1">
            <div className="text-emerald-400 font-medium">Ground Verified</div>
            <div className="text-xl font-bold text-emerald-400">{metrics.verifiedDataCount || metrics.verifiedCount || 0} Active</div>
          </div>
        </div>
      </div>

      {/* National Geographic Hierarchy Coverage Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-4 rounded-2xl border border-emerald-800/40 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">Rwanda-Wide Geographic Coverage</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full uppercase">
                7-Tier Hierarchy Active
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              5 Provinces • 11 Districts • 6 Focus Sectors (<strong>Kacyiru</strong>, <strong>Nyamirambo</strong>, Muhoza, Ngoma, Gisenyi, Kigabiro) • 12 Cells • Local Areas & Landmarks (MINAGRI KG 569 St)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-semibold text-emerald-300">
            2 Assigned Agents
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: "businesses", label: t.admin.tabs.businesses, count: businesses.length, icon: StoreIcon },
          { id: "captures", label: t.admin.tabs.ocrCaptures, count: captures.length, icon: FileText },
          { id: "reports", label: t.admin.tabs.moderation, count: reports.length, icon: AlertTriangle },
          { id: "demands", label: t.admin.tabs.demand, count: demands.length, icon: TrendingUp },
          { id: "audit", label: "Audit & Governance", count: auditLogs.length, icon: History },
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
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search registered local businesses..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <button
              onClick={fetchAdminData}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh database records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredBusinesses.map((biz) => (
                <div key={biz.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      <img src={biz.coverImage} alt={biz.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/business/${biz.id}`} className="font-bold text-slate-900 text-sm hover:text-emerald-700">
                          {biz.name}
                        </Link>
                        <VerificationBadge status={biz.verificationStatus} />
                        <DataStatusBadge status={(biz as any).dataStatus} />
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {biz.category} • {(biz as any).localArea?.name || biz.location?.community || (biz as any).cell || "Rwanda"} • Phone: {biz.phone}
                        {(biz as any).priceRangeMin && (biz as any).priceRangeMax && (
                          <span className="ml-2 text-amber-700 font-semibold">
                            (Est. {(biz as any).priceRangeMin.toLocaleString()} - {(biz as any).priceRangeMax.toLocaleString()} RWF)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                    {/* Lifecycle Promotion Controls */}
                    {(biz as any).dataStatus === "DEMO" && (
                      <button
                        onClick={() => handleUpdateDataStatus(biz.id, "VERIFIED")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                        title="Certify as ground-verified"
                      >
                        ✓ Promote to Verified
                      </button>
                    )}
                    {(biz as any).dataStatus === "RESEARCHED" && (
                      <button
                        onClick={() => handleUpdateDataStatus(biz.id, "VERIFIED")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                      >
                        ✓ Certify Verified
                      </button>
                    )}
                    {(biz as any).dataStatus === "VERIFIED" && (
                      <button
                        onClick={() => handleUpdateDataStatus(biz.id, "DEMO")}
                        className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 text-[10px] font-medium transition-colors"
                        title="Revert back to demo synthetic record for testing"
                      >
                        Reset to Demo
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleVerification(biz.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors"
                    >
                      Toggle Confidence
                    </button>
                    <Link
                      href={`/business/${biz.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                    >
                      View Live
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Captures Tab */}
      {activeTab === "captures" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Physical OCR Extracted Records ({captures.length})
          </h3>
          <div className="space-y-4">
            {captures.map((cap) => (
              <div key={cap.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{cap.businessName || "Local Merchant"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase">
                      {cap.documentType}
                    </span>
                    <span className="text-[10px] text-slate-400">Agent: {cap.agentName}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Extracted {cap.extractedItems?.length || 0} line items • Total: {cap.extractedTotal?.toLocaleString() || 0} RWF
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-200 max-w-xl truncate">
                    {cap.rawOcrText || "No raw text available"}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    {cap.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            Community Moderation Queue ({reports.length})
          </h3>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No open moderation reports in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{rep.businessName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                        {rep.reason}
                      </span>
                    </div>
                    <p className="text-slate-600">{rep.details}</p>
                    <div className="text-[10px] text-slate-400">Reported by: {rep.reportedBy || "Resident"} • Status: {rep.status}</div>
                  </div>

                  {rep.status === "OPEN" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveReport(rep.id, "RESOLVED")}
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, "DISMISSED")}
                        className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-colors"
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
                  <div className="text-slate-500">{d.description || `${d.cell}, ${d.sector}`}</div>
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

      {/* Audit & Governance Tab */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">
              PostgreSQL Immutable Audit Trail ({auditLogs.length})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Permanent Event Log
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No audit logs recorded yet. Perform actions like OTP login, verification, or review creation to populate audit records.
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px] uppercase">
                        {log.action}
                      </span>
                      <span className="font-medium text-slate-800">{log.entityType}: {log.entityId}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Actor: {log.actor?.name || "System"} ({log.actor?.role || "SYSTEM"}) • {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {log.metadata && (
                    <span className="text-[10px] font-mono text-slate-400 max-w-xs truncate">
                      {log.metadata}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
