"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { offlineQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const updateStatus = () => {
      setIsOffline(!navigator.onLine);
      setPendingCount(offlineQueue.getPendingCount());
    };

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    const interval = setInterval(updateStatus, 3000);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      clearInterval(interval);
    };
  }, []);

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-md transition-all">
      <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
        {isOffline ? <WifiOff className="w-4 h-4 shrink-0 animate-pulse" /> : <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />}
        <span>
          {isOffline ? t.common.offlineNotice : `Syncing ${pendingCount} local offline update(s)...`}
        </span>
      </div>
    </div>
  );
}
