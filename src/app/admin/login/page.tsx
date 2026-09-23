"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, User, KeyRound, AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin";

  const [identifier, setIdentifier] = useState("admin@mosa.rw");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Forced password change state
  const [isForcedChange, setIsForcedChange] = useState(false);
  const [pendingAdminEmail, setPendingAdminEmail] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Invalid administrator credentials.");
        return;
      }

      if (data.mustChangePassword) {
        setIsForcedChange(true);
        setPendingAdminEmail(data.user?.email || identifier);
        setCurrentPasswordInput(password);
        setSuccessMsg("Initial authentication verified. Temporary password update required.");
        return;
      }

      setSuccessMsg("Administrator session authorized. Accessing Command Center...");
      setTimeout(() => {
        router.push(redirectTarget);
      }, 700);
    } catch {
      setErrorMsg("Network error connecting to administrator authentication service.");
    } finally {
      setLoading(false);
    }
  };

  const handleForcedPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      setLoading(false);
      return;
    }

    if (newPassword === currentPasswordInput) {
      setErrorMsg("Your new password must be different from the temporary password.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingAdminEmail,
          currentPassword: currentPasswordInput,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update password.");
        return;
      }

      setSuccessMsg("Password updated successfully! Permanent administrative session active.");
      setTimeout(() => {
        router.push("/admin");
      }, 1000);
    } catch {
      setErrorMsg("Network error during password update.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-elevated space-y-6">
        
        {/* Command Center Official Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              GOVERNANCE PORTAL
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              MOSA COMMAND CENTER
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Platform Administration & Business Verification
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Form 1: Standard Admin Sign In */}
        {!isForcedChange ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Administrator Identifier (Email or Phone)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@mosa.rw"
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <Link
                  href="/admin/forgot-password"
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating Clearance...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Enter MOSA Command Center</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Form 2: Mandatory First-Login Password Change */
          <form onSubmit={handleForcedPasswordChange} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Temporary Password Detected</span>
              </div>
              <p className="text-[11px] text-amber-700">
                You must change your temporary password before accessing the MOSA Command Center. The temporary password will permanently expire.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Temporary Password
              </label>
              <input
                type="password"
                required
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="Enter current temporary password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Secure Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Securing Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Save Password & Launch Command Center</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link
            href="/"
            className="text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1"
          >
            <span>← Public MOSA Website</span>
          </Link>

          <Link
            href="/owner/dashboard"
            className="text-slate-400 hover:text-purple-600 font-medium"
          >
            Business Owner Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading Command Center authentication...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
