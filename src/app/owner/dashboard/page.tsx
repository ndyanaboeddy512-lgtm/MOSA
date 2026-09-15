"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { Business, ProductItem, CommunityDemandSignal } from "@/types";
import { VerificationBadge } from "@/components/common/Badge";
import { 
  Store, 
  Eye, 
  PhoneCall, 
  Search, 
  TrendingUp, 
  Plus, 
  Tag, 
  Edit, 
  Clock, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  X
} from "lucide-react";

export default function OwnerDashboardPage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [demands, setDemands] = useState<CommunityDemandSignal[]>([]);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [postOfferModalOpen, setPostOfferModalOpen] = useState(false);

  // New item form
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState(2500);
  const [itemCategory, setItemCategory] = useState("Service");

  // Offer form
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDiscount, setOfferDiscount] = useState("20% OFF");

  useEffect(() => {
    // Look for claimed business or default to Salon Nova Style for immediate rich demo
    const all = store.getBusinesses();
    const myBiz = all.find((b) => b.claimedByUserId === user?.id) || all[0];
    setBusiness(myBiz);

    if (myBiz) {
      const relDemands = store.getDemands().filter((d) => d.category === myBiz.category || d.cell === myBiz.location.cell);
      setDemands(relDemands.length > 0 ? relDemands : store.getDemands().slice(0, 2));
    }
  }, [user]);

  if (!business) {
    return <div className="p-12 text-center text-sm">Loading Owner Hub...</div>;
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    store.addProductToBusiness(business.id, {
      businessId: business.id,
      name: itemName,
      price: Number(itemPrice),
      currency: "RWF",
      unit: "service",
      isAvailable: true,
      category: itemCategory,
      verifiedByAgent: false,
    });

    setBusiness({ ...business, products: [...business.products] });
    setAddItemModalOpen(false);
    setItemName("");
  };

  const handlePostOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) return;

    business.featuredOffer = {
      title: offerTitle,
      titleRw: offerTitle,
      discount: offerDiscount,
      validUntil: "2026-10-31",
    };
    setBusiness({ ...business });
    setPostOfferModalOpen(false);
    setOfferTitle("");
  };

  const displayName = lang === "rw" && business.nameRw ? business.nameRw : business.name;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Welcome Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Store className="w-5 h-5" />
            </span>
            <VerificationBadge status={business.verificationStatus} size="sm" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {business.location.community}, {business.location.cell}, Nyamirambo • Phone: {business.phone}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setAddItemModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.ownerDashboard.addNewItem}</span>
          </button>
          <button
            onClick={() => setPostOfferModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Tag className="w-4 h-4" />
            <span>{t.ownerDashboard.postOffer}</span>
          </button>
          <Link
            href={`/business/${business.id}`}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            View Public Profile
          </Link>
        </div>
      </div>

      {/* Simplified Analytics Metrics (No Overwhelming Charts) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t.ownerDashboard.viewsMetric}</span>
            <Eye className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{business.viewsCount}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">+18% this week</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t.ownerDashboard.contactsMetric}</span>
            <PhoneCall className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{business.contactClicksCount}</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-1">Direct calls / WhatsApp</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t.ownerDashboard.searchesMetric}</span>
            <Search className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{business.searchAppearancesCount}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">In neighborhood queries</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Catalogue Items</span>
            <Tag className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{business.products.length}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Verified Prices in RWF</div>
        </div>
      </div>

      {/* Main Grid: Catalogue Management & Demand Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left (2 Cols): Manage Catalogue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {t.ownerDashboard.catalogManagement}
                </h3>
                <p className="text-xs text-slate-500">
                  Products and services visible to neighborhood residents
                </p>
              </div>
              <button
                onClick={() => setAddItemModalOpen(true)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {business.products.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                      {p.verifiedByAgent && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                          ✓ Agent Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Category: {p.category || "General"} • Source: {p.extractedFrom || "Manual"}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-slate-900">{p.price.toLocaleString()} Frw</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right (1 Col): Demand Intelligence for Owner */}
        <div className="space-y-6">
          
          {/* Active Featured Offer */}
          {business.featuredOffer && (
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <span>Active Neighborhood Special Offer</span>
                </span>
                <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded uppercase text-[10px]">
                  {business.featuredOffer.discount}
                </span>
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {business.featuredOffer.title}
              </div>
              <div className="text-[11px] text-slate-500">
                Valid until {business.featuredOffer.validUntil}
              </div>
            </div>
          )}

          {/* Demand Intelligence in Category */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>Demand Radar in Your Category</span>
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              MOSA aggregates searches from nearby residents so you know what services are in high demand right now in Biryogo.
            </p>

            <div className="space-y-3">
              {demands.map((d) => (
                <div key={d.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">"{d.queryTerm}"</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {d.opportunityScore}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px]">{d.description}</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {d.searchCount} searches in {d.cell} • {d.activeBusinessesCount} existing shops
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Add Product Modal */}
      {addItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Add Catalogue Item</h3>
              <button onClick={() => setAddItemModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item / Service Name</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Modern Fade Haircut, Dress Tailoring"
                  required
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (RWF)</label>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    required
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    placeholder="e.g. Grooming"
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddItemModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md"
                >
                  Add to Catalogue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Offer Modal */}
      {postOfferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">Post Local Offer</h3>
              <button onClick={() => setPostOfferModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostOffer} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Offer Title</label>
                <input
                  type="text"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder="e.g. Tuesday Special: 1500 Frw haircut"
                  required
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Discount Tag</label>
                <input
                  type="text"
                  value={offerDiscount}
                  onChange={(e) => setOfferDiscount(e.target.value)}
                  placeholder="e.g. 25% OFF, SAVE 500 FRW"
                  required
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPostOfferModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md"
                >
                  Publish Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
