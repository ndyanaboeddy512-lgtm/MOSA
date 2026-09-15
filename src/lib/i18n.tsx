"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "./translations/en";
import { rw } from "./translations/rw";

export type Language = "en" | "rw";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof en;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "rw",
  setLang: () => {},
  t: rw as unknown as typeof en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("rw");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mosa_lang") as Language;
    if (saved === "en" || saved === "rw") {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("mosa_lang", newLang);
    }
  };

  const t = lang === "rw" ? (rw as unknown as typeof en) : en;

  // Prevent flash while rendering
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
