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

  async function registerForPush() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      await api.registerPushToken(token);
    } catch {
      // Push registration is best-effort — never block the app on it.
    }
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
