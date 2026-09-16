"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth, DEMO_USERS } from "@/lib/auth-context";
import { Role } from "@/types";
import { Phone, ShieldCheck, UserCheck, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { switchDemoRole, loginWithPhone, verifyOtp } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+250788");
  const [otp, setOtp] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setErrorMsg("Please enter a valid phone number");
      return;
    }
    setErrorMsg("");
    const res = await loginWithPhone(phone);
    setSimulatedOtp(res.otp);
    setStep("otp");
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await verifyOtp(otp);
    if (ok) {
      router.push("/");
    } else {
      setErrorMsg("Invalid code. Use the code shown below.");
    }
  };

  const handleQuickDemoRole = (role: Role) => {
    switchDemoRole(role);
    if (role === "COMMUNITY_AGENT") router.push("/agent/dashboard");
    else if (role === "BUSINESS_OWNER") router.push("/owner/dashboard");
    else if (role === "SUPER_ADMIN") router.push("/admin");
    else router.push("/");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-md">
          M
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          {lang === "rw" ? "Injira muri MOSA" : "Sign in to MOSA"}
        </h1>
        <p className="text-xs text-slate-500">
          {lang === "rw"
            ? "Injira ukoresheje telefone cyangwa uhitemo umwirondoro wo kugenzura."
            : "Sign in with your phone or select a demo role for instant evaluation."}
        </p>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
        
        {step === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Nimero ya Telefone (Rwanda)" : "Phone Number"}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 000 000"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              {lang === "rw" ? "Ohereza Umubare w'Ibanga (Send OTP)" : "Send Verification Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Injiza Umubare w'Ibanga (4-Digit OTP)" : "Enter 4-Digit Code"}
              </label>
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="1234"
                className="w-full text-center tracking-widest text-2xl font-black py-3 bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                autoFocus
              />
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <span>Demo SMS Code: <strong>{simulatedOtp || "1234"}</strong></span>
              <button
                type="button"
                onClick={() => setOtp(simulatedOtp || "1234")}
                className="text-[11px] font-bold text-emerald-700 underline"
              >
                Auto-fill
              </button>
            </div>

            {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              {lang === "rw" ? "Emeza Maze Winjire" : "Verify & Continue"}
            </button>
          </form>
        )}

        {/* Instant Demo Role Switcher for Evaluators */}
        <div className="pt-4 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Demo Switcher</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Switch perspectives immediately without needing SMS verification:
          </p>

          <div className="space-y-2">
            {[
              { role: "COMMUNITY_AGENT" as Role, desc: "Emmanuel Hakizimana (Biryogo Scout)" },
              { role: "BUSINESS_OWNER" as Role, desc: "Kevine Mukashyaka (Salon Owner)" },
              { role: "CUSTOMER" as Role, desc: "Jean-Paul Mugisha (Resident)" },
              { role: "SUPER_ADMIN" as Role, desc: "Diane Uwera (Platform Lead)" },
            ].map((item) => (
              <button
                key={item.role}
                onClick={() => handleQuickDemoRole(item.role)}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-900">{item.role.replace("_", " ")}</div>
                  <div className="text-[10px] text-slate-500">{item.desc}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
