"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MapPin, Navigation, Plus, Minus, Compass, ExternalLink, CheckCircle2 } from "lucide-react";
import { getGoogleMapsDirectionsUrl } from "@/lib/location-quality";

export interface MosaMapPin {
  id: string;
  name: string;
  nameRw?: string;
  category?: string;
  categoryDisplay?: string;
  latitude: number;
  longitude: number;
  nearestLandmark?: string;
  addressNote?: string;
  priceSnippet?: string;
  isVerified?: boolean;
  coverImage?: string;
}

interface MosaMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  pins?: MosaMapPin[];
  selectedPinId?: string;
  onSelectPin?: (pin: MosaMapPin) => void;
  draggablePin?: boolean;
  draggableCoords?: { lat: number; lng: number };
  onCoordinateChange?: (coords: { lat: number; lng: number }) => void;
  accuracyRadiusMeters?: number;
  heightClassName?: string;
  showDirectionsButton?: boolean;
  interactive?: boolean;
}

// Standard Web Mercator projection functions
function latLngToPoint(lat: number, lng: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (0.5 - mercN / (2 * Math.PI)) * scale;
  return { x, y };
}

function pointToLatLng(x: number, y: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const mercN = (0.5 - y / scale) * 2 * Math.PI;
  const latRad = 2 * Math.atan(Math.exp(mercN)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

export function MosaMap({
  center = { lat: -1.981, lng: 30.046 }, // Default center (Kigali)
  zoom: initialZoom = 15,
  pins = [],
  selectedPinId,
  onSelectPin,
  draggablePin = false,
  draggableCoords,
  onCoordinateChange,
  accuracyRadiusMeters,
  heightClassName = "h-80 sm:h-96",
  showDirectionsButton = true,
  interactive = true,
}: MosaMapProps) {
  const [currentZoom, setCurrentZoom] = useState(initialZoom);
  const [mapCenter, setMapCenter] = useState(center);
  const [activePin, setActivePin] = useState<MosaMapPin | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Keep center updated when prop changes
  useEffect(() => {
    setMapCenter(center);
  }, [center.lat, center.lng]);

  // Keep active pin updated when prop changes
  useEffect(() => {
    if (selectedPinId) {
      const p = pins.find((x) => x.id === selectedPinId);
      if (p) setActivePin(p);
    }
  }, [selectedPinId, pins]);

  // Observe container size for accurate tile and pin placement
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Compute center point in Web Mercator
  const centerPoint = latLngToPoint(mapCenter.lat, mapCenter.lng, currentZoom);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !interactive) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const newCenterPoint = {
      x: centerPoint.x - dx,
      y: centerPoint.y - dy,
    };
    const newLatLng = pointToLatLng(newCenterPoint.x, newCenterPoint.y, currentZoom);
    setMapCenter(newLatLng);
  }, [isDragging, dragStart, centerPoint, currentZoom, interactive]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Click on map to place or adjust draggable pin
  const handleMapClick = (e: React.MouseEvent) => {
    if (!draggablePin || !onCoordinateChange || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const offsetX = clickX - dimensions.width / 2;
    const offsetY = clickY - dimensions.height / 2;

    const clickedPoint = {
      x: centerPoint.x + offsetX,
      y: centerPoint.y + offsetY,
    };
    const newCoords = pointToLatLng(clickedPoint.x, clickedPoint.y, currentZoom);
    onCoordinateChange(newCoords);
  };

  // Convert lat/lng to container pixel coordinates relative to center
  const getPinPixel = (lat: number, lng: number) => {
    const pt = latLngToPoint(lat, lng, currentZoom);
    return {
      left: dimensions.width / 2 + (pt.x - centerPoint.x),
      top: dimensions.height / 2 + (pt.y - centerPoint.y),
    };
  };

  // Tile grid calculations
  const tileSize = 256;
  const minTileX = Math.floor((centerPoint.x - dimensions.width / 2) / tileSize);
  const maxTileX = Math.floor((centerPoint.x + dimensions.width / 2) / tileSize);
  const minTileY = Math.floor((centerPoint.y - dimensions.height / 2) / tileSize);
  const maxTileY = Math.floor((centerPoint.y + dimensions.height / 2) / tileSize);

  const tiles = [];
  const maxTileIndex = Math.pow(2, currentZoom);
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      if (y >= 0 && y < maxTileIndex) {
        const wrappedX = ((x % maxTileIndex) + maxTileIndex) % maxTileIndex;
        const left = dimensions.width / 2 + (x * tileSize - centerPoint.x);
        const top = dimensions.height / 2 + (y * tileSize - centerPoint.y);
        tiles.push({
          key: `${currentZoom}-${wrappedX}-${y}`,
          url: `https://tile.openstreetmap.org/${currentZoom}/${wrappedX}/${y}.png`,
          left,
          top,
        });
      }
    }
  }

  // Calculate pixel radius for accuracy circle
  let pixelAccuracyRadius = 0;
  if (accuracyRadiusMeters && accuracyRadiusMeters > 0) {
    const metersPerPixel = (156543.03392 * Math.cos((mapCenter.lat * Math.PI) / 180)) / Math.pow(2, currentZoom);
    pixelAccuracyRadius = Math.max(12, Math.round(accuracyRadiusMeters / metersPerPixel));
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleMapClick}
      className={`relative w-full ${heightClassName} rounded-3xl overflow-hidden bg-slate-900 select-none border border-slate-700 shadow-xl ${
        interactive ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
      }`}
    >
      {/* Raster Tiles Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            loading="lazy"
            style={{
              position: "absolute",
              left: `${t.left}px`,
              top: `${t.top}px`,
              width: `${tileSize}px`,
              height: `${tileSize}px`,
            }}
            className="opacity-90 contrast-[1.05]"
          />
        ))}
      </div>

      {/* Map Grid Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/20" />

      {/* Top Map Status / Attribution */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
          <span>MOSA Ground Map • Rwanda</span>
        </div>

        {accuracyRadiusMeters ? (
          <div className="bg-emerald-950/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center gap-1 shadow-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>GPS: ±{Math.round(accuracyRadiusMeters)}m</span>
          </div>
        ) : null}
      </div>

      {/* Accuracy Circle on Map (for GPS capture or center point) */}
      {pixelAccuracyRadius > 0 && (
        <div
          style={{
            position: "absolute",
            left: `${dimensions.width / 2}px`,
            top: `${dimensions.height / 2}px`,
            width: `${pixelAccuracyRadius * 2}px`,
            height: `${pixelAccuracyRadius * 2}px`,
            transform: "translate(-50%, -50%)",
          }}
          className="rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 pointer-events-none animate-pulse"
        />
      )}

      {/* Draggable / Target Coordinate Pin */}
      {draggablePin && (
        (() => {
          const targetCoords = draggableCoords || mapCenter;
          const pos = getPinPixel(targetCoords.lat, targetCoords.lng);
          return (
            <div
              style={{
                position: "absolute",
                left: `${pos.left}px`,
                top: `${pos.top}px`,
                transform: "translate(-50%, -100%)",
              }}
              className="z-30 pointer-events-none flex flex-col items-center group cursor-pointer"
            >
              <div className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-amber-300 mb-1 animate-bounce">
                Drag or Click to Set Pin
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center shadow-elevated">
                <MapPin className="w-5 h-5 text-slate-950 fill-amber-300" />
              </div>
              <div className="w-2 h-2 rounded-full bg-slate-950 -mt-1" />
            </div>
          );
        })()
      )}

      {/* Business Pins */}
      {pins.map((pin) => {
        const pos = getPinPixel(pin.latitude, pin.longitude);
        const isSelected = activePin?.id === pin.id;

        // Skip pins far outside viewport
        if (
          pos.left < -50 ||
          pos.left > dimensions.width + 50 ||
          pos.top < -50 ||
          pos.top > dimensions.height + 50
        ) {
          return null;
        }

        return (
          <button
            key={pin.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePin(pin);
              onSelectPin?.(pin);
            }}
            style={{
              position: "absolute",
              left: `${pos.left}px`,
              top: `${pos.top}px`,
              transform: "translate(-50%, -100%)",
            }}
            className={`z-20 group transition-transform duration-200 cursor-pointer ${
              isSelected ? "scale-125 z-30" : "scale-100 hover:scale-115"
            }`}
          >
            <div
              className={`p-1.5 rounded-2xl flex items-center gap-1.5 shadow-lg border backdrop-blur-md transition-all ${
                isSelected
                  ? "bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-amber-500/40"
                  : pin.isVerified
                  ? "bg-emerald-600 text-white border-emerald-400"
                  : "bg-slate-800 text-slate-100 border-slate-600"
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="text-[10px] max-w-[110px] truncate hidden sm:inline">
                {pin.name}
              </span>
            </div>
          </button>
        );
      })}

      {/* Active Pin Info Card Popup */}
      {activePin && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-30 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {activePin.categoryDisplay || "Local Business"}
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                {activePin.name}
              </h4>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActivePin(null);
              }}
              className="text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ✕
            </button>
          </div>

          {activePin.nearestLandmark && (
            <div className="flex items-center gap-1 text-xs text-slate-600 mt-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{activePin.nearestLandmark}</span>
            </div>
          )}

          {activePin.priceSnippet && (
            <div className="mt-2 text-xs font-semibold text-slate-900 bg-slate-50 p-2 rounded-xl">
              {activePin.priceSnippet}
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2">
            <Link
              href={`/business/${activePin.id}`}
              className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-colors"
            >
              View Profile
            </Link>
            {showDirectionsButton && (
              <a
                href={getGoogleMapsDirectionsUrl(activePin.latitude, activePin.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                title="Open Google Maps Navigation"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Directions</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Floating Map Zoom & Recenter Controls */}
      {interactive && (
        <div className="absolute right-3 top-14 z-20 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-2xl border border-slate-700 shadow-lg">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentZoom((z) => Math.min(18, z + 1));
            }}
            className="p-2 text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-700 w-full" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentZoom((z) => Math.max(10, z - 1));
            }}
            className="p-2 text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-700 w-full" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMapCenter(center);
            }}
            className="p-2 text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Re-center"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom OSM Open Data Attribution */}
      <div className="absolute bottom-1 right-2 z-10 text-[9px] text-slate-500 pointer-events-none">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline pointer-events-auto">OpenStreetMap</a> contributors
      </div>
    </div>
  );
}
