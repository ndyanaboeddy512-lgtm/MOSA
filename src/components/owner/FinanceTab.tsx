"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  DollarSign,
  TrendingUp,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Send,
  RefreshCw,
  ShoppingBag,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  Info,
} from "lucide-react";

interface FinanceTabProps {
  businessId: string;
  lang?: string;
}

export function FinanceTab({ businessId }: FinanceTabProps) {
  const { lang, t, tr } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    purchaseCount: 0,
    totalCost: 0,
    expectedRevenue: 0,
    expectedGrossProfit: 0,
    expectedMarginPercent: 0,
    totalExpenses: 0,
    netExpectedProfit: 0,
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState({
    itemName: "",
    quantity: 10,
    unit: "kg",
    buyingPriceUnit: 1200,
    sellingPriceUnit: 1800,
    supplierName: "",
    supplierContact: "",
    notes: "",
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    category: "RENT",
    amount: 25000,
    description: "",
  });

  // Real-time calculation previews
  const qtyNum = Math.max(0.01, Number(purchaseForm.quantity) || 1);
  const buyNum = Number(purchaseForm.buyingPriceUnit) || 0;
  const sellNum = Number(purchaseForm.sellingPriceUnit) || 0;
  const costPreview = qtyNum * buyNum;
  const revenuePreview = qtyNum * sellNum;
  const profitPreview = revenuePreview - costPreview;
  const marginPreview = revenuePreview > 0 ? ((profitPreview / revenuePreview) * 100).toFixed(1) : "0";

  const fetchFinanceData = async (month = selectedMonth) => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [finRes, repRes] = await Promise.all([
        fetch(`/api/owner/finance?businessId=${businessId}&monthYear=${month}`),
        fetch(`/api/owner/reports?businessId=${businessId}`),
      ]);

      if (finRes.ok) {
        const finData = await finRes.json();
        setPurchases(finData.purchases || []);
        setExpenses(finData.expenses || []);
        if (finData.summary) {
          setSummary(finData.summary);
        }
      }

      if (repRes.ok) {
        const repData = await repRes.json();
        setMonthlyReports(repData.reports || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData(selectedMonth);
  }, [businessId, selectedMonth]);

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.itemName.trim()) {
      setErrorMsg("Item name is required.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/owner/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PURCHASE",
          businessId,
          itemName: purchaseForm.itemName,
          quantity: qtyNum,
          unit: purchaseForm.unit || "units",
          buyingPriceUnit: buyNum,
          sellingPriceUnit: sellNum,
          supplierName: purchaseForm.supplierName || null,
          supplierContact: purchaseForm.supplierContact || null,
          notes: purchaseForm.notes || null,
          purchaseDate: `${selectedMonth}-15T10:00:00.000Z`,
        }),
      });

      if (res.ok) {
        setSuccessMsg(
          lang === "rw"
            ? "Igicuruzwa cyanditswe neza mu gitabo cy'imari (Neon PostgreSQL)!"
            : "Purchase recorded successfully in Neon PostgreSQL!"
        );
        setPurchaseForm({
          itemName: "",
          quantity: 1,
          unit: "kg",
          buyingPriceUnit: 1000,
          sellingPriceUnit: 1500,
          supplierName: "",
          supplierContact: "",
          notes: "",
        });
        await fetchFinanceData(selectedMonth);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to record purchase.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record purchase.");
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setErrorMsg("Valid expense amount is required.");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/owner/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXPENSE",
          businessId,
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          description: expenseForm.description || null,
          expenseDate: `${selectedMonth}-15T10:00:00.000Z`,
        }),
      });

      if (res.ok) {
        setSuccessMsg(
          lang === "rw" ? "Amafaranga yakoreshejwe yanditswe neza!" : "Operational expense recorded successfully!"
        );
        setExpenseForm({ category: "RENT", amount: 10000, description: "" });
        await fetchFinanceData(selectedMonth);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to record expense.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record expense.");
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm(lang === "rw" ? "Gusiba iki gicuruzwa cyanditswe?" : "Delete this purchase record?")) return;
    try {
      const res = await fetch(`/api/owner/finance?purchaseId=${purchaseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchFinanceData(selectedMonth);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete record.");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm(lang === "rw" ? "Gusiba iki kiguzi cyanditswe?" : "Delete this expense record?")) return;
    try {
      const res = await fetch(`/api/owner/finance?expenseId=${expenseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchFinanceData(selectedMonth);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete expense.");
    }
  };

  const handleGenerateReportAndSMS = async () => {
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await fetch("/api/owner/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          monthYear: selectedMonth,
          sendSms: true,
          language: lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSmsResult(data.smsResult);
        await fetchFinanceData(selectedMonth);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to generate monthly report.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send monthly report.");
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-600 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <DollarSign className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {t.finance.title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.finance.subtitle}
          </p>
        </div>

        {/* Month Selector & SMS Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-600">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 outline-none"
            >
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-10">October 2026</option>
            </select>
          </div>

          <button
            onClick={handleGenerateReportAndSMS}
            disabled={smsSending}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {smsSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{lang === "rw" ? "Ohereza Raporo na SMS" : "Send Monthly Report & SMS"}</span>
          </button>
        </div>
      </div>

      {/* Honest SMS Status Result */}
      {smsResult && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <Info className="w-4 h-4 text-amber-600" />
            <span>SMS Provider Status: {smsResult.status}</span>
          </div>
          <p className="text-amber-800">
            {smsResult.error || "SMS record persisted to Neon PostgreSQL."}
          </p>
          <div className="text-[11px] text-amber-700 font-mono bg-white/70 p-2 rounded border border-amber-200">
            {smsResult.messageBody}
          </div>
        </div>
      )}

      {/* Legal & Financial Estimation Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-emerald-400">
            {lang === "rw" ? "Icyitonderwa ku Nyungu Iteganyijwe (Estimation Notice)" : "Financial Estimation Disclaimer"}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t.finance.disclaimer}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Wholesale Cost */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>{t.finance.totalCost}</span>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {summary.totalCost.toLocaleString()} <span className="text-xs text-slate-500 font-medium">RWF</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summary.purchaseCount} {lang === "rw" ? "ibicuruzwa byanditswe" : "records this month"}
          </div>
        </div>

        {/* Expected Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>{t.finance.expectedRevenue}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {summary.expectedRevenue.toLocaleString()} <span className="text-xs text-slate-500 font-medium">RWF</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {lang === "rw" ? "Kugurisha ku giciro cya MOSA" : "At catalog selling price"}
          </div>
        </div>

        {/* Expected Gross Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-bold mb-1">
            <span>{t.finance.expectedProfit}</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {summary.expectedGrossProfit >= 0 ? "+" : ""}
            {summary.expectedGrossProfit.toLocaleString()} <span className="text-xs font-medium">RWF</span>
          </div>
          <div className="text-[11px] font-bold text-emerald-800 mt-1">
            {t.finance.marginPercent}: {summary.expectedMarginPercent}%
          </div>
        </div>

        {/* Net Expected (After Expenses) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>{t.finance.netProfit}</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {(summary.netExpectedProfit || 0).toLocaleString()} <span className="text-xs text-slate-500 font-medium">RWF</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {t.finance.totalExpenses}: {(summary.totalExpenses || 0).toLocaleString()} RWF
          </div>
        </div>
      </div>

      {/* 2-Column: Purchase Entry Form & Live Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Record Purchase Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {lang === "rw" ? "Andika Igicuruzwa Gishya Mwagize (Record Purchase)" : "Record Inventory Purchase"}
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Month: <strong>{selectedMonth}</strong>
            </span>
          </div>

          <form onSubmit={handleRecordPurchase} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Item Name / Izina ry'Igicuruzwa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inyange Milk 500ml, Kitenge 6yd, Sugar 25kg"
                  value={purchaseForm.itemName}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, itemName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unit / Igipimo
                </label>
                <select
                  value={purchaseForm.unit}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, unit: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium focus:border-emerald-500"
                >
                  <option value="kg">kg (Kilograms)</option>
                  <option value="units">units (Items / Pcs)</option>
                  <option value="bags">bags (Imifuka)</option>
                  <option value="crates">crates (Amakaziye)</option>
                  <option value="boxes">boxes (Amakarito)</option>
                  <option value="liters">liters (Litiro)</option>
                  <option value="meters">meters (Metero)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity / Ingano *
                </label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900 focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Buying Price / Unit (RWF) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={purchaseForm.buyingPriceUnit}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, buyingPriceUnit: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900 focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Selling Price / Unit (RWF) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={purchaseForm.sellingPriceUnit}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, sellingPriceUnit: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-emerald-700 focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Live Instant Profit Preview */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500">Total Cost:</span>{" "}
                <strong className="text-slate-900 font-bold">{costPreview.toLocaleString()} RWF</strong>
              </div>
              <div>
                <span className="text-slate-500">Expected Rev:</span>{" "}
                <strong className="text-emerald-700 font-bold">{revenuePreview.toLocaleString()} RWF</strong>
              </div>
              <div>
                <span className="text-slate-500">Expected Profit:</span>{" "}
                <strong className="text-emerald-800 font-black">
                  {profitPreview >= 0 ? "+" : ""}
                  {profitPreview.toLocaleString()} RWF ({marginPreview}%)
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bralirwa, Inyange, Kimironko Market"
                  value={purchaseForm.supplierName}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier Contact / Phone
                </label>
                <input
                  type="text"
                  placeholder="+250 788 123 456"
                  value={purchaseForm.supplierContact}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierContact: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === "rw" ? "Bika mu Gitabo cy'Imari (Neon PostgreSQL)" : "Save Purchase to Neon Database"}</span>
            </button>
          </form>
        </div>

        {/* Right 1 Col: Record Operational Expense */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <Receipt className="w-5 h-5 text-slate-700" />
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {lang === "rw" ? "Amafaranga Yakoreshejwe (Expenses)" : "Operational Expense"}
              </h3>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none"
                >
                  <option value="RENT">Rent / Ubukode bw'inzu</option>
                  <option value="TRANSPORT">Transport & Delivery</option>
                  <option value="ELECTRICITY_WATER">Electricity & Water (REG / WASAC)</option>
                  <option value="WAGES">Wages / Ibihembo by'abakozi</option>
                  <option value="PACKAGING">Packaging & Bags</option>
                  <option value="TAXES">Taxes & Sector Fees</option>
                  <option value="OTHER">Other Operational Expense</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (RWF) *</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. September Shop Rent paid to Landlord"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                {lang === "rw" ? "Bika Ikiguzi" : "Record Expense"}
              </button>
            </form>
          </div>

          {/* Quick Expense List for Month */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {lang === "rw" ? "Ibyakoreshejwe muri uku kwezi:" : "Expenses This Month:"}
            </div>
            {expenses.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No operational expenses recorded.</div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{exp.category.replace("_", " ")}</div>
                      {exp.description && <div className="text-[10px] text-slate-500">{exp.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{exp.amount.toLocaleString()} RWF</span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-slate-400 hover:text-red-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purchases Ledger Table (Neon PostgreSQL) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {lang === "rw" ? "Igitabo cy'Ibyaguzwe (Purchases Ledger)" : "Inventory Purchases Ledger"}
            </h3>
            <p className="text-xs text-slate-500">
              {purchases.length} {lang === "rw" ? "ibicuruzwa byanditswe muri Neon PostgreSQL" : "records stored in Neon PostgreSQL"}
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Month: {selectedMonth}
          </span>
        </div>

        {purchases.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl text-xs text-slate-500">
            {lang === "rw"
              ? "Nta gicuruzwa kirandikwa muri uku kwezi. Koresha ifishi iri hejuru wandike ibyo mwaguze."
              : "No purchases recorded for this month yet. Use the form above to record your inventory."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3">Item</th>
                  <th className="p-3">Qty & Unit</th>
                  <th className="p-3">Buying Price</th>
                  <th className="p-3">Total Cost</th>
                  <th className="p-3">Target Retail</th>
                  <th className="p-3">Expected Revenue</th>
                  <th className="p-3">Expected Profit</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => {
                  const margin = p.expectedRevenue > 0 ? ((p.expectedGrossProfit / p.expectedRevenue) * 100).toFixed(1) : "0";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{p.itemName}</td>
                      <td className="p-3 font-semibold text-slate-700">
                        {p.quantity} {p.unit}
                      </td>
                      <td className="p-3 font-medium text-slate-600">{p.buyingPriceUnit.toLocaleString()} RWF</td>
                      <td className="p-3 font-bold text-slate-900">{p.totalCost.toLocaleString()} RWF</td>
                      <td className="p-3 font-medium text-slate-700">{p.sellingPriceUnit.toLocaleString()} RWF</td>
                      <td className="p-3 font-bold text-emerald-700">{p.expectedRevenue.toLocaleString()} RWF</td>
                      <td className="p-3 font-black text-emerald-800">
                        +{p.expectedGrossProfit.toLocaleString()} RWF ({margin}%)
                      </td>
                      <td className="p-3 text-slate-500">{p.supplierName || "—"}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeletePurchase(p.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete purchase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Monthly Reports Ledger (Neon PostgreSQL) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {lang === "rw" ? "Amateka ya Raporo za Buri Kwezi" : "Historical Monthly Financial Ledgers"}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "rw"
                  ? "Raporo zanditse burundu muri Neon PostgreSQL (September 2026, n'ayandi mezi)."
                  : "Permanent historical records aggregated directly in Neon PostgreSQL."}
              </p>
            </div>
          </div>
        </div>

        {monthlyReports.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            {lang === "rw" ? "Nta raporo z'amezi ashize zirahurizwa." : "No monthly records aggregated yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3">Month</th>
                  <th className="p-3">Purchases Count</th>
                  <th className="p-3">Total Cost</th>
                  <th className="p-3">Expected Revenue</th>
                  <th className="p-3">Expected Gross Profit</th>
                  <th className="p-3">Operating Expenses</th>
                  <th className="p-3">SMS Notification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{rep.monthYear}</td>
                    <td className="p-3 font-semibold text-slate-700">{rep.purchaseCount} items</td>
                    <td className="p-3 font-bold text-slate-900">{rep.totalCost.toLocaleString()} RWF</td>
                    <td className="p-3 font-bold text-emerald-700">{rep.expectedRevenue.toLocaleString()} RWF</td>
                    <td className="p-3 font-black text-emerald-800">
                      +{rep.expectedGrossProfit.toLocaleString()} RWF
                    </td>
                    <td className="p-3 font-medium text-slate-700">{rep.totalExpenses.toLocaleString()} RWF</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rep.smsStatus === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800"
                            : rep.smsStatus === "SENT"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {rep.smsStatus || "NOT_REQUESTED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
