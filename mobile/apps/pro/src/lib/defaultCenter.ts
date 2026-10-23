// Where a map starts before the phone's GPS answers: the user's own city, else the main city of the country the phone is in
// (from the server's IP detection), and only as a last resort Karachi. A Saudi user never sees Karachi first.
// Shared by apps/customer and apps/pro.
import * as api from "./api";

export type LatLng = { lat: number; lng: number };

const CENTERS: Record<string, LatLng> = {
  karachi: { lat: 24.8607, lng: 67.0011 },
  lahore: { lat: 31.5204, lng: 74.3587 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5651, lng: 73.0169 },
  jeddah: { lat: 21.4858, lng: 39.1925 },
  madinah: { lat: 24.5247, lng: 39.5692 },
  medina: { lat: 24.5247, lng: 39.5692 },
  riyadh: { lat: 24.7136, lng: 46.6753 },
  makkah: { lat: 21.3891, lng: 39.8579 },
  dammam: { lat: 26.4207, lng: 50.0888 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  "abu dhabi": { lat: 24.4539, lng: 54.3773 },
  sharjah: { lat: 25.3463, lng: 55.4209 },
  doha: { lat: 25.2854, lng: 51.531 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  vancouver: { lat: 49.2827, lng: -123.1207 },
  montreal: { lat: 45.5017, lng: -73.5673 },
  calgary: { lat: 51.0447, lng: -114.0719 },
  "new york": { lat: 40.7128, lng: -74.006 },
  berlin: { lat: 52.52, lng: 13.405 },
  munich: { lat: 48.1351, lng: 11.582 },
  warsaw: { lat: 52.2297, lng: 21.0122 },
};
const COUNTRY_CENTER: Record<string, LatLng> = {
  PK: CENTERS.karachi,
  SA: CENTERS.jeddah,
  AE: CENTERS.dubai,
  QA: CENTERS.doha,
  CA: CENTERS.toronto,
  US: CENTERS["new york"],
  DE: CENTERS.berlin,
  PL: CENTERS.warsaw,
};
export const FALLBACK_CENTER: LatLng = CENTERS.karachi;

export function cityCenter(city: string | null | undefined): LatLng | null {
  return city ? (CENTERS[city.trim().toLowerCase()] ?? null) : null;
}

let countryCenter: Promise<LatLng | null> | null = null;

/** The best starting point for a map: the user's city, else the country the phone is in, else Karachi. */
export async function defaultCenter(city?: string | null): Promise<LatLng> {
  const own = cityCenter(city);
  if (own) return own;
  if (!countryCenter) {
    countryCenter = api
      .getMarket()
      .then((m) => COUNTRY_CENTER[(m.country ?? "").toUpperCase()] ?? null)
      .catch(() => null);
  }
  return (await countryCenter) ?? FALLBACK_CENTER;
}
