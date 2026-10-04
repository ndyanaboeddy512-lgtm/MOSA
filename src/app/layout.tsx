import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { PlatformSettingsProvider } from "@/lib/platform-context";
import { AuthProvider } from "@/lib/auth-context";
import { LocationProvider } from "@/lib/location-context";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { LocationSelectorModal } from "@/components/layout/LocationSelectorModal";

export const metadata: Metadata = {
  title: "MOSA — Global Community Commerce & Ground Discovery Network",
  description:
    "Pioneering micro-enterprise discovery, authentic price transparency, and street-level landmark navigation. Originating in Rwanda and built for sustainable community commerce worldwide.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  keywords: [
    "MOSA",
    "Community Commerce",
    "Global Business Discovery",
    "Rwanda Innovation",
    "Kigali",
    "Ground Discovery",
    "Micro Enterprise",
    "Authentic Price Intelligence",
    "Local Street Commerce",
  ],
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

import { TextSizeProvider } from "@/lib/text-size-context";
import { LightboxProvider } from "@/lib/lightbox-context";
import { CasualProtectionProvider } from "@/components/common/CasualProtectionProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="rw" data-text-size="normal">
      <body className="min-h-screen flex flex-col antialiased text-slate-900 bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
        <TextSizeProvider>
          <PlatformSettingsProvider>
            <LanguageProvider>
              <AuthProvider>
                <LocationProvider>
                  <LightboxProvider>
                    <CasualProtectionProvider>
                      <OfflineBanner />
                      <Navbar />
                      <LocationSelectorModal />
                      <main className="flex-1 w-full overflow-x-hidden">{children}</main>
                      <Footer />
                    </CasualProtectionProvider>
                  </LightboxProvider>
                </LocationProvider>
              </AuthProvider>
            </LanguageProvider>
          </PlatformSettingsProvider>
        </TextSizeProvider>
      </body>
    </html>
  );
}
