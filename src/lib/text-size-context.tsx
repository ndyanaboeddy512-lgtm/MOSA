"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type TextSize = "small" | "normal" | "large" | "extra-large";

export interface TextSizeOption {
  id: TextSize;
  label: string;
  labelRw: string;
  shortLabel: string;
}

export const TEXT_SIZE_OPTIONS: TextSizeOption[] = [
  { id: "small", label: "Small", labelRw: "Gito", shortLabel: "A-" },
  { id: "normal", label: "Normal", labelRw: "Gisanzwe", shortLabel: "A" },
  { id: "large", label: "Large", labelRw: "Kinini", shortLabel: "A+" },
  { id: "extra-large", label: "Extra Large", labelRw: "Kinini Cyane", shortLabel: "A++" },
];

interface TextSizeContextType {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  options: TextSizeOption[];
}

const TextSizeContext = createContext<TextSizeContextType>({
  textSize: "normal",
  setTextSize: () => {},
  options: TEXT_SIZE_OPTIONS,
});

const STORAGE_KEY = "mosa_text_size";

function applyTextSizeToDOM(size: TextSize) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-text-size", size);
  
  // Set root font size scale - rem typography scales proportionally while preserving media/icon geometry
  switch (size) {
    case "small":
      root.style.fontSize = "14px";
      break;
    case "normal":
      root.style.fontSize = "16px";
      break;
    case "large":
      root.style.fontSize = "18px";
      break;
    case "extra-large":
      root.style.fontSize = "20px";
      break;
    default:
      root.style.fontSize = "16px";
  }
}

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>("normal");

  useEffect(() => {
    // Read persisted setting on client mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as TextSize | null;
      if (stored && ["small", "normal", "large", "extra-large"].includes(stored)) {
        setTextSizeState(stored);
        applyTextSizeToDOM(stored);
      } else {
        applyTextSizeToDOM("normal");
      }
    } catch {
      applyTextSizeToDOM("normal");
    }
  }, []);

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
    applyTextSizeToDOM(size);
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch (e) {
      console.warn("Could not save text size to localStorage:", e);
    }
  };

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize, options: TEXT_SIZE_OPTIONS }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  return useContext(TextSizeContext);
}
