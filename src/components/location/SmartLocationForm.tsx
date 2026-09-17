"use client";

import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Crosshair, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  Info,
  Loader2
} from "lucide-react";
import { MosaMap } from "@/components/discovery/MosaMap";
import { haversineDistance, checkNearDuplicates } from "@/lib/location-quality";
import { LocationSource, LocationVerificationStatus } from "@/types";

export interface SmartLocationFormData {
  provinceId?: string;
  province: string;
  districtId?: string;
  district: string;
  sectorId?: string;
  sector: string;
  cellId?: string;
  cell: string;
  localAreaId?: string;
  nearestLandmark: string;
  streetName?: string;
  nearbyPlace?: string;
  locationDescription: string;
  latitude: number;
  longitude: number;
  locationSource: LocationSource;
  locationAccuracy?: number;
  locationVerificationStatus: LocationVerificationStatus;
}

interface SmartLocationFormProps {
  initialValues?: Partial<SmartLocationFormData>;
  businessName?: string;
  businessCategory?: string;
  onChange: (data: SmartLocationFormData) => void;
  existingBusinesses?: Array<{ id: string; name: string; latitude: number; longitude: number; category?: string }>;
}

export function SmartLocationForm({
  initialValues,
  businessName = "",
  businessCategory,
  onChange,
  existingBusinesses = [],
}: SmartLocationFormProps) {
  // Geographic hierarchy tree from /api/geo
  const [geoTree, setGeoTree] = useState<any[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(true);

  // Form states
  const [province, setProvince] = useState(initialValues?.province || "City of Kigali");
  const [provinceId, setProvinceId] = useState(initialValues?.provinceId || "");
  const [district, setDistrict] = useState(initialValues?.district || "Gasabo");
  const [districtId, setDistrictId] = useState(initialValues?.districtId || "");
  const [sector, setSector] = useState(initialValues?.sector || "Kacyiru");
  const [sectorId, setSectorId] = useState(initialValues?.sectorId || "");
  const [cell, setCell] = useState(initialValues?.cell || "Kamutwa");
  const [cellId, setCellId] = useState(initialValues?.cellId || "");
  const [localAreaId, setLocalAreaId] = useState(initialValues?.localAreaId || "");

  // Structured human reference points
  const [nearestLandmark, setNearestLandmark] = useState(initialValues?.nearestLandmark || "");
  const [streetName, setStreetName] = useState(initialValues?.streetName || "");
  const [nearbyPlace, setNearbyPlace] = useState(initialValues?.nearbyPlace || "");
  const [locationDescription, setLocationDescription] = useState(initialValues?.locationDescription || "");

  // Machine coordinates & verification metadata
  const [latitude, setLatitude] = useState<number>(initialValues?.latitude ?? -1.942);
  const [longitude, setLongitude] = useState<number>(initialValues?.longitude ?? 30.088);
  const [locationSource, setLocationSource] = useState<LocationSource>(initialValues?.locationSource || "ADMIN_MANUAL");
  const [locationAccuracy, setLocationAccuracy] = useState<number | undefined>(initialValues?.locationAccuracy);
  const [locationVerificationStatus, setLocationVerificationStatus] = useState<LocationVerificationStatus>(
    initialValues?.locationVerificationStatus || "UNVERIFIED"
  );

  // GPS acquisition states
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Fetch geographic hierarchy on mount
  useEffect(() => {
    fetch("/api/geo?level=tree")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.provinces)) {
          setGeoTree(data.provinces);
          // Auto-select initial province/district/sector IDs if missing
          const kigali = data.provinces.find((p: any) => p.name.includes("Kigali") || p.code === "KIGALI");
          if (kigali && !provinceId) {
            setProvinceId(kigali.id);
            setProvince(kigali.name);
            const gasabo = kigali.districts.find((d: any) => d.name === "Gasabo") || kigali.districts[0];
            if (gasabo) {
              setDistrictId(gasabo.id);
              setDistrict(gasabo.name);
              const kacyiru = gasabo.sectors.find((s: any) => s.name === "Kacyiru") || gasabo.sectors[0];
              if (kacyiru) {
                setSectorId(kacyiru.id);
                setSector(kacyiru.name);
                const kamutwa = kacyiru.cells.find((c: any) => c.name === "Kamutwa") || kacyiru.cells[0];
                if (kamutwa) {
                  setCellId(kamutwa.id);
                  setCell(kamutwa.name);
                }
              }
            }
          }
        }
      })
      .catch((err) => console.warn("[SmartLocationForm] Geo load error:", err))
      .finally(() => setLoadingGeo(false));
  }, []);

  // Compute available districts for selected province
  const currentProvinceObj = geoTree.find((p) => p.id === provinceId || p.name === province);
  const availableDistricts = currentProvinceObj?.districts || [];

  // Compute available sectors for selected district
  const currentDistrictObj = availableDistricts.find((d: any) => d.id === districtId || d.name === district);
  const availableSectors = currentDistrictObj?.sectors || [];

  // Compute available cells for selected sector
  const currentSectorObj = availableSectors.find((s: any) => s.id === sectorId || s.name === sector);
  const availableCells = currentSectorObj?.cells || [];

  // Compute available local areas for selected cell/sector
  const currentCellObj = availableCells.find((c: any) => c.id === cellId || c.name === cell);
  const availableLocalAreas = currentCellObj?.localAreas || [];

  // Cascade handlers
  const handleProvinceChange = (pId: string) => {
    setProvinceId(pId);
    const p = geoTree.find((item) => item.id === pId);
    if (p) {
      setProvince(p.name);
      const firstDist = p.districts[0];
      if (firstDist) {
        setDistrictId(firstDist.id);
        setDistrict(firstDist.name);
        const firstSec = firstDist.sectors[0];
        if (firstSec) {
          setSectorId(firstSec.id);
          setSector(firstSec.name);
          const firstCell = firstSec.cells[0];
          if (firstCell) {
            setCellId(firstCell.id);
            setCell(firstCell.name);
          }
        }
      }
    }
  };

  const handleDistrictChange = (dId: string) => {
    setDistrictId(dId);
    const d = availableDistricts.find((item: any) => item.id === dId);
    if (d) {
      setDistrict(d.name);
      const firstSec = d.sectors[0];
      if (firstSec) {
        setSectorId(firstSec.id);
        setSector(firstSec.name);
        const firstCell = firstSec.cells[0];
        if (firstCell) {
          setCellId(firstCell.id);
          setCell(firstCell.name);
        }
      }
    }
  };

  const handleSectorChange = (sId: string) => {
    setSectorId(sId);
    const s = availableSectors.find((item: any) => item.id === sId);
    if (s) {
      setSector(s.name);
      // Update coordinates to sector center if manual
      if (locationSource === "ADMIN_MANUAL" && s.latitude && s.longitude) {
        setLatitude(s.latitude);
        setLongitude(s.longitude);
      }
      const firstCell = s.cells[0];
      if (firstCell) {
        setCellId(firstCell.id);
        setCell(firstCell.name);
      }
    }
  };

  const handleCellChange = (cId: string) => {
    setCellId(cId);
    const c = availableCells.find((item: any) => item.id === cId);
    if (c) {
      setCell(c.name);
      if (locationSource === "ADMIN_MANUAL" && c.latitude && c.longitude) {
        setLatitude(c.latitude);
        setLongitude(c.longitude);
      }
    }
  };

  // GPS Location Capture via Browser Geolocation API
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Please enter landmark manually.");
      return;
    }

    setIsCapturingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        setLatitude(Number(lat.toFixed(6)));
        setLongitude(Number(lng.toFixed(6)));
        setLocationAccuracy(Math.round(accuracy));
        setLocationSource("GPS_DEVICE");
        setLocationVerificationStatus("AGENT_CAPTURED");
        setIsCapturingGps(false);
      },
      (error) => {
        setIsCapturingGps(false);
        let msg = "Unable to retrieve GPS coordinates.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "GPS permission denied. Please enable location permissions or adjust the pin manually on the map.";
        } else if (error.code === error.TIMEOUT) {
          msg = "GPS acquisition timed out. Please try again or place pin on map.";
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // Interactive Map Pin Adjustment
  const handleMapPinAdjust = (coords: { lat: number; lng: number }) => {
    setLatitude(Number(coords.lat.toFixed(6)));
    setLongitude(Number(coords.lng.toFixed(6)));
    setLocationSource("AGENT_PIN");
    if (locationVerificationStatus === "UNVERIFIED") {
      setLocationVerificationStatus("AGENT_CAPTURED");
    }
  };

  // Check near duplicates whenever coordinates or businessName changes
  useEffect(() => {
    if (businessName && existingBusinesses.length > 0) {
      const dup = checkNearDuplicates(
        { lat: latitude, lng: longitude, name: businessName, category: businessCategory },
        existingBusinesses,
        25
      );
      if (dup.isNearDuplicate && dup.matchedBusiness) {
        setDuplicateWarning(
          `Warning: "${dup.matchedBusiness.name}" is already registered within ${dup.distanceMeters}m of these coordinates.`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [latitude, longitude, businessName, businessCategory, existingBusinesses]);

  // Propagate changes upward to parent form
  useEffect(() => {
    onChange({
      provinceId: provinceId || undefined,
      province,
      districtId: districtId || undefined,
      district,
      sectorId: sectorId || undefined,
      sector,
      cellId: cellId || undefined,
      cell,
      localAreaId: localAreaId || undefined,
      nearestLandmark,
      streetName: streetName || undefined,
      nearbyPlace: nearbyPlace || undefined,
      locationDescription,
      latitude,
      longitude,
      locationSource,
      locationAccuracy,
      locationVerificationStatus,
    });
  }, [
    provinceId, province, districtId, district, sectorId, sector, cellId, cell,
    localAreaId, nearestLandmark, streetName, nearbyPlace, locationDescription,
    latitude, longitude, locationSource, locationAccuracy, locationVerificationStatus
  ]);

  return (
    <div className="space-y-4 text-xs">
      
      {/* 1. Administrative Hierarchy Cascade */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-600" />
            <span>Rwanda Administrative Hierarchy</span>
          </span>
          <span className="text-[10px] text-slate-400">Dynamic Filter</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Province */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">Province</label>
            <select
              value={provinceId}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="w-full p-2 rounded-xl bg-white border border-slate-300 font-medium outline-none"
            >
              {geoTree.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">District</label>
            <select
              value={districtId}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full p-2 rounded-xl bg-white border border-slate-300 font-medium outline-none"
            >
              {availableDistricts.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Sector */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">Sector</label>
            <select
              value={sectorId}
              onChange={(e) => handleSectorChange(e.target.value)}
              className="w-full p-2 rounded-xl bg-white border border-slate-300 font-medium outline-none"
            >
              {availableSectors.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Cell */}
          <div>
            <label className="block text-slate-600 font-bold mb-1">Cell</label>
            <select
              value={cellId}
              onChange={(e) => handleCellChange(e.target.value)}
              className="w-full p-2 rounded-xl bg-white border border-slate-300 font-medium outline-none"
            >
              {availableCells.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Structured Human Reference Points */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>Human Ground References (How Customers Find It)</span>
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Nearest Landmark <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nearestLandmark}
              onChange={(e) => setNearestLandmark(e.target.value)}
              placeholder="e.g. MINAGRI Main Gate, Cosmos Junction, Green Mosque"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Street / Road Name <span className="text-slate-400 font-normal">(Optional if unavailable)</span>
            </label>
            <input
              type="text"
              value={streetName}
              onChange={(e) => setStreetName(e.target.value)}
              placeholder="e.g. KG 569 St, KN 123 St"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Nearby Place / Building</label>
            <input
              type="text"
              value={nearbyPlace}
              onChange={(e) => setNearbyPlace(e.target.value)}
              placeholder="e.g. Opposite Bank of Kigali branch"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Local Area / Corridor</label>
            {availableLocalAreas.length > 0 ? (
              <select
                value={localAreaId}
                onChange={(e) => setLocalAreaId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="">Select recognized local area...</option>
                {availableLocalAreas.map((la: any) => (
                  <option key={la.id} value={la.id}>{la.name} ({la.type})</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={cell}
                disabled
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-bold mb-1">
            Human Location Description <span className="text-slate-400 font-normal">(Crucial for micro-discovery)</span>
          </label>
          <textarea
            value={locationDescription}
            onChange={(e) => setLocationDescription(e.target.value)}
            rows={2}
            placeholder="e.g. Opposite the yellow MTN kiosk, 2nd shop after the pharmacy on the left side."
            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white leading-relaxed"
          />
        </div>
      </div>

      {/* 3. Machine Coordinates & GPS Capture */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="font-bold flex items-center gap-1.5 text-sm">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span>Exact Machine Coordinates (MOSA Single Source of Truth)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Never fabricated. Captured via device GPS or adjusted on interactive satellite map.
            </p>
          </div>

          {/* GPS Capture Button */}
          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={isCapturingGps}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer shrink-0"
          >
            {isCapturingGps ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Acquiring GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-3.5 h-3.5" />
                <span>Capture Current Location</span>
              </>
            )}
          </button>
        </div>

        {/* GPS Capture Status Feedback */}
        {locationAccuracy ? (
          <div className="bg-emerald-950/80 border border-emerald-500/40 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>GPS Captured Successfully</span>
            </span>
            <span className="font-mono text-[11px] bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
              Accuracy: ±{locationAccuracy} meters ({locationSource})
            </span>
          </div>
        ) : null}

        {gpsError && (
          <div className="bg-amber-950/80 border border-amber-500/40 p-2.5 rounded-xl flex items-start gap-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">GPS Fallback Active</div>
              <div className="text-[11px] text-amber-200/80">{gpsError}</div>
            </div>
          </div>
        )}

        {/* Coordinates Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => {
                setLatitude(parseFloat(e.target.value) || 0);
                setLocationSource("ADMIN_MANUAL");
              }}
              className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => {
                setLongitude(parseFloat(e.target.value) || 0);
                setLocationSource("ADMIN_MANUAL");
              }}
              className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="text-slate-400 block mb-1">Status / Source</label>
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-bold truncate">
              {locationVerificationStatus} ({locationSource})
            </div>
          </div>
        </div>

        {/* Near Duplicate Alert */}
        {duplicateWarning && (
          <div className="bg-red-950/80 border border-red-500/40 p-2.5 rounded-xl flex items-start gap-2 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {/* Interactive Map Preview with Pin Adjustment */}
        <div>
          <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-400">
            <span>Drag pin or click map to refine coordinates</span>
            <span>Rwanda Coordinates</span>
          </div>
          <MosaMap
            center={{ lat: latitude, lng: longitude }}
            draggablePin={true}
            draggableCoords={{ lat: latitude, lng: longitude }}
            onCoordinateChange={handleMapPinAdjust}
            accuracyRadiusMeters={locationAccuracy}
            heightClassName="h-56"
            showDirectionsButton={false}
          />
        </div>
      </div>

    </div>
  );
}
