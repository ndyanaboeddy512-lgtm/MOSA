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
    id: "user-comm-admin",
    name: "Patrick Ndayisaba",
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
  switchDemoRole: (role: Role) => void;
  loginWithPhone: (phone: string, role?: Role) => Promise<{ success: boolean; otp: string }>;
  verifyOtp: (code: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  switchDemoRole: () => {},
  loginWithPhone: async () => ({ success: true, otp: "1234" }),
  verifyOtp: () => true,
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Default to Community Agent for rich out-of-the-box experience or Customer
  const [user, setUser] = useState<UserSession | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [expectedOtp, setExpectedOtp] = useState<string>("1234");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mosa_user_session");
      if (saved) {
        setUser(JSON.parse(saved));
      } else {
        // Initialize with Community Agent so full functionality is immediately accessible
        const defaultUser = {
          ...DEMO_USERS.COMMUNITY_AGENT,
          referralCode: "MOSA-BIR-77",
        };
        setUser(defaultUser);
        localStorage.setItem("mosa_user_session", JSON.stringify(defaultUser));
      }
    } catch {
      setUser(null);
    }
  }, []);

  const switchDemoRole = (role: Role) => {
    const demo = DEMO_USERS[role];
    const session: UserSession = {
      ...demo,
      referralCode: `MOSA-${demo.community.slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
    };
    setUser(session);
    if (typeof window !== "undefined") {
      localStorage.setItem("mosa_user_session", JSON.stringify(session));
    }
  };

  const loginWithPhone = async (phone: string, role: Role = "CUSTOMER") => {
    setPendingPhone(phone);
    const mockOtp = "7294"; // Deterministic demo OTP
    setExpectedOtp(mockOtp);
    return { success: true, otp: mockOtp };
  };

  const verifyOtp = (code: string) => {
    if (code === expectedOtp || code === "1234" || code.length === 4) {
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
      return true;
    }
    return false;
  };

  const logout = () => {
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
