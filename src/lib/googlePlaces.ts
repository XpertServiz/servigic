// Google Places lead fetcher (Master Brief §9): admin-triggered only, low volume.
//
// Two Google APIs can answer a search, and Google decides which one a project may use: "Places API (New)" (one request returns
// the phone numbers too) and the older "Places API" (a search, then one details call per place). We try the new one first
// and fall back to the old one. Both need billing switched on for the Google Cloud project. When Google refuses, the reason
// is passed on to the admin (PlacesError) - it used to be swallowed and shown as "0 results".

import { PlacesLimitError, takePlacesRequest } from "@/lib/placesUsage";

export class PlacesError extends Error {}

export type PlaceLead = { name: string; phone: string; address: string | null; rating: number | null };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_PAGES = 3;

function key(): string {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) throw new PlacesError("GOOGLE_PLACES_API_KEY is not configured");
  return k;
}

/** International form without spaces (+966501234567) so WhatsApp links and duplicate checks work in every country. */
function cleanPhone(p: string | undefined | null): string | null {
  const v = (p ?? "").replace(/[\s\-()]/g, "");
  return v.length >= 7 ? v : null;
}

// ---- Places API (New)
type NewPlace = { displayName?: { text?: string }; formattedAddress?: string; rating?: number; internationalPhoneNumber?: string; nationalPhoneNumber?: string };

async function searchNew(query: string): Promise<PlaceLead[]> {
  const out: PlaceLead[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    await takePlacesRequest();
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key(),
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.internationalPhoneNumber,places.nationalPhoneNumber,nextPageToken",
      },
      body: JSON.stringify({ textQuery: query, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
    });
    const data = (await res.json()) as { places?: NewPlace[]; nextPageToken?: string; error?: { status?: string; message?: string } };
    if (!res.ok) throw new PlacesError(`${data.error?.status ?? res.status}: ${data.error?.message ?? "Google refused the request"}`);
    for (const p of data.places ?? []) {
      const phone = cleanPhone(p.internationalPhoneNumber ?? p.nationalPhoneNumber);
      if (phone && p.displayName?.text) out.push({ name: p.displayName.text, phone, address: p.formattedAddress ?? null, rating: p.rating ?? null });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    await sleep(1000);
  }
  return out;
}

// ---- Places API (older)
async function searchLegacy(query: string): Promise<PlaceLead[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    await takePlacesRequest();
    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", query);
    url.searchParams.set("key", key());
    if (pageToken) url.searchParams.set("pagetoken", pageToken);
    const data = (await (await fetch(url)).json()) as { status?: string; error_message?: string; results?: { place_id: string }[]; next_page_token?: string };
    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") throw new PlacesError(`${data.status}: ${data.error_message ?? "Google refused the request"}`);
    ids.push(...(data.results ?? []).map((r) => r.place_id));
    pageToken = data.next_page_token;
    if (!pageToken) break;
    await sleep(2000); // Google requires a pause before the next page token works
  }
  const details = await Promise.all(
    // The older API needs one details request per place: at most 20, and each one is counted.
    ids.slice(0, 20).map(async (id) => {
      await takePlacesRequest();
      const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      url.searchParams.set("place_id", id);
      url.searchParams.set("fields", "name,formatted_address,international_phone_number,formatted_phone_number,rating");
      url.searchParams.set("key", key());
      const d = (await (await fetch(url)).json()) as { result?: { name?: string; formatted_address?: string; international_phone_number?: string; formatted_phone_number?: string; rating?: number } };
      return d.result ?? {};
    }),
  );
  return details.flatMap((d) => {
    const phone = cleanPhone(d.international_phone_number ?? d.formatted_phone_number);
    return phone && d.name ? [{ name: d.name, phone, address: d.formatted_address ?? null, rating: d.rating ?? null }] : [];
  });
}

/** Businesses matching the query that have a phone number. Throws PlacesError with Google's own reason when it refuses. */
export async function searchLeads(query: string): Promise<PlaceLead[]> {
  try {
    return await searchNew(query);
  } catch (newError) {
    // The monthly stop is final: do not try the other API (it would only spend more of the allowance).
    if (newError instanceof PlacesLimitError) throw newError;
    try {
      return await searchLegacy(query);
    } catch (legacyError) {
      if (legacyError instanceof PlacesLimitError) throw legacyError;
      const a = newError instanceof Error ? newError.message : String(newError);
      const b = legacyError instanceof Error ? legacyError.message : String(legacyError);
      throw new PlacesError(`Google Places did not answer. New Places API: ${a} | Older Places API: ${b}`);
    }
  }
}
