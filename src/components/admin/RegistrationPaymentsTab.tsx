"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Settings,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Smartphone,
  Building,
  ArrowUpDown,
  Printer,
  Copy,
  Sliders,
  History,
  Lock,
  Play,
  Bell,
  Award,
  Calendar,
  Gift,
  ShieldAlert,
  Radio,
} from "lucide-react";
import { PaymentBridgeManagementModal } from "@/components/admin/PaymentBridgeManagementModal";

interface PaymentItem {
  id: string;
  businessId: string;
  businessName: string;
  businessStatus: string;
  verificationStatus: string;
  renewalStatus?: string;
  registrationExpiresAt?: string | null;
  gracePeriodEndsAt?: string | null;
  isWaiver?: boolean;
  waiverReason?: string | null;
  paymentType?: string;
  periodCoveredStart?: string | null;
  periodCoveredEnd?: string | null;
  receiptType?: string | null;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string | null;
  feeAmount: number;
  currency: string;
  provider: string;
  paymentReference: string;
  providerTransactionRef?: string | null;
  status: string;
  failureReason?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  receiptId?: string | null;
  receiptNumber?: string | null;
  createdAt: string;
}

interface SummaryData {
  totalRevenue: number;
  confirmedCount: number;
  pendingCount: number;
  failedCount: number;
  duplicateCount: number;
  renewalsDueSoon?: number;
  expiredRegistrations?: number;
  inGracePeriod?: number;
  suspendedBusinesses?: number;
  waiverBusinesses?: number;
  outstandingRenewals?: number;
  activeRegistrations?: number;
  totalBusinesses?: number;
  activeRegistrationFee?: number;
  activeRenewalFee?: number;
  gracePeriodDays?: number;
  currency?: string;
  byProvider: {
    MTN_MOMO: number;
    AIRTEL_MONEY: number;
    BANK_TRANSFER: number;
    ADMIN_WAIVER?: number;
  };
}

