"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CommunityOption {
  id: string;
  name: string;
  nameRw?: string;
  sector: string;
  district: string;
  province: string;
  cell?: string;
  localArea?: string;
  isLandmark?: boolean;
  businessCount?: number;
}

export const DEFAULT_COMMUNITIES: CommunityOption[] = [
  {
    id: "kacyiru-minagri",
    name: "MINAGRI Area (KG 569 St), Kacyiru",
    nameRw: "Ahegereye MINAGRI (KG 569 St), Kacyiru",
    sector: "Kacyiru",
    cell: "Kamutwa",
    localArea: "MINAGRI Area (KG 569 St)",
    district: "Gasabo",
    province: "Kigali City",
    isLandmark: true,
    businessCount: 8,
  },
  {
    id: "kacyiru-kamutwa",
    name: "Kamutwa, Kacyiru",
    nameRw: "Kamutwa, Kacyiru",
    sector: "Kacyiru",
    cell: "Kamutwa",
    district: "Gasabo",
    province: "Kigali City",
    businessCount: 6,
  },
  {
    id: "kacyiru-kibaza",
    name: "Kibaza, Kacyiru",
    nameRw: "Kibaza, Kacyiru",
    sector: "Kacyiru",
    cell: "Kibaza",
    district: "Gasabo",
    province: "Kigali City",
    businessCount: 5,
  },
  {
    id: "kacyiru-kamatamu",
    name: "Kamatamu, Kacyiru",
    nameRw: "Kamatamu, Kacyiru",
    sector: "Kacyiru",
    cell: "Kamatamu",
    district: "Gasabo",
    province: "Kigali City",
    businessCount: 4,
  },
  {
    id: "nyamirambo-biryogo",
    name: "Biryogo Car-Free Zone, Nyamirambo",
    nameRw: "Biryogo Car-Free Zone, Nyamirambo",
    sector: "Nyamirambo",
    cell: "Biryogo",
    localArea: "Car-Free Zone",
    district: "Nyarugenge",
    province: "Kigali City",
    isLandmark: true,
    businessCount: 24,
  },
  {
    id: "nyamirambo-cosmos",
    name: "Cosmos & Commercial Center, Nyamirambo",
    nameRw: "Cosmos, Nyamirambo",
    sector: "Nyamirambo",
    cell: "Biryogo",
    localArea: "Cosmos",
    district: "Nyarugenge",
    province: "Kigali City",
    businessCount: 18,
  },
  {
    id: "nyamirambo-tapi-rouge",
    name: "Tapi Rouge & Maison des Jeunes, Nyamirambo",
    nameRw: "Tapi Rouge, Nyamirambo",
    sector: "Nyamirambo",
    cell: "Rwezamenyo",
    localArea: "Tapi Rouge",
    district: "Nyarugenge",
    province: "Kigali City",
    businessCount: 14,
  },
  {
    id: "musanze-muhoza",
    name: "Musanze Town Center, Muhoza",
    nameRw: "Isoko rya Musanze, Muhoza",
    sector: "Muhoza",
    cell: "Ruhengeri",
    district: "Musanze",
    province: "Northern Province",
    businessCount: 5,
  },
  {
    id: "huye-ngoma",
    name: "Huye University Belt, Ngoma",
    nameRw: "Ahegereye Kaminuza, Ngoma",
    sector: "Ngoma",
    cell: "Matyazo",
    district: "Huye",
    province: "Southern Province",
    businessCount: 4,
  },
  {
    id: "rubavu-gisenyi",
    name: "Gisenyi Border & Lake Market, Rubavu",
    nameRw: "Isoko rya Gisenyi ku Mupaka, Rubavu",
    sector: "Gisenyi",
    cell: "Kivumu",
    district: "Rubavu",
    province: "Western Province",
    businessCount: 6,
  },
  {
    id: "rwamagana-kigabiro",
    name: "Rwamagana Bus Park & Market",
    nameRw: "Gari ya Rwamagana n'Isoko",
    sector: "Kigabiro",
    cell: "Sibagire",
    district: "Rwamagana",
    province: "Eastern Province",
    businessCount: 4,
  },
  {
    id: "bugesera-nyamata",
    name: "Nyamata Town Center, Bugesera",
    nameRw: "Umujyi wa Nyamata",
    sector: "Nyamata",
    cell: "Nyamata Ville",
    district: "Bugesera",
    province: "Eastern Province",
    businessCount: 5,
  },
  {
    id: "muhanga-nyamabuye",
    name: "Muhanga Commercial Crossroads",
    nameRw: "Hagati mu Mujyi wa Muhanga",
    sector: "Nyamabuye",
    cell: "Gitarama",
    district: "Muhanga",
    province: "Southern Province",
    businessCount: 5,
  },
  {
    id: "rusizi-kamembe",
    name: "Kamembe Port & Market, Rusizi",
    nameRw: "Icyambu n'Isoko rya Kamembe",
    sector: "Kamembe",
    cell: "Kamembe",
    district: "Rusizi",
    province: "Western Province",
    businessCount: 4,
  },
  {
    id: "kimironko-market",
    name: "Kimironko Grand Market, Gasabo",
    nameRw: "Isoko rya Kimironko",
    sector: "Kimironko",
    cell: "Bibare",
    district: "Gasabo",
    province: "Kigali City",
    businessCount: 7,
  },
];

