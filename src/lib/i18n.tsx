"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "./translations/en";
import { rw } from "./translations/rw";
import { fr } from "./translations/fr";
import { sw } from "./translations/sw";

export type Language = "en" | "rw" | "fr" | "sw";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof en;
}

const dictionaries: Record<Language, typeof en> = {
  rw: rw as unknown as typeof en,
  en,
  fr: fr as unknown as typeof en,
  sw: sw as unknown as typeof en,
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "rw",
  setLang: () => {},
  t: rw as unknown as typeof en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("rw");

  useEffect(() => {
    const saved = localStorage.getItem("mosa_lang") as Language;
    if (saved && (saved === "en" || saved === "rw" || saved === "fr" || saved === "sw")) {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("mosa_lang", newLang);
      // Asynchronously sync preference to user account in database if logged in
      fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLang }),
      }).catch(() => {});
    }
  };

  const t = dictionaries[lang] || dictionaries.rw;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
