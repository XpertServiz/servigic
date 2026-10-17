// Servigic mobile API client — shared logic for both apps/customer and apps/pro.
//
// Not wired up as a real npm workspace package (Metro's node_modules
// transform rules for TS files in linked workspace packages need extra
// config we can't verify without running `expo start`, which isn't
// available in this environment). This file is the source of truth —
// apps/customer/src/lib/api.ts and apps/pro/src/lib/api.ts are exact
// copies of it. If you change one, copy the change to the other two.
//
// Talks to the same Next.js backend the web app uses. Auth is a Bearer JWT
// from POST /api/mobile/auth/login (see src/lib/mobileAuth.ts in the web
// app) — every other endpoint is a normal web API route made mobile-aware
// by src/lib/requireRole.ts checking for an Authorization header first.

import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";

const TOKEN_KEY = "servigic_token";

export class ApiError extends Error {
  status: number;
  // Machine-readable `code` plus the full JSON body, for the few errors the
  // UI reacts to specially (e.g. DUPLICATE_OPEN_JOB, OPEN_JOB_LIMIT).
  code?: string;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
    if (typeof data.code === "string") this.code = data.code;
  }
}

let apiBaseUrl = "http://localhost:3000";
let authToken: string | null = null;

export function configureApiClient(baseUrl: string) {
  apiBaseUrl = baseUrl;
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
  if (!res.ok) throw new ApiError(data.error ?? res.statusText, res.status, data);
  return data as T;
}

// ─── Language ───
// Public (works before login): which language to *suggest* for this country.
export function getMarket() {
  return request<{ country: string; countryName: string; suggestedLocale: string }>("/api/mobile/market");
}

// Persists the chosen language on the user's account.
export function updateMyLanguage(language: string) {
  return request<{ language: string }>("/api/mobile/me", { method: "PATCH", body: JSON.stringify({ language }) });
}

// ─── Auth ───
export function login(phone: string, password: string) {
  return request<{
    token: string;
    user: { id: string; name: string; role: "CUSTOMER" | "PROVIDER"; phone: string; language?: string };
  }>(
    "/api/mobile/auth/login",
    { method: "POST", body: JSON.stringify({ phone, password }) }
  );
}

export function register(input: {
  role: "CUSTOMER" | "PROVIDER";
  name: string;
  phone: string;
  email?: string;
  password: string;
  city?: string;
  referralCode?: string;
  deviceId?: string;
}) {
  return request<{ userId: string; phone: string; referral?: "applied" | "invalid" | "none" }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function verifyOtp(userId: string, code: string) {
  return request<{ verified: true }>("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ userId, code }),
  });
}

export function resendOtp(userId: string) {
  return request<{ sent: true }>("/api/auth/otp/resend", { method: "POST", body: JSON.stringify({ userId }) });
}

export function getMe() {
  return request<{ user: Record<string, unknown> & { language?: string } }>("/api/mobile/me");
}

export function registerPushToken(token: string) {
  return request<{ ok: true }>("/api/mobile/push-token", { method: "POST", body: JSON.stringify({ token }) });
}

// ─── Notifications (bell icon) ───
export function getNotifications() {
  return request<{
    notifications: { id: string; type: string; title: string; body: string; linkUrl: string | null; isRead: boolean; createdAt: string }[];
    unreadCount: number;
  }>("/api/mobile/notifications");
}

export function markNotificationsRead() {
  return request<{ ok: true }>("/api/mobile/notifications", { method: "POST" });
}


// ─── Market config (handoff section 11.6) ───
export type MarketConfig = {
  legacyOpen: boolean;
  country: string | null;
  market: { id: string; name: string; status: "WAITLIST" | "PILOT" | "LIVE"; cities: string[]; currency: string; phoneCode: string; timezone: string } | null;
  acceptingJobs: boolean;
  trades: Record<string, boolean>;
  // Admin-controlled (Admin > Settings): announcement, minimum app version, store links, support WhatsApp.
  app?: {
    announcement: { title: string; body: string; audience: "ALL" | "CUSTOMER" | "PROVIDER" } | null;
    minVersionCode: number;
    storeUrls: { pro: string | null; customer: string | null };
    supportWhatsapp: string | null;
    minTopUpPKR: number;
  };
};

