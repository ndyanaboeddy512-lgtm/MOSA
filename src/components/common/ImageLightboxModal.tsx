"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from "lucide-react";

export interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  caption?: string;
  allowDownload?: boolean;
}

export function ImageLightboxModal({
  isOpen,
  onClose,
  src,
  alt = "Business media",
  caption,
  allowDownload = true,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch pinch-to-zoom tracking
  const touchDistanceRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const isTouchPanningRef = useRef<boolean>(false);
  const touchPanStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset zoom & pan whenever opened with a new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, src]);

  // ESC key and keyboard zoom controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.35, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.35, 0.8);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Double click / double tap toggles 1x <-> 2.2x zoom
  const handleDoubleClick = () => {
    if (zoom > 1.05) {
      handleResetZoom();
    } else {
      setZoom(2.2);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.25, 4));
    } else {
      setZoom((prev) => {
        const next = Math.max(prev - 0.25, 0.8);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers (pinch-to-zoom & single touch pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers -> Pinch to zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchDistanceRef.current = dist;
      touchStartZoomRef.current = zoom;
    } else if (e.touches.length === 1 && zoom > 1) {
      // 1 finger when zoomed in -> Pan
      isTouchPanningRef.current = true;
      touchPanStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = currentDist / touchDistanceRef.current;
      const nextZoom = Math.min(Math.max(touchStartZoomRef.current * ratio, 0.8), 4);
      setZoom(nextZoom);
    } else if (e.touches.length === 1 && isTouchPanningRef.current && zoom > 1) {
      e.preventDefault();
      const newX = e.touches[0].clientX - touchPanStartRef.current.x;
      const newY = e.touches[0].clientY - touchPanStartRef.current.y;
      setPan({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      isTouchPanningRef.current = false;
      if (zoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
    }
  };

  // Safe Permitted Download Handler (downloads original image file)
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!allowDownload || !src) return;
    setIsDownloading(true);

    const cleanName = (caption || alt || "mosa-media")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 50);

    try {
      // 1. Data URLs (Base64) - convert to Blob for true browser file download
      if (src.startsWith("data:")) {
        const mimeMatch = src.match(/^data:([^;]+);base64,/);
        const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
        const filename = `${cleanName}.${ext}`;

        const base64Content = src.split(",")[1];
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
        return;
      }

      // 2. Blob URLs
      if (src.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = src;
        link.download = `${cleanName}.jpg`;
        link.setAttribute("download", `${cleanName}.jpg`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // 3. HTTP / HTTPS / Relative URLs - fetch and convert to Blob
      const response = await fetch(src);
      if (!response.ok) throw new Error("Fetch failed");
      const blob = await response.blob();
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const filename = `${cleanName}.${ext}`;
      link.download = filename;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch {
      // Fallback for cross-origin or restricted fetch
      const link = document.createElement("a");
      link.href = src;
      link.download = `${cleanName}.jpg`;
      link.setAttribute("download", `${cleanName}.jpg`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="image-lightbox-modal"
      aria-label={caption || alt || "Full-screen Image Viewer"}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/92 backdrop-blur-md select-none animate-in fade-in duration-200"
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
    >
      {/* Top Navigation & Toolbar Bar */}
      <div className="flex items-center justify-between p-3 sm:p-5 z-20 bg-linear-to-b from-black/80 via-black/40 to-transparent">
        {/* Caption / Title info */}
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
            <Maximize2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-sm">
              {caption || alt || "Image Preview"}
            </p>
            <p className="text-[10px] text-slate-300 font-medium">
              Zoom: {Math.round(zoom * 100)}% • Double-tap or pinch to inspect
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom Out */}
          <button
            type="button"
            data-testid="lightbox-zoom-out"
            onClick={handleZoomOut}
            disabled={zoom <= 0.8}
            className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Reset / Level indicator */}
          <button
            type="button"
            data-testid="lightbox-zoom-reset"
            onClick={handleResetZoom}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Reset Zoom (0)"
            aria-label="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            data-testid="lightbox-zoom-in"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Permitted Download Option */}
          {allowDownload && (
            <button
              type="button"
              data-testid="lightbox-download-btn"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 hover:scale-105"
              title="Download Image"
              aria-label="Download Image"
            >
              <Download className="w-4 h-4 text-white shrink-0" />
              <span className="font-bold text-white text-xs inline">{isDownloading ? "Saving..." : "Download"}</span>
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            data-testid="lightbox-close-btn"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-white/15 hover:bg-rose-600 text-white transition-colors cursor-pointer ml-1"
            title="Close viewer (ESC)"
            aria-label="Close image viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-6"
        onClick={(e) => {
          // Click background to close when not zoomed
          if (e.target === e.currentTarget && zoom <= 1) {
            onClose();
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
      >
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
          onDoubleClick={handleDoubleClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            data-testid="lightbox-display-img"
            draggable={false}
            className="max-w-[94vw] max-h-[78vh] sm:max-h-[82vh] w-auto h-auto object-contain rounded-lg shadow-2xl pointer-events-auto"
            style={{
              aspectRatio: "auto", // Strict aspect ratio preservation: no cropping or distortion
            }}
          />
        </div>
      </div>

      {/* Bottom Information / Tip Bar */}
      <div className="p-3 sm:p-4 z-20 bg-linear-to-t from-black/80 via-black/40 to-transparent flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          {caption && (
            <span className="font-semibold text-white drop-shadow-sm line-clamp-1">
              {caption}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hidden sm:inline">Mouse wheel / Drag to pan</span>
          <span>Pinch to zoom</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
}