interface LocationState {
  currentSector: string;
  currentCell: string | null;
  currentLocalArea: string | null;
  currentDistrict: string;
  currentProvince: string;
  isSelectorOpen: boolean;
  displayLabel: string;
  setSector: (sector: string, district?: string, province?: string) => void;
  setCell: (cell: string | null) => void;
  setLocalArea: (localArea: string | null) => void;
  setFullLocation: (options: {
    sector: string;
    district?: string;
    province?: string;
    cell?: string | null;
    localArea?: string | null;
  }) => void;
  resetLocation: () => void;
  openSelector: () => void;
  closeSelector: () => void;
}

const LocationContext = createContext<LocationState | undefined>(undefined);

const STORAGE_KEY = "mosa_user_community";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  // Default to Kacyiru (Gasabo District, Kigali City)
  const [currentSector, setCurrentSector] = useState<string>("Kacyiru");
  const [currentCell, setCurrentCell] = useState<string | null>(null);
  const [currentLocalArea, setCurrentLocalArea] = useState<string | null>(null);
  const [currentDistrict, setCurrentDistrict] = useState<string>("Gasabo");
  const [currentProvince, setCurrentProvince] = useState<string>("Kigali City");
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  // Initialize from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sector) setCurrentSector(parsed.sector);
        if (parsed.cell !== undefined) setCurrentCell(parsed.cell);
        if (parsed.localArea !== undefined) setCurrentLocalArea(parsed.localArea);
        if (parsed.district) setCurrentDistrict(parsed.district);
        if (parsed.province) setCurrentProvince(parsed.province);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const persist = (data: {
    sector: string;
    cell: string | null;
    localArea: string | null;
    district: string;
    province: string;
  }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  };

  const setSector = (sector: string, district?: string, province?: string) => {
    const d = district || (sector === "Kacyiru" ? "Gasabo" : sector === "Nyamirambo" ? "Nyarugenge" : currentDistrict);
    const p = province || (d === "Gasabo" || d === "Nyarugenge" ? "Kigali City" : currentProvince);
    setCurrentSector(sector);
    setCurrentCell(null);
    setCurrentLocalArea(null);
    setCurrentDistrict(d);
    setCurrentProvince(p);
    persist({ sector, cell: null, localArea: null, district: d, province: p });
  };

  const setCell = (cell: string | null) => {
    setCurrentCell(cell);
    persist({ sector: currentSector, cell, localArea: currentLocalArea, district: currentDistrict, province: currentProvince });
  };

  const setLocalArea = (localArea: string | null) => {
    setCurrentLocalArea(localArea);
    persist({ sector: currentSector, cell: currentCell, localArea, district: currentDistrict, province: currentProvince });
  };

  const setFullLocation = (options: {
    sector: string;
    district?: string;
    province?: string;
    cell?: string | null;
    localArea?: string | null;
  }) => {
    const d = options.district || (options.sector === "Kacyiru" ? "Gasabo" : options.sector === "Nyamirambo" ? "Nyarugenge" : currentDistrict);
    const p = options.province || (d === "Gasabo" || d === "Nyarugenge" ? "Kigali City" : currentProvince);
    setCurrentSector(options.sector);
    setCurrentDistrict(d);
    setCurrentProvince(p);
    setCurrentCell(options.cell || null);
    setCurrentLocalArea(options.localArea || null);
    persist({
      sector: options.sector,
      cell: options.cell || null,
      localArea: options.localArea || null,
      district: d,
      province: p,
    });
  };

  const resetLocation = () => {
    setCurrentSector("all");
    setCurrentCell(null);
    setCurrentLocalArea(null);
    setCurrentDistrict("Rwanda");
    setCurrentProvince("Rwanda");
    persist({ sector: "all", cell: null, localArea: null, district: "Rwanda", province: "Rwanda" });
  };

  // Build human friendly display label
  let displayLabel = "Rwanda";
  if (currentLocalArea) {
    displayLabel = `${currentLocalArea}, ${currentSector}`;
  } else if (currentCell) {
    displayLabel = `${currentCell}, ${currentSector}`;
  } else if (currentSector && currentSector !== "all") {
    displayLabel = `${currentSector}, ${currentDistrict}`;
  }

  return (
    <LocationContext.Provider
      value={{
        currentSector,
        currentCell,
        currentLocalArea,
        currentDistrict,
        currentProvince,
        isSelectorOpen,
        displayLabel,
        setSector,
        setCell,
        setLocalArea,
        setFullLocation,
        resetLocation,
        openSelector: () => setIsSelectorOpen(true),
        closeSelector: () => setIsSelectorOpen(false),
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
