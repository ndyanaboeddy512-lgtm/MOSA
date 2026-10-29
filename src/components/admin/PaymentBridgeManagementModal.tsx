"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Shield,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Battery,
  BatteryCharging,
  Wifi,
  Copy,
  Check,
  Plus,
  Trash2,
  Key,
  Edit2,
  FileText,
  Lock,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Radio,
  Globe,
  RotateCcw,
  Server,
  ShieldCheck,
} from "lucide-react";

interface DomainConfigState {
  canonicalUrl: string;
  status: "ACTIVE" | "PENDING_VERIFICATION" | "VERIFIED" | "FAILED_VERIFICATION" | "ROLLED_BACK";
  pendingCustomDomain: string | null;
  verificationToken: string | null;
  verificationMethod: string | null;
  verifiedAt: string | null;
  rollbackUrl: string | null;
  approvedDomains: string[];
  diagnostics: string | null;
}

interface BridgeDevice {
  id: string;
  name: string;
  deviceId: string;
  simPhoneNumber?: string | null;
  carrier: string;
  status: "PENDING_PAIRING" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  batteryLevel?: number | null;
  isCharging?: boolean;
  networkType?: string | null;
  appVersion?: string | null;
  pairingCode?: string;
  pairingExpiresAt?: string;
  lastHeartbeatAt?: string | null;
  lastSyncAt?: string | null;
  enrolledAt?: string | null;
  enrolledBy?: { id: string; name: string; email: string } | null;
  revokedAt?: string | null;
  revokedBy?: { id: string; name: string; email: string } | null;
  revokedReason?: string | null;
  createdAt: string;
}

interface PaymentProvider {
  id: string;
  provider: string;
  name: string;
  isEnabled: boolean;
  accountNumber?: string | null;
  accountName?: string | null;
  instructions?: string | null;
  instructionsRw?: string | null;
  updatedAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; email: string; role: string } | null;
}

interface PaymentBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentBridgeManagementModal({ isOpen, onClose }: PaymentBridgeModalProps) {
  const [activeTab, setActiveTab] = useState<"terminal" | "destinations" | "domain" | "enroll" | "history" | "audit">("terminal");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [devices, setDevices] = useState<BridgeDevice[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Domain configuration & migration state
  const [domainConfig, setDomainConfig] = useState<DomainConfigState | null>(null);
  const [domainAuditHistory, setDomainAuditHistory] = useState<any[]>([]);
  const [inputCustomDomain, setInputCustomDomain] = useState("https://mosa.rw");
  const [rollbackReason, setRollbackReason] = useState("");

  // Enrollment form state
  const [newDeviceName, setNewDeviceName] = useState("Primary Airtel Money Android Terminal");
  const [newSimNumber, setNewSimNumber] = useState("+250729974065");
  const [newCarrier, setNewCarrier] = useState("Airtel Rwanda");
  const [latestChallenge, setLatestChallenge] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [serverUrl, setServerUrl] = useState("https://mosa-one.vercel.app");
  const [pairingExpiryMinutes, setPairingExpiryMinutes] = useState(15);

  // Edit SIM form state
  const [editingDevice, setEditingDevice] = useState<BridgeDevice | null>(null);
  const [editSimPhone, setEditSimPhone] = useState("");
  const [editDeviceName, setEditDeviceName] = useState("");

  // Revocation state
  const [revokingDevice, setRevokingDevice] = useState<BridgeDevice | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Provider destination edit state
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null);
  const [providerAccount, setProviderAccount] = useState("");
  const [providerAccountName, setProviderAccountName] = useState("");
  const [providerInstructions, setProviderInstructions] = useState("");
  const [providerEnabled, setProviderEnabled] = useState(true);

