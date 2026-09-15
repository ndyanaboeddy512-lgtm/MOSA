"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { CommunityMission } from "@/types";
import { 
  Award, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  ShieldCheck, 
  Share2, 
  Copy, 
  Compass, 
  HeartHandshake,
  ArrowRight
} from "lucide-react";

export default function MissionsPage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const [missions, setMissions] = useState<CommunityMission[]>([]);
  const [copied, setCopied] = useState(false);
  const [completedMissionId, setCompletedMissionId] = useState<string | null>(null);

  useEffect(() => {
    setMissions(store.getMissions());
  }, []);

  const handleAcceptMission = (missionId: string) => {
    store.completeMission(missionId);
    setCompletedMissionId(missionId);
    setMissions([...store.getMissions()]);
    setTimeout(() => {
      setCompletedMissionId(null);
    }, 3000);
  };

  const handleCopyReferral = () => {
    const code = user?.referralCode || "MOSA-NYA-88";
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`https://mosa.rw/join?ref=${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-elevated mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/60 text-emerald-200 text-xs font-bold backdrop-blur-md">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Ethical Participation • Zero Gambling</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black">
            {t.missions.title}
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            {t.missions.subtitle}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-xs space-y-2 shrink-0 max-w-xs">
          <div className="flex items-center justify-between">
            <span className="text-emerald-200 font-semibold">Your Community Standing:</span>
            <span className="font-bold text-amber-300">{user?.points || 120} Points</span>
          </div>
          <div className="text-[11px] text-emerald-100/80">
            Current Badges: {user?.badges.join(", ") || "Neighborhood Explorer"}
          </div>
        </div>
      </div>

      {/* Referral Link & Community Growth */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Invite Trusted Local Businesses or Scouts</span>
          </div>
          <p className="text-xs text-slate-500">
            Help grow Nyamirambo's digital visibility network. Protected by anti-fraud velocity limits.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <code className="bg-slate-100 px-3 py-2 rounded-xl text-xs font-mono font-bold text-slate-800 border border-slate-200">
            {user?.referralCode || "MOSA-NYA-88"}
          </code>
          <button
            onClick={handleCopyReferral}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
        </div>
      </div>

      {/* Available Missions Grid */}
      <div className="space-y-4 mb-12">
        <h2 className="text-xl font-bold text-slate-900">
          {lang === "rw" ? "Ubutumwa Buhari Muri Nyamirambo" : "Active Neighborhood Missions"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {missions.map((m) => {
            const title = lang === "rw" ? m.titleRw : m.title;
            const desc = lang === "rw" ? m.descriptionRw : m.description;
            const isDone = m.isCompleted;

            return (
              <div
                key={m.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                  isDone
                    ? "bg-emerald-50/50 border-emerald-300"
                    : "bg-white border-slate-200 shadow-card hover:shadow-elevated"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/50">
                      {m.targetArea}
                    </span>

                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      +{m.pointsReward} {t.missions.points}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {desc}
                    </p>
                  </div>

                  {m.badgeReward && (
                    <div className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Unlocks Badge: {m.badgeReward}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {isDone ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.missions.missionCompleted} (+{m.pointsReward} pts)</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcceptMission(m.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{t.missions.completeMission}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <Link
                    href="/agent/capture"
                    className="text-xs text-slate-400 hover:text-emerald-700 font-semibold"
                  >
                    Open Capture Tool
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ethical Badges Showcase */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card">
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          {t.missions.rewardsTitle}
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          MOSA uses ethical recognition to celebrate honest, grounded contributions that benefit the community.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-900 text-xs pt-1">{t.missions.badges.explorer}</div>
            <div className="text-[10px] text-slate-500">Discovered 3+ unlisted shops</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white mx-auto flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-900 text-xs pt-1">{t.missions.badges.helper}</div>
            <div className="text-[10px] text-slate-500">Verified opening times</div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
            <div className="w-10 h-10 rounded-full bg-purple-600 text-white mx-auto flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-900 text-xs pt-1">{t.missions.badges.scout}</div>
            <div className="text-[10px] text-slate-500">Digitized paper price lists</div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white mx-auto flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-900 text-xs pt-1">{t.missions.badges.champion}</div>
            <div className="text-[10px] text-slate-500">Certified Community Contributor</div>
          </div>
        </div>
      </div>

    </div>
  );
}
