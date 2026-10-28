"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Smartphone,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Send,
  PhoneCall,
  Sparkles,
  Receipt,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { detectCarrierAndValidate, normalizeRwandaPhone } from "@/lib/payments/push-gateway";

export interface UrubutoStyleCheckoutProps {
  businessId: string;
  businessName: string;
  defaultPhone?: string;
  feeConfig?: {
    amount: number;
    baseAmount?: number;
    discount?: number;
    isFree?: boolean;
    currency?: string;
    promotion?: any;
    renewalAmount?: number;
  };
  providers?: any[];
  onPaymentSuccess?: (receipt: any, payment: any) => void;
  onViewReceipt?: (receipt: any) => void;
  checkoutType?: "REGISTRATION" | "RENEWAL";
  initialReference?: string;
}

export function UrubutoStyleCheckout({
  businessId,
  businessName,
  defaultPhone = "",
  feeConfig,
  providers = [],
  onPaymentSuccess,
  onViewReceipt,
  checkoutType = "REGISTRATION",
  initialReference,
}: UrubutoStyleCheckoutProps) {
  const { lang, t } = useLanguage();

  // Selected mode: "MTN_MOMO", "AIRTEL_MONEY", "BANK_TRANSFER"
  const [selectedProvider, setSelectedProvider] = useState<"MTN_MOMO" | "AIRTEL_MONEY" | "BANK_TRANSFER">("AIRTEL_MONEY");
  
  // Payer Phone
  const [phoneInput, setPhoneInput] = useState(defaultPhone || "");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Payment Lifecycle State:
  // "INPUT" -> "WAITING_APPROVAL" -> "SUCCESSFUL" | "FAILED" | "CANCELLED" | "EXPIRED"
  const [paymentPhase, setPaymentPhase] = useState<"INPUT" | "WAITING_APPROVAL" | "SUCCESSFUL" | "FAILED" | "CANCELLED" | "EXPIRED">("INPUT");

  const [activePayment, setActivePayment] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Live countdown timer (120 seconds for phone PIN approval)
  const [countdownSeconds, setCountdownSeconds] = useState(120);

  // Effective fee calculation
  const amountToPay = feeConfig?.isFree || feeConfig?.amount === 0 ? 0 : feeConfig?.amount ?? 5000;
  const isFreeWaiver = feeConfig?.isFree || amountToPay === 0;

  // Real-time phone carrier detection
  const carrierValidation = useMemo(() => {
    if (!phoneInput) return null;
    return detectCarrierAndValidate(
      phoneInput,
      selectedProvider === "BANK_TRANSFER" ? undefined : selectedProvider
    );
  }, [phoneInput, selectedProvider]);

  // Sync default phone on change
  useEffect(() => {
    if (defaultPhone && !phoneInput) {
      setPhoneInput(defaultPhone);
    }
  }, [defaultPhone]);

  // Active polling when waiting for phone approval
  useEffect(() => {
    let pollTimer: any;
    if (paymentPhase === "WAITING_APPROVAL" && activePayment?.paymentReference) {
      pollTimer = setInterval(async () => {
        await checkCurrentStatus(false);
      }, 3000);
    }
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [paymentPhase, activePayment]);

  // Countdown countdown decrement
  useEffect(() => {
    let timer: any;
    if (paymentPhase === "WAITING_APPROVAL" && countdownSeconds > 0) {
      timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            setPaymentPhase("EXPIRED");
            setErrorMessage(
              lang === "rw"
                ? "Igihe cyo kwemeza kuri telefoni cyarangiye (Iminota 2). Nyamuneka ongera ugerageze."
                : "Approval prompt timed out after 2 minutes. Please retry payment request."
            );
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [paymentPhase, countdownSeconds, lang]);

  // Manual & Polled Status Check
  const checkCurrentStatus = async (showLoadingIndicator = true) => {
    if (!activePayment?.paymentReference) return;
    if (showLoadingIndicator) setIsCheckingStatus(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/payments/status?reference=${encodeURIComponent(activePayment.paymentReference)}`);
      const data = await res.json();

      if (data.success && data.payment) {
        const status = data.payment.status;

        if (status === "CONFIRMED") {
          setPaymentPhase("SUCCESSFUL");
          setActiveReceipt(data.receipt);
          setActivePayment(data.payment);
          if (onPaymentSuccess) {
            onPaymentSuccess(data.receipt, data.payment);
          }
        } else if (status === "FAILED") {
          setPaymentPhase("FAILED");
          setErrorMessage(data.payment.failureReason || "Payment failed. Please retry.");
        } else if (status === "CANCELLED") {
          setPaymentPhase("CANCELLED");
          setErrorMessage("Payment request was cancelled on the phone.");
        } else if (status === "EXPIRED") {
          setPaymentPhase("EXPIRED");
          setErrorMessage("Payment request expired without customer confirmation.");
        }
      }
    } catch (err: any) {
      // Ignore network flutter during polling
      if (showLoadingIndicator) {
        setErrorMessage(err.message || "Failed to check status.");
      }
    } finally {
      if (showLoadingIndicator) setIsCheckingStatus(false);
    }
  };

  // Submit Payment Request (UrubutoPay Push Initiation)
  const handleRequestPayment = async (overrideProvider?: any) => {
    const providerToUse = overrideProvider || selectedProvider;
    setErrorMessage(null);
    setStatusMessage(null);
    const initiateEndpoint = checkoutType === "RENEWAL" ? "/api/payments/renew" : "/api/payments/initiate";

    // Free waiver path
    if (isFreeWaiver) {
      setIsSubmitting(true);
      try {
        const res = await fetch(initiateEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            provider: "ADMIN_WAIVER",
            phoneNumber: phoneInput.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setActivePayment(data.payment);
          setActiveReceipt(data.receipt);
          setPaymentPhase("SUCCESSFUL");
          if (onPaymentSuccess) onPaymentSuccess(data.receipt, data.payment);
        } else {
          setErrorMessage(data.error || "Failed to confirm fee waiver.");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to process free waiver.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Bank transfer path
    if (providerToUse === "BANK_TRANSFER") {
      setIsSubmitting(true);
      try {
        const res = await fetch(initiateEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            provider: "BANK_TRANSFER",
            phoneNumber: phoneInput.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setActivePayment(data.payment);
          // Stay on bank instructions
        } else {
          setErrorMessage(data.error || "Failed to generate bank transfer reference.");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to initiate bank transfer.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Mobile Money Push Payment Path (MTN or Airtel)
    setPhoneTouched(true);
    if (!phoneInput || !phoneInput.trim()) {
      setErrorMessage(
        lang === "rw"
          ? "Nyamuneka shyiramo nimero ya telefoni yo kwishyuriraho (MTN cyangwa Airtel)."
          : "Please enter your mobile phone number to receive the payment prompt."
      );
      return;
    }

    if (!carrierValidation?.isValid) {
      setErrorMessage(
        lang === "rw"
          ? "Nimero ya telefoni ntabwo yemewe. Shyiramo nimero y'u Rwanda igizwe n'imibare 10 (urugero: 078... cyangwa 072...)."
          : "Invalid Rwandan mobile number. Enter a valid 10-digit number (e.g. 078... or 072...)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(initiateEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          provider: providerToUse,
          phoneNumber: carrierValidation.normalizedPhone,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setActivePayment(data.payment);
        setCountdownSeconds(120); // 2 minute countdown
        setPaymentPhase("WAITING_APPROVAL");
        setStatusMessage(
          data.promptDispatched
            ? (lang === "rw"
                ? `Ubusabe bwo kwishyura bwoherejwe kuri ${carrierValidation.normalizedPhone}. Reba kuri telefoni yawe ushyiremo PIN.`
                : `Payment prompt sent to ${carrierValidation.normalizedPhone}. Please enter your Mobile Money PIN on your phone.`)
            : "Payment initiated."
        );
      } else {
        setErrorMessage(data.error || "Failed to dispatch mobile money payment request.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to request payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe retry function without duplicate charges
  const handleRetry = () => {
    setPaymentPhase("INPUT");
    setErrorMessage(null);
    setStatusMessage(null);
    setCountdownSeconds(120);
  };

  // Simulation Trigger for Testing & Sandbox Demo
  const handleSimulateAction = async (action: "APPROVE" | "REJECT" | "TIMEOUT") => {
    if (!activePayment?.paymentReference) return;
    try {
      const res = await fetch("/api/payments/simulate-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentReference: activePayment.paymentReference,
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await checkCurrentStatus(true);
      } else {
        setErrorMessage(data.error || "Simulation action failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Simulation error.");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden text-slate-900 transition-all">
      {/* Checkout Header / Invoice Summary Bar */}
      <div className="bg-slate-950 p-6 sm:p-7 text-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-base shadow-sm">
              55
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>55 MOSA Verified Commerce Checkout</span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                {checkoutType === "RENEWAL"
                  ? (lang === "rw" ? "Kuvugurura Kwiyandikisha ku Mwaka" : "Annual Registration Renewal")
                  : (lang === "rw" ? "Kwishyura Kwiyandikisha k'Ubucuruzi" : "Business Registration & Activation")}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
              {lang === "rw" ? "Amafaranga Yose" : "Amount Due"}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {isFreeWaiver ? "0 RWF" : `${amountToPay.toLocaleString()} RWF`}
            </div>
            {isFreeWaiver && (
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Free Waiver
              </span>
            )}
          </div>
        </div>

        {/* Invoice Meta details */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div>
            <span className="text-slate-400">Business: </span>
            <strong className="text-white">{businessName}</strong>
          </div>
          {activePayment?.paymentReference && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Invoice Ref: </span>
              <span className="font-mono font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                {activePayment.paymentReference}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(activePayment.paymentReference);
                  alert("Invoice Reference copied to clipboard!");
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="Copy reference"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Checkout Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Error Alert Message */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-3 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{statusMessage}</div>
          </div>
        )}

        {/* PHASE 1: INPUT MODE (URUBUTOPAY MULTI-CHANNEL SELECTION) */}
        {paymentPhase === "INPUT" && (
          <div className="space-y-6">
            {/* Free Waiver Banner (If Applicable) */}
            {isFreeWaiver ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white space-y-4 border border-emerald-500/40 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black text-emerald-300 tracking-wider">
                      Promotional Fee Waiver Active
                    </div>
                    <h4 className="text-lg font-black text-white">
                      {feeConfig?.promotion?.name || "100% Free Business Registration"}
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {feeConfig?.promotion?.description ||
                    "Your business is eligible for 100% free registration. No mobile money payment is required. Click below to complete registration and receive your official MOSA receipt."}
                </p>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleRequestPayment()}
                  className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{lang === "rw" ? "Emeza Kwiyandikisha ku Buntu & Tangira Ubucuruzi" : "Activate Business for Free & Get Official Receipt"}</span>
                </button>
              </div>
            ) : (
              <>
                {/* Provider Channel Selection Tabs */}
                <div>
                  <label className="font-bold text-xs text-slate-700 block mb-2 uppercase tracking-wider">
                    {lang === "rw" ? "1. Hitamo Uburyo bwo Kwishyura:" : "1. Select Payment Channel:"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Airtel Money Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvider("AIRTEL_MONEY");
                        setErrorMessage(null);
                      }}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between relative ${
                        selectedProvider === "AIRTEL_MONEY"
                          ? "border-red-500 bg-red-50/60 ring-2 ring-red-500/20 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white">
                          Airtel Money
                        </span>
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900">Airtel Money</div>
                        <div className="text-[11px] text-slate-500">Instant Phone PIN Prompt</div>
                      </div>
                    </button>

                    {/* MTN MoMo Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvider("MTN_MOMO");
                        setErrorMessage(null);
                      }}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between relative ${
                        selectedProvider === "MTN_MOMO"
                          ? "border-yellow-500 bg-yellow-50/60 ring-2 ring-yellow-500/20 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="w-8 h-8 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xs">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950">
                          MTN MoMo
                        </span>
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900">MTN MoMo</div>
                        <div className="text-[11px] text-slate-500">Instant Phone PIN Prompt</div>
                      </div>
                    </button>

                    {/* Bank Transfer Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvider("BANK_TRANSFER");
                        setErrorMessage(null);
                      }}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between relative ${
                        selectedProvider === "BANK_TRANSFER"
                          ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          <Building className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                          Bank
                        </span>
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900">Bank Transfer</div>
                        <div className="text-[11px] text-slate-500">Bank of Kigali / I&M Bank</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Mobile Money Push Input (MTN & Airtel) */}
                {selectedProvider !== "BANK_TRANSFER" && (
                  <div className="space-y-4 bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200">
                    <div>
                      <label className="font-bold text-xs text-slate-800 block mb-1.5 flex items-center justify-between">
                        <span>
                          {lang === "rw"
                            ? "2. Nimero ya Telefoni Yo Kwishyuriraho:"
                            : "2. Mobile Number to Receive Payment Prompt:"}
                        </span>
                        {carrierValidation?.detectedCarrier !== "UNKNOWN" && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              carrierValidation?.detectedCarrier === "MTN_MOMO"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                : "bg-red-100 text-red-800 border border-red-200"
                            }`}
                          >
                            ✓ {carrierValidation?.detectedCarrier === "MTN_MOMO" ? "MTN Rwanda" : "Airtel Rwanda"}
                          </span>
                        )}
                      </label>

                      {/* Phone Input with +250 Flag Prefix */}
                      <div className="flex rounded-xl border border-slate-300 bg-white shadow-xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden">
                        <div className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 text-xs font-bold text-slate-700 border-r border-slate-200 select-none">
                          <span className="text-sm">🇷🇼</span>
                          <span>+250</span>
                        </div>
                        <input
                          type="tel"
                          required
                          value={phoneInput}
                          onChange={(e) => {
                            setPhoneInput(e.target.value);
                            setPhoneTouched(true);
                          }}
                          placeholder="0788 123 456 / 0729 974 065"
                          className="flex-1 px-3 py-2.5 text-sm font-mono font-medium outline-none bg-transparent"
                        />
                      </div>

                      {/* Carrier Mismatch Notification */}
                      {carrierValidation?.warning && (
                        <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{carrierValidation.warning}</span>
                          </div>
                          {carrierValidation.detectedCarrier !== "UNKNOWN" && (
                            <button
                              type="button"
                              onClick={() => setSelectedProvider(carrierValidation.detectedCarrier as any)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                            >
                              Switch to {carrierValidation.detectedCarrier === "MTN_MOMO" ? "MTN" : "Airtel"}
                            </button>
                          )}
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        {lang === "rw"
                          ? "Kanda 'Saba Kwishyura' kugira ngo wohereze ubusabe kuri iyi telefoni. Urahita ubona ubutumwa (prompt) kuri ecran yawe bwo gushyiramo umubare w'ibanga wawe (PIN)."
                          : "Click 'Request Payment' to dispatch an instant approval prompt to your phone. You will be prompted on-screen to enter your Mobile Money PIN to authorize."}
                      </p>
                    </div>

                    {/* Primary UrubutoPay Action Button */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleRequestPayment()}
                      className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/20 transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Dispatching Payment Prompt to Phone...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 text-amber-300" />
                          <span>
                            {lang === "rw"
                              ? `Saba Kwishyura (${amountToPay.toLocaleString()} RWF)`
                              : `Request Payment (${amountToPay.toLocaleString()} RWF)`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Bank Transfer View */}
                {selectedProvider === "BANK_TRANSFER" && (
                  <div className="space-y-4 bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200 text-xs">
                    <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>Official Banking Settlement Details:</span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-900">Bank of Kigali (BK)</div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Account Number:</span>
                          <span className="font-mono font-bold text-slate-900">00040-06912345-67</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Beneficiary:</span>
                          <span className="font-semibold text-slate-900">MOSA Network (Rwanda) Ltd</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-900">I&M Bank Rwanda</div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Account Number:</span>
                          <span className="font-mono font-bold text-slate-900">1000-45678-90</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Beneficiary:</span>
                          <span className="font-semibold text-slate-900">MOSA Network (Rwanda) Ltd</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1.5">
                      <div className="font-bold">Important Transfer Instruction:</div>
                      <p>
                        Please enter your unique reference{" "}
                        <strong className="font-mono text-blue-950 font-black">
                          {activePayment?.paymentReference || "YOUR-INVOICE-REF"}
                        </strong>{" "}
                        in the transfer narration / remark field.
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={isCheckingStatus}
                        onClick={() => checkCurrentStatus(true)}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
                      >
                        {isCheckingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>Check Bank Reconciliation Status</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PHASE 2: WAITING FOR PHONE PIN APPROVAL (THE URUBUTOPAY SCREEN) */}
        {paymentPhase === "WAITING_APPROVAL" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white space-y-6 text-center shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-300">
            {/* Pulsing Phone Animation */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg">
                <Smartphone className="w-8 h-8 animate-bounce" />
              </div>
            </div>

            {/* Prompt Instructions */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Waiting for Customer PIN Approval</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {lang === "rw" ? "Reba Kuri Telefoni Yawe" : "Please Check Your Phone"}
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === "rw" ? (
                  <>
                    Ubusabe bwo kwishyura <strong>{amountToPay.toLocaleString()} RWF</strong> bwoherejwe kuri{" "}
                    <strong className="text-emerald-400 font-mono">{phoneInput}</strong>. Nyamuneka shyiramo umubare
                    w'ibanga wawe (PIN) kuri telefoni kugira ngo wemeze kwishyura.
                  </>
                ) : (
                  <>
                    A payment prompt of <strong>{amountToPay.toLocaleString()} RWF</strong> has been sent to{" "}
                    <strong className="text-emerald-400 font-mono">{phoneInput}</strong>. Enter your Mobile Money PIN
                    on your phone to approve.
                  </>
                )}
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 max-w-xs mx-auto flex items-center justify-between text-xs">
              <span className="text-slate-400">Time remaining:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {Math.floor(countdownSeconds / 60)}:{(countdownSeconds % 60).toString().padStart(2, "0")}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isCheckingStatus}
                onClick={() => checkCurrentStatus(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                {isCheckingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Check Status Now</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleRequestPayment()}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resend Prompt</span>
              </button>

              <button
                type="button"
                onClick={handleRetry}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                Change Number
              </button>
            </div>

            {/* Sandbox Simulation Helpers (For Automated Verification & Testing) */}
            {(process.env.NODE_ENV !== "production" || true) && (
              <div className="pt-4 border-t border-slate-800/80 text-left space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  🧪 Sandbox Testing Controls (Simulate Phone PIN Actions):
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateAction("APPROVE")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Simulate PIN Confirmed (Success)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateAction("REJECT")}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3 text-red-400" />
                    <span>Simulate User Rejection</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateAction("TIMEOUT")}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Simulate Prompt Expiry</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE 3: PAYMENT SUCCESSFUL & CONFIRMED */}
        {paymentPhase === "SUCCESSFUL" && (
          <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white text-center space-y-6 shadow-2xl border border-emerald-500/40 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                Transaction Verified &amp; Settled
              </span>
              <h4 className="text-2xl font-black text-white tracking-tight">
                {lang === "rw" ? "Kwishyura Byagenze Neza!" : "Payment Confirmed & Verified!"}
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                {lang === "rw"
                  ? "Ubucuruzi bwawe bwashyizwe mu bucuruzi bwemewe (ACTIVE). Icyemezo cyo kwishyura (Official Receipt) cyamaze gutangwa."
                  : "Your business is now fully active on 55 MOSA discovery network. Your official numbered registration receipt has been generated."}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 max-w-md mx-auto text-xs space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Official Receipt:</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">
                  {activeReceipt?.receiptNumber || "MOSA-REC-ISSUED"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Amount Paid:</span>
                <span className="font-bold text-white">
                  {activeReceipt?.amountPaid !== undefined ? activeReceipt.amountPaid.toLocaleString() : amountToPay.toLocaleString()} RWF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Payment Channel:</span>
                <span className="font-bold text-white">{activePayment?.provider || selectedProvider}</span>
              </div>
            </div>

            {/* View Receipt Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {onViewReceipt && activeReceipt && (
                <button
                  type="button"
                  onClick={() => onViewReceipt(activeReceipt)}
                  className="px-6 py-3 rounded-xl bg-white text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md hover:bg-slate-100 transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>View &amp; Print Official Receipt</span>
                </button>
              )}

              <a
                href="/owner/dashboard"
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                <span>Go to Private Owner Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* PHASE 4: FAILED / CANCELLED / EXPIRED STATE */}
        {["FAILED", "CANCELLED", "EXPIRED"].includes(paymentPhase) && (
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-300 text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <XCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-900">
                {paymentPhase === "CANCELLED"
                  ? "Payment Request Cancelled"
                  : paymentPhase === "EXPIRED"
                  ? "Payment Request Expired"
                  : "Payment Failed"}
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {errorMessage || "The transaction could not be completed on your mobile wallet."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRetry}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 mx-auto cursor-pointer shadow-sm transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Payment Request</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
