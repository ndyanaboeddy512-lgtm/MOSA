"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { useLocation, DEFAULT_COMMUNITIES, CommunityOption } from "@/lib/location-context";
import { MapPin, X, Globe, Check, Search, ChevronRight, Building, Sparkles } from "lucide-react";

interface GeoSectorItem {
  id: string;
  name: string;
  nameRw: string;
  district: {
    name: string;
    nameRw: string;
    province: {
      name: string;
      nameRw: string;
    };
  };
  cells: {
    id: string;
    name: string;
    nameRw: string;
    localAreas: {
      id: string;
      name: string;
      nameRw: string;
      type: string;
      addressNote: string | null;
    }[];
    _count?: { businesses: number };
  }[];
  _count?: { businesses: number; agents: number };
}

export function LocationSelectorModal() {
  const { lang } = useLanguage();
  const {
    currentSector,
    currentCell,
    currentLocalArea,
    setFullLocation,
    resetLocation,
    isSelectorOpen,
    closeSelector,
  } = useLocation();

  const [activeTab, setActiveTab] = useState<"quick" | "hierarchy">("quick");
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorsData, setSectorsData] = useState<GeoSectorItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Hierarchy drill-down state
  const [selectedHierarchySector, setSelectedHierarchySector] = useState<GeoSectorItem | null>(null);
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string>("all");

  useEffect(() => {
    if (!isSelectorOpen) return;

    // Fetch sectors and cells from the real database API
    setLoading(true);
    fetch("/api/geo?level=sectors")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.sectors) {
          setSectorsData(data.sectors);
          // Preselect current sector in hierarchy if matched
          const matched = data.sectors.find((s: GeoSectorItem) => s.name.toLowerCase() === currentSector.toLowerCase());
          if (matched) {
            setSelectedHierarchySector(matched);
          } else if (data.sectors.length > 0) {
            setSelectedHierarchySector(data.sectors[0]);
          }
        }
      })
      .catch((err) => console.warn("[LocationModal] Geo fetch fallback:", err))
      .finally(() => setLoading(false));
  }, [isSelectorOpen, currentSector]);

  if (!isSelectorOpen) return null;

  const filteredCommunities = DEFAULT_COMMUNITIES.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      (c.cell && c.cell.toLowerCase().includes(q)) ||
      (c.localArea && c.localArea.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">
                {lang === "rw" ? "Hitamo Agace k'Ubucuruzi" : "Select Community & Discovery Area"}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === "rw"
                  ? "Reba amaduka, serivisi n'ibiciro byo mu gace kawe"
                  : "Discover verified neighborhood enterprises, services & real ground prices"}
              </p>
            </div>
          </div>
          <button
            onClick={closeSelector}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("quick")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "quick"
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{lang === "rw" ? "Utuce Tugezweho (Kacyiru & Nyamirambo)" : "Popular Hubs & Landmarks"}</span>
          </button>
          <button
            onClick={() => setActiveTab("hierarchy")}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "hierarchy"
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Building className="w-4 h-4 text-slate-600" />
            <span>{lang === "rw" ? "U Rwanda Yose (Hierarchy)" : "All Rwanda Hierarchy"}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === "rw"
                  ? "Shakisha Kacyiru, MINAGRI, Kamutwa, Biryogo, Musanze..."
                  : "Search Kacyiru, MINAGRI, Kamutwa, Biryogo, Musanze, Huye..."
              }
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 focus:bg-white rounded-xl border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all text-slate-900 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === "quick" ? (
            <div className="space-y-4">
              {/* Nationwide discovery shortcut */}
              <button
                onClick={() => {
                  resetLocation();
                  closeSelector();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  currentSector === "all"
                    ? "border-emerald-500 bg-emerald-50/70 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {lang === "rw" ? "U Rwanda Rwose (Ahantu Hose)" : "All Rwanda (Nationwide Coverage)"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {lang === "rw" ? "Shakisha amaduka mu gihugu cyose" : "Discover across all 5 provinces & 30 districts"}
                    </div>
                  </div>
                </div>
                {currentSector === "all" && (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              {/* Kacyiru Section Header */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                    Kacyiru Sector (Gasabo) — Active Expansion Hub
                  </span>
                  <span className="text-[11px] text-slate-700 font-semibold">MINAGRI KG 569 St · Kamutwa · Kibaza · Kamatamu</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredCommunities
                    .filter((c) => c.sector === "Kacyiru")
                    .map((comm) => {
                      const isSelected =
                        currentSector === "Kacyiru" &&
                        ((comm.localArea && currentLocalArea === comm.localArea) ||
                          (!comm.localArea && currentCell === comm.cell && !currentLocalArea));

                      return (
                        <button
                          key={comm.id}
                          onClick={() => {
                            setFullLocation({
                              sector: comm.sector,
                              district: comm.district,
                              province: comm.province,
                              cell: comm.cell,
                              localArea: comm.localArea,
                            });
                            closeSelector();
                          }}
                          className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                              {comm.isLandmark && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                  Landmark
                                </span>
                              )}
                              <span>{comm.name}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Cell: <strong className="text-slate-700">{comm.cell}</strong> · Gasabo District
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Nyamirambo Section Header */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    Nyamirambo Sector (Nyarugenge)
                  </span>
                  <span className="text-[11px] text-slate-700 font-semibold">Biryogo · Cosmos · Tapi Rouge · Mumena</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredCommunities
                    .filter((c) => c.sector === "Nyamirambo")
                    .map((comm) => {
                      const isSelected =
                        currentSector === "Nyamirambo" &&
                        ((comm.localArea && currentLocalArea === comm.localArea) ||
                          (!comm.localArea && currentCell === comm.cell && !currentLocalArea));

                      return (
                        <button
                          key={comm.id}
                          onClick={() => {
                            setFullLocation({
                              sector: comm.sector,
                              district: comm.district,
                              province: comm.province,
                              cell: comm.cell,
                              localArea: comm.localArea,
                            });
                            closeSelector();
                          }}
                          className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm">
                              {comm.isLandmark && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                  Commercial
                                </span>
                              )}
                              <span>{comm.name}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Cell: <strong className="text-slate-700">{comm.cell}</strong> · Nyarugenge
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Provincial Hubs */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-md">
                    Provincial Discovery Hubs
                  </span>
                  <span className="text-[11px] text-slate-700 font-semibold">Musanze · Huye · Rubavu</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {filteredCommunities
                    .filter((c) => c.sector !== "Kacyiru" && c.sector !== "Nyamirambo")
                    .map((comm) => {
                      const isSelected = currentSector.toLowerCase() === comm.sector.toLowerCase();

                      return (
                        <button
                          key={comm.id}
                          onClick={() => {
                            setFullLocation({
                              sector: comm.sector,
                              district: comm.district,
                              province: comm.province,
                              cell: comm.cell,
                              localArea: comm.localArea,
                            });
                            closeSelector();
                          }}
                          className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{comm.sector}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {comm.district} · {comm.province.split(" ")[0]}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            /* All Rwanda Hierarchy Tree Explorer */
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Explore Rwanda&apos;s administrative hierarchy: <strong>Country &rarr; Province &rarr; District &rarr; Sector &rarr; Cell &rarr; Local Area / Landmark</strong>.
              </p>

              {/* Province Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: "all", label: "All Provinces" },
                  { id: "kigali", label: "Kigali" },
                  { id: "north", label: "Northern" },
                  { id: "south", label: "Southern" },
                  { id: "east", label: "Eastern" },
                  { id: "west", label: "Western" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvinceFilter(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedProvinceFilter === p.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                  Loading geographic hierarchy from database...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Sector List */}
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 max-h-80 overflow-y-auto space-y-1.5">
                    <div className="text-xs font-bold text-slate-500 uppercase px-2 pb-1">
                      Available Sectors ({sectorsData.filter((s) => {
                        if (selectedProvinceFilter === "all") return true;
                        return (s.district?.province?.name || "").toLowerCase().includes(selectedProvinceFilter);
                      }).length})
                    </div>
                    {sectorsData
                      .filter((s) => {
                        if (selectedProvinceFilter === "all") return true;
                        return (s.district?.province?.name || "").toLowerCase().includes(selectedProvinceFilter);
                      })
                      .map((sec) => {
                        const isChosen = selectedHierarchySector?.id === sec.id;
                        return (
                          <button
                            key={sec.id}
                            onClick={() => setSelectedHierarchySector(sec)}
                            className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                              isChosen
                                ? "bg-white shadow-xs border border-emerald-500 text-emerald-950 font-bold"
                                : "hover:bg-white text-slate-700"
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-sm text-slate-900">{sec.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {sec.district.name}, {sec.district.province.name}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full">
                                {sec.cells.length} cells
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </button>
                        );
                      })}
                  </div>

                  {/* Right Column: Cells and Local Areas for Selected Sector */}
                  <div className="border border-slate-200 rounded-2xl p-3 bg-white max-h-80 overflow-y-auto">
                    {selectedHierarchySector ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {selectedHierarchySector.name} Sector
                            </h4>
                            <span className="text-xs text-slate-500">
                              {selectedHierarchySector.district.name} District
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setFullLocation({
                                sector: selectedHierarchySector.name,
                                district: selectedHierarchySector.district.name,
                                province: selectedHierarchySector.district.province.name,
                                cell: null,
                                localArea: null,
                              });
                              closeSelector();
                            }}
                            className="text-xs font-semibold px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Select Entire Sector
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase">
                            Cells & Local Areas
                          </div>
                          {selectedHierarchySector.cells.map((cell) => (
                            <div
                              key={cell.id}
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 transition-colors space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-slate-900">
                                  Cell: {cell.name}
                                </span>
                                <button
                                  onClick={() => {
                                    setFullLocation({
                                      sector: selectedHierarchySector.name,
                                      district: selectedHierarchySector.district.name,
                                      province: selectedHierarchySector.district.province.name,
                                      cell: cell.name,
                                      localArea: null,
                                    });
                                    closeSelector();
                                  }}
                                  className="text-[11px] font-medium text-emerald-700 hover:underline"
                                >
                                  Select Cell
                                </button>
                              </div>

                              {cell.localAreas && cell.localAreas.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {cell.localAreas.map((la) => (
                                    <button
                                      key={la.id}
                                      onClick={() => {
                                        setFullLocation({
                                          sector: selectedHierarchySector.name,
                                          district: selectedHierarchySector.district.name,
                                          province: selectedHierarchySector.district.province.name,
                                          cell: cell.name,
                                          localArea: la.name,
                                        });
                                        closeSelector();
                                      }}
                                      className="text-[11px] px-2 py-0.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-md text-slate-700 flex items-center gap-1 transition-all"
                                    >
                                      <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>{la.name}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        Select a sector on the left to view cells & landmarks
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
            <span>
              Currently viewing: <strong className="text-slate-900">{currentLocalArea || currentCell || currentSector}</strong>
            </span>
          </div>
          <button
            onClick={closeSelector}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors"
          >
            {lang === "rw" ? "Funga" : "Done"}
          </button>
        </div>

      </div>
    </div>
  );
}
