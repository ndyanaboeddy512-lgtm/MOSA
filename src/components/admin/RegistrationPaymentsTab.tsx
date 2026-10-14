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
} from "lucide-react";

interface PaymentItem {
  id: string;
  businessId: string;
  businessName: string;
  businessStatus: string;
  verificationStatus: string;
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
  byProvider: {
    MTN_MOMO: number;
    AIRTEL_MONEY: number;
    BANK_TRANSFER: number;
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
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Panels
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentItem | null>(null);
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<PaymentItem | null>(null);
  const [bankRefInput, setBankRefInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [confirmingLoading, setConfirmingLoading] = useState(false);

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

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        status: statusFilter,
        provider: providerFilter,
      });
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
        if (data.activeFee?.amount) {
          setNewFeeAmount(data.activeFee.amount);
        }
      }
    } catch (err) {
      console.error("Failed to load fee configuration:", err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, providerFilter]);

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
                  Registration Payments &amp; Revenue Reconciliation
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wider">
                  Automated Activation
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic Rwanda registration fees, verified telco callbacks (MTN &amp; Airtel), bank reconciliation, and numbered audit receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setSimulatorModalOpen(true);
              setSimulatorResult(null);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-700" />
            <span>MTN Bridge Simulator</span>
          </button>

          <button
            onClick={() => {
              fetchFeeConfig();
              setConfigModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>Fee &amp; Provider Settings</span>
          </button>

          <button
            onClick={exportReconciliationCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Reconciliation</span>
          </button>

          <button
            onClick={() => {
              fetchPayments();
            }}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Records</span>
          </button>
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {summary.totalRevenue.toLocaleString()} RWF
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Verified registration fees</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-card">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Confirmed &amp; Active</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{summary.confirmedCount}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Auto-activated businesses</div>
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
          <div className="text-[10px] text-blue-600 mt-0.5">Configured default</div>
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
            placeholder="Search by business name, payment reference (MOSA-REG-...), receipt #, or phone..."
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
          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
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
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Providers</option>
              <option value="MTN_MOMO">MTN Mobile Money</option>
              <option value="AIRTEL_MONEY">Airtel Money</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
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
                  <th className="py-3 px-4">Fee Charged</th>
                  <th className="py-3 px-4">Provider &amp; Ext. Ref</th>
                  <th className="py-3 px-4">Payment Status</th>
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
                        <div className="font-bold text-slate-900">
                          {p.feeAmount.toLocaleString()} {p.currency}
                        </div>
                        <div className="text-[10px] text-slate-400">Standard fee</div>
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
                        </div>
                        <div className="font-mono text-[10px] text-slate-600 mt-0.5">
                          {p.providerTransactionRef || <span className="italic text-slate-400">Pending callback</span>}
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
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.businessStatus === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {p.businessStatus === "ACTIVE" ? "DISCOVERABLE (ACTIVE)" : p.businessStatus}
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
                  <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                    M
                  </span>
                  <h3 className="font-black text-lg text-slate-900 tracking-tight">MOSA OFFICIAL RECEIPT</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ministry of Commerce &amp; Local Business Community Discovery Network
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
                  <span>Rwanda Platform Business Registration &amp; Activation Fee</span>
                  <span>{selectedReceipt.feeAmount.toLocaleString()} {selectedReceipt.currency}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Payment Channel: {selectedReceipt.provider}</span>
                  <span>Ext Ref: {selectedReceipt.providerTransactionRef || "N/A"}</span>
                </div>
              </div>

              <div className="flex justify-between items-center font-bold text-sm text-slate-900 pt-1">
                <span>TOTAL PAID</span>
                <span className="text-emerald-700">{selectedReceipt.feeAmount.toLocaleString()} {selectedReceipt.currency}</span>
              </div>

              <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-200">
                <div>Status: Confirmed &amp; Activated on Live Discovery Engine.</div>
                <div>Verification Method: {selectedReceipt.verifiedBy || "Automated Cryptographic Telco Callback"}</div>
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
                  <h4 className="font-bold text-slate-900 text-sm">Active Standard Registration Fee</h4>
                  <p className="text-xs text-slate-500">
                    Charged dynamically for new micro-business registrations. Historical fees remain permanently snapshotted.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-700">
                    {activeFee?.amount.toLocaleString()} {activeFee?.currency || "RWF"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleUpdateFee} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">New Fee Amount (RWF)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newFeeAmount}
                    onChange={(e) => setNewFeeAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Reason for Fee Adjustment</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Approved quarterly platform tariff update"
                      value={newFeeReason}
                      onChange={(e) => setNewFeeReason(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={configSaving}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      Update Fee
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
    </div>
  );
}
