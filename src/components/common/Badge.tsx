"use client";

import React from "react";
import { VerificationStatus } from "@/types";
import { useLanguage } from "@/lib/i18n";
import { CheckCircle2, ShieldCheck, Award, AlertCircle, Sparkles } from "lucide-react";

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function VerificationBadge({ status, size = "md", showText = true }: VerificationBadgeProps) {
  const { lang, t } = useLanguage();

  const config = {
    UNVERIFIED: {
      bg: "bg-slate-100 text-slate-700 border-slate-300",
      icon: AlertCircle,
      text: lang === "rw" ? "Ntabwo Byemejwe" : "Unverified",
    },
    AGENT_VERIFIED: {
      bg: "bg-blue-50 text-blue-700 border-blue-200",
      icon: ShieldCheck,
      text: lang === "rw" ? "Ryemejwe n'Umukozi" : "Agent Verified",
    },
    COMMUNITY_VERIFIED: {
      bg: "bg-teal-50 text-teal-700 border-teal-200",
      icon: CheckCircle2,
      text: lang === "rw" ? "Ryemejwe n'Abaturage" : "Community Verified",
    },
    BUSINESS_VERIFIED: {
      bg: "bg-purple-50 text-purple-700 border-purple-200",
      icon: Award,
      text: lang === "rw" ? "Ryemejwe na Nyiraryo" : "Owner Verified",
    },
    HIGH_CONFIDENCE: {
      bg: "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold",
      icon: Sparkles,
      text: lang === "rw" ? "Icyizere Gihanitse" : "High Confidence",
    },
  };

  const item = config[status] || config.UNVERIFIED;
  const Icon = item.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-medium",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-4.5 h-4.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs ${item.bg} ${sizeClasses[size]}`}
      title={item.text}
    >
      <Icon className={`${iconSizes[size]} shrink-0`} />
      {showText && <span>{item.text}</span>}
    </span>
  );
}

export function DataStatusBadge({
  status,
  size = "sm",
}: {
  status?: "DEMO" | "RESEARCHED" | "VERIFIED" | string;
  size?: "sm" | "md";
}) {
  const { lang } = useLanguage();
  if (!status || status === "VERIFIED") return null;

  if (status === "DEMO") {
    const textMap: Record<string, string> = {
      rw: "ICYITEGEREREZO / DEMO",
      en: "DEMO / SAMPLE RECORD",
      fr: "ÉCHANTILLON / DÉMO",
      sw: "KUMBUKUMBU YA MFANO",
    };
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold text-[10px] tracking-wider uppercase shadow-xs border border-amber-600">
        <span>⚠️</span>
        <span>{textMap[lang] || textMap.en}</span>
      </span>
    );
  }

  if (status === "RESEARCHED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 font-semibold text-[10px] tracking-wide border border-sky-300">
        <span>🔬</span>
        <span>{lang === "rw" ? "UBUSHAKASHATSI" : "PRE-RESEARCHED"}</span>
      </span>
    );
  }

  return null;
}