  const fetchBridgeData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices");
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
        setProviders(data.providers || []);
        setAuditLogs(data.auditLogs || []);
        if (data.serverUrl) {
          setServerUrl(data.serverUrl);
        } else if (typeof window !== "undefined") {
          setServerUrl(window.location.origin);
        }
        if (data.domainConfig) {
          setDomainConfig(data.domainConfig);
          if (data.domainConfig.pendingCustomDomain) {
            setInputCustomDomain(data.domainConfig.pendingCustomDomain);
          }
        }
        if (data.domainAuditHistory) {
          setDomainAuditHistory(data.domainAuditHistory);
        }
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to load bridge devices." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error loading bridge data." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_CUSTOM_DOMAIN",
          customDomain: inputCustomDomain.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to submit custom domain." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyCustomDomain = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_CUSTOM_DOMAIN",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.message || data.error || "Verification failed." });
        fetchBridgeData();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error verifying domain." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateCustomDomain = async () => {
    if (!confirm(`Are you sure you want to activate "${domainConfig?.pendingCustomDomain}" as the canonical production endpoint for MOSA? All payment bridge terminals will migrate automatically on their next heartbeat.`)) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTIVATE_CUSTOM_DOMAIN",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to activate domain." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollbackCustomDomain = async () => {
    if (!confirm(`Are you sure you want to rollback the canonical endpoint to "${domainConfig?.rollbackUrl || "https://mosa-one.vercel.app"}"?`)) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ROLLBACK_CUSTOM_DOMAIN",
          reason: rollbackReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setRollbackReason("");
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to rollback domain." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error." });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBridgeData();
      setFeedback(null);
    }
  }, [isOpen]);

  const activeDevice = devices.find((d) => d.status === "ACTIVE");
  const pendingDevices = devices.filter((d) => d.status === "PENDING_PAIRING");

  const handleCreatePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_PAIRING",
          name: newDeviceName.trim(),
          simPhoneNumber: newSimNumber.trim() || undefined,
          carrier: newCarrier.trim(),
          expiryMinutes: pairingExpiryMinutes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLatestChallenge(data.challenge);
        setFeedback({ type: "success", message: data.message });
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to generate pairing challenge." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRePair = async (device: BridgeDevice) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RE_PAIR_TERMINAL",
          deviceId: device.deviceId,
          expiryMinutes: pairingExpiryMinutes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLatestChallenge(data.challenge);
        setFeedback({ type: "success", message: data.message });
        setActiveTab("enroll");
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to generate re-pairing challenge." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPairing = async (deviceId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EXPIRE_PAIRING",
          deviceId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        if (latestChallenge?.deviceId === deviceId) {
          setLatestChallenge(null);
        }
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDeviceEdit = async () => {
    if (!editingDevice) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_DEVICE",
          deviceId: editingDevice.deviceId,
          name: editDeviceName.trim() || editingDevice.name,
          simPhoneNumber: editSimPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: "Device and SIM details updated successfully." });
        setEditingDevice(null);
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRevocation = async () => {
    if (!revokingDevice) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVOKE_DEVICE",
          deviceId: revokingDevice.deviceId,
          reason: revokeReason.trim() || "Revoked by Administrator",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setRevokingDevice(null);
        setRevokeReason("");
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProviderDestination = async () => {
    if (!editingProvider) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/payments/bridge/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PROVIDER_DESTINATION",
          provider: editingProvider.provider,
          name: editingProvider.name,
          accountNumber: providerAccount.trim(),
          accountName: providerAccountName.trim(),
          instructions: providerInstructions.trim(),
          isEnabled: providerEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setEditingProvider(null);
        fetchBridgeData();
      } else {
        setFeedback({ type: "error", message: data.error });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-emerald-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">Payment Bridge &amp; SIM Control</h2>
                {activeDevice ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Terminal Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertTriangle className="w-3 h-3" />
                    No Active Terminal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Replaceable Android terminals, receiving MTN SIM cards, and payment destinations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBridgeData}
              disabled={loading}
              title="Refresh Terminal Data"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer font-bold opacity-60 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-slate-50 flex items-center gap-1 overflow-x-auto">
          {[
            { id: "terminal", label: "Active Terminal & SIM", icon: Smartphone },
            { id: "destinations", label: "Payment Destinations", icon: Sliders },
            {
              id: "domain",
              label: "Custom Domain & Migration",
              icon: Globe,
              badge:
                domainConfig?.status === "PENDING_VERIFICATION"
                  ? "Verify"
                  : domainConfig?.status === "VERIFIED"
                  ? "Ready"
                  : null,
            },
            { id: "enroll", label: "Enroll Replacement Phone", icon: Plus, badge: pendingDevices.length > 0 ? pendingDevices.length : null },
            { id: "history", label: "Terminal History", icon: Clock },
            { id: "audit", label: "Audit Trail", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-emerald-600 text-emerald-800 bg-white shadow-2xs"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600" : "text-slate-500"}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* TAB 1: ACTIVE TERMINAL & SIM */}
          {activeTab === "terminal" && (
            <div className="space-y-6">
              {activeDevice ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                  {/* Status Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Enrolled Bridge Terminal</div>
                      <h3 className="text-xl font-black text-slate-900 mt-0.5">{activeDevice.name}</h3>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {activeDevice.deviceId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRePair(activeDevice)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        title="Generate a new one-time pairing code for this terminal without creating duplicate records"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-700" />
                        <span>Re-Pair Terminal</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingDevice(activeDevice);
                          setEditDeviceName(activeDevice.name);
                          setEditSimPhone(activeDevice.simPhoneNumber || "");
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit SIM / Details</span>
                      </button>
                      <button
                        onClick={() => setRevokingDevice(activeDevice)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke Terminal</span>
                      </button>
                    </div>
                  </div>

                  {/* Backend Connection & Guided Setup Banner */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5" />
                          <span>Authorized MOSA Backend Connection URL</span>
                        </div>
                        <div className="font-mono text-sm font-bold text-slate-100 mt-0.5 select-all">
                          {serverUrl}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(serverUrl)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Copied!" : "Copy Backend URL"}</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                      <div><strong>App Package:</strong> <span className="font-mono text-emerald-300">rw.mosa.paymentbridge.debug</span></div>
                      <div><strong>Target Version:</strong> <span className="font-semibold text-white">v1.1.0 (Signed APK)</span></div>
                      <div><strong>Upgrade Compatibility:</strong> <span className="text-emerald-400 font-semibold">In-Place (No Data Loss)</span></div>
                    </div>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receiving SIM Card</div>
                      <div className="text-sm font-black text-slate-800 mt-1 font-mono">
                        {activeDevice.simPhoneNumber || "Not Set"}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{activeDevice.carrier}</div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Battery Status</div>
                      <div className="text-sm font-black text-slate-800 mt-1 flex items-center gap-1.5">
                        {activeDevice.isCharging ? (
                          <BatteryCharging className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Battery className="w-4 h-4 text-slate-600" />
                        )}
                        <span>{activeDevice.batteryLevel !== null ? `${activeDevice.batteryLevel}%` : "Unknown"}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {activeDevice.isCharging ? "⚡ AC Connected" : "On Battery"}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Network &amp; App</div>
                      <div className="text-sm font-black text-slate-800 mt-1 flex items-center gap-1.5">
                        <Wifi className="w-4 h-4 text-blue-600" />
                        <span>{activeDevice.networkType || "Wi-Fi"}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        v{activeDevice.appVersion || "1.0.0"} (Kotlin)
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Telemetry</div>
                      <div className="text-sm font-black text-slate-800 mt-1">
                        {activeDevice.lastHeartbeatAt
                          ? new Date(activeDevice.lastHeartbeatAt).toLocaleTimeString()
                          : "Just now"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {activeDevice.lastHeartbeatAt
                          ? new Date(activeDevice.lastHeartbeatAt).toLocaleDateString()
                          : "Live"}
                      </div>
                    </div>
                  </div>

                  {/* Architecture & Financial Safeguards Box */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span>MOSA Backend Authoritative Guarantee</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      This Android terminal forwards incoming MTN Mobile Money SMS notifications as raw transaction evidence.
                      The MOSA server verifies the amount, unique payment reference, and telecom transaction ID before issuing
                      any registration receipt or activating services.
                    </p>
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      Replacing this phone or swapping the SIM card does not alter historical receipts or accounting records.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">No Active Android Bridge Phone</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      No Android smartphone is currently enrolled to forward MTN MoMo notifications. Generate a one-time
                      pairing code to link a company phone.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("enroll")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enroll Bridge Phone Now</span>
                  </button>
                </div>
              )}

              {/* Pending Pairing Section (if any) */}
              {pendingDevices.length > 0 && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Pending Terminal Pairing Codes
                      </span>
                    </div>
                    <span className="text-xs text-amber-700 font-semibold">{pendingDevices.length} active code(s)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingDevices.map((p) => (
                      <div key={p.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800">{p.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            Expires: {p.pairingExpiresAt ? new Date(p.pairingExpiresAt).toLocaleTimeString() : "15m"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="font-mono text-base font-black text-emerald-700 tracking-wider">
                            {p.pairingCode}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyToClipboard(p.pairingCode || "")}
                              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                              title="Copy Pairing Code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelPairing(p.deviceId)}
                              className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition cursor-pointer"
                              title="Cancel / Invalidate Code"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENT DESTINATIONS */}
          {activeTab === "destinations" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Supported Payment Destinations</h3>
                    <p className="text-xs text-slate-500">
                      Configure the official MTN MoMo numbers, merchant codes, and bank accounts displayed to customers.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {providers.map((prov) => (
                    <div
                      key={prov.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              prov.isEnabled ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          <div>
                            <span className="font-bold text-sm text-slate-900">{prov.name}</span>
                            <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">
                              {prov.provider}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingProvider(prov);
                            setProviderAccount(prov.accountNumber || "");
                            setProviderAccountName(prov.accountName || "");
                            setProviderInstructions(prov.instructions || "");
                            setProviderEnabled(prov.isEnabled);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Configure Destination</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Receiving Number / Code
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {prov.accountNumber || "Not configured"}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Account Name
                          </span>
                          <span className="font-bold text-slate-800">{prov.accountName || "MOSA"}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Status
                          </span>
                          <span
                            className={`font-bold ${prov.isEnabled ? "text-emerald-700" : "text-slate-400"}`}
                          >
                            {prov.isEnabled ? "Active & Accepting Payments" : "Disabled"}
                          </span>
                        </div>
                      </div>

                      {prov.instructions && (
                        <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-700">Instructions shown to payer:</span>{" "}
                          {prov.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CUSTOM DOMAIN & MIGRATION */}
          {activeTab === "domain" && (
            <div className="space-y-6">
              {/* Active Canonical Endpoint Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Canonical Production Endpoint</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Globe className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-xl font-mono font-black text-slate-900">
                        {domainConfig?.canonicalUrl || "https://mosa-one.vercel.app"}
                      </h3>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(domainConfig?.canonicalUrl || "https://mosa-one.vercel.app");
                          setFeedback({ type: "success", message: "Canonical URL copied to clipboard!" });
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Authoritative URL used by Android Bridge terminals, payer checkouts, and public APIs.
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        domainConfig?.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : domainConfig?.status === "VERIFIED"
                          ? "bg-blue-100 text-blue-800"
                          : domainConfig?.status === "PENDING_VERIFICATION"
                          ? "bg-amber-100 text-amber-800"
                          : domainConfig?.status === "ROLLED_BACK"
                          ? "bg-slate-100 text-slate-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {domainConfig?.status || "ACTIVE"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Zero-rebuild migration enabled
                    </span>
                  </div>
                </div>

                {/* Approved Domains List */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Explicitly Approved Trusted Domains:</span>
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Broad *.vercel.app disabled
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(domainConfig?.approvedDomains || ["mosa-one.vercel.app", "mosa.rw", "*.mosa.rw"]).map((d) => (
                      <span
                        key={d}
                        className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Domain Migration & Verification Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-600" />
                    Migrate to Custom Domain
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Transition MOSA to its canonical custom domain (e.g. <code className="font-mono text-slate-700 font-bold">https://mosa.rw</code>). 
                    The Android Bridge will automatically re-point upon receiving configuration without requiring physical device reinstallation.
                  </p>
                </div>

                <form onSubmit={handleSubmitCustomDomain} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Production Domain (HTTPS only)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={inputCustomDomain}
                        onChange={(e) => setInputCustomDomain(e.target.value)}
                        placeholder="https://mosa.rw"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {actionLoading ? "Generating..." : "Generate Challenge"}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Challenge Details */}
                {domainConfig?.verificationToken && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-600" />
                        Domain Ownership Verification Challenge
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          domainConfig.status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {domainConfig.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-bold block mb-0.5">Option A: DNS TXT Record</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono">
                            <span className="text-[10px] text-slate-400 block font-sans">Host:</span>
                            _mosa-challenge.{domainConfig.pendingCustomDomain?.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono break-all flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">Value:</span>
                              {domainConfig.verificationToken}
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(domainConfig.verificationToken || "");
                                setFeedback({ type: "success", message: "Verification token copied!" });
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {domainConfig.diagnostics && (
                        <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-2.5 text-[11px] font-mono">
                          <span className="font-bold font-sans">Diagnostics:</span> {domainConfig.diagnostics}
                        </div>
                      )}
                    </div>

                    {/* Verification Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={handleVerifyCustomDomain}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                        Verify Domain Now
                      </button>

                      <button
                        onClick={handleActivateCustomDomain}
                        disabled={actionLoading || domainConfig.status !== "VERIFIED"}
                        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                          domainConfig.status === "VERIFIED"
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                        title={domainConfig.status === "VERIFIED" ? "Activate verified custom domain" : "Domain must pass verification before activation"}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Activate Custom Domain
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Safe Rollback Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-slate-600" />
                      Safe Endpoint Rollback
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Instantly revert to the previous verified endpoint (or default Vercel URL) if DNS or certificate issues arise.
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200">
                    Target: {domainConfig?.rollbackUrl || "https://mosa-one.vercel.app"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rollbackReason}
                    onChange={(e) => setRollbackReason(e.target.value)}
                    placeholder="Optional rollback rationale (e.g. DNS propagation delay)"
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={handleRollbackCustomDomain}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rollback to Previous URL
                  </button>
                </div>
              </div>

              {/* Migration Audit Trail */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Domain Migration Audit Trail
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {domainAuditHistory.length} recorded events
                  </span>
                </div>

                {domainAuditHistory.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No domain migration events recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                          <th className="pb-2">Action</th>
                          <th className="pb-2">Admin Actor</th>
                          <th className="pb-2">Details</th>
                          <th className="pb-2 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {domainAuditHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-bold font-mono text-emerald-800">
                              {item.action}
                            </td>
                            <td className="py-2.5 font-semibold text-slate-700">
                              {item.actor?.name || "System Administrator"}
                            </td>
                            <td className="py-2.5 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                              {item.metadata || "—"}
                            </td>
                            <td className="py-2.5 text-right text-slate-400 font-mono text-[11px]">
                              {new Date(item.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ENROLL REPLACEMENT PHONE */}
          {activeTab === "enroll" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900">Enroll a Replacement or New Bridge Phone</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate an 8-character one-time pairing code to pair a physical Android smartphone running the MOSA Payment Bridge APK.
                  </p>
                </div>

                {/* Backend Connection & Guided Setup Banner */}
                <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5" />
                        <span>Authorized MOSA Backend Connection URL</span>
                      </div>
                      <div className="font-mono text-sm font-bold text-slate-100 mt-0.5 select-all">
                        {serverUrl}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(serverUrl)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied!" : "Copy Backend URL"}</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1 pt-2 border-t border-slate-800">
                    <div className="font-bold text-white">Setup Instructions for Terminal Operator:</div>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                      <li>Install or upgrade <span className="font-mono text-emerald-300">app-debug.apk</span> (v1.1.0, Package: <span className="font-mono">rw.mosa.paymentbridge.debug</span>).</li>
                      <li>Open the app and verify the MOSA Server URL matches the URL above.</li>
                      <li>Enter the pairing code generated below and tap <strong>Pair Device &amp; Activate Terminal</strong>.</li>
                      <li>Grant SMS permissions and accept the battery-optimization exemption prompt.</li>
                    </ol>
                  </div>
                </div>

                <form onSubmit={handleCreatePairing} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Device Friendly Name</label>
                      <input
                        type="text"
                        value={newDeviceName}
                        onChange={(e) => setNewDeviceName(e.target.value)}
                        placeholder="e.g. Primary Hub Phone - MTN SIM 1"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Receiving SIM Number (Optional)</label>
                      <input
                        type="text"
                        value={newSimNumber}
                        onChange={(e) => setNewSimNumber(e.target.value)}
                        placeholder="e.g. +250 788 123 456"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Telecom Carrier</label>
                      <select
                        value={newCarrier}
                        onChange={(e) => setNewCarrier(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      >
                        <option value="MTN Rwanda">MTN Rwanda (MoMo *182#)</option>
                        <option value="Airtel Rwanda">Airtel Rwanda (Airtel Money)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pairing Code Lifetime</label>
                      <select
                        value={pairingExpiryMinutes}
                        onChange={(e) => setPairingExpiryMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      >
                        <option value={15}>15 Minutes (Default - High Security)</option>
                        <option value={30}>30 Minutes</option>
                        <option value={60}>60 Minutes (Field Deployment)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{actionLoading ? "Generating Code..." : "Generate One-Time Pairing Code"}</span>
                  </button>
                </form>

                {/* Newly Generated Challenge Card */}
                {latestChallenge && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 text-center space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-900">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>One-Time Pairing Code Ready</span>
                    </div>

                    <div className="py-2">
                      <div className="text-3xl font-black font-mono tracking-widest text-emerald-900 select-all">
                        {latestChallenge.pairingCode}
                      </div>
                      <div className="text-xs text-emerald-700 mt-1 font-semibold">
                        Expires in 15 minutes ({new Date(latestChallenge.pairingExpiresAt).toLocaleTimeString()})
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => copyToClipboard(latestChallenge.pairingCode)}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? "Copied to Clipboard!" : "Copy Pairing Code"}</span>
                      </button>
                    </div>

                    <div className="bg-white/80 p-4 rounded-xl text-left text-xs text-slate-700 space-y-2 border border-emerald-200">
                      <div className="font-bold text-slate-900">Operator Setup Instructions:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Step 1: MOSA Server URL</div>
                          <div className="font-mono font-bold text-slate-800 text-xs mt-0.5 select-all">{serverUrl}</div>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Step 2: Pairing Code</div>
                          <div className="font-mono font-bold text-emerald-800 text-xs mt-0.5 select-all">{latestChallenge.pairingCode}</div>
                        </div>
                      </div>
                      <div className="text-slate-600 text-[11px] pt-1">
                        Tap <strong>Pair Device &amp; Activate Terminal</strong> on the phone. The device will be cryptographically enrolled into MOSA Command Center.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TERMINAL HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Enrolled Hardware History</h3>
                  <p className="text-xs text-slate-500">
                    Audit log of all Android phones ever enrolled, replaced, or revoked. Historical receipts and transactions remain permanently preserved.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Device / Name</th>
                        <th className="py-2.5 px-3">Hardware ID</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">SIM Number</th>
                        <th className="py-2.5 px-3">Enrolled At</th>
                        <th className="py-2.5 px-3">Revoked Details</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {devices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            No devices recorded.
                          </td>
                        </tr>
                      ) : (
                        devices.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800">{d.name}</div>
                              <div className="text-[11px] text-slate-400">{d.carrier}</div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{d.deviceId}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  d.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : d.status === "PENDING_PAIRING"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {d.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                              {d.simPhoneNumber || "—"}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {d.enrolledAt ? new Date(d.enrolledAt).toLocaleDateString() : "Pending"}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {d.status === "REVOKED" ? (
                                <div>
                                  <div className="text-red-700 font-semibold">{d.revokedReason || "Revoked"}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {d.revokedAt ? new Date(d.revokedAt).toLocaleDateString() : ""}
                                  </div>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {d.status === "ACTIVE" && (
                                <button
                                  onClick={() => setRevokingDevice(d)}
                                  className="text-red-600 hover:text-red-800 font-bold text-[11px] cursor-pointer"
                                >
                                  Revoke
                                </button>
                              )}
                              {d.status === "PENDING_PAIRING" && (
                                <button
                                  onClick={() => handleCancelPairing(d.deviceId)}
                                  className="text-amber-700 hover:text-amber-900 font-bold text-[11px] cursor-pointer"
                                >
                                  Cancel Code
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Security &amp; Management Audit Trail</h3>
                  <p className="text-xs text-slate-500">
                    Immutable history of all device enrollments, SIM replacements, pairing code generations, and destination updates.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Administrator</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Entity</th>
                        <th className="py-2.5 px-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No audit log entries recorded yet.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800">{log.actor?.name || "System"}</div>
                              <div className="text-[10px] text-slate-400">{log.actor?.email}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{log.entityType}</td>
                            <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={log.metadata || ""}>
                              {log.metadata || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: EDIT SIM & DEVICE DETAILS */}
        {editingDevice && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">Update Receiving SIM &amp; Details</h4>
                <button
                  onClick={() => setEditingDevice(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Device Friendly Name</label>
                  <input
                    type="text"
                    value={editDeviceName}
                    onChange={(e) => setEditDeviceName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receiving MTN SIM Phone Number</label>
                  <input
                    type="text"
                    value={editSimPhone}
                    onChange={(e) => setEditSimPhone(e.target.value)}
                    placeholder="+250 788 123 456"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Updating this phone number updates the office inventory and audit logs without requiring a phone re-enrollment.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingDevice(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDeviceEdit}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save SIM Details"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: REVOKE CONFIRMATION */}
        {revokingDevice && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-red-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Revoke Terminal Authorization</h4>
                  <div className="text-xs text-slate-500 font-mono">{revokingDevice.deviceId}</div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Revoking this Android phone will immediately blacklist its bearer token and HMAC signing secret. The phone will no longer be able to submit payment evidence.
              </p>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 font-semibold">
                🛡️ <strong>Zero Data Loss:</strong> All historical transactions, receipts, and audit history remain permanently intact in the MOSA PostgreSQL database.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Revocation</label>
                <input
                  type="text"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Phone damaged, replaced with new model, lost"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRevokingDevice(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRevocation}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Revoking..." : "Confirm Revocation"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT PAYMENT PROVIDER DESTINATION */}
        {editingProvider && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">
                  Configure Payment Destination: {editingProvider.name}
                </h4>
                <button
                  onClick={() => setEditingProvider(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Receiving Number / Merchant Code
                    </label>
                    <input
                      type="text"
                      value={providerAccount}
                      onChange={(e) => setProviderAccount(e.target.value)}
                      placeholder="e.g. *182*8*1*123456# or 0788123456"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={providerAccountName}
                      onChange={(e) => setProviderAccountName(e.target.value)}
                      placeholder="e.g. MOSA Network Ltd"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payer Instructions (USSD / Steps)</label>
                  <textarea
                    rows={2}
                    value={providerInstructions}
                    onChange={(e) => setProviderInstructions(e.target.value)}
                    placeholder="Dial *182*8*1*123456# and enter the reference number..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="providerEnabledCheck"
                    checked={providerEnabled}
                    onChange={(e) => setProviderEnabled(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <label htmlFor="providerEnabledCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Enable this payment destination for registration &amp; renewal checkouts
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setEditingProvider(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProviderDestination}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Destination Details"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
