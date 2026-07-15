import React, { createContext, useContext, useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as api from "./api";

type User = { id: string; name: string; role: "ADMIN"; phone: string };

// Stored alongside the bearer token (SecureStore = OS keychain/keystore, not
// plaintext) so the WebView admin-panel screen can silently (re-)establish
// its own cookie session without asking the admin to retype credentials
// every time the app is relaunched or the web session cookie expires.
const CREDS_KEY = "servigic_admin_creds";

interface AuthState {
  user: User | null;
  loading: boolean;
  credentials: { phone: string; password: string } | null;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<{ phone: string; password: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await api.loadStoredToken();
      if (token) {
        try {
          const { user: me } = await api.getMe();
          setUser(me as unknown as User);
          const storedCreds = await SecureStore.getItemAsync(CREDS_KEY);
          if (storedCreds) setCredentials(JSON.parse(storedCreds));
          registerForPush();
        } catch {
          await api.setAuthToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Best-effort and fully isolated from app startup/login — a misconfigured
  // native push module must never be able to take the whole app down. See
  // mobile/apps/pro/src/lib/auth.tsx for the identical pattern this mirrors.
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

        try {
          // High-importance channel so a new payment/dispute alert rings and
          // vibrates immediately — this is the whole point of the app: no
          // more needing to open a laptop to catch a pending payment.
          await Notifications.setNotificationChannelAsync("admin-alerts", {
            name: "Admin alerts (payments, disputes)",
            importance: Notifications.AndroidImportance.MAX,
            sound: "default",
            vibrationPattern: [0, 500, 250, 500],
          });
        } catch (e) {
          console.warn("[push] failed to create notification channel", e);
        }
      } catch (e) {
        console.warn("[push] registration failed", e);
      }
    }, 0);
  }

  async function signIn(phone: string, password: string) {
    const { token, user: loggedInUser } = await api.login(phone, password);
    await api.setAuthToken(token);
    await SecureStore.setItemAsync(CREDS_KEY, JSON.stringify({ phone, password }));
    setCredentials({ phone, password });
    setUser(loggedInUser as User);
    registerForPush();
  }

  async function signOut() {
    await api.setAuthToken(null);
    await SecureStore.deleteItemAsync(CREDS_KEY);
    setCredentials(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, credentials, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
