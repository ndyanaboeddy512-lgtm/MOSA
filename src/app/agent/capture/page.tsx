"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { parsePhysicalDocument, SAMPLE_PHYSICAL_DOCUMENTS, ExtractedLineItem } from "@/lib/ocr";
import { 
  Camera, 
  UploadCloud, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Plus, 
  FileText, 
  ArrowLeft,
  Lock,
  RefreshCw,
  Store
} from "lucide-react";

export default function PhysicalCapturePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [documentType, setDocumentType] = useState<"RECEIPT" | "MENU" | "PRICE_BOARD" | "STOREFRONT_SIGN">("RECEIPT");
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    merchantName: string;
    detectedDate: string;
    items: ExtractedLineItem[];
    totalAmount: number;
    hasRedactions: boolean;
    overallConfidence: number;
  } | null>(null);

  const [targetBusinessId, setTargetBusinessId] = useState("biz-3");
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Load a preset sample document
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_PHYSICAL_DOCUMENTS.find((s) => s.id === sampleId);
    if (sample) {
      setDocumentType(sample.type);
      setInputText(sample.text);
      processExtraction(sample.text, sample.type);
    }
  };

  const processExtraction = (text: string, type: typeof documentType) => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = parsePhysicalDocument(text, type);
      setParseResult({
        merchantName: result.merchantName,
        detectedDate: result.detectedDate,
        items: result.items,
        totalAmount: result.totalAmount,
        hasRedactions: result.hasRedactions,
        overallConfidence: result.overallConfidence,
      });
      setIsProcessing(false);
    }, 400);
  };

  const handleManualAnalyze = () => {
    if (inputText.trim()) {
      processExtraction(inputText, documentType);
    }
  };

  // Line item editing
  const handleUpdateItem = (id: string, field: keyof ExtractedLineItem, val: any) => {
    if (!parseResult) return;
    const updated = parseResult.items.map((i) => (i.id === id ? { ...i, [field]: val } : i));
    const newTotal = updated.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    setParseResult({ ...parseResult, items: updated, totalAmount: newTotal });
  };

  const handleDeleteItem = (id: string) => {
    if (!parseResult) return;
    const updated = parseResult.items.filter((i) => i.id !== id);
    const newTotal = updated.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    setParseResult({ ...parseResult, items: updated, totalAmount: newTotal });
  };

  const handleAddItem = () => {
    if (!parseResult) return;
    const newItem: ExtractedLineItem = {
      id: `item-manual-${Date.now()}`,
      name: "New Service / Item",
      price: 1000,
      quantity: 1,
      category: "General",
      confidence: 1.0,
    };
    const updated = [...parseResult.items, newItem];
    setParseResult({
      ...parseResult,
      items: updated,
      totalAmount: parseResult.totalAmount + newItem.price,
    });
  };

  // Publish to business catalogue
  const handlePublish = () => {
    if (!parseResult || !targetBusinessId) return;

    // Create the capture record
    const record = store.addCapture({
      businessId: targetBusinessId,
      businessName: parseResult.merchantName,
      agentId: user?.id || "agent-1",
      agentName: user?.name || "Emmanuel Hakizimana",
      documentType,
      imageUrl: "https://images.unsplash.com/photo-1554415707-9e4466aef152?w=800&auto=format&fit=crop&q=60",
      rawOcrText: inputText,
      extractedMerchant: parseResult.merchantName,
      extractedDate: parseResult.detectedDate,
      extractedItems: parseResult.items,
      extractedTotal: parseResult.totalAmount,
      currency: "RWF",
      status: "VERIFIED",
      sanitized: true,
      verifiedAt: new Date().toISOString(),
    });

    // Publish line items into the target business's live catalogue
    store.verifyCaptureAndPublish(record.id, parseResult.items, targetBusinessId);
    setPublishSuccess(true);

    setTimeout(() => {
      router.push(`/business/${targetBusinessId}`);
    }, 2000);
  };

  const businesses = store.getBusinesses();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.common.back}</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Camera className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {t.physicalCapture.title}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t.physicalCapture.subtitle}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start sm:self-center">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.physicalCapture.privacyBadge}</span>
          </div>
        </div>
      </div>

      {/* Preset Fast Testing Bar */}
      <div className="bg-slate-100 p-3 sm:p-4 rounded-2xl border border-slate-200 mb-8 space-y-2">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>{lang === "rw" ? "Kanda hano ugerageze ibipimo by'inzego z'ibanze:" : "Fast Evaluator Presets (Simulate Mobile Snap):"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_PHYSICAL_DOCUMENTS.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleLoadSample(doc.id)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs transition-colors cursor-pointer"
            >
              📄 {doc.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Document Input / Camera Capture */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
            
            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.physicalCapture.selectDocType}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "RECEIPT", label: t.physicalCapture.docTypes.receipt },
                  { id: "PRICE_BOARD", label: t.physicalCapture.docTypes.price_board },
                  { id: "MENU", label: t.physicalCapture.docTypes.menu },
                  { id: "STOREFRONT_SIGN", label: t.physicalCapture.docTypes.storefront_sign },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setDocumentType(type.id as typeof documentType)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                      documentType === type.id
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Business in Nyamirambo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === "rw" ? "Hitamo Ubucuruzi bwo Kumenyekanishaho" : "Assign to Business Profile"}</span>
              </label>
              <select
                value={targetBusinessId}
                onChange={(e) => setTargetBusinessId(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none"
              >
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.name} ({biz.location.community} • {biz.categoryDisplay})
                  </option>
                ))}
              </select>
            </div>

            {/* Text / Image OCR Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === "rw" ? "Inyandiko y'Ifoto cyangwa Fagitire (OCR Input)" : "Document Text / OCR Preview"}
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste receipt text or click a preset above..."
                rows={9}
                className="w-full p-3 bg-slate-50 font-mono text-xs text-slate-800 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleManualAnalyze}
              disabled={isProcessing || !inputText.trim()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.physicalCapture.extracting}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === "rw" ? "Sesengura Ibiciro (Run OCR Structuring)" : "Analyze & Extract Line Items"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Human-in-the-Loop Verification Editor */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{lang === "rw" ? "Kugenzura Amakuru Mbere yo Kuyatangaza" : "Agent Verification Table"}</span>
              </h3>
              {parseResult && (
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {Math.round(parseResult.overallConfidence * 100)}% Confidence
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {t.physicalCapture.humanVerificationNote}
            </p>

            {parseResult ? (
              <div className="space-y-4">
                
                {/* Header Signals */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      {t.physicalCapture.extractedMerchant}
                    </span>
                    <span className="font-bold text-slate-900">{parseResult.merchantName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      {t.physicalCapture.extractedDate}
                    </span>
                    <span className="font-bold text-slate-900">{parseResult.detectedDate}</span>
                  </div>
                </div>

                {/* Editable Line Items */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {parseResult.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, "name", e.target.value)}
                          className="w-full text-xs font-semibold text-slate-900 border-b border-transparent focus:border-emerald-500 outline-none"
                        />
                        <div className="text-[10px] text-slate-400">
                          Category: {item.category} • Confidence: {Math.round(item.confidence * 100)}%
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateItem(item.id, "price", Number(e.target.value))}
                            className="w-20 p-1 text-right text-xs font-bold text-slate-900 bg-slate-50 rounded border border-slate-200 outline-none"
                          />
                          <span className="text-[11px] font-semibold text-slate-500">Frw</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Discard false item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Item Button */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:border-emerald-500 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === "rw" ? "Ongeraho ikindi gicuruzwa" : "Add Missing Line Item"}</span>
                </button>

                {/* Computed Total */}
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>Total Calculated:</span>
                  <span className="text-sm font-black">{parseResult.totalAmount.toLocaleString()} Frw</span>
                </div>

                {/* Publish CTA */}
                {publishSuccess ? (
                  <div className="p-4 bg-emerald-600 text-white rounded-2xl text-xs font-bold text-center animate-in zoom-in-95">
                    ✓ Verified and successfully published to live catalogue! Redirecting...
                  </div>
                ) : (
                  <button
                    onClick={handlePublish}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t.physicalCapture.publishBtn}</span>
                  </button>
                )}

              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs">
                  {lang === "rw"
                    ? "Hitamo ifoto cyangwa ukande kuri rimwe mu maperekeza hejuru kugira ngo usuzume ibiciro."
                    : "Upload an artifact or click a preset above to preview extracted line items."}
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
