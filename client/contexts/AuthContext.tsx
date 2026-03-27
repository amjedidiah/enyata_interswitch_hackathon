"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PropsWithChildren } from "react";
import { setAccessToken } from "@/lib/auth";
import { SESSION_HINT_COOKIE } from "@/lib/auth-constants";

export type AuthUser = { id: string; name: string; email: string };

type AuthContextType = {
  user: AuthUser | null;
  hasToken: boolean;
  /** false until the initial silent refresh attempt completes */
  isInitialized: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  hasToken: false,
  isInitialized: false,
  setAuth: () => {},
  clearAuth: () => {},
});

function hasSessionCookie() {
  return (
    typeof document !== "undefined" &&
    document.cookie
      .split(";")
      .some((c) => c.trim().startsWith(`${SESSION_HINT_COOKIE}=`))
  );
}

export function AuthProvider({ children }: Readonly<PropsWithChildren>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Lazy initializer: if there's no session hint cookie we know immediately
  // the user is logged out — no network call needed, so start as initialized.
  const [isInitialized, setIsInitialized] = useState(() => !hasSessionCookie());

  const setAuth = useCallback((newToken: string, newUser: AuthUser) => {
    setAccessToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // If no session hint cookie, isInitialized was set to true by the lazy
    // useState initializer — nothing to do here.
    if (!hasSessionCookie()) return;

    // Silently obtain a new access token using the HttpOnly refresh_token cookie.
    // Using fetch directly here to avoid a circular import with api.ts.
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("refresh failed");
        return r.json();
      })
      .then(({ token: t, user: u }: { token: string; user: AuthUser }) =>
        setAuth(t, u),
      )
      .catch(() => {
        // Refresh token expired or invalid — user is logged out.
      })
      .finally(() => setIsInitialized(true));
  }, [setAuth]);

  const value = useMemo(
    () => ({ user, hasToken: !!token, isInitialized, setAuth, clearAuth }),
    [user, token, isInitialized, setAuth, clearAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
