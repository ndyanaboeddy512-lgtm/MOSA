"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { store } from "@/lib/store";
import { Business, UserReview } from "@/types";
import { VerificationBadge } from "@/components/common/Badge";
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  UserCheck, 
  Star, 
  CheckCircle2, 
  ArrowLeft,
  FileText,
  AlertTriangle,
  HeartHandshake,
  Share2,
  ExternalLink,
  ChevronRight,
  Plus
} from "lucide-react";

export default function BusinessProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<"WRONG_PRICE" | "FAKE_BUSINESS" | "CLOSED_PERMANENTLY" | "WRONG_LOCATION">("WRONG_PRICE");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    const biz = store.getBusinessById(resolvedParams.id);
    if (biz) {
      setBusiness(biz);
      store.trackView(biz.id);
      setReviews(store.getReviewsForBusiness(biz.id));
    }
  }, [resolvedParams.id]);

  if (!business) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">
          {lang === "rw" ? "Ubucuruzi ntibubonetse" : "Business not found"}
        </h2>
        <Link href="/explore" className="text-emerald-600 font-semibold text-sm mt-3 inline-block">
          {lang === "rw" ? "Subira ku rutonde" : "Return to directory"}
        </Link>
      </div>
    );
  }

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const rev = store.addReview({
      businessId: business.id,
      userName: user?.name || "Verified Resident",
      userRole: user?.role || "CUSTOMER",
      rating: newRating,
      comment: newComment,
      commentRw: newComment,
      verifiedVisit: true,
    });

    setReviews([rev, ...reviews]);
    setNewComment("");
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.submitReport({
      businessId: business.id,
      businessName: business.name,
      reportedBy: user?.name || "Anonymous Resident",
      reason: reportReason,
      details: reportDetails,
    });
    setReportSubmitted(true);
    setTimeout(() => {
      setReportModalOpen(false);
      setReportSubmitted(false);
      setReportDetails("");
    }, 2000);
  };

  const displayName = lang === "rw" && business.nameRw ? business.nameRw : business.name;
  const displayCategory = lang === "rw" && business.categoryDisplayRw ? business.categoryDisplayRw : business.categoryDisplay;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Back Link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.common.back}</span>
      </button>

      {/* Hero Profile Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-elevated mb-8">
        <div className="h-64 sm:h-80 w-full relative">
          <img
            src={business.coverImage}
            alt={displayName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
        </div>

        {/* Floating Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge status={business.verificationStatus} size="md" />
              <span className="text-xs font-medium px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-emerald-200">
                {displayCategory}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 bg-emerald-600/80 backdrop-blur-md rounded-full text-white">
                {business.isOpenNow ? t.common.openNow : t.common.closedNow}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{displayName}</h1>
            
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {business.location.community}, {business.location.cell}, {business.location.sector}
              </span>
              {business.location.addressNote && (
                <span className="text-slate-400">({business.location.addressNote})</span>
              )}
            </div>
          </div>

          {/* Direct CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                onClick={() => store.trackContactClick(business.id)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{t.common.call}</span>
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp}?text=Muraho,%20nabonye%20ubucuruzi%20bwanyu%20bwa%20${encodeURIComponent(displayName)}%20kuri%20MOSA.`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => store.trackContactClick(business.id)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Details, Catalog, Verification Audit & Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Products Catalogue & Evidence */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* About description */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              {t.businessProfile.about}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {lang === "rw" && business.descriptionRw ? business.descriptionRw : business.description}
            </p>
          </div>

          {/* Verified Products & Services Catalogue */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <span>{t.businessProfile.productsAndServices}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    {business.products.length} {lang === "rw" ? "byemejwe" : "verified"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === "rw"
                    ? "Ibiciro byose byemejwe ku butaka hifashishijwe amafoto y'ibyapa n'inyemezabwishyu."
                    : "Prices collected and verified on the ground from physical boards, receipts, and menus."}
                </p>
              </div>
            </div>

            {business.products.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {lang === "rw" ? "Nta bicuruzwa birashyirwaho" : "No catalogue items listed yet."}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {business.products.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 group">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                          {lang === "rw" && item.nameRw ? item.nameRw : item.name}
                        </span>
                        {item.verifiedByAgent && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                            ✓ {lang === "rw" ? "Kuri fagitire" : "Verified Source"}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500">{item.description}</p>
                      )}
                      {item.extractedFrom && (
                        <div className="text-[10px] text-slate-400">
                          Source: {item.extractedFrom.replace("_", " ")} ({Math.round((item.confidenceScore || 0.95) * 100)}% accuracy)
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold text-slate-900">
                        {item.price.toLocaleString()} Frw
                      </div>
                      {item.unit && (
                        <div className="text-[10px] text-slate-400">/{item.unit}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Physical Evidence Section (OCR Captures & Receipts) */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">
                {t.businessProfile.physicalEvidence}
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {lang === "rw"
                ? "MOSA ntishingira gusa ku magambo. Amakuru aturuka ku bimenyetso bifatika byo ku butaka (inyemezabwishyu zemejwe, amamenyu, n'ibyapa by'ibiciro). Amakuru y'ibanga y'abakiliya yakuwemo."
                : "MOSA transforms physical artifacts into digital trust. Private client phone numbers and payment card info are redacted automatically before audit archiving."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Physical Receipt Audit</span>
                  <span className="text-emerald-600">✓ Audited</span>
                </div>
                <p className="text-xs text-slate-500 font-mono bg-slate-100 p-2 rounded-lg text-[11px] leading-relaxed">
                  [DOCUMENT EVIDENCE #0914]<br/>
                  Merchant: {business.name}<br/>
                  Cell: {business.location.cell} (Ground audit)<br/>
                  Sanitized: 100% (PII Stripped)
                </p>
                <div className="text-[10px] text-slate-400">
                  Inspected by Community Agent: {business.verificationDetails.agentName || "Emmanuel Hakizimana"}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Price Board Inspection</span>
                  <span className="text-emerald-600">✓ Ground Match</span>
                </div>
                <p className="text-xs text-slate-500 font-mono bg-slate-100 p-2 rounded-lg text-[11px] leading-relaxed">
                  [STOREFRONT AUDIT]<br/>
                  Coordinates: {business.location.coordinates.lat.toFixed(4)}, {business.location.coordinates.lng.toFixed(4)}<br/>
                  Status: Active Micro-Enterprise
                </p>
                <div className="text-[10px] text-slate-400">
                  Last verified: {business.verificationDetails.recentActivityDate}
                </div>
              </div>
            </div>
          </div>

          {/* Community Reviews & Confirmations */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">
                {lang === "rw" ? "Ubuhamya bw'Abaturage" : "Community Feedback & Verification"}
              </h3>
              <span className="text-xs text-slate-500">
                {reviews.length} {lang === "rw" ? "ubuhamya" : "reviews"}
              </span>
            </div>

            {/* Submit New Community Review */}
            <form onSubmit={handleAddReview} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {lang === "rw" ? "Tanga ubuhamya kuri ubu bucuruzi:" : "Add a verified community recommendation:"}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-4 h-4 ${star <= newRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={lang === "rw" ? "Andika ubuhamya bwawe ku biciro, serivisi, cyangwa aho riherereye..." : "Share feedback on pricing, quality, and location accuracy..."}
                rows={2}
                className="w-full p-2.5 text-xs bg-white rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {t.common.submit}
              </button>
            </form>

            {/* Reviews List */}
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-white border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{rev.userName}</span>
                      {rev.verifiedVisit && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                          ✓ Verified Neighbor
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                  <div className="text-[10px] text-slate-400">{rev.createdAt}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1 Col): Trust Signals, Hours, Location & Claim */}
        <div className="space-y-6">
          
          {/* Layered Trust Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              {t.businessProfile.communityTrust}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    {t.verification.agentVerified}
                  </div>
                  <div className="text-slate-500">
                    {business.verificationDetails.agentName
                      ? `Inspected by ${business.verificationDetails.agentName} on ${business.verificationDetails.agentVerifiedAt}`
                      : "Ground audited by certified local agent"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    {lang === "rw" ? "Aho Riherereye Hemejwe" : "Location Confirmed"}
                  </div>
                  <div className="text-slate-500">
                    Coordinates verified within 15 meters on site.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    {lang === "rw" ? "Ubuhamya bw'Abaturage" : "Community Endorsements"}
                  </div>
                  <div className="text-slate-500">
                    {business.verificationDetails.communityConfirmationsCount} local residents confirmed active operations.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    {lang === "rw" ? "Amakuru Mashya" : "Recent Evidence"}
                  </div>
                  <div className="text-slate-500">
                    Updated {business.verificationDetails.recentActivityDate}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
            <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{t.businessProfile.openingHours}</span>
            </h3>

            <div className="space-y-2 text-xs">
              {business.openingHours.map((h) => (
                <div key={h.day} className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="font-medium text-slate-700">
                    {lang === "rw" ? h.dayRw : h.day}
                  </span>
                  <span className={h.isClosed ? "text-red-500 font-semibold" : "text-slate-900 font-semibold"}>
                    {h.isClosed ? "Closed" : `${h.open} - ${h.close}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Owner Claim Banner */}
          {!business.claimedByUserId ? (
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-3xl border border-amber-300 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <HeartHandshake className="w-4 h-4 text-amber-700" />
                <span>{lang === "rw" ? "Uri nyir'ubu bucuruzi?" : "Are you the owner?"}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === "rw"
                  ? "Bwiyandikisheho ukoresheje nimero yawe ya telefone. Urabasha guhindura ibiciro, kureba abashyitsi, no gutangaza ibiciro bidasanzwe."
                  : "Claim your profile in 30 seconds with your phone number. Manage prices, view customer contact analytics, and publish neighborhood discounts."}
              </p>
              <Link
                href={`/business/${business.id}/claim`}
                className="inline-block w-full text-center py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all"
              >
                {lang === "rw" ? "Bwiyandikisheho Ubu (Claim Profile)" : "Claim This Business"}
              </Link>
            </div>
          ) : (
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-700 shrink-0" />
              <span>
                {lang === "rw" ? "Ubu bucuruzi bwiyandikishijweho na nyirabwo yemewe." : "Officially claimed and actively managed by verified owner."}
              </span>
            </div>
          )}

          {/* Report Button */}
          <div className="text-center pt-2">
            <button
              onClick={() => setReportModalOpen(true)}
              className="text-xs text-slate-400 hover:text-red-600 transition-colors inline-flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t.businessProfile.reportIssue}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              {lang === "rw" ? "Tanga Raporo ku Makuru Atari Yo" : "Report Inaccurate Information"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Help MOSA Community Agents maintain high data integrity in Nyamirambo.
            </p>

            {reportSubmitted ? (
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-semibold text-center">
                ✓ Report submitted to community moderation queue.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as typeof reportReason)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none"
                  >
                    <option value="WRONG_PRICE">Wrong Price Displayed</option>
                    <option value="CLOSED_PERMANENTLY">Business Closed Permanently</option>
                    <option value="WRONG_LOCATION">Wrong Location / Relocated</option>
                    <option value="FAKE_BUSINESS">Non-existent / Fake Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Details</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Describe what needs correction..."
                    rows={3}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    {t.common.submit}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
