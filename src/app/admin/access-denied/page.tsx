"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert, ArrowLeft, Lock, Store, Home } from "lucide-react";

export default function AccessDeniedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Restricted Zone • 403 Forbidden</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Access Denied
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            The <strong>MOSA COMMAND CENTER</strong> is strictly reserved for authorized platform administrators and governance staff.
          </p>
        </div>

        {user && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-1">
            <div className="text-slate-400 font-medium">Currently Authenticated As:</div>
            <div className="font-bold text-slate-900">{user.name} ({user.phone || user.id})</div>
            <div className="text-slate-600">Active Role: <span className="font-bold text-amber-600">{user.role}</span></div>
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          {user?.role === "BUSINESS_OWNER" && (
            <Link
              href="/owner/dashboard"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Store className="w-4 h-4" />
              <span>Go to Business Owner Dashboard</span>
            </Link>
          )}

          <Link
            href="/admin/login"
            onClick={() => {
              if (user && user.role !== "SUPER_ADMIN" && user.role !== "COMMUNITY_ADMIN") {
                logout().catch(() => {});
              }
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span>Sign In with Administrator Account</span>
          </Link>

          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Return to MOSA Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
