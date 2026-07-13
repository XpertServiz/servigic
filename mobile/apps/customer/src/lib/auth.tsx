import React, { createContext, useContext, useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as api from "./api";

type User = { id: string; name: string; role: "CUSTOMER"; phone: string };

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await api.loadStoredToken();
      if (token) {
        try {
          const { user: me } = await api.getMe();
          setUser(me as unknown as User);
          registerForPush();
        } catch {
          await api.setAuthToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Best-effort and fully isolated from app startup/login: push credentials
  // (FCM on Android) may not be fully provisioned yet, and a misconfigured
  // native module here must never be able to take the whole app down.
  // Deferred one tick past sign-in so it can never block/crash the
  // navigation transition itself, and every native call is independently
  // guarded so one failing step doesn't skip the others.
  function registerForPush() {
    setTimeout(async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") return;

        let token: string | undefined;
        try {
          const result = await Notifications.getExpoPushTokenAsync();
          token = result.data;
        } catch (e) {
          console.warn("[push] getExpoPushTokenAsync failed, skipping push registration", e);
          return;
        }
        if (!token) return;

        try {
          await api.registerPushToken(token);
        } catch (e) {
          console.warn("[push] failed to register token with backend", e);
        }
      } catch (e) {
        console.warn("[push] registration failed", e);
      }
    }, 0);
  }

  async function signIn(phone: string, password: string) {
    const { token, user: loggedInUser } = await api.login(phone, password);
    await api.setAuthToken(token);
    setUser(loggedInUser as User);
    registerForPush();
  }

  async function signOut() {
    await api.setAuthToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
