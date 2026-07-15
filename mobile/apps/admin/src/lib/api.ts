// Servigic Admin mobile API client — trimmed-down variant of the
// customer/pro apps' shared src/lib/api.ts (see that file's header comment
// for why this isn't a real workspace package). Only what the admin login +
// push-token registration needs; the rest of "all admin features" is
// deliberately served by loading the real admin web panel in a WebView
// (src/screens/AdminWebScreen.tsx) rather than re-implementing every admin
// page natively.

import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "servigic_admin_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let apiBaseUrl = "http://localhost:3000";
let authToken: string | null = null;

export function configureApiClient(baseUrl: string) {
  apiBaseUrl = baseUrl;
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export async function loadStoredToken(): Promise<string | null> {
  authToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return authToken;
}

export async function setAuthToken(token: string | null) {
  authToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? res.statusText, res.status);
  return data as T;
}

export function login(phone: string, password: string) {
  return request<{ token: string; user: { id: string; name: string; role: "ADMIN"; phone: string } }>(
    "/api/mobile/auth/login",
    { method: "POST", body: JSON.stringify({ phone, password }) }
  );
}

export function getMe() {
  return request<{ user: Record<string, unknown> }>("/api/mobile/me");
}

export function registerPushToken(token: string) {
  return request<{ ok: true }>("/api/mobile/push-token", { method: "POST", body: JSON.stringify({ token }) });
}
