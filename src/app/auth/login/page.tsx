"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/types";
import { 
  Phone, 
  Lock, 
  User, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Mail, 
  ArrowLeft, 
  RefreshCw, 
  X 
} from "lucide-react";

type AuthTab = "password" | "sms" | "register";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const reasonParam = searchParams.get("reason");

  const { lang, t } = useLanguage();
  const { switchDemoRole, loginWithPhone, loginWithPassword, register, verifyOtp } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>("password");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Password Login State
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password / Password Recovery State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"request" | "verify">("request");
  const [recoveryMethod, setRecoveryMethod] = useState<"SMS" | "EMAIL">("SMS");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryShowNewPassword, setRecoveryShowNewPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");
  const [devRecoveryCode, setDevRecoveryCode] = useState("");

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

  const navigateAfterAuth = (userRole?: string) => {
    // If a redirect parameter was provided, respect it for permitted roles
    if (redirectParam) {
      if (redirectParam.startsWith("/admin")) {
        if (userRole === "SUPER_ADMIN" || userRole === "COMMUNITY_ADMIN" || userRole === "MODERATOR") {
          router.push(redirectParam);
          return;
        }
      } else if (redirectParam.startsWith("/owner")) {
        if (userRole === "BUSINESS_OWNER" || userRole === "SUPER_ADMIN") {
          router.push(redirectParam);
          return;
        }
      } else if (redirectParam.startsWith("/agent")) {
        if (userRole === "COMMUNITY_AGENT" || userRole === "SUPER_ADMIN") {
          router.push(redirectParam);
          return;
        }
      } else if (!redirectParam.startsWith("/api/")) {
        router.push(redirectParam);
        return;
      }
    }

    // Role-based destination
    if (userRole === "SUPER_ADMIN" || userRole === "COMMUNITY_ADMIN" || userRole === "MODERATOR") {
      router.push("/admin");
    } else if (userRole === "BUSINESS_OWNER") {
      router.push("/owner/dashboard");
    } else if (userRole === "COMMUNITY_AGENT") {
      router.push("/agent/dashboard");
    } else {
      router.push("/");
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await loginWithPassword(phone, password, rememberMe);
      if (res.success) {
        setSuccessMsg(t.auth.successLogin);
        setTimeout(() => {
          navigateAfterAuth(res.user?.role);
        }, 600);
      } else {
        setErrorMsg(res.error || "Invalid username, phone number, or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");
    if (!recoveryIdentifier.trim()) {
      setRecoveryError(lang === "rw" ? "Injiza telefone cyangwa imeli yawe." : "Please enter your phone number or email.");
      return;
    }

    try {
      setRecoveryLoading(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: recoveryIdentifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process recovery request.");
      }

      setRecoveryMethod(data.method || (recoveryIdentifier.includes("@") ? "EMAIL" : "SMS"));
      setRecoverySuccess(data.message);
      if (data.devOtp) setDevRecoveryCode(data.devOtp);
      if (data.devToken) setDevRecoveryCode(data.devToken);
      setRecoveryStep("verify");
    } catch (err: any) {
      setRecoveryError(err.message || "Failed to initiate password recovery.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");

    if (!recoveryCode.trim()) {
      setRecoveryError(lang === "rw" ? "Injiza kode yemeza cyangwa token." : "Please enter the verification code or token.");
      return;
    }

    if (recoveryNewPassword.length < 8) {
      setRecoveryError(lang === "rw" ? "Ijambobanga rigomba kugira byibura inyuguti 8." : "Password must be at least 8 characters long.");
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setRecoveryError(lang === "rw" ? "Amagambobanga yombi ntabwo ahura." : "Passwords do not match.");
      return;
    }

    try {
      setRecoveryLoading(true);
      const isEmail = recoveryIdentifier.includes("@") || recoveryMethod === "EMAIL";
      const payload: any = {
        newPassword: recoveryNewPassword,
        confirmPassword: recoveryConfirmPassword,
      };

      if (isEmail) {
        payload.token = recoveryCode.trim();
      } else {
        payload.phone = recoveryIdentifier.trim();
        payload.otp = recoveryCode.trim();
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      // Prefill login form with recovered identifier and new password
      setPhone(recoveryIdentifier.trim());
      setPassword(recoveryNewPassword);
      setShowForgotPassword(false);
      setSuccessMsg(
        lang === "rw"
          ? "Ijambobanga ryahinduwe neza! Ushobora kwinjira ubu."
          : "Password reset successfully! You can now sign in with your new password."
      );
      // Reset recovery form
      setRecoveryStep("request");
      setRecoveryCode("");
      setRecoveryNewPassword("");
      setRecoveryConfirmPassword("");
    } catch (err: any) {
      setRecoveryError(err.message || "Failed to complete password reset.");
    } finally {
      setRecoveryLoading(false);
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
      const res = await verifyOtp(otp);
      if (res.success) {
        navigateAfterAuth(res.user?.role);
      } else {
        setErrorMsg(t.auth.invalidCode);
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
        setSuccessMsg(t.auth.successRegister);
        setTimeout(() => {
          navigateAfterAuth(res.user?.role || regRole);
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
    navigateAfterAuth(role);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-14 w-full">
      {/* Brand Header */}
      <div className="text-center mb-6 space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-md">
          M
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          {t.auth.signInTitle}
        </h1>
        <p className="text-xs text-slate-500">
          {t.auth.signInSubtitle}
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-card space-y-5">
        {/* Admin Access Notice */}
        {(redirectParam?.startsWith("/admin") || reasonParam === "admin_required") && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                {lang === "rw" ? "Ubuyobozi Bukuru Busabwa" : "Admin Command Center Authentication"}
              </span>
              <span>
                {lang === "rw"
                  ? "Injira ukoresheje konti y'ubuyobozi kugira ngo ugere mu buyobozi bukuru bwa MOSA."
                  : "Please sign in with administrator credentials to enter the MOSA Command Center."}
              </span>
            </div>
          </div>
        )}

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
            {t.auth.passwordTab}
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
            {t.auth.otpTab}
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
            {t.auth.registerTab}
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
          <form 
            method="POST" 
            action="/api/auth/login" 
            onSubmit={handlePasswordLogin} 
            className="space-y-4"
            autoCapitalize="none"
            autoCorrect="off"
          >
            <div>
              <label htmlFor="owner-username" className="block text-xs font-bold text-slate-700 mb-1">
                {lang === "rw" ? "Nimero ya Telefone cyangwa Imeli" : "Phone Number or Email"}
              </label>
              <div className="relative">
                <input
                  id="owner-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={lang === "rw" ? "urugero: 0788123456 cyangwa izina@ubucuruzi.rw" : "e.g. 0788123456 or name@business.rw"}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === "rw" ? "Yakira 078..., 079..., 072..., 073..., +250... cyangwa imeli" : "Accepts 078..., 079..., 072..., 073..., +250..., or email"}
              </p>
            </div>

            <div>
              <label htmlFor="owner-password" className="block text-xs font-bold text-slate-700 mb-1">
                {t.auth.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="owner-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Navigation */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  id="owner-remember"
                  name="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
                <span className="font-medium text-slate-700">
                  {lang === "rw" ? "Nyibuka kuri iki cyuma" : "Remember me"}
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setErrorMsg("");
                  setSuccessMsg("");
                  if (phone && phone !== "+250788") {
                    setRecoveryIdentifier(phone);
                  }
                }}
                className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer transition-colors"
              >
                {lang === "rw" ? "Wibagiwe ijambobanga?" : "Forgot password?"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.auth.signingInBtn}</span>
                </>
              ) : (
                <span>{t.auth.signInBtn}</span>
              )}
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
                    {t.auth.phoneLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      placeholder={t.auth.phonePlaceholder}
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
                  {loading ? t.auth.sendingOtpBtn : t.auth.sendOtpBtn}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.auth.otpLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder={t.auth.otpPlaceholder}
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
                  {loading ? t.auth.verifyingBtn : t.auth.verifyBtn}
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
                {t.auth.fullNameLabel}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={t.auth.fullNamePlaceholder}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.auth.phoneLabel}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder={t.auth.phonePlaceholder}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.auth.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
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
                  {t.auth.accountTypeLabel}
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as Role)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none"
                >
                  <option value="BUSINESS_OWNER">{t.auth.accountTypes.owner}</option>
                  <option value="CUSTOMER">{t.auth.accountTypes.customer}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.auth.primaryAreaLabel}
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
              {loading ? t.auth.creatingAccountBtn : t.auth.createAccountBtn}
            </button>
          </form>
        )}

        {/* Instant Demo Role Switcher (Hidden in production when demo switch is disabled) */}
        {process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH === "true" && (
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
        )}

      {/* Forgot Password / Account Recovery Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {lang === "rw" ? "Kugarura Ijambobanga" : "Reset & Recover Password"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === "rw" ? "Ubufasha bwo kwinjira ku bacuruzi ba MOSA" : "MOSA Owner & Member Account Recovery"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setRecoveryError("");
                  setRecoverySuccess("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoveryError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {recoveryError}
              </div>
            )}

            {recoverySuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{recoverySuccess}</span>
              </div>
            )}

            {/* Recovery Step 1: Request Code / Token */}
            {recoveryStep === "request" && (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4 mt-4">
                <div>
                  <label htmlFor="recovery-identifier" className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Nimero ya Telefone cyangwa Imeli" : "Registered Phone Number or Email"}
                  </label>
                  <div className="relative">
                    <input
                      id="recovery-identifier"
                      name="username"
                      type="text"
                      autoComplete="username"
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      placeholder={lang === "rw" ? "urugero: 0788123456 cyangwa name@business.rw" : "e.g. 0788123456 or name@business.rw"}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {lang === "rw" 
                      ? "Tuzakwoherereza kode y'akanya gato kuri SMS cyangwa umurongo wo guhindura kuri imeli."
                      : "We'll send a 4-digit SMS verification code to your phone or a secure reset link to your email."}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    {lang === "rw" ? "Reka" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {recoveryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>{recoveryLoading ? "Sending..." : (lang === "rw" ? "Ohereza Kode" : "Send Recovery Code")}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Recovery Step 2: Verify Code and Set New Password */}
            {recoveryStep === "verify" && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 mt-4">
                {devRecoveryCode && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-mono">
                    <span className="font-bold">Dev Verification Code: </span>
                    <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">{devRecoveryCode}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="recovery-code" className="block text-xs font-bold text-slate-700 mb-1">
                    {recoveryMethod === "EMAIL" 
                      ? (lang === "rw" ? "Kode cyangwa Token y'Imeli" : "Email Reset Token")
                      : (lang === "rw" ? "Kode y'Imibare 4 yo kuri SMS" : "4-Digit SMS Verification Code")}
                  </label>
                  <input
                    id="recovery-code"
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder={recoveryMethod === "EMAIL" ? "Paste token here..." : "e.g. 7294"}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="recovery-new-password" className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Ijambobanga Rishya" : "New Password"}
                  </label>
                  <div className="relative">
                    <input
                      id="recovery-new-password"
                      name="new-password"
                      type={recoveryShowNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value)}
                      placeholder={lang === "rw" ? "Byibura inyuguti 8" : "At least 8 characters"}
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setRecoveryShowNewPassword(!recoveryShowNewPassword)}
                      className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {recoveryShowNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="recovery-confirm-password" className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Subiramo Ijambobanga Rishya" : "Confirm New Password"}
                  </label>
                  <input
                    id="recovery-confirm-password"
                    name="confirm-password"
                    type={recoveryShowNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    value={recoveryConfirmPassword}
                    onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                    placeholder={lang === "rw" ? "Subiramo ijambobanga" : "Re-enter new password"}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryStep("request");
                      setRecoveryError("");
                    }}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{lang === "rw" ? "Subira inyuma" : "Back"}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {recoveryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{recoveryLoading ? "Resetting..." : (lang === "rw" ? "Hindura Ijambobanga" : "Save New Password")}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="max-w-md mx-auto px-4 py-14 text-center text-sm text-slate-500">Loading...</div>}>
      <LoginContent />
    </React.Suspense>
  );
}