export type GeoPoint = { lat: number; lng: number };

// With a map point (GPS or job pin) the server checks it against the drawn service-zone geofence.
export function getMarketConfig(city?: string | null, point?: GeoPoint | null) {
  const q: string[] = [];
  if (city) q.push(`city=${encodeURIComponent(city)}`);
  if (point) q.push(`lat=${point.lat}`, `lng=${point.lng}`);
  return request<MarketConfig>(`/api/mobile/config${q.length ? `?${q.join("&")}` : ""}`);
}

export function joinWaitlist(input: { trade?: string; role?: "CUSTOMER" | "PROVIDER"; city?: string; email?: string; phone?: string; lat?: number; lng?: number; area?: string }) {
  return request<{ ok: true }>("/api/mobile/waitlist", { method: "POST", body: JSON.stringify(input) });
}

// ─── Categories ───
export function getCategories() {
  return request<{
    categories: { id: string; name: string; icon: string; slug: string; trade: string; available: boolean; subServices: { id: string; name: string }[] }[];
    acceptingJobs: boolean;
    market: { id: string; name: string; status: string } | null;
  }>("/api/mobile/categories");
}

// ─── Customer: jobs ───
export function createJob(input: Record<string, unknown>) {
  return request<{ job: { id: string }; dispatchedCount: number }>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getMyJobs() {
  return request<{ jobs: { id: string; title: string; status: string; areaLabel: string; category: { icon: string; name: string }; _count: { bids: number } }[] }>(
    "/api/jobs?scope=mine"
  );
}

export function getJobDetail(jobId: string) {
  return request<{ job: Record<string, unknown>; bids: Record<string, unknown>[] }>(`/api/mobile/jobs/${jobId}`);
}

export function acceptBid(bidId: string) {
  return request<{ booking: { id: string } }>(`/api/bids/${bidId}/accept`, { method: "POST" });
}

export function declineBid(bidId: string, reason: string) {
  return request<{ bid: Record<string, unknown> }>(`/api/bids/${bidId}/decline`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function counterBid(bidId: string, counterPricePKR: number) {
  return request<{ bid: Record<string, unknown> }>(`/api/bids/${bidId}/counter`, {
    method: "POST",
    body: JSON.stringify({ counterPricePKR }),
  });
}

// ─── Provider: dispatch feed + bidding ───
export function getProviderJobFeed() {
  return request<{
    jobs: {
      id: string;
      title: string;
      areaLabel: string;
      urgency: string;
      categoryIcon: string;
      categoryName: string;
      alreadyBid: boolean;
      // Present once the backend update is deployed; the app copes without them.
      budgetPKR?: number | null;
      approxLat?: number;
      approxLng?: number;
      createdAt?: string;
    }[];
    isOnline: boolean;
    boostedUntil?: string | null;
  }>("/api/mobile/provider/jobs");
}

// Rewarded-ad perk: widens the pro's job radius for an hour.
export function claimVisibilityBoost() {
  return request<{ boostedUntil: string; alreadyActive: boolean }>("/api/mobile/provider/boost", { method: "POST" });
}

export function getProviderJobDetail(jobId: string) {
  return request<{
    job: Record<string, unknown>;
    myBid: Record<string, unknown> | null;
    bookingId: string | null;
    verificationLevel: number;
  }>(`/api/mobile/provider/jobs/${jobId}`);
}

export function submitBid(input: {
  jobId: string;
  pricePKR: number;
  etaMinutes: number;
  message?: string;
  estimatedPartsNote?: string;
}) {
  return request<{ bid: Record<string, unknown> }>("/api/bids", { method: "POST", body: JSON.stringify(input) });
}

export function respondToCounter(bidId: string, action: "accept" | "decline") {
  return request<{ bid: Record<string, unknown> }>(`/api/bids/${bidId}/counter-response`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

export function setOnline(isOnline: boolean) {
  return request<{ isOnline: boolean }>("/api/provider/online", { method: "POST", body: JSON.stringify({ isOnline }) });
}

export type TradeRequest = {
  trade: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  certificateRequested: boolean;
  certificateUploaded: boolean;
  adminNote: string | null;
};

export function getProviderProfile() {
  return request<{ profile: Record<string, unknown> | null; tradeRequests?: TradeRequest[] }>("/api/provider/profile");
}

export function uploadTradeCertificate(trade: string, url: string) {
  return request<{ ok: true }>("/api/provider/trade-certificate", { method: "POST", body: JSON.stringify({ trade, url }) });
}

export function updateProviderProfile(input: Record<string, unknown>) {
  return request<{ profile: Record<string, unknown>; tradeRequests?: TradeRequest[] }>("/api/provider/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getProviderEarnings() {
  return request<{
    // PROTECTED mode (payout-received framing)
    payouts?: { id: string; amountPKR: number; status: string; jobTitle: string; categoryIcon: string }[];
    totalSent?: number;
    totalQueued?: number;
    // CASH_WALLET mode (commission-debt framing) — see v6 addendum
    dispatchStatus?: "NORMAL" | "WARNED" | "THROTTLED" | "SUSPENDED";
    dispatchBlockedReason?: string | null;
    wallet?: { balancePKR: number; ceilingPKR: number; unsettledJobCount: number };
    ledger?: { id: string; type: string; amountPKR: number; memo: string | null; jobTitle: string | null; createdAt: string }[];
    topUps?: { id: string; amountPKR: number; status: string; createdAt: string }[];
    // Both modes
    commissionPct: number;
    standardCommissionPct?: number;
    foundingUntil?: string | null;
    profileValue?: { ratingAvg: number; verificationLevel: number; jobsCompleted: number };
  }>("/api/mobile/provider/earnings");
}

export type PayTo = {
  JAZZCASH?: { title?: string; number: string };
  EASYPAISA?: { title?: string; number: string };
  BANK_TRANSFER?: { bankName?: string; title?: string; number: string };
};

// Where to send a wallet top-up (JazzCash / EasyPaisa / bank), set by the admin.
export function getTopUpAccounts() {
  return request<{ payTo: PayTo; minTopUpPKR: number }>("/api/mobile/wallet/topup");
}

export function submitTopUp(amountPKR: number, method: string, proofImageUrl: string, reference: string) {
  return request<{ topUp: Record<string, unknown> }>("/api/mobile/wallet/topup", {
    method: "POST",
    body: JSON.stringify({ amountPKR, method, proofImageUrl, reference }),
  });
}

// ─── Bookings (both roles) ───
export function getMyBookings() {
  return request<{
    bookings: { id: string; status: string; totalPKR: number; payoutPKR: number; jobTitle: string; categoryIcon: string }[];
  }>("/api/mobile/bookings");
}

export function getBookingDetail(bookingId: string) {
  return request<{ booking: Record<string, unknown> }>(`/api/mobile/bookings/${bookingId}`);
}

export function submitPayment(bookingId: string, method: string, proofImageUrl: string) {
  return request<{ payment: Record<string, unknown> }>(`/api/bookings/${bookingId}/payment`, {
    method: "POST",
    body: JSON.stringify({ method, proofImageUrl }),
  });
}

export function updateBookingStatus(bookingId: string, status: "ON_MY_WAY" | "ARRIVED" | "WORKING" | "DONE") {
  return request<{ booking: Record<string, unknown> }>(`/api/bookings/${bookingId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function sendLocationPing(bookingId: string, lat: number, lng: number) {
  return request<{ ping: Record<string, unknown> }>(`/api/bookings/${bookingId}/location`, {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  });
}

export function getLatestLocation(bookingId: string) {
  return request<{ ping: { lat: number; lng: number } | null }>(`/api/bookings/${bookingId}/location`);
}

export function confirmBooking(bookingId: string) {
  return request<{ booking: Record<string, unknown> }>(`/api/bookings/${bookingId}/confirm`, { method: "POST" });
}

export function openDispute(bookingId: string, reason: string) {
  return request<{ dispute: Record<string, unknown> }>(`/api/bookings/${bookingId}/dispute`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function cancelBooking(bookingId: string, reasonCode: string, reasonNote?: string) {
  return request<{ ok: true }>(`/api/bookings/${bookingId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reasonCode, reasonNote }),
  });
}

export function submitReview(bookingId: string, rating: number, tags: string[], comment?: string) {
  return request<{ review: Record<string, unknown> }>(`/api/bookings/${bookingId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating, tags, comment }),
  });
}

export function getMessages(bookingId: string) {
  return request<{ messages: { id: string; body: string; senderId: string; sender: { name: string } }[] }>(
    `/api/bookings/${bookingId}/messages`
  );
}

export function sendMessage(bookingId: string, body: string) {
  return request<{ message: Record<string, unknown> }>(`/api/bookings/${bookingId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function getBidWinProbability(jobId: string, pricePKR: number, etaMinutes: number) {
  return request<{ winProbability: number; isHeuristic: boolean }>("/api/ai/bids/win-probability", {
    method: "POST",
    body: JSON.stringify({ jobId, pricePKR, etaMinutes }),
  });
}

// ─── File upload (photos, KYC docs, payment proof) ───
// Uses expo-file-system's native multipart uploader instead of RN's
// fetch()+FormData bridge — the latter throws a native "Unsupported
// FormDataPart implementation" error on some Android devices/RN versions
// when appending a { uri, name, type } file part. uploadAsync talks to the
// same /api/mobile/upload route via a dedicated native upload task, which
// doesn't go through that bridge codepath at all.
export async function uploadFile(fileUri: string, fileName: string, mimeType: string): Promise<string> {
  const result = await FileSystem.uploadAsync(`${apiBaseUrl}/api/mobile/upload`, fileUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    parameters: { name: fileName },
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });

  let data: { url?: string; error?: string } = {};
  try {
    data = JSON.parse(result.body);
  } catch {
    // Non-JSON body (e.g. a plain-text 502 from an upstream failure) — fall
    // through and let the status-code check below produce the real error.
  }
  if (result.status < 200 || result.status >= 300) {
    throw new ApiError(data.error ?? `Upload failed (${result.status})`, result.status);
  }
  if (!data.url) throw new ApiError("Upload succeeded but no URL was returned", result.status);
  return data.url;
}

// ─── Pro supply/demand + alert controls (handoff sections 11.4, 11.5) ───
export type ProviderStatus = {
  activation: "ACTIVE" | "WAITING";
  approved: boolean;
  foundingPro: boolean;
  commissionFreeJobsLeft: number;
  market: { name: string; status: string; open: boolean } | null;
  jobsThisWeek: number;
  limits: { radiusMinKm: number; radiusMaxKm: number; radiusDefaultKm: number; maxTrades: number };
  alerts: { paused: boolean; quietStartMin: number | null; quietEndMin: number | null; dailyCap: number; emailAlerts: boolean };
};

export function getProviderStatus() {
  return request<ProviderStatus>("/api/mobile/provider/status");
}

export function updateAlertSettings(input: { paused?: boolean; quietStartMin?: number | null; quietEndMin?: number | null; dailyCap?: number; emailAlerts?: boolean }) {
  return request<{ alerts: ProviderStatus["alerts"] }>("/api/mobile/provider/alerts", { method: "PUT", body: JSON.stringify(input) });
}

// ─── Referrals ───
export type ReferralSummary = {
  code: string;
  enabled: boolean;
  role: "CUSTOMER" | "PROVIDER";
  offer: {
    customerDiscountPKR: number;
    customerMinJobPKR: number;
    customerReferrerCreditPKR: number;
    proReferrerCreditPKR: number;
    proJobsRequired: number;
    proFreeJobs: number;
  };
  myWelcome: { discountPKR: number; minJobPKR: number; freeJobsLeft: number } | null;
  earnedPKR: number;
  availablePKR: number;
  pendingCount: number;
  releasedCount: number;
  entries: { id: string; amountPKR: number; createdAt: string; used: boolean }[];
  referrals: { id: string; name: string; status: "PENDING" | "RELEASED"; createdAt: string }[];
};

export function getReferral() {
  return request<ReferralSummary>("/api/mobile/referral");
}

// Sends a test job alert to this phone after a short delay, so the pro can lock the phone / swipe the app away first.
export function sendTestJobAlert(delaySec = 15) {
  return request<{ ok: true; delaySec: number }>("/api/mobile/provider/test-alert", { method: "POST", body: JSON.stringify({ delaySec }) });
}
