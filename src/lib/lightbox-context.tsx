"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ImageLightboxModal } from "@/components/common/ImageLightboxModal";

export interface LightboxItem {
  src: string;
  alt?: string;
  caption?: string;
  allowDownload?: boolean;
}

interface LightboxContextType {
  openLightbox: (item: LightboxItem) => void;
  closeLightbox: () => void;
  activeItem: LightboxItem | null;
  isOpen: boolean;
}

const LightboxContext = createContext<LightboxContextType>({
  openLightbox: () => {},
  closeLightbox: () => {},
  activeItem: null,
  isOpen: false,
});

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [activeItem, setActiveItem] = useState<LightboxItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openLightbox = useCallback((item: LightboxItem) => {
    if (!item.src) return;
    setActiveItem(item);
    setIsOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <LightboxContext.Provider value={{ openLightbox, closeLightbox, activeItem, isOpen }}>
      {children}
      {isOpen && activeItem && (
        <ImageLightboxModal
          isOpen={isOpen}
          onClose={closeLightbox}
          src={activeItem.src}
          alt={activeItem.alt}
          caption={activeItem.caption}
          allowDownload={activeItem.allowDownload ?? true}
        />
      )}
    </LightboxContext.Provider>
  );
}

export function useLightbox() {
  return useContext(LightboxContext);
}
