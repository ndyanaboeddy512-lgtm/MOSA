import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { OfflineBanner } from "@/components/common/OfflineBanner";

export const metadata: Metadata = {
  title: "MOSA — Micro-Opportunity & Service Access | Rwanda",
  description:
    "Rwanda's Community Commerce Discovery Network. Making local micro-enterprises, shops, tailors, salons, mechanics, and artisanal services discoverable through verified Community Agents.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  keywords: [
    "MOSA",
    "Rwanda",
    "Kigali",
    "Nyamirambo",
    "Community Commerce",
    "Local Business Discovery",
    "Community Agent",
    "Micro Enterprise",
    "Receipt OCR",
  ],
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="rw">
      <body className="min-h-screen flex flex-col antialiased text-slate-900 bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <LanguageProvider>
          <AuthProvider>
            <OfflineBanner />
            <Navbar />
            <main className="flex-1 w-full">{children}</main>
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
