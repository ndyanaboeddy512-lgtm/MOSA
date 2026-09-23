"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Role, UserSession } from "@/types";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  phone: string;
  community: string;
  assignedCell?: string;
  points: number;
  badges: string[];
}

export const DEMO_USERS: Record<Role, DemoUser> = {
  SUPER_ADMIN: {
    id: "user-super-admin",
    name: "Diane Uwera",
    role: "SUPER_ADMIN",
    phone: "+250788000001",
    community: "Kigali Central",
    points: 1500,
    badges: ["Super Administrator", "Governance Lead"],
  },
  COMMUNITY_ADMIN: {
    name: "Patrick Ndayisaba",
    id: "user-comm-admin",
    role: "COMMUNITY_ADMIN",
    phone: "+250788000002",
    community: "Nyamirambo Sector",
    assignedCell: "Nyamirambo",
    points: 850,
    badges: ["Sector Lead", "Community Organizer"],
  },
  COMMUNITY_AGENT: {
    id: "agent-1",
    name: "Emmanuel Hakizimana",
    role: "COMMUNITY_AGENT",
    phone: "+250788000003",
    community: "Biryogo",
    assignedCell: "Biryogo & Cosmos",
    points: 420,
    badges: ["Certified Agent", "Local Scout", "Quality Rank #1"],
  },
  BUSINESS_OWNER: {
    id: "user-owner-1",
    name: "Kevine Mukashyaka (Salon Owner)",
    role: "BUSINESS_OWNER",
    phone: "+250788123456",
    community: "Biryogo Car-Free Zone",
    points: 210,
    badges: ["Verified Business Owner", "Early Pioneer"],
  },
  CUSTOMER: {
    id: "user-customer-1",
    name: "Jean-Paul Mugisha",
    role: "CUSTOMER",
    phone: "+250788999888",
    community: "Cosmos, Nyamirambo",
    points: 120,
    badges: ["Neighborhood Explorer", "Top Reviewer"],
  },
  MODERATOR: {
    id: "user-mod-1",
    name: "Clarisse Keza",
    role: "MODERATOR",
    phone: "+250788555444",
    community: "Rwezamenyo",
    points: 390,
    badges: ["Trust Guardian", "Fact Checker"],
  },
};

interface AuthContextType {
  user: UserSession | null;
  switchDemoRole: (role: Role) => Promise<void>;
  loginWithPhone: (phone: string, role?: Role) => Promise<{ success: boolean; otp: string }>;
  loginWithPassword: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; user?: UserSession; error?: string }>;
  register: (data: { phone: string; password: string; name: string; role?: Role; community?: string }) => Promise<{ success: boolean; user?: UserSession; error?: string }>;
  verifyOtp: (code: string) => Promise<{ success: boolean; user?: UserSession }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  switchDemoRole: async () => {},
  loginWithPhone: async () => ({ success: true, otp: "1234" }),
  loginWithPassword: async () => ({ success: false, error: "Not implemented" }),
  register: async () => ({ success: false, error: "Not implemented" }),
  verifyOtp: async () => ({ success: true }),
  logout: async () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [expectedOtp, setExpectedOtp] = useState<string>("7294");

  useEffect(() => {
    async function initAuth() {
      // 1. Check if server already has active session cookie
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem("mosa_user_session", JSON.stringify(data.user));
            return;
          }
        }
      } catch {
        // Fallback to local
      }

      // 2. Check local storage (demo mode only)
      if (process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH === "true") {
        try {
          const saved = localStorage.getItem("mosa_user_session");
          if (saved) {
            const parsed = JSON.parse(saved);
            setUser(parsed);
            // Sync server cookie in background
            fetch("/api/auth/demo-switch", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: parsed.role }),
            }).catch(() => {});
            return;
          }
        } catch {
          // Continue to default
        }
      } else {
        localStorage.removeItem("mosa_user_session");
      }

      // 3. Unauthenticated guests remain unauthenticated (user = null)
      setUser(null);
    }

    initAuth();
  }, []);

  const switchDemoRole = async (role: Role) => {
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCH !== "true") {
      console.warn("[Auth]: Demo role switching is disabled in this environment.");
      return;
    }
    const demo = DEMO_USERS[role];
    const session: UserSession = {
      ...demo,
      referralCode: `MOSA-${demo.community.slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
    };
    setUser(session);
    if (typeof window !== "undefined") {
      localStorage.setItem("mosa_user_session", JSON.stringify(session));
    }

    // Set server HTTP-only cookie and PostgreSQL session
    try {
      await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    } catch (err) {
      console.warn("[Demo switch server sync error]:", err);
    }
  };

  const loginWithPhone = async (phone: string, role: Role = "CUSTOMER") => {
    setPendingPhone(phone);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, role }),
      });
      const data = await res.json();
      const code = data.code || "7294";
      setExpectedOtp(code);
      return { success: true, otp: code };
    } catch {
      const mockOtp = "7294";
      setExpectedOtp(mockOtp);
      return { success: true, otp: mockOtp };
    }
  };

  const verifyOtp = async (code: string): Promise<{ success: boolean; user?: UserSession }> => {
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: pendingPhone || "+250788999888",
          code,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("mosa_user_session", JSON.stringify(data.user));
          return { success: true, user: data.user };
        }
      }
    } catch (err) {
      console.warn("[Verify OTP server error, using fallback]:", err);
    }

    // Dev fallback ONLY in non-production environments when offline
    if (process.env.NODE_ENV !== "production" && (code === expectedOtp || code === "1234" || code === "7294")) {
      const session: UserSession = {
        id: `user-${Date.now()}`,
        name: "Verified Resident",
        phone: pendingPhone || "+250788000123",
        role: "CUSTOMER",
        community: "Nyamirambo",
        points: 50,
        badges: ["New Member"],
        referralCode: `MOSA-NYA-${Math.floor(100 + Math.random() * 900)}`,
      };
      setUser(session);
      if (typeof window !== "undefined") {
        localStorage.setItem("mosa_user_session", JSON.stringify(session));
      }
      return { success: true, user: session };
    }
    return { success: false };
  };

  const loginWithPassword = async (
    identifier: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; user?: UserSession; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier,
          phone: identifier,
          email: identifier.includes("@") ? identifier : undefined,
          password,
          rememberMe,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Invalid username, phone number, or password" };
      }
      if (data.user) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          if (rememberMe) {
            localStorage.setItem("mosa_user_session", JSON.stringify(data.user));
            sessionStorage.removeItem("mosa_user_session");
          } else {
            sessionStorage.setItem("mosa_user_session", JSON.stringify(data.user));
            localStorage.removeItem("mosa_user_session");
          }
        }
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during login" };
    }
  };

  const register = async (payload: { phone: string; password: string; name: string; role?: Role; community?: string }): Promise<{ success: boolean; user?: UserSession; error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }
      if (data.user) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("mosa_user_session", JSON.stringify(data.user));
        }
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during registration" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("mosa_user_session");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        switchDemoRole,
        loginWithPhone,
        loginWithPassword,
        register,
        verifyOtp,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
