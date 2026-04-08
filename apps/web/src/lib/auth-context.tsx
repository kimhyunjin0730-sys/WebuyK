"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "./api-client";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  mailboxNo: string | null;
}

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: {
    email: string;
    password: string;
    displayName: string;
    countryCode?: string;
  }) => Promise<void>;
  /** Used by the /auth/callback page after an OAuth redirect. */
  acceptToken: (token: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("wbk_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api<SessionUser>("/me");
      setUser(me);
    } catch {
      window.localStorage.removeItem("wbk_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: SessionUser }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    window.localStorage.setItem("wbk_token", res.accessToken);
    setUser(res.user);
  };

  const signup: AuthCtx["signup"] = async (input) => {
    const res = await api<{ accessToken: string; user: SessionUser }>(
      "/auth/signup",
      { method: "POST", body: JSON.stringify(input) },
    );
    window.localStorage.setItem("wbk_token", res.accessToken);
    setUser(res.user);
  };

  const acceptToken = async (token: string) => {
    window.localStorage.setItem("wbk_token", token);
    setLoading(true);
    await refresh();
  };

  const logout = () => {
    window.localStorage.removeItem("wbk_token");
    setUser(null);
  };

  return (
    <Ctx.Provider
      value={{ user, loading, login, signup, acceptToken, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
