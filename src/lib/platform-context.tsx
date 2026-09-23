"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface PlatformSocialLinks {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
}

export interface PlatformBrandAssets {
  secondaryLogoUrl?: string;
  brandColor?: string;
}

export interface PlatformSettingsData {
  id: string;
  platformName: string;
  platformNameRw: string;
  tagline: string;
  taglineRw: string;
  shortDescription: string;
  shortDescriptionRw: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  heroBannerUrl: string | null;
  officialEmail: string;
  officialPhone: string;
  officialWhatsapp: string;
  officialAddress: string;
  officialAddressRw: string;
  supportedLanguages: string; // "rw,en,fr,sw"
  operatingHours: string;
  operatingHoursRw: string;
  socialLinks: PlatformSocialLinks;
  brandAssets: PlatformBrandAssets;
  copyrightText: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsData = {
  id: "default",
  platformName: "MOSA",
  platformNameRw: "MOSA",
  tagline: "Neighborhood Commerce & Authentic Price Intelligence",
  taglineRw: "Urubuga rw'Ubucuruzi bw'Ibiciro by'Ukuri mu Rwanda",
  shortDescription: "Rwanda's Community Commerce Discovery Network",
  shortDescriptionRw: "Urusobe rw'Ikoranabuhanga ry'Ubucuruzi n'Ibiciro by'Ukuri mu Rwanda",
  logoUrl: null,
  faviconUrl: null,
  heroBannerUrl: null,
  officialEmail: "contact@mosa.rw",
  officialPhone: "+250 788 000 000",
  officialWhatsapp: "+250 788 000 000",
  officialAddress: "Kigali, Rwanda • Nyarugenge • Nyamirambo Pilot Hub",
  officialAddressRw: "Kigali, u Rwanda • Nyarugenge • Ihuriro rya Nyamirambo",
  supportedLanguages: "rw,en,fr,sw",
  operatingHours: "Monday - Saturday: 08:00 - 18:00 CAT",
  operatingHoursRw: "Kuwa Mbere - Kuwa Gatandatu: 08:00 - 18:00 CAT",
  socialLinks: {
    twitter: "https://twitter.com",
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    linkedin: "https://linkedin.com",
    youtube: "",
  },
  brandAssets: {
    brandColor: "#059669",
  },
  copyrightText: "MOSA Network (Rwanda). Built for sustainable, ethical community discovery.",
  updatedBy: null,
  updatedAt: null,
};

interface PlatformContextType {
  settings: PlatformSettingsData;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettingsLocally: (newSettings: Partial<PlatformSettingsData>) => void;
  isLanguageSupported: (langCode: string) => boolean;
}

const PlatformSettingsContext = createContext<PlatformContextType>({
  settings: DEFAULT_PLATFORM_SETTINGS,
  isLoading: false,
  refreshSettings: async () => {},
  updateSettingsLocally: () => {},
  isLanguageSupported: () => true,
});

export function PlatformSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettingsData>(DEFAULT_PLATFORM_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const parseSettings = (raw: any): PlatformSettingsData => {
    let parsedSocial: PlatformSocialLinks = DEFAULT_PLATFORM_SETTINGS.socialLinks;
    if (typeof raw.socialLinks === "string") {
      try {
        parsedSocial = JSON.parse(raw.socialLinks);
      } catch {}
    } else if (typeof raw.socialLinks === "object" && raw.socialLinks !== null) {
      parsedSocial = raw.socialLinks;
    }

    let parsedBrand: PlatformBrandAssets = DEFAULT_PLATFORM_SETTINGS.brandAssets;
    if (typeof raw.brandAssets === "string") {
      try {
        parsedBrand = JSON.parse(raw.brandAssets);
      } catch {}
    } else if (typeof raw.brandAssets === "object" && raw.brandAssets !== null) {
      parsedBrand = raw.brandAssets;
    }

    return {
      id: raw.id || "default",
      platformName: raw.platformName || DEFAULT_PLATFORM_SETTINGS.platformName,
      platformNameRw: raw.platformNameRw || DEFAULT_PLATFORM_SETTINGS.platformNameRw,
      tagline: raw.tagline || DEFAULT_PLATFORM_SETTINGS.tagline,
      taglineRw: raw.taglineRw || DEFAULT_PLATFORM_SETTINGS.taglineRw,
      shortDescription: raw.shortDescription || DEFAULT_PLATFORM_SETTINGS.shortDescription,
      shortDescriptionRw: raw.shortDescriptionRw || DEFAULT_PLATFORM_SETTINGS.shortDescriptionRw,
      logoUrl: raw.logoUrl || null,
      faviconUrl: raw.faviconUrl || null,
      heroBannerUrl: raw.heroBannerUrl || null,
      officialEmail: raw.officialEmail || DEFAULT_PLATFORM_SETTINGS.officialEmail,
      officialPhone: raw.officialPhone || DEFAULT_PLATFORM_SETTINGS.officialPhone,
      officialWhatsapp: raw.officialWhatsapp || DEFAULT_PLATFORM_SETTINGS.officialWhatsapp,
      officialAddress: raw.officialAddress || DEFAULT_PLATFORM_SETTINGS.officialAddress,
      officialAddressRw: raw.officialAddressRw || DEFAULT_PLATFORM_SETTINGS.officialAddressRw,
      supportedLanguages: raw.supportedLanguages || DEFAULT_PLATFORM_SETTINGS.supportedLanguages,
      operatingHours: raw.operatingHours || DEFAULT_PLATFORM_SETTINGS.operatingHours,
      operatingHoursRw: raw.operatingHoursRw || DEFAULT_PLATFORM_SETTINGS.operatingHoursRw,
      socialLinks: parsedSocial,
      brandAssets: parsedBrand,
      copyrightText: raw.copyrightText || DEFAULT_PLATFORM_SETTINGS.copyrightText,
      updatedBy: raw.updatedBy || null,
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : null,
    };
  };

  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/platform/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setSettings(parseSettings(data));
        }
      }
    } catch (err) {
      console.warn("[PlatformSettings] Failed to fetch settings, using cached/default:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();

    // Listen for cross-tab or in-app custom update events
    const handleCustomUpdate = () => {
      refreshSettings();
    };
    window.addEventListener("mosa_platform_settings_updated", handleCustomUpdate);
    return () => {
      window.removeEventListener("mosa_platform_settings_updated", handleCustomUpdate);
    };
  }, [refreshSettings]);

  const updateSettingsLocally = useCallback((newPartial: Partial<PlatformSettingsData>) => {
    setSettings((prev) => ({
      ...prev,
      ...newPartial,
    }));
  }, []);

  const isLanguageSupported = useCallback(
    (langCode: string): boolean => {
      if (!settings.supportedLanguages) return true;
      const list = settings.supportedLanguages
        .split(",")
        .map((l) => l.trim().toLowerCase());
      return list.includes(langCode.toLowerCase());
    },
    [settings.supportedLanguages]
  );

  return (
    <PlatformSettingsContext.Provider
      value={{
        settings,
        isLoading,
        refreshSettings,
        updateSettingsLocally,
        isLanguageSupported,
      }}
    >
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings() {
  return useContext(PlatformSettingsContext);
}
