"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Business } from "@/types";
import { ArrowLeft, Phone, Mail, ShieldCheck, CheckCircle2, HeartHandshake, Sparkles, RefreshCw } from "lucide-react";

export default function BusinessClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { loginWithEmail, verifyOtp } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [step, setStep] = useState<"contact" | "otp" | "success">("contact");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+250788");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadBiz() {
      try {
        const res = await fetch(`/api/businesses/${resolvedParams.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.business) {
            setBusiness(data.business);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load business for claiming:", err);
      }
      setBusiness(null);
    }
    loadBiz();
  }, [resolvedParams.id]);

  if (!business) {
    return <div className="p-12 text-center text-sm">Business not found.</div>;
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid proprietor email address");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await loginWithEmail(email, "BUSINESS_OWNER");
      if (res.success) {
        setStep("otp");
      } else {
        setErrorMsg(res.error || "Failed to dispatch verification email");
      }
    } catch {
      setErrorMsg("Failed to dispatch verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await verifyOtp(otpCode, email);
      if (res.success) {
        // Sync claim to Neon PostgreSQL via official claims API
        try {
          await fetch("/api/claims", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessId: business.id,
              claimPhone: phone,
              claimEmail: email,
            }),
          });
        } catch (err) {
          console.warn("[Claims sync error]:", err);
        }

        setStep("success");
        setTimeout(() => {
          router.push("/owner/dashboard");
        }, 2000);
      } else {
        setErrorMsg(res.error || "Invalid or expired verification code.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.common.back}</span>
      </button>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-elevated">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
          <HeartHandshake className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-black text-slate-900">
          {lang === "rw" ? "Bwiyandikisheho nk'Umucuruzi" : "Claim Business Profile"}
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {lang === "rw"
            ? `Bwiyandikisheho kuri "${business.name}" i ${business.location?.community || (business as any).cell || "Nyamirambo"} ukoresheje imeli yawe.`
            : `Verify ownership of "${business.name}" located in ${business.location?.community || (business as any).cell || "Nyamirambo"} via email.`}
        </p>

        {step === "contact" && (
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Imeli y'Umucuruzi" : "Proprietor Email Address"}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@business.rw"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                We will send an instant 4-digit verification code to your email.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Nimero ya Telefone (Rwanda)" : "Proprietor Contact Phone"}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              <span>{lang === "rw" ? "Ohereza Kode yo Kwemeza" : "Send Verification Code"}</span>
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {lang === "rw" ? "Injiza Kode y'Imibare 4 yo kuri Imeli" : "Enter 4-Digit Email Code"}
                </label>
                <button
                  type="button"
                  onClick={() => setStep("contact")}
                  className="text-xs text-amber-700 hover:underline font-semibold"
                >
                  Change email
                </button>
              </div>
              <input
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="1234"
                className="w-full text-center tracking-widest text-2xl font-black py-3 bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1 text-center">
                A 4-digit code was sent to {email}. Valid for 10 minutes.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading || otpCode.length !== 4}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              <span>{lang === "rw" ? "Emeza Maze Winjire" : "Verify & Claim Business"}</span>
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="text-center py-6 space-y-3 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-slate-900 text-lg">
              {lang === "rw" ? "Byagenze Neza!" : "Ownership Successfully Verified!"}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === "rw"
                ? "Wamaze guhuzwa n'ubucuruzi bwawe. Uri kwerekezwa ku cyicaro cy'umucuruzi..."
                : "You are now verified as the proprietor. Redirecting to your Owner Hub..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
