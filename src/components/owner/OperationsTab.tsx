"use client";

import React, { useState, useEffect } from "react";
import { ProductItem } from "@/types";
import { useLanguage } from "@/lib/i18n";
import {
  Layers,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  History,
  Tag,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface OperationsTabProps {
  businessId: string;
  products: ProductItem[];
  historyList: any[];
  lang?: string;
  onRefresh?: () => void;
}

export function OperationsTab({
  businessId,
  products,
  historyList,
  onRefresh,
}: OperationsTabProps) {
  const { lang, t } = useLanguage();
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadInventory() {
      try {
        const res = await fetch(`/api/owner/inventory?businessId=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            setInventoryItems(data.items);
          }
        }
      } catch (err) {
        console.error("Failed to load inventory:", err);
      } finally {
        setLoading(false);
      }
    }
    if (businessId) loadInventory();
  }, [businessId]);

  const handleAdjustStock = async (inventoryItemId: string, delta: number) => {
    setAdjustingId(inventoryItemId);
    try {
      const res = await fetch("/api/owner/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, inventoryItemId, stockDelta: delta }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          setInventoryItems((prev) =>
            prev.map((it) => (it.id === inventoryItemId ? data.item : it))
          );
          setSavedSuccess(t.inventory.stockUpdated);
          setTimeout(() => setSavedSuccess(null), 2500);
          if (onRefresh) onRefresh();
        }
      }
    } catch (err) {
      console.error("Error adjusting stock:", err);
    } finally {
      setAdjustingId(null);
    }
  };

  const inStockCount = inventoryItems.filter((i) => i.status === "IN_STOCK").length;
  const lowStockCount = inventoryItems.filter((i) => i.status === "LOW_STOCK").length;
  const outOfStockCount = inventoryItems.filter((i) => i.status === "OUT_OF_STOCK").length;

  return (
    <div className="space-y-6">
      {savedSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* Operations Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-slate-900 text-white">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {t.inventory.title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.inventory.subtitle}
          </p>
        </div>
      </div>

      {/* Stock Health KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
            <span>{t.inventory.inStock}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{inStockCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ready for customers</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-1">
            <span>{t.inventory.lowStock}</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{lowStockCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">&le; 5 units remaining</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-200 bg-red-50/20 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-red-800 mb-1">
            <span>{t.inventory.outOfStock}</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700">{outOfStockCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Reorder required</div>
        </div>
      </div>

      {/* Live Inventory Stock Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="font-extrabold text-slate-900 text-base">
            {t.inventory.title}
          </h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {inventoryItems.length} {lang === "rw" ? "ibicuruzwa" : "items"}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">
            {t.common.loading}
          </div>
        ) : inventoryItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            {lang === "rw" ? "Nta bicuruzwa birashyirwamo." : "No inventory items found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3">{t.inventory.itemName}</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Retail Price</th>
                  <th className="p-3">{t.inventory.currentStock}</th>
                  <th className="p-3">{t.inventory.status}</th>
                  <th className="p-3 text-right">{t.inventory.adjustStockBtn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryItems.map((item) => {
                  const stock = item.currentStock ?? 0;
                  const isLow = item.status === "LOW_STOCK";
                  const isOut = item.status === "OUT_OF_STOCK";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        {item.name}
                      </td>
                      <td className="p-3 text-slate-600">{item.category || "General"}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {(item.sellingPrice ?? 0).toLocaleString()} RWF <span className="text-[10px] text-slate-500 font-normal">/{item.unit || "unit"}</span>
                      </td>
                      <td className="p-3 font-black text-sm text-slate-900">
                        {stock} <span className="text-xs font-medium text-slate-500">{item.unit || "unit"}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOut
                              ? "bg-red-100 text-red-800"
                              : isLow
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleAdjustStock(item.id, -1)}
                            disabled={adjustingId === item.id || stock <= 0}
                            className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold disabled:opacity-50"
                            title="-1 Stock"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(item.id, 10)}
                            disabled={adjustingId === item.id}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded border border-emerald-200 text-[11px] disabled:opacity-50"
                            title="+10 Restock"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => handleAdjustStock(item.id, 50)}
                            disabled={adjustingId === item.id}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] disabled:opacity-50"
                            title="+50 Restock"
                          >
                            +50
                          </button>
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

      {/* Restocking & Modification Change History */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-card">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <History className="w-5 h-5 text-slate-700" />
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              {lang === "rw" ? "Amateka y'Impinduka mu Bubiko" : "Restocking & Inventory Audit Log"}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === "rw"
                ? "Impinduka zose zakozwe ku bicuruzwa n'ibiciro bibikwa mu buryo bw'umwimerere."
                : "Immutable change history log recorded in Neon PostgreSQL."}
            </p>
          </div>
        </div>

        {historyList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            {lang === "rw" ? "Nta mpinduka zirakorwa ku bicuruzwa." : "No inventory change history recorded."}
          </div>
        ) : (
          <div className="space-y-2">
            {historyList.slice(0, 10).map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{h.action.replace("_", " ")}</div>
                  <div className="text-[11px] text-slate-600">
                    {h.fieldChanged}:{" "}
                    <span className="line-through text-slate-400">{h.previousValue || "none"}</span> &rarr;{" "}
                    <span className="font-bold text-emerald-700">{h.newValue || "updated"}</span>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  {new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
