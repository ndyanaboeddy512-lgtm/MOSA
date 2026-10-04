"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export function CasualProtectionProvider({ children }: { children: React.ReactNode }) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let toastTimeout: NodeJS.Timeout;

    const showProtectedToast = (msg: string) => {
      setToastMessage(msg);
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
    };

    // 1. Prevent simple image drag-and-drop saving
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "IMG" || target.closest("img") || target.getAttribute("data-protected") === "true") {
        e.preventDefault();
        showProtectedToast("Image drag-and-drop is disabled to protect local business media.");
      }
    };

    // 2. Prevent casual right-click/context-menu copying on media and protected content
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Always allow context menu on interactive form elements (inputs, textareas, contenteditable)
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("input, textarea, [contenteditable='true'], .selectable-text")
      ) {
        return;
      }

      // Intercept right click on images, videos, and protected public cards
      const isMedia = target.tagName === "IMG" || target.tagName === "VIDEO" || target.closest("img, video");
      const isProtected = target.closest(".content-protected");

      if (isMedia || isProtected) {
        e.preventDefault();
        showProtectedToast("MOSA Casual Content Protection: Right-click copying is disabled on this media.");
      }
    };

    window.addEventListener("dragstart", handleDragStart, { passive: false });
    window.addEventListener("contextmenu", handleContextMenu, { passive: false });

    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("contextmenu", handleContextMenu);
      clearTimeout(toastTimeout);
    };
  }, []);

  return (
    <>
      {children}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-950/95 text-white text-xs font-semibold shadow-2xl border border-slate-800 flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-150"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
