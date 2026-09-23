"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Business } from "@/types";
import { ArrowLeft, Phone, ShieldCheck, CheckCircle2, HeartHandshake, Sparkles } from "lucide-react";

export default function BusinessClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { loginWithPhone, verifyOtp } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [step, setStep] = useState<"phone" | "otp" | "success">("phone");
  const [phone, setPhone] = useState("+250788");
  const [otpCode, setOtpCode] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState("");
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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setErrorMsg("Please enter a valid Rwandan phone number");
      return;
    }
    setErrorMsg("");
    const res = await loginWithPhone(phone, "BUSINESS_OWNER");
    setSimulatedOtp(res.otp);
    setStep("otp");
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await verifyOtp(otpCode);
    if (res.success) {
      // Sync claim to Neon PostgreSQL via official claims API
      try {
        await fetch("/api/claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: business.id,
            claimPhone: phone,
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
      setErrorMsg("Invalid OTP code. Use the code shown below.");
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
            ? `Bwiyandikisheho kuri "${business.name}" i ${business.location?.community || (business as any).cell || "Nyamirambo"} ukoresheje telefone yawe.`
            : `Verify ownership of "${business.name}" located in ${business.location?.community || (business as any).cell || "Nyamirambo"}.`}
        </p>

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Nimero ya Telefone (Rwanda)" : "Proprietor Phone Number"}
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
              <p className="text-[11px] text-slate-400 mt-1">
                We will send an instant one-time verification SMS code.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              {lang === "rw" ? "Ohereza Umubare w'Ibanga (Send OTP)" : "Send Verification Code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Injiza Umubare w'Ibanga (4-Digit OTP)" : "Enter 4-Digit SMS Code"}
              </label>
              <input
                type="text"
                maxLength={4}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="1234"
                className="w-full text-center tracking-widest text-2xl font-black py-3 bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                autoFocus
              />
            </div>

            {/* Simulated SMS notification display */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <span>Demo SMS: Your code is <strong>{simulatedOtp || "1234"}</strong></span>
              <button
                type="button"
                onClick={() => setOtpCode(simulatedOtp || "1234")}
                className="text-[11px] font-bold text-amber-700 underline"
              >
                Auto-fill
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              {lang === "rw" ? "Emeza Maze Winjire" : "Verify & Claim Business"}
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
