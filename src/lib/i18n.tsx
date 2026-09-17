"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "./translations/en";
import { rw } from "./translations/rw";
import { fr } from "./translations/fr";
import { sw } from "./translations/sw";

export type Language = "en" | "rw" | "fr" | "sw";

export interface TranslationsRecord {
  rw: string;
  en: string;
  fr?: string;
  sw?: string;
}

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof en;
  tr: (translations: TranslationsRecord) => string;
}

function createDictionaryWithFallback(target: any, fallback: any): any {
  if (!target) return fallback;
  return new Proxy(target, {
    get(obj, prop) {
      const val = obj[prop];
      const fallbackVal = fallback ? fallback[prop] : undefined;
      if (val === undefined) {
        return fallbackVal;
      }
      if (typeof val === "object" && val !== null) {
        return createDictionaryWithFallback(val, fallbackVal);
      }
      return val;
    },
  });
}

const rawDictionaries: Record<Language, any> = {
  rw,
  en,
  fr,
  sw,
};

const dictionaries: Record<Language, typeof en> = {
  rw: createDictionaryWithFallback(rw, en),
  en,
  fr: createDictionaryWithFallback(fr, en),
  sw: createDictionaryWithFallback(sw, en),
};

const defaultTr = (translations: TranslationsRecord) => translations.rw;

const LanguageContext = createContext<LanguageContextType>({
  lang: "rw",
  setLang: () => {},
  t: dictionaries.rw,
  tr: defaultTr,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("rw");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mosa_lang") as Language;
      if (saved && (saved === "en" || saved === "rw" || saved === "fr" || saved === "sw")) {
        setLangState(saved);
        return;
      }
      if (typeof document !== "undefined") {
        const match = document.cookie.match(/(?:^|;\s*)mosa_lang=([a-z]{2})/);
        if (match && (match[1] === "en" || match[1] === "rw" || match[1] === "fr" || match[1] === "sw")) {
          setLangState(match[1] as Language);
          localStorage.setItem("mosa_lang", match[1]);
        }
      }
    } catch {}
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mosa_lang", newLang);
        document.cookie = `mosa_lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
      // Asynchronously sync preference to user account in database if logged in
      fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLang }),
      }).catch(() => {});
    }
  };

  const tr = (translations: TranslationsRecord): string => {
    if (lang === "rw") return translations.rw;
    if (lang === "fr") return translations.fr || translations.en;
    if (lang === "sw") return translations.sw || translations.en;
    return translations.en;
  };

  const t = dictionaries[lang] || dictionaries.rw;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
