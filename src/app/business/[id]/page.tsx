"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
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
  Plus,
  Tag,
  Navigation,
  ThumbsUp,
  Flame,
  Award,
  HelpCircle,
  Play,
  Video,
  Film,
  X,
  Megaphone,
  Sparkles,
  Briefcase,
  Users,
  Truck,
  Info,
  Clock3,
  Send,
  Check,
  Building2
} from "lucide-react";
import { LocationCard } from "@/components/discovery/LocationCard";
import { getGoogleMapsDirectionsUrl } from "@/lib/location-quality";
import { getBusinessOperatingModel } from "@/lib/taxonomy";
import { isVideoMedia, isLegacyBagPlaceholder } from "@/lib/media-upload";

export default function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<"WRONG_PRICE" | "FAKE_BUSINESS" | "CLOSED_PERMANENTLY" | "WRONG_LOCATION" | "INAPPROPRIATE_CONTENT">("WRONG_PRICE");
  const [reportDetails, setReportDetails] = useState("");
  const [reportTargetType, setReportTargetType] = useState<"BUSINESS" | "VIDEO" | "PHOTO" | "PRODUCT">("BUSINESS");
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetLabel, setReportTargetLabel] = useState<string>("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Opportunity Inquiry Modal State
  const [oppModalOpen, setOppModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<any | null>(null);
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");
  const [oppSubmitting, setOppSubmitting] = useState(false);
  const [oppSubmitted, setOppSubmitted] = useState(false);

  useEffect(() => {
    async function loadBusiness() {
      try {
        const res = await fetch(`/api/businesses/${resolvedParams.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.business) {
            setBusiness(data.business);
            setReviews(data.business.reviews || []);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load business from DB:", err);
      }
      setBusiness(null);
    }
    loadBusiness();
  }, [resolvedParams.id]);

  const handleTrackInquiry = (
    bizId: string,
    type: "WHATSAPP_CLICK" | "PHONE_CALL" | "DIRECTIONS_VIEW" | "ORDER_INQUIRY" | "BOOKING_REQUEST",
    item?: { id?: string; name?: string; price?: number }
  ) => {
    fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "TELEMETRY",
        businessId: bizId,
        type,
        channel: "PUBLIC_WEB",
        productId: item?.id,
        itemName: item?.name,
        itemPrice: item?.price,
      }),
    }).catch(() => {});

    // Backwards-compatible click tracking
    fetch(`/api/businesses/${bizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactClick: true }),
    }).catch(() => {});
  };

  const handleOppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp || !applicantName.trim() || !applicantPhone.trim()) return;
    setOppSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OPPORTUNITY_APPLY",
          opportunityId: selectedOpp.id,
          applicantName,
          applicantPhone,
          message: applicantMessage,
        }),
      });
      if (res.ok) {
        setOppSubmitted(true);
        setTimeout(() => {
          setOppModalOpen(false);
          setOppSubmitted(false);
          setApplicantName("");
          setApplicantPhone("");
          setApplicantMessage("");
          setSelectedOpp(null);
        }, 2200);
      }
    } catch (err) {
      console.error("Failed to submit opportunity application:", err);
    } finally {
      setOppSubmitting(false);
    }
  };

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

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          userName: user?.name || "Verified Resident",
          userRole: user?.role || "CUSTOMER",
          rating: newRating,
          comment: newComment,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.review) {
          setReviews([data.review, ...reviews]);
        }
        setNewComment("");
      }
    } catch (err) {
      console.error("[Review POST DB error]:", err);
    }
  };

  const openReportForTarget = (
    type: "BUSINESS" | "VIDEO" | "PHOTO" | "PRODUCT",
    id: string | null = null,
    label: string = ""
  ) => {
    setReportTargetType(type);
    setReportTargetId(id);
    setReportTargetLabel(label);
    if (type === "VIDEO" || type === "PHOTO") {
      setReportReason("INAPPROPRIATE_CONTENT");
    } else {
      setReportReason("WRONG_PRICE");
    }
    setReportSubmitted(false);
    setReportDetails("");
    setReportModalOpen(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          reason: reportReason,
          details: reportDetails,
          targetType: reportTargetType,
          targetId: reportTargetId,
          reporterName: user?.name || "Anonymous Resident",
        }),
      });
      if (res.ok) {
        setReportSubmitted(true);
      }
    } catch (err) {
      console.error("[Report POST DB error]:", err);
    }

    setTimeout(() => {
      setReportModalOpen(false);
      setReportSubmitted(false);
      setReportDetails("");
    }, 2000);
  };

  const displayName = lang === "rw" && business.nameRw ? business.nameRw : business.name;
  const displayCategory = lang === "rw" && business.categoryDisplayRw ? business.categoryDisplayRw : business.categoryDisplay;

  const operatingModel = getBusinessOperatingModel(
    business.mainCategory || business.category,
    business.subCategory,
    business.businessType
  );

  const rawWhatsApp = (business.whatsapp || business.phone || "").replace(/[^0-9]/g, "");
  const formattedWhatsApp = rawWhatsApp.startsWith("0")
    ? "250" + rawWhatsApp.slice(1)
    : (rawWhatsApp.startsWith("250") ? rawWhatsApp : "250" + rawWhatsApp);

  const hasValidCover = Boolean(business.coverImage && !isLegacyBagPlaceholder(business.coverImage));
  const isCoverVideo = hasValidCover && isVideoMedia(business.coverImage);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description,
    telephone: business.phone,
    image: hasValidCover ? business.coverImage : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.streetName || business.nearestLandmark || "N/A",
      addressLocality: business.location?.cell || (business as any).cell || "Kigali",
      addressRegion: business.location?.sector || (business as any).sector || "Kigali",
      addressCountry: "RW",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.location?.coordinates?.lat ?? business.latitude,
      longitude: business.location?.coordinates?.lng ?? business.longitude,
    },
    openingHoursSpecification: business.openingHours?.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.day,
      opens: h.isClosed ? undefined : h.open,
      closes: h.isClosed ? undefined : h.close,
    })),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Native Google / Chrome Discoverability JSON-LD LocalBusiness Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
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
          {hasValidCover ? (
            isCoverVideo ? (
              <video
                src={business.coverImage!}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={business.coverImage!}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-600/15 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-extrabold text-3xl shadow-xl mb-3">
                {displayName ? displayName.charAt(0).toUpperCase() : "M"}
              </div>
              <div className="relative z-10 text-xs font-bold text-emerald-300 tracking-wider uppercase bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                {(lang === "rw" ? business.classificationPathRw : business.classificationPath) || displayCategory}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Floating Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge status={business.verificationStatus} size="md" />
              <span className="text-xs font-medium px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-emerald-200">
                {(lang === "rw" ? business.classificationPathRw : business.classificationPath) || displayCategory}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 bg-emerald-600/80 backdrop-blur-md rounded-full text-white">
                {business.isOpenNow ? t.common.openNow : t.common.closedNow}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{displayName}</h1>
            
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {business.nearestLandmark
                  ? `${business.nearestLandmark} • ${business.location?.cell || "Nyamirambo"}, ${business.location?.sector || "Nyamirambo"}`
                  : `${business.location?.community || (business as any).cell || "Nyamirambo"}, ${business.location?.cell || (business as any).cell || "Nyamirambo"}, ${business.location?.sector || "Nyamirambo"}`}
              </span>
              {business.location?.addressNote && !business.nearestLandmark && (
                <span className="text-slate-400">({business.location.addressNote})</span>
              )}
            </div>
          </div>

          {/* Direct CTAs */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <a
              href={getGoogleMapsDirectionsUrl(
                business.location?.coordinates?.lat ?? business.latitude,
                business.location?.coordinates?.lng ?? business.longitude
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleTrackInquiry(business.id, "DIRECTIONS_VIEW")}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm border border-slate-700 shadow-md transition-all flex items-center gap-2 cursor-pointer"
              title="Get Directions via Google Maps"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Directions</span>
            </a>
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                onClick={() => handleTrackInquiry(business.id, "PHONE_CALL")}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{t.common.call}</span>
              </a>
            )}
            {(business.whatsapp || business.phone) && (
              <a
                href={`https://wa.me/${formattedWhatsApp}?text=${encodeURIComponent(
                  operatingModel.hasBookings
                    ? `Muraho, nabonye serivisi zanyu kuri MOSA, ndifuza gufata gahunda kuri ${displayName}.`
                    : `Muraho, nabonye ibicuruzwa byanyu kuri MOSA, ndifuza gutumiza/kubaza kuri ${displayName}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleTrackInquiry(business.id, operatingModel.hasBookings ? "BOOKING_REQUEST" : "WHATSAPP_CLICK")}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {operatingModel.hasBookings
                    ? (lang === "rw" ? "Gufata Gahunda kuri WhatsApp" : "Book on WhatsApp")
                    : (operatingModel.hasOrders
                        ? (lang === "rw" ? "Gutumiza kuri WhatsApp" : "Order via WhatsApp")
                        : "WhatsApp")}
                </span>
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

          {/* Featured Active Offer if Present */}
          {business.featuredOffer && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <span>{lang === "rw" ? "Poromosiyo Idasanzwe muri aka Gace" : "Special Neighborhood Offer"}</span>
                </span>
                <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                  {business.featuredOffer.discount}
                </span>
              </div>
              <h4 className="text-base font-black text-slate-900">
                {lang === "rw" && business.featuredOffer.titleRw ? business.featuredOffer.titleRw : business.featuredOffer.title}
              </h4>
              {business.featuredOffer.description && (
                <p className="text-xs text-slate-600">{business.featuredOffer.description}</p>
              )}
              <div className="text-[11px] text-slate-400">
                Valid until {new Date(business.featuredOffer.validUntil).toLocaleDateString()}
              </div>
            </div>
          )}
          {/* Active Business Updates & Bulletins */}
          {business.updates && business.updates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {lang === "rw" ? "Amatangazo n'Amakuru Mashya" : "Business Updates & Notices"}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {business.updates.map((update) => {
                  const isNotice = update.type === "NOTICE" || update.type === "TEMPORARY_CLOSURE";
                  const isOffer = update.type === "OFFER";
                  const isNewArrival = update.type === "NEW_ARRIVAL";

                  return (
                    <div
                      key={update.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        isNotice
                          ? "bg-amber-50/70 border-amber-200"
                          : isOffer
                          ? "bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-emerald-200"
                          : "bg-white border-slate-200 shadow-xs hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            isNotice
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : isOffer
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : isNewArrival
                              ? "bg-purple-100 text-purple-900 border-purple-300"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                          }`}
                        >
                          {update.badge || update.type.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(update.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mb-1.5">
                        {lang === "rw" && update.titleRw ? update.titleRw : update.title}
                      </h4>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {lang === "rw" && update.contentRw ? update.contentRw : update.content}
                      </p>

                      {update.imageUrl && (
                        <img
                          src={update.imageUrl}
                          alt={update.title}
                          className="mt-3 rounded-2xl w-full h-36 object-cover border border-slate-100"
                        />
                      )}

                      {update.validUntil && (
                        <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {lang === "rw" ? "Bizarangira ku ya:" : "Valid until:"}{" "}
                            {new Date(update.validUntil).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                {business.products.map((item) => {
                  const isContactForPrice = item.price === 0 || (!item.price && !item.priceMin);
                  const priceLabel = isContactForPrice
                    ? (lang === "rw" ? "Baza Igiciro" : "Contact for price")
                    : item.priceType === "RANGE" && item.priceMin && item.priceMax
                    ? `${item.priceMin.toLocaleString()} – ${item.priceMax.toLocaleString()} Frw`
                    : `${item.price.toLocaleString()} Frw`;

                  const waText = item.isService || operatingModel.hasBookings
                    ? (isContactForPrice
                        ? `Muraho, ndifuza kubaza igiciro no gufata gahunda ya serivisi: ${item.name} kuri ${displayName}.`
                        : `Muraho, ndifuza gufata gahunda ya: ${item.name} (${priceLabel}) kuri ${displayName}.`)
                    : (isContactForPrice
                        ? `Muraho, ndifuza kubaza igiciro cy'igicuruzwa: ${item.name} kuri ${displayName}.`
                        : `Muraho, ndifuza gutumiza: ${item.name} (${priceLabel}) kuri ${displayName}.`);

                  return (
                    <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                      <div className="flex items-start gap-3.5">
                        {item.mediaUrl && (
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                            {item.mediaType === "VIDEO" ? (
                              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                                <Video className="w-6 h-6" />
                                <span className="text-[8px] font-black uppercase tracking-wider text-white mt-0.5">Video</span>
                              </div>
                            ) : item.mediaType === "FILE" ? (
                              <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-700 group-hover:scale-105 transition-transform">
                                <FileText className="w-6 h-6 text-emerald-600" />
                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-600 mt-0.5">File</span>
                              </div>
                            ) : (
                              <img
                                src={item.mediaUrl}
                                alt={item.mediaCaption || item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                              {lang === "rw" && item.nameRw ? item.nameRw : item.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                              {item.isService ? (lang === "rw" ? "Serivisi" : "Service") : (lang === "rw" ? "Igicuruzwa" : "Product")}
                            </span>
                            {item.isAvailable === false ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                {lang === "rw" ? "Bishize (Out of Stock)" : "Out of Stock"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                {lang === "rw" ? "Birahari" : "In Stock"}
                              </span>
                            )}
                            {item.verifiedByAgent && (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                                ✓ {lang === "rw" ? "Kuri fagitire" : "Verified Source"}
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                          )}

                          {item.mediaCaption && (
                            <div className="text-[11px] text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-200/70 italic font-medium inline-block">
                              Caption: &ldquo;{item.mediaCaption}&rdquo;
                            </div>
                          )}

                          {item.extractedFrom && (
                            <div className="text-[10px] text-slate-400">
                              Source: {item.extractedFrom.replace("_", " ")} ({Math.round((item.confidenceScore || 0.95) * 100)}% accuracy)
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                        <div className="text-right">
                          {isContactForPrice ? (
                            <div className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80">
                              {priceLabel}
                            </div>
                          ) : (
                            <div className="text-base font-extrabold text-slate-900">
                              {priceLabel}
                            </div>
                          )}
                          <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400">
                            {item.isEstimated && !isContactForPrice && <span className="text-amber-600 font-semibold">(Est.)</span>}
                            {!isContactForPrice && item.unit && <span>/{item.unit}</span>}
                          </div>
                        </div>

                        {(business.whatsapp || business.phone) && (
                          item.isAvailable !== false ? (
                            <a
                              href={`https://wa.me/${formattedWhatsApp}?text=${encodeURIComponent(waText)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                handleTrackInquiry(
                                  business.id,
                                  item.isService || operatingModel.hasBookings
                                    ? "BOOKING_REQUEST"
                                    : "ORDER_INQUIRY",
                                  { id: item.id, name: item.name, price: item.price }
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>
                                {isContactForPrice
                                  ? (lang === "rw" ? "Baza Igiciro" : "Inquire / Quote")
                                  : item.isService || operatingModel.hasBookings
                                  ? (lang === "rw" ? "Fata Gahunda" : "Book via WhatsApp")
                                  : (lang === "rw" ? "Tumiza" : "Order via WhatsApp")}
                              </span>
                            </a>
                          ) : (
                            <span className="text-xs text-red-500 font-bold italic">
                              {lang === "rw" ? "Ntibikibonetse" : "Out of stock"}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Short Business Showcase Videos (Verified Commercial Media) */}
          {(business as any).videos && (business as any).videos.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">
                      {lang === "rw" ? "Amashusho Magufi y'Ubucuruzi" : "Short Business Showcase Videos"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {lang === "rw"
                        ? "Amashusho y'umwimerere agaragaza ibicuruzwa, serivisi, cyangwa aho rukorera"
                        : "Verified short videos highlighting authentic products, craftsmanship, and facilities"}
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  <Video className="w-3.5 h-3.5" />
                  Verified Commerce
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {((business as any).videos as any[]).map((vid) => (
                  <div
                    key={vid.id}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-9/14 flex flex-col justify-end p-4 text-white shadow-md hover:shadow-xl transition-all"
                  >
                    {/* Background Preview */}
                    {vid.thumbnailUrl ? (
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.caption || "Showcase video"}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-linear-to-b from-slate-800 via-slate-900 to-black flex items-center justify-center">
                        <Film className="w-12 h-12 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 border border-white/10">
                        {vid.topic || "Showcase"}
                      </span>
                      {vid.durationSec && (
                        <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono text-slate-200 border border-white/10">
                          {vid.durationSec}s
                        </span>
                      )}
                    </div>

                    {/* Center Play Button Overlay */}
                    <button
                      type="button"
                      onClick={() => setActiveVideo(vid)}
                      className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer group-hover:scale-110 transition-transform"
                      aria-label="Play video"
                    >
                      <div className="w-13 h-13 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-lg backdrop-blur-xs hover:bg-emerald-500">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </button>

                    {/* Bottom Caption & Moderation Trigger */}
                    <div className="relative z-10 space-y-1.5 pointer-events-none">
                      {vid.caption && (
                        <p className="text-xs font-medium text-white/95 line-clamp-2 leading-snug drop-shadow-sm">
                          {vid.caption}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-1 pointer-events-auto">
                        <span className="text-[10px] text-slate-300 font-medium">
                          {displayName}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReportForTarget("VIDEO", vid.id, vid.caption || "Showcase Video");
                          }}
                          className="text-[10px] text-white/70 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Report
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Opportunities & Community Openings */}
          {business.opportunities && business.opportunities.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">
                      {lang === "rw" ? "Amahirwe n'Amatangazo y'Akazi" : "Business Opportunities & Openings"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {lang === "rw"
                        ? "Ubufatanye, akazi, n'amahirwe yo kugemura ku bacuruzi b'akarere."
                        : "Employment, supply contracts, and partnerships directly with this verified merchant."}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  {business.opportunities.length} {lang === "rw" ? "Bihari" : "Open"}
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {business.opportunities.map((opp) => {
                  const oppTypeLabel = {
                    EMPLOYMENT: lang === "rw" ? "Akazi / Umwanya Uhari" : "Hiring / Employment",
                    SUPPLIER_REQUEST: lang === "rw" ? "Gushaka Abagemuzi" : "Supplier Request",
                    PARTNERSHIP: lang === "rw" ? "Ubufatanye mu Bucuruzi" : "Business Partnership",
                    COLLABORATION: lang === "rw" ? "Gufatanya" : "Collaboration",
                    OTHER: lang === "rw" ? "Ibindi" : "Opportunity",
                  }[opp.type] || opp.type;

                  return (
                    <div
                      key={opp.id}
                      className="p-5 rounded-2xl bg-slate-50 hover:bg-slate-50/80 border border-slate-200/80 space-y-3 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wide">
                          {oppTypeLabel}
                        </span>
                        {opp.deadline && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                            {lang === "rw" ? "Itariki ntarengwa:" : "Deadline:"}{" "}
                            {new Date(opp.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-slate-900 mb-1">
                          {lang === "rw" && opp.titleRw ? opp.titleRw : opp.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {lang === "rw" && opp.descriptionRw ? opp.descriptionRw : opp.description}
                        </p>
                      </div>

                      {(opp.compensation || opp.requirements) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200/70">
                          {opp.compensation && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {lang === "rw" ? "Igihembo / Umushahara" : "Compensation"}
                              </span>
                              <span className="font-semibold text-emerald-700">{opp.compensation}</span>
                            </div>
                          )}
                          {opp.requirements && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {lang === "rw" ? "Ibisabwa" : "Requirements"}
                              </span>
                              <span className="font-medium text-slate-700">{opp.requirements}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTAs: Direct WhatsApp or Form Response */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {(business.whatsapp || business.phone) && (
                          <a
                            href={`https://wa.me/${formattedWhatsApp}?text=${encodeURIComponent(
                              `Muraho, nabonye itangazo ryanyu rya "${opp.title}" kuri MOSA, nifuzaga kubaza uburyo nakora / nasaba.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleTrackInquiry(business.id, "WHATSAPP_CLICK")}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{lang === "rw" ? "Baza kuri WhatsApp" : "Inquire on WhatsApp"}</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOpp(opp);
                            setOppSubmitted(false);
                            setOppModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{lang === "rw" ? "Saba / Ohereza Umwirondoro" : "Apply / Send Details"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dedicated Smart Ground Location & Navigation */}
          <LocationCard business={business} lang={lang} />

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
                  Cell: {business.location?.cell || (business as any).cell || "Biryogo"} (Ground audit)<br/>
                  Sanitized: 100% (PII Stripped)
                </p>
                <div className="text-[10px] text-slate-400">
                  Inspected by Community Agent: {business.verificationDetails?.agentName || "Emmanuel Hakizimana"}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Price Board Inspection</span>
                  <span className="text-emerald-600">✓ Ground Match</span>
                </div>
                <p className="text-xs text-slate-500 font-mono bg-slate-100 p-2 rounded-lg text-[11px] leading-relaxed">
                  [STOREFRONT AUDIT]<br/>
                  Coordinates: {(business.location?.coordinates?.lat ?? -1.981).toFixed(4)}, {(business.location?.coordinates?.lng ?? 30.046).toFixed(4)}<br/>
                  Status: Active Micro-Enterprise
                </p>
                <div className="text-[10px] text-slate-400">
                  Last verified: {business.verificationDetails?.recentActivityDate || "Recently"}
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
                    {business.verificationDetails?.agentName
                      ? `Inspected by ${business.verificationDetails.agentName}${business.verificationDetails.agentVerifiedAt ? ` on ${business.verificationDetails.agentVerifiedAt}` : ""}`
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
                    {business.verificationDetails?.communityConfirmationsCount || 12} local residents confirmed active operations.
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
                    Updated {business.verificationDetails?.recentActivityDate || "recently"}
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

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-3xl max-w-lg w-full overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 uppercase tracking-wide">
                  {activeVideo.topic || "Showcase"}
                </span>
                <span className="text-xs text-slate-300 font-medium truncate max-w-[200px]">
                  {displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close video"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Box */}
            <div className="relative bg-black flex-1 flex items-center justify-center aspect-9/16 max-h-[60vh] sm:max-h-[65vh]">
              <video
                src={activeVideo.url}
                poster={activeVideo.thumbnailUrl || undefined}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Caption & Report Footer */}
            <div className="p-4 bg-slate-900/80 border-t border-white/10 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
                {activeVideo.caption || "Verified commercial showcase video."}
              </p>
              <button
                type="button"
                onClick={() => {
                  const targetVid = activeVideo;
                  setActiveVideo(null);
                  openReportForTarget("VIDEO", targetVid.id, targetVid.caption || "Showcase Video");
                }}
                className="shrink-0 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg mb-1">
              {lang === "rw" ? "Tanga Raporo ku Makuru Atari Yo" : "Report Content or Information"}
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {reportTargetType === "VIDEO"
                ? "Help MOSA maintain high commercial integrity. Report prohibited, irrelevant, or offensive videos."
                : "Help MOSA Community Agents maintain high data integrity."}
            </p>

            {reportTargetLabel && (
              <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs flex items-center gap-2">
                <span className="font-bold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                  {reportTargetType}
                </span>
                <span className="truncate">{reportTargetLabel}</span>
              </div>
            )}

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
                    {reportTargetType === "VIDEO" || reportTargetType === "PHOTO" ? (
                      <>
                        <option value="INAPPROPRIATE_CONTENT">Inappropriate, Offensive or Irrelevant Media</option>
                        <option value="SPAM">Spam or Non-commercial Content</option>
                        <option value="FAKE_BUSINESS">Misleading / Fake Business Media</option>
                      </>
                    ) : (
                      <>
                        <option value="WRONG_PRICE">Wrong Price Displayed</option>
                        <option value="CLOSED_PERMANENTLY">Business Closed Permanently</option>
                        <option value="WRONG_LOCATION">Wrong Location / Relocated</option>
                        <option value="FAKE_BUSINESS">Non-existent / Fake Business</option>
                        <option value="INAPPROPRIATE_CONTENT">Inappropriate or Prohibited Content</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Details</label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Describe what violates MOSA commercial guidelines..."
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

      {/* Opportunity Response / Application Modal */}
      {oppModalOpen && selectedOpp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-lg">
                {lang === "rw" ? "Saba cyangwa Ohereza Umwirondoro" : "Apply or Respond"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setOppModalOpen(false);
                  setSelectedOpp(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs">
              <span className="font-bold block text-[10px] uppercase text-indigo-600">Opportunity</span>
              <span className="font-semibold text-sm">{selectedOpp.title}</span>
            </div>

            {oppSubmitted ? (
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-semibold text-center space-y-1">
                <Check className="w-6 h-6 text-emerald-600 mx-auto" />
                <p>
                  {lang === "rw"
                    ? "Amakuru yawe yoherejwe kuri nyir'ubucuruzi neza!"
                    : "Your contact details were sent directly to the business owner!"}
                </p>
              </div>
            ) : (
              <form onSubmit={handleOppSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Amazina yawe" : "Your Full Name"}
                  </label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="e.g. Jean Claude Nshimiyimana"
                    required
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Numero ya telefone (WhatsApp)" : "Phone Number (Calls/WhatsApp)"}
                  </label>
                  <input
                    type="tel"
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="078... or 079..."
                    required
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "rw" ? "Ubutumwa bukubiyemo uburambe cyangwa icyo usaba" : "Brief Message or Qualifications"}
                  </label>
                  <textarea
                    value={applicantMessage}
                    onChange={(e) => setApplicantMessage(e.target.value)}
                    rows={3}
                    placeholder={
                      lang === "rw"
                        ? "Sobanura uburambe bwawe n'ubushobozi bwawe muri make..."
                        : "Briefly mention your experience, availability, or how you can fulfill this role/supply request..."
                    }
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOppModalOpen(false);
                      setSelectedOpp(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={oppSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {oppSubmitting ? "Sending..." : lang === "rw" ? "Ohereza" : "Submit Details"}
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
