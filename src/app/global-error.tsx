"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MOSA Global Error Caught]:", error);
  }, [error]);

  return (
    <html lang="rw">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md text-2xl font-black">
            M
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900">
              MOSA — Subiramo urupapuro
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Habaye ikibazo kidasanzwe. Kanda buto yo hasi kugira ngo urupapuro rwongere rwitangize.
            </p>
            <p className="text-xs text-slate-500">
              An unexpected application error occurred. Click reload to refresh the session.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Ongera Utangize / Reload Page</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/";
                }
              }}
              className="w-full py-2.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Garuka Ahabanza / Back to Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
