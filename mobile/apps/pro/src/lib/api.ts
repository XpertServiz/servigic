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

// ─── Auth ───
export function login(phone: string, password: string) {
  return request<{ token: string; user: { id: string; name: string; role: "CUSTOMER" | "PROVIDER"; phone: string } }>(
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
}) {
  return request<{ userId: string; phone: string }>("/api/auth/register", {
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
  return request<{ user: Record<string, unknown> }>("/api/mobile/me");
}

export function registerPushToken(token: string) {
  return request<{ ok: true }>("/api/mobile/push-token", { method: "POST", body: JSON.stringify({ token }) });
}

// ─── Categories ───
export function getCategories() {
  return request<{
    categories: { id: string; name: string; icon: string; slug: string; subServices: { id: string; name: string }[] }[];
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
    jobs: { id: string; title: string; areaLabel: string; urgency: string; categoryIcon: string; categoryName: string; alreadyBid: boolean }[];
    isOnline: boolean;
  }>("/api/mobile/provider/jobs");
}

export function getProviderJobDetail(jobId: string) {
  return request<{ job: Record<string, unknown>; myBid: Record<string, unknown> | null; verificationLevel: number }>(
    `/api/mobile/provider/jobs/${jobId}`
  );
}

export function submitBid(input: { jobId: string; pricePKR: number; etaMinutes: number; message?: string }) {
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

export function getProviderProfile() {
  return request<{ profile: Record<string, unknown> | null }>("/api/provider/profile");
}

export function updateProviderProfile(input: Record<string, unknown>) {
  return request<{ profile: Record<string, unknown> }>("/api/provider/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getProviderEarnings() {
  return request<{
    payouts: { id: string; amountPKR: number; status: string; jobTitle: string; categoryIcon: string }[];
    totalSent: number;
    totalQueued: number;
    commissionPct: number;
  }>("/api/mobile/provider/earnings");
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
