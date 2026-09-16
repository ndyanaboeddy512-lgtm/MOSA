"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@/types";
import { Phone, Lock, User, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

type AuthTab = "password" | "sms" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { switchDemoRole, loginWithPhone, loginWithPassword, register, verifyOtp } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>("password");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Password Login State
  const [phone, setPhone] = useState("+250788");
  const [password, setPassword] = useState("");

  // SMS OTP State
  const [smsPhone, setSmsPhone] = useState("+250788");
  const [smsStep, setSmsStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState("");

  // Register State
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("+250788");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>("BUSINESS_OWNER");
  const [regCommunity, setRegCommunity] = useState("Biryogo");

  const redirectByRole = (role?: string) => {
    if (role === "BUSINESS_OWNER") router.push("/owner/dashboard");
    else if (role === "COMMUNITY_AGENT") router.push("/agent/dashboard");
    else if (role === "SUPER_ADMIN") router.push("/admin");
    else router.push("/");
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await loginWithPassword(phone, password);
      if (res.success) {
        setSuccessMsg(lang === "rw" ? "Mwinjiye neza!" : "Logged in successfully!");
        setTimeout(() => {
          redirectByRole();
        }, 600);
      } else {
        setErrorMsg(res.error || "Invalid phone or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSmsPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await loginWithPhone(smsPhone);
      setSimulatedOtp(res.otp);
      setSmsStep("otp");
    } catch {
      setErrorMsg("Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const ok = await verifyOtp(otp);
      if (ok) {
        redirectByRole();
      } else {
        setErrorMsg(lang === "rw" ? "Umubare w'ibanga si wo." : "Invalid code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    if (regPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      const res = await register({
        name: regName,
        phone: regPhone,
        password: regPassword,
        role: regRole,
        community: regCommunity,
      });

      if (res.success) {
        setSuccessMsg(lang === "rw" ? "Kwandika byarangiye neza!" : "Registration successful! Redirecting...");
        setTimeout(() => {
          redirectByRole(regRole);
        }, 800);
      } else {
        setErrorMsg(res.error || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoRole = (role: Role) => {
    switchDemoRole(role);
    redirectByRole(role);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-14 w-full">
      {/* Brand Header */}
      <div className="text-center mb-6 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-md">
          M
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          {lang === "rw" ? "Injira muri MOSA" : "Sign in to MOSA"}
        </h1>
        <p className="text-xs text-slate-500">
          {lang === "rw"
            ? "Urubuga rwo guteza imbere ubucuruzi buciriritse mu Rwanda"
            : "Rwanda's verified local business network & discovery platform"}
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-card space-y-5">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => { setActiveTab("password"); setErrorMsg(""); }}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer truncate ${
              activeTab === "password"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "rw" ? "Ijambo banga" : "Password"}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("sms"); setErrorMsg(""); }}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer truncate ${
              activeTab === "sms"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "rw" ? "SMS Code" : "SMS Code"}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("register"); setErrorMsg(""); }}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer truncate ${
              activeTab === "register"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {lang === "rw" ? "Iyandikishe" : "Register"}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Password Login */}
        {activeTab === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Nimero ya Telefone" : "Rwanda Phone Number"}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Accepts 078..., 079..., 072..., 073..., or +2507...</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Ijambo ry'Ibanga (Password)" : "Password"}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {loading
                ? (lang === "rw" ? "Gufungura..." : "Signing in...")
                : (lang === "rw" ? "Injira n'Ijambo ry'Ibanga" : "Sign in with Password")}
            </button>
          </form>
        )}

        {/* Tab 2: SMS OTP Login */}
        {activeTab === "sms" && (
          <div>
            {smsStep === "phone" ? (
              <form onSubmit={handleSmsPhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Nimero ya Telefone (Rwanda)" : "Phone Number"}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      placeholder="+250 788 000 000"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? (lang === "rw" ? "Kohereza..." : "Sending...")
                    : (lang === "rw" ? "Ohereza Umubare w'Ibanga (Send OTP)" : "Send Verification Code")}
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
                    className="w-full text-center tracking-widest text-2xl font-black py-2.5 bg-slate-50 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    autoFocus
                  />
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <span>Demo SMS Code: <strong>{simulatedOtp || "1234"}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtp(simulatedOtp || "1234")}
                    className="text-[11px] font-bold text-emerald-700 underline cursor-pointer"
                  >
                    Auto-fill
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? (lang === "rw" ? "Kugenzura..." : "Verifying...")
                    : (lang === "rw" ? "Emeza Maze Winjire" : "Verify & Continue")}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Account Registration */}
        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Amazina Yose" : "Full Name"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Marie Claire Uwase"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Nimero ya Telefone (Rwanda)" : "Rwanda Phone Number"}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+250 788 123 456"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Ijambo ry'Ibanga (Min. 8 inyuguti)" : "Password (Min. 8 characters)"}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Ubwoko bwa Konti" : "Account Type"}
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as Role)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none"
                >
                  <option value="BUSINESS_OWNER">Business Owner</option>
                  <option value="CUSTOMER">Customer / Resident</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === "rw" ? "Agace / Umurenge" : "Primary Area"}
                </label>
                <input
                  type="text"
                  value={regCommunity}
                  onChange={(e) => setRegCommunity(e.target.value)}
                  placeholder="e.g. Biryogo, Kacyiru"
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {loading
                ? (lang === "rw" ? "Gufungura konti..." : "Creating account...")
                : (lang === "rw" ? "Fungura Konti Nshya" : "Create My Account")}
            </button>
          </form>
        )}

        {/* Instant Demo Role Switcher for Evaluators */}
        <div className="pt-4 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Demo Switcher (For Evaluators)</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Quickly preview platform roles without manual registration:
          </p>

          <div className="space-y-1.5">
            {[
              { role: "BUSINESS_OWNER" as Role, name: "Business Owner", desc: "Kevine Mukashyaka (Salon Owner)" },
              { role: "COMMUNITY_AGENT" as Role, name: "Community Agent", desc: "Emmanuel Hakizimana (Biryogo Scout)" },
              { role: "SUPER_ADMIN" as Role, name: "Platform Admin", desc: "Diane Uwera (Command Center Lead)" },
              { role: "CUSTOMER" as Role, name: "Customer", desc: "Jean-Paul Mugisha (Resident)" },
            ].map((item) => (
              <button
                key={item.role}
                onClick={() => handleQuickDemoRole(item.role)}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-900">{item.name}</div>
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