export function RegistrationPaymentsTab() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalRevenue: 0,
    confirmedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    duplicateCount: 0,
    byProvider: { MTN_MOMO: 0, AIRTEL_MONEY: 0, BANK_TRANSFER: 0 },
  });

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("ALL");
  const [renewalStatusFilter, setRenewalStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Panels
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentItem | null>(null);
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<PaymentItem | null>(null);
  const [bankRefInput, setBankRefInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [confirmingLoading, setConfirmingLoading] = useState(false);

  // Administrative Waiver Modal State
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverBizId, setWaiverBizId] = useState("");
  const [waiverType, setWaiverType] = useState<"REGISTRATION" | "ANNUAL_RENEWAL">("ANNUAL_RENEWAL");
  const [waiverReason, setWaiverReason] = useState("");
  const [waiverLoading, setWaiverLoading] = useState(false);
  const [waiverMsg, setWaiverMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Scheduled Lifecycle Cron Runner State
  const [cronModalOpen, setCronModalOpen] = useState(false);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  // Payment Bridge & SIM Management Modal State
  const [bridgeModalOpen, setBridgeModalOpen] = useState(false);

  // MTN Bridge Simulator State
  const [simulatorModalOpen, setSimulatorModalOpen] = useState(false);
  const [simulatorType, setSimulatorType] = useState<string>("SUCCESS");
  const [simulatorRefInput, setSimulatorRefInput] = useState("");
  const [simulatorAmountInput, setSimulatorAmountInput] = useState<number>(5000);
  const [simulatorLang, setSimulatorLang] = useState<"rw" | "en">("rw");
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorResult, setSimulatorResult] = useState<any>(null);

  // Configuration Data
  const [activeFee, setActiveFee] = useState<any>(null);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [newFeeAmount, setNewFeeAmount] = useState<number>(5000);
  const [newRenewalAmount, setNewRenewalAmount] = useState<number>(5000);
  const [newGracePeriodDays, setNewGracePeriodDays] = useState<number>(7);
  const [newReminderSchedule, setNewReminderSchedule] = useState<string>("30,14,7,0");
  const [newFeeReason, setNewFeeReason] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRunSimulator = async () => {
    setSimulatorLoading(true);
    setSimulatorResult(null);
    try {
      const res = await fetch("/api/admin/payments/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulationType: simulatorType,
          paymentReference: simulatorRefInput.trim() || undefined,
          amount: simulatorAmountInput,
          language: simulatorLang,
        }),
      });
      const data = await res.json();
      setSimulatorResult(data);
      if (data.success) {
        fetchPayments();
      }
    } catch (err: any) {
      setSimulatorResult({ success: false, error: err.message });
    } finally {
      setSimulatorLoading(false);
    }
  };

  const handleRunRenewalCron = async () => {
    setCronLoading(true);
    setCronResult(null);
    setCronModalOpen(true);
    try {
      const res = await fetch("/api/admin/renewals/cron", {
        method: "POST",
      });
      const data = await res.json();
      setCronResult(data);
      if (data.success) {
        fetchPayments();
      }
    } catch (err: any) {
      setCronResult({ success: false, error: err.message });
    } finally {
      setCronLoading(false);
    }
  };

  const handleGrantWaiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiverBizId.trim() || waiverReason.trim().length < 8) {
      setWaiverMsg({ type: "error", text: "Business ID and a descriptive reason (min 8 characters) are required." });
      return;
    }
    setWaiverLoading(true);
    setWaiverMsg(null);
    try {
      const res = await fetch("/api/admin/renewals/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: waiverBizId.trim(),
          waiverType,
          reason: waiverReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWaiverMsg({ type: "success", text: `Waiver successfully granted! Receipt #${data.receipt?.receiptNumber}` });
        setWaiverBizId("");
        setWaiverReason("");
        fetchPayments();
      } else {
        setWaiverMsg({ type: "error", text: data.error || "Failed to grant waiver." });
      }
    } catch (err: any) {
      setWaiverMsg({ type: "error", text: err.message || "Failed to grant waiver." });
    } finally {
      setWaiverLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        status: statusFilter,
        provider: providerFilter,
      });
      if (paymentTypeFilter !== "ALL") params.append("paymentType", paymentTypeFilter);
      if (renewalStatusFilter !== "ALL") params.append("renewalStatus", renewalStatusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
        setSummary(data.summary || summary);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeConfig = async () => {
    try {
      const res = await fetch("/api/admin/payments/fee-config");
      const data = await res.json();
      if (data.success) {
        setActiveFee(data.activeFee);
        setFeeHistory(data.feeHistory || []);
        setProviders(data.providers || []);
        if (data.activeFee?.amount !== undefined) {
          setNewFeeAmount(data.activeFee.amount);
        }
        if (data.activeFee?.renewalAmount !== undefined) {
          setNewRenewalAmount(data.activeFee.renewalAmount);
        }
        if (data.activeFee?.gracePeriodDays !== undefined) {
          setNewGracePeriodDays(data.activeFee.gracePeriodDays);
        }
        if (data.activeFee?.reminderSchedule !== undefined) {
          setNewReminderSchedule(data.activeFee.reminderSchedule);
        }
      }
    } catch (err) {
      console.error("Failed to load fee configuration:", err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, providerFilter, paymentTypeFilter, renewalStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleUpdateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      const res = await fetch("/api/admin/payments/fee-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_FEE",
          amount: newFeeAmount,
          renewalAmount: newRenewalAmount,
          gracePeriodDays: newGracePeriodDays,
          reminderSchedule: newReminderSchedule,
          currency: "RWF",
          reason: newFeeReason || "Updated by Administrator",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigMsg({ type: "success", text: data.message });
        setNewFeeReason("");
        await fetchFeeConfig();
        fetchPayments();
      } else {
        setConfigMsg({ type: "error", text: data.error || "Update failed." });
      }
    } catch (err: any) {
      setConfigMsg({ type: "error", text: err.message || "Failed to update fee." });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleUpdateProvider = async (provider: any) => {
    setConfigSaving(true);
    setConfigMsg(null);
    try {
      const res = await fetch("/api/admin/payments/fee-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PROVIDER",
          provider: provider.provider,
          name: provider.name,
          isEnabled: provider.isEnabled,
          accountNumber: provider.accountNumber,
          accountName: provider.accountName,
          instructions: provider.instructions,
          instructionsRw: provider.instructionsRw,
          webhookSecret: provider.webhookSecret,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigMsg({ type: "success", text: data.message });
        await fetchFeeConfig();
      } else {
        setConfigMsg({ type: "error", text: data.error || "Update failed." });
      }
    } catch (err: any) {
      setConfigMsg({ type: "error", text: err.message || "Failed to update provider." });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleConfirmBankPayment = async () => {
    if (!confirmPaymentModal || !bankRefInput.trim()) return;
    setConfirmingLoading(true);
    try {
      const res = await fetch("/api/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: confirmPaymentModal.id,
          providerTransactionRef: bankRefInput.trim(),
          notes: adminNotesInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfirmPaymentModal(null);
        setBankRefInput("");
        setAdminNotesInput("");
        fetchPayments();
      } else {
        alert(data.error || "Confirmation failed.");
      }
    } catch (err: any) {
      alert(err.message || "Confirmation failed.");
    } finally {
      setConfirmingLoading(false);
    }
  };

  const exportReconciliationCSV = () => {
    if (payments.length === 0) return;
    const headers = [
      "Payment Reference",
      "Provider Ref",
      "Business Name",
      "Owner Name",
      "Owner Phone",
      "Fee Snapshot (RWF)",
      "Payment Type",
      "Renewal Status",
      "Period Start",
      "Period End",
      "Is Waiver",
      "Waiver Reason",
      "Provider",
      "Status",
      "Receipt Number",
      "Business Discovery Status",
      "Created At",
      "Verified At",
    ];

    const rows = payments.map((p) => [
      `"${p.paymentReference}"`,
      `"${p.providerTransactionRef || ""}"`,
      `"${p.businessName}"`,
      `"${p.ownerName}"`,
      `"${p.ownerPhone}"`,
      p.feeAmount,
      `"${p.paymentType || "REGISTRATION"}"`,
      `"${p.renewalStatus || "CURRENT"}"`,
      `"${p.periodCoveredStart ? new Date(p.periodCoveredStart).toLocaleDateString() : ""}"`,
      `"${p.periodCoveredEnd ? new Date(p.periodCoveredEnd).toLocaleDateString() : ""}"`,
      `"${p.isWaiver ? "YES" : "NO"}"`,
      `"${p.waiverReason || ""}"`,
      `"${p.provider}"`,
      `"${p.status}"`,
      `"${p.receiptNumber || ""}"`,
      `"${p.businessStatus}"`,
      `"${new Date(p.createdAt).toISOString()}"`,
      `"${p.verifiedAt ? new Date(p.verifiedAt).toISOString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MOSA_Reconciliation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CreditCard className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900">
                  Registration, Renewals &amp; Revenue Reconciliation
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wider">
                  12-Mo Lifecycle
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic registration fees, 12-month expiry engine, automated 30d/14d/7d warnings, grace period enforcement, and audit waivers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunRenewalCron}
            disabled={cronLoading}
            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
            title="Scan all businesses, evaluate 12-month expiry, trigger grace periods and send stage-specific warning notifications"
          >
            <Clock className={`w-3.5 h-3.5 text-indigo-700 ${cronLoading ? "animate-spin" : ""}`} />
            <span>Run Renewal Engine</span>
          </button>

          <button
            onClick={() => {
              setWaiverModalOpen(true);
              setWaiverMsg(null);
            }}
            className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="Grant free 12-month registration or renewal waiver with mandatory audit log"
          >
            <Gift className="w-3.5 h-3.5 text-purple-700" />
            <span>Grant Fee Waiver</span>
          </button>

          <button
            onClick={() => setBridgeModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
            <span>Bridge &amp; SIM Control</span>
          </button>

          <button
            onClick={() => {
              setSimulatorModalOpen(true);
              setSimulatorResult(null);
            }}
            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-700" />
            <span>MTN Simulator</span>
          </button>

          <button
            onClick={() => {
              fetchFeeConfig();
              setConfigModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>Fee Settings</span>
          </button>

          <button
            onClick={exportReconciliationCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              fetchPayments();
            }}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Financial Summary KPI Cards (Row 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {summary.totalRevenue.toLocaleString()} RWF
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Verified registration &amp; renewal fees</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-card">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Confirmed &amp; Active</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{summary.confirmedCount}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Total payments confirmed</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-card">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending Callback</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{summary.pendingCount}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Awaiting telco / bank transfer</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-card">
          <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Duplicate / Blocked</div>
          <div className="text-2xl font-black text-purple-700 mt-1">{summary.duplicateCount}</div>
          <div className="text-[10px] text-purple-600 mt-0.5">Prevented replay attacks</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-card">
          <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Active Standard Fee</div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {activeFee ? `${activeFee.amount.toLocaleString()} ${activeFee.currency}` : "5,000 RWF"}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">
            Renewal: {activeFee?.renewalAmount ? `${activeFee.renewalAmount.toLocaleString()} RWF` : "5,000 RWF"}
          </div>
        </div>
      </div>

      {/* Annual Renewal & Enforcement KPI Cards (Row 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 shadow-card">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Active Registrations</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {summary.activeRegistrations ?? summary.confirmedCount}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Valid 12-month registration</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-card">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Renewals Due Soon</span>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {summary.renewalsDueSoon ?? 0}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">Expiring within 30 days</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200 bg-orange-50/40 shadow-card">
          <div className="text-[10px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            <span>In Grace Period</span>
          </div>
          <div className="text-2xl font-black text-orange-700 mt-1">
            {summary.inGracePeriod ?? 0}
          </div>
          <div className="text-[10px] text-orange-700 mt-0.5">
            {summary.gracePeriodDays ?? 7}-day overdue window
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/40 shadow-card">
          <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Suspended (Overdue)</span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            {summary.suspendedBusinesses ?? 0}
          </div>
          <div className="text-[10px] text-rose-700 mt-0.5">Public visibility paused</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-card">
          <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3 h-3 text-purple-600" />
            <span>Fee Waivers Granted</span>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">
            {summary.waiverBusinesses ?? 0}
          </div>
          <div className="text-[10px] text-purple-700 mt-0.5">0 RWF official admin waivers</div>
        </div>
      </div>

      {/* Search & Filtering Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name, payment ref (MOSA-REG-... / MOSA-REN-...), receipt #, or phone..."
            className="w-full pl-9 pr-20 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium focus:outline-emerald-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Payment Type Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">Type:</span>
            <select
              value={paymentTypeFilter}
              onChange={(e) => {
                setPaymentTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Types</option>
              <option value="REGISTRATION">Initial Registration</option>
              <option value="ANNUAL_RENEWAL">Annual Renewal</option>
              <option value="ADMIN_WAIVER">Admin Waiver</option>
            </select>
          </div>

          {/* Renewal Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">Lifecycle:</span>
            <select
              value={renewalStatusFilter}
              onChange={(e) => {
                setRenewalStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Lifecycles</option>
              <option value="CURRENT">Current (Active)</option>
              <option value="DUE_SOON">Due Soon (30d)</option>
              <option value="GRACE_PERIOD">Grace Period (7d)</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="DUPLICATE">Duplicate</option>
              <option value="UNMATCHED">Unmatched</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">Provider:</span>
            <select
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Providers</option>
              <option value="MTN_MOMO">MTN MoMo</option>
              <option value="AIRTEL_MONEY">Airtel Money</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ADMIN_WAIVER">Admin Waiver</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800">
            Transactions Registry ({totalCount} records)
          </div>
          <div className="text-[11px] text-slate-400">
            Showing Page {page} of {Math.max(1, Math.ceil(totalCount / 50))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Loading transactions and reconciliation records...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No registration payments matching the current search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Business &amp; Owner</th>
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4">Type &amp; Validity</th>
                  <th className="py-3 px-4">Fee Charged</th>
                  <th className="py-3 px-4">Provider &amp; Ext. Ref</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Renewal Health</th>
                  <th className="py-3 px-4">Discovery Status</th>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const isConfirmed = p.status === "CONFIRMED";
                  const isPending = p.status === "PENDING";
                  const isDuplicate = p.status === "DUPLICATE";
                  const isFailed = p.status === "FAILED";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{p.businessName}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.ownerName} • {p.ownerPhone}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">
                          {p.paymentReference}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                              p.paymentType === "ANNUAL_RENEWAL"
                                ? "bg-blue-100 text-blue-900 border border-blue-200"
                                : p.paymentType === "ADMIN_WAIVER"
                                ? "bg-purple-100 text-purple-900 border border-purple-200"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            }`}
                          >
                            {p.paymentType === "ANNUAL_RENEWAL"
                              ? "Annual Renewal"
                              : p.paymentType === "ADMIN_WAIVER"
                              ? "Admin Waiver"
                              : "Registration"}
                          </span>
                        </div>
                        {p.periodCoveredEnd && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Valid to {new Date(p.periodCoveredEnd).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {p.feeAmount === 0 && p.isWaiver ? "0 RWF (Waiver)" : `${p.feeAmount.toLocaleString()} ${p.currency}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.isWaiver ? "Administrative waiver" : "Applicable fee"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {p.provider === "MTN_MOMO" && (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 font-bold text-[9px]">
                              MTN MoMo
                            </span>
                          )}
                          {p.provider === "AIRTEL_MONEY" && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-900 font-bold text-[9px]">
                              Airtel Money
                            </span>
                          )}
                          {p.provider === "BANK_TRANSFER" && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[9px]">
                              Bank Transfer
                            </span>
                          )}
                          {p.provider === "ADMIN_WAIVER" && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[9px]">
                              Admin Waiver
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-slate-600 mt-0.5">
                          {p.providerTransactionRef || (p.isWaiver ? "WAIVER-AUTH" : <span className="italic text-slate-400">Pending callback</span>)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            CONFIRMED
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            PENDING
                          </span>
                        )}
                        {isDuplicate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            <AlertTriangle className="w-3 h-3 text-purple-600" />
                            DUPLICATE
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            <X className="w-3 h-3 text-rose-600" />
                            FAILED
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.renewalStatus === "SUSPENDED"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : p.renewalStatus === "GRACE_PERIOD"
                              ? "bg-orange-100 text-orange-800 border border-orange-200"
                              : p.renewalStatus === "DUE_SOON"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {p.renewalStatus === "SUSPENDED"
                            ? "SUSPENDED"
                            : p.renewalStatus === "GRACE_PERIOD"
                            ? "GRACE PERIOD"
                            : p.renewalStatus === "DUE_SOON"
                            ? "DUE SOON"
                            : "CURRENT"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.businessStatus === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {p.businessStatus === "ACTIVE" ? "DISCOVERABLE" : p.businessStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.receiptNumber ? (
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="font-mono text-emerald-700 hover:text-emerald-800 font-bold text-[11px] underline flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{p.receiptNumber}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unissued</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && p.provider === "BANK_TRANSFER" && (
                            <button
                              onClick={() => {
                                setConfirmPaymentModal(p);
                                setBankRefInput("");
                                setAdminNotesInput("");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Confirm Bank Slip</span>
                            </button>
                          )}

                          {p.receiptNumber && (
                            <button
                              onClick={() => setSelectedReceipt(p)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                              title="View & Print Official Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: OFFICIAL RECEIPT VIEWER & PRINTER */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 text-slate-900 space-y-6 relative">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <img src="/icon.svg" alt="MOSA" className="w-8 h-8 rounded-xl object-contain shadow-xs" />
                  <h3 className="font-black text-lg text-slate-900 tracking-tight">MOSA OFFICIAL RECEIPT</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Local Business Community Discovery Network
                </p>
              </div>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Receipt Paper Styling */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4 font-mono text-xs relative overflow-hidden">
              <div className="absolute right-4 bottom-4 opacity-10 pointer-events-none select-none text-6xl font-black rotate-[-20deg]">
                VERIFIED
              </div>

              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Receipt Reference</div>
                  <div className="text-sm font-bold text-emerald-800">{selectedReceipt.receiptNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase">Date of Issue</div>
                  <div className="text-xs font-semibold text-slate-700">
                    {new Date(selectedReceipt.verifiedAt || selectedReceipt.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Business Entity</div>
                  <div className="font-bold text-slate-900">{selectedReceipt.businessName}</div>
                  <div className="text-[11px] text-slate-600">ID: {selectedReceipt.businessId}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Registered Proprietor</div>
                  <div className="font-bold text-slate-900">{selectedReceipt.ownerName}</div>
                  <div className="text-[11px] text-slate-600">{selectedReceipt.ownerPhone}</div>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-3 space-y-2">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>
                    {selectedReceipt.paymentType === "ANNUAL_RENEWAL"
                      ? "MOSA 12-Month Annual Registration Renewal"
                      : selectedReceipt.isWaiver
                      ? `Administrative Fee Waiver (${selectedReceipt.waiverReason || "Community Development Grant"})`
                      : "MOSA Platform Business Registration & Activation Fee"}
                  </span>
                  <span>{selectedReceipt.feeAmount.toLocaleString()} {selectedReceipt.currency}</span>
                </div>
                {selectedReceipt.periodCoveredStart && selectedReceipt.periodCoveredEnd && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                    <strong>12-Month Validity Period:</strong>{" "}
                    {new Date(selectedReceipt.periodCoveredStart).toLocaleDateString()} to{" "}
                    {new Date(selectedReceipt.periodCoveredEnd).toLocaleDateString()}
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Payment Channel: {selectedReceipt.provider}</span>
                  <span>Ext Ref: {selectedReceipt.providerTransactionRef || (selectedReceipt.isWaiver ? "WAIVER-AUTH" : "N/A")}</span>
                </div>
              </div>

              <div className="flex justify-between items-center font-bold text-sm text-slate-900 pt-1">
                <span>TOTAL PAID</span>
                <span className="text-emerald-700">{selectedReceipt.feeAmount.toLocaleString()} {selectedReceipt.currency}</span>
              </div>

              <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-200">
                <div>Status: Confirmed &amp; Activated on Live Discovery Engine.</div>
                <div>
                  Verification Status:{" "}
                  {selectedReceipt.isWaiver
                    ? `Fee Waiver Granted (${selectedReceipt.waiverReason || "Official Exemption"})`
                    : selectedReceipt.verifiedBy || "Official Verified Record"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Official proof of payment for commercial registration.</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL BANK CONFIRMATION MODAL */}
      {confirmPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">Confirm Bank Transfer Payment</h3>
              </div>
              <button
                onClick={() => setConfirmPaymentModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Confirming this payment will generate an official receipt and <strong>immediately activate</strong>{" "}
              <span className="font-bold text-slate-900">{confirmPaymentModal.businessName}</span> for public discovery.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Bank Deposit Slip / Bank Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankRefInput}
                  onChange={(e) => setBankRefInput(e.target.value)}
                  placeholder="e.g. BK-TXN-2026-98124 or Deposit Slip #"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Admin Audit Notes</label>
                <textarea
                  rows={2}
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  placeholder="Verified against Bank of Kigali account statement."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmPaymentModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmingLoading || !bankRefInput.trim()}
                onClick={handleConfirmBankPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {confirmingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm &amp; Activate Business</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FEE & PROVIDER CONFIGURATION DRAWER */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-lg text-slate-900">Registration Fee &amp; Providers Settings</h3>
              </div>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {configMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  configMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {configMsg.text}
              </div>
            )}

            {/* Section 1: Standard Fee Configuration */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Registration &amp; Annual Renewal Fees</h4>
                  <p className="text-xs text-slate-500">
                    Set default tariffs and grace periods for micro-businesses. Historical fees remain permanently snapshotted.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-700">
                    Reg: {activeFee?.amount?.toLocaleString() ?? 5000} {activeFee?.currency || "RWF"}
                  </div>
                  <div className="text-xs font-bold text-blue-700">
                    Ren: {activeFee?.renewalAmount ? `${activeFee.renewalAmount.toLocaleString()} RWF` : "5,000 RWF"}
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateFee} className="space-y-3 pt-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Standard Initial Registration Fee (RWF)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newFeeAmount}
                      onChange={(e) => setNewFeeAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Annual Renewal Fee (RWF)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newRenewalAmount}
                      onChange={(e) => setNewRenewalAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Grace Period Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      required
                      value={newGracePeriodDays}
                      onChange={(e) => setNewGracePeriodDays(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Reminder Schedule (Days Before Expiry)</label>
                    <input
                      type="text"
                      required
                      value={newReminderSchedule}
                      onChange={(e) => setNewReminderSchedule(e.target.value)}
                      placeholder="e.g. 30,14,7,0"
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reason for Adjustment &amp; Audit Justification</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Approved 2026 tariff policy and grace period update"
                      value={newFeeReason}
                      onChange={(e) => setNewFeeReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={configSaving}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {configSaving ? "Saving..." : "Update Settings"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Section 2: Payment Providers Configuration */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Configured Payment Providers &amp; Telco Credentials</span>
              </h4>

              <div className="space-y-3">
                {providers.map((pr) => (
                  <div
                    key={pr.provider}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{pr.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">({pr.provider})</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[11px] font-bold text-slate-600">Enabled</span>
                        <input
                          type="checkbox"
                          checked={pr.isEnabled}
                          onChange={(e) => {
                            const updated = { ...pr, isEnabled: e.target.checked };
                            handleUpdateProvider(updated);
                          }}
                          className="w-4 h-4 accent-emerald-600"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">
                          Account / Merchant Code / Till Number
                        </label>
                        <input
                          type="text"
                          value={pr.accountNumber || ""}
                          onChange={(e) => {
                            setProviders(
                              providers.map((p) =>
                                p.provider === pr.provider ? { ...p, accountNumber: e.target.value } : p
                              )
                            );
                          }}
                          className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">Beneficiary Account Name</label>
                        <input
                          type="text"
                          value={pr.accountName || ""}
                          onChange={(e) => {
                            setProviders(
                              providers.map((p) =>
                                p.provider === pr.provider ? { ...p, accountName: e.target.value } : p
                              )
                            );
                          }}
                          className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 block mb-0.5">Payment Instructions (EN)</label>
                      <input
                        type="text"
                        value={pr.instructions || ""}
                        onChange={(e) => {
                          setProviders(
                            providers.map((p) =>
                              p.provider === pr.provider ? { ...p, instructions: e.target.value } : p
                            )
                          );
                        }}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateProvider(pr)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Save Provider Settings
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Fee Audit History */}
            {feeHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-600" />
                  <span>Fee Change Audit Log</span>
                </h4>
                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                  {feeHistory.map((fh: any) => (
                    <div key={fh.id} className="p-2.5 bg-white flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{fh.amount.toLocaleString()} {fh.currency}</span>
                        <span className="text-slate-500 text-[11px] ml-2">— {fh.reason}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(fh.effectiveFrom).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 4: MTN Bridge Simulator Modal */}
      {simulatorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">MTN Payment Bridge Simulator</h3>
                  <p className="text-xs text-slate-500">
                    Simulate Android SIM SMS forwarder events with authentic HMAC signatures
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatorModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Simulation Test Scenario</label>
                <select
                  value={simulatorType}
                  onChange={(e) => {
                    setSimulatorType(e.target.value);
                    if (e.target.value === "UNDERPAYMENT") {
                      setSimulatorAmountInput(500);
                    } else if (e.target.value === "SUCCESS") {
                      setSimulatorAmountInput(5000);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                >
                  <option value="SUCCESS">✅ Valid Payment (5,000 RWF - Instant Auto-Activation &amp; Receipt)</option>
                  <option value="UNDERPAYMENT">❌ Underpayment (500 RWF - Anti-Fraud Underpayment Rejection)</option>
                  <option value="INVALID_REFERENCE">⚠️ Invalid Reference (Non-existent MOSA Reference)</option>
                  <option value="DUPLICATE">🛡️ Duplicate Replay (Reusing Already-Consumed MoMo Txn ID)</option>
                  <option value="UNMATCHED_SMS">📋 Unmatched SMS (Payer Omitted Reference in Reason Field)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Payment Reference <span className="text-slate-400 font-normal">(Leave blank to use latest pending)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MOSA-REG-20261013-XXXX"
                    value={simulatorRefInput}
                    onChange={(e) => setSimulatorRefInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Simulated MoMo Amount (RWF)</label>
                  <input
                    type="number"
                    value={simulatorAmountInput}
                    onChange={(e) => setSimulatorAmountInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-700">Telecom SMS Language:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="simLang"
                    checked={simulatorLang === "rw"}
                    onChange={() => setSimulatorLang("rw")}
                  />
                  <span>Kinyarwanda (Mwakiriye...)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="simLang"
                    checked={simulatorLang === "en"}
                    onChange={() => setSimulatorLang("en")}
                  />
                  <span>English (You have received...)</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={simulatorLoading}
                  onClick={handleRunSimulator}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-60"
                >
                  {simulatorLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitting Simulated MoMo Event...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>Execute Simulator Event</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simulation Diagnostics Panel */}
              {simulatorResult && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Bridge Diagnostics &amp; Verification</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        simulatorResult.success
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {simulatorResult.success ? "PASSED (Activated)" : "REJECTED (Protected)"}
                    </span>
                  </div>

                  {/* Simulated Raw SMS */}
                  <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] space-y-1">
                    <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      Simulated Raw SMS (Received on MTN SIM):
                    </div>
                    <div>{simulatorResult.simulatedSms}</div>
                  </div>

                  {/* Parsed Fields Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
                    <div>
                      <div className="text-slate-400 font-bold text-[10px]">PARSED REF</div>
                      <div className="font-mono font-bold text-slate-800 truncate">
                        {simulatorResult.parsedSms?.paymentReference || "N/A (Unmatched)"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-bold text-[10px]">AMOUNT PAID</div>
                      <div className="font-bold text-slate-800">
                        {simulatorResult.parsedSms?.amount} {simulatorResult.parsedSms?.currency}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-bold text-[10px]">MOMO TXN ID</div>
                      <div className="font-mono text-slate-800 truncate">
                        {simulatorResult.parsedSms?.providerTransactionRef}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-bold text-[10px]">HMAC STATUS</div>
                      <div className="font-bold text-emerald-700">
                        {simulatorResult.isSignatureValid ? "VERIFIED (SHA-256)" : "FAILED"}
                      </div>
                    </div>
                  </div>

                  {/* Outcome */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Payment Status:</span>
                      <span className="font-mono font-bold text-slate-900">{simulatorResult.paymentStatus}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Business Status:</span>
                      <span className="font-mono font-bold text-emerald-700">{simulatorResult.businessStatus}</span>
                    </div>
                    {simulatorResult.receipt && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="font-bold text-slate-700">Generated Receipt:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {simulatorResult.receipt.receiptNumber}
                        </span>
                      </div>
                    )}
                    {simulatorResult.confirmationError && (
                      <div className="text-red-600 font-semibold pt-1 border-t border-slate-100 text-[11px]">
                        Rejection Rationale: {simulatorResult.confirmationError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Administrative Waiver Modal */}
      {waiverModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900">Grant Administrative Fee Waiver</h3>
              </div>
              <button
                onClick={() => setWaiverModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Authorized administrators can grant free 12-month registration or annual renewal. A formal <strong>0 RWF receipt</strong> will be generated and an immutable audit log recorded.
            </p>

            {waiverMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  waiverMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {waiverMsg.text}
              </div>
            )}

            <form onSubmit={handleGrantWaiver} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Business ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cm123abc456 or copy from table"
                  value={waiverBizId}
                  onChange={(e) => setWaiverBizId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Waiver Type</label>
                <select
                  value={waiverType}
                  onChange={(e) => setWaiverType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                >
                  <option value="ANNUAL_RENEWAL">Annual Renewal Waiver (12 Months)</option>
                  <option value="REGISTRATION">Initial Registration Waiver (12 Months)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Mandatory Audit Justification Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={8}
                  placeholder="e.g. Official Youth Entrepreneurship Promotion Program grant."
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-purple-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Minimum 8 characters. Stored permanently on the audit log.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWaiverModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={waiverLoading || !waiverBizId.trim() || waiverReason.trim().length < 8}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {waiverLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
                  <span>Grant 12-Month Waiver</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section 6: Renewal Lifecycle Cron Result Modal */}
      {cronModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Renewal Lifecycle &amp; Reminders Engine</h3>
              </div>
              <button
                onClick={() => setCronModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Scans all active and pending businesses, evaluates 12-month expiry thresholds, enforces grace periods or suspensions, and sends staged warning notices.
            </p>

            {cronLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="font-bold text-slate-700">Evaluating 12-month expiry and dispatching notices...</span>
              </div>
            ) : cronResult ? (
              <div className="space-y-3 text-xs">
                {cronResult.success ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Renewal scan completed successfully!</span>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Scan failed: {cronResult.error || "Unknown error"}</span>
                  </div>
                )}

                {cronResult.summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Evaluated</div>
                      <div className="text-lg font-black text-slate-800">{cronResult.summary.checked ?? 0}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-amber-600 font-bold uppercase">Due Soon (30d)</div>
                      <div className="text-lg font-black text-amber-700">{cronResult.summary.dueSoon ?? 0}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-orange-600 font-bold uppercase">Grace Period</div>
                      <div className="text-lg font-black text-orange-700">{cronResult.summary.enteredGracePeriod ?? 0}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-rose-600 font-bold uppercase">Suspended</div>
                      <div className="text-lg font-black text-rose-700">{cronResult.summary.suspended ?? 0}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-indigo-600 font-bold uppercase">Notices Sent</div>
                      <div className="text-lg font-black text-indigo-700">{cronResult.summary.notificationsSent ?? 0}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Deduped / Skipped</div>
                      <div className="text-lg font-black text-slate-600">{cronResult.summary.deduplicated ?? 0}</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleRunRenewalCron}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Rerun Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => setCronModalOpen(false)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Section 7: Centralized Payment Bridge & SIM Management Modal */}
      <PaymentBridgeManagementModal
        isOpen={bridgeModalOpen}
        onClose={() => {
          setBridgeModalOpen(false);
          fetchPayments();
        }}
      />
    </div>
  );
}
