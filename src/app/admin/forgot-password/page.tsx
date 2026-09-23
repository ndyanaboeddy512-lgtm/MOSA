"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, KeyRound, ArrowLeft, CheckCircle2, Lock } from "lucide-react";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [token, setToken] = useState(queryToken || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isResetMode, setIsResetMode] = useState(!!queryToken);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Password reset instructions dispatched.");
        if (data.devToken) {
          setToken(data.devToken);
          setIsResetMode(true);
        }
      } else {
        setErrorMsg(data.error || "Unable to process request.");
      }
    } catch {
      setErrorMsg("Network error connecting to governance authentication system.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Password reset successfully. Redirecting to admin login...");
        setTimeout(() => {
          router.push("/admin/login");
        }, 1500);
      } else {
        setErrorMsg(data.error || "Failed to reset password.");
      }
    } catch {
      setErrorMsg("Network error during password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {isResetMode ? "Create New Password" : "Reset Admin Password"}
          </h1>
          <p className="text-xs text-slate-500">
            {isResetMode
              ? "Enter your reset token and your new administrator password."
              : "Enter your registered administrative email address to recover your access credentials."}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!isResetMode ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Administrative Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mosa.rw"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? "Sending Reset Token..." : "Send Password Reset Token"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsResetMode(true)}
                className="text-xs text-emerald-700 hover:underline font-semibold"
              >
                Already have a reset token? Click here
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reset Token
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token received via governance alert"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Administrator Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
                placeholder="Confirm password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? "Updating Password..." : "Set New Password & Proceed"}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link
            href="/admin/login"
            className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin Login</span>
          </Link>

          <Link href="/" className="text-slate-400 hover:text-slate-700">
            MOSA Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading password recovery...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
