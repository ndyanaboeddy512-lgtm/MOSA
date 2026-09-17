"use client";

import React from "react";
import { 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  ShieldCheck, 
  Compass, 
  ExternalLink,
  Info
} from "lucide-react";
import { Business } from "@/types";
import { MosaMap } from "@/components/discovery/MosaMap";
import { getGoogleMapsDirectionsUrl } from "@/lib/location-quality";

interface LocationCardProps {
  business: Business;
  lang?: "en" | "rw" | "fr" | "sw";
}

export function LocationCard({ business, lang = "en" }: LocationCardProps) {
  const loc = business.location;
  const lat = loc?.coordinates?.lat ?? business.latitude;
  const lng = loc?.coordinates?.lng ?? business.longitude;

  // Extract human location context
  const landmark = business.nearestLandmark || loc?.nearestLandmark || business.localArea?.landmark || (business.localArea?.type === "LANDMARK" ? business.localArea?.name : undefined);
  const street = business.streetName || loc?.streetName;
  const nearby = business.nearbyPlace || loc?.nearbyPlace;
  const description = business.locationDescription || loc?.locationDescription || business.addressNote || loc?.addressNote;

  // Verification metadata
  const isGpsVerified = Boolean(
    business.locationSource === "GPS_DEVICE" ||
    business.locationSource === "AGENT_PIN" ||
    business.locationAccuracy ||
    business.verificationStatus === "AGENT_VERIFIED"
  );
  const accuracyMeters = business.locationAccuracy || loc?.accuracy;
  const verificationLabel = 
    business.locationVerificationStatus === "AGENT_CAPTURED" ? "Agent GPS Captured" :
    business.locationVerificationStatus === "AGENT_VERIFIED" ? "Agent On-Site Verified" :
    business.locationVerificationStatus === "BUSINESS_CONFIRMED" ? "Business Owner Confirmed" :
    business.locationVerificationStatus === "COMMUNITY_VERIFIED" ? "Community Verified" : "Location Unverified";

  // Breadcrumb path
  const hierarchyPath = [
    loc?.province || "Kigali City",
    loc?.district || "Gasabo",
    loc?.sector || "Kacyiru",
    loc?.cell || "Kamutwa",
    business.localArea?.name,
  ].filter(Boolean);

  const directionsUrl = getGoogleMapsDirectionsUrl(lat, lng);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <MapPin className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-slate-900 text-lg">
              {lang === "rw" ? "Aho Ikorera n'Ibyerekezo" : "Location & Directions"}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === "rw"
              ? "MOSA itanga ibyerekezo by'ukuri byemejwe n'abakozi bacu ku butaka, byoroshya kubona ubu bucuruzi."
              : "Authoritative ground coordinates and landmarks verified by MOSA Community Agents."}
          </p>
        </div>

        {/* Directions CTA Button */}
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>{lang === "rw" ? "Guhabwa Ibyerekezo (Directions)" : "Get Directions"}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      <div className="p-6 space-y-5">
        {/* Administrative Hierarchy Breadcrumbs */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          {hierarchyPath.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-300">/</span>}
              <span className={idx === hierarchyPath.length - 1 ? "font-bold text-slate-800" : ""}>
                {item}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Prominent Landmark Highlight */}
        {landmark && (
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
            <span className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0">
              <MapPin className="w-4 h-4" />
            </span>
            <div>
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                {lang === "rw" ? "Ahantu Hazwi Cyane Hafi Yaho (Landmark)" : "Nearest Landmark"}
              </div>
              <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                {landmark}
              </div>
              {street && (
                <div className="text-xs text-slate-600 mt-0.5">
                  Road / Street: <strong className="text-slate-800">{street}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Human Location Description ("How to find us") */}
        {description && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === "rw" ? "Uko Ugera Kuri Ubu Bucuruzi" : "How to Find Us"}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              "{description}"
            </p>
            {nearby && (
              <div className="text-[11px] text-slate-500 pt-1">
                Nearby reference: <strong>{nearby}</strong>
              </div>
            )}
          </div>
        )}

        {/* Location Verification Status Badge & Coordinate Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-emerald-900">{verificationLabel}</span>
            {accuracyMeters && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                GPS ±{accuracyMeters}m
              </span>
            )}
          </div>

          <div className="font-mono text-[11px] text-slate-500">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        </div>

        {/* Interactive MOSA Map */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold">{lang === "rw" ? "Ikarita yo ku Butaka" : "Interactive Ground Map"}</span>
            <span className="text-[11px]">Rwanda Mercator Projection</span>
          </div>
          <MosaMap
            center={{ lat, lng }}
            zoom={16}
            pins={[
              {
                id: business.id,
                name: lang === "rw" && business.nameRw ? business.nameRw : business.name,
                categoryDisplay: business.categoryDisplay,
                latitude: lat,
                longitude: lng,
                nearestLandmark: landmark,
                isVerified: isGpsVerified,
              },
            ]}
            selectedPinId={business.id}
            accuracyRadiusMeters={accuracyMeters}
            heightClassName="h-64 sm:h-72"
            showDirectionsButton={true}
          />
        </div>
      </div>
    </div>
  );
}
