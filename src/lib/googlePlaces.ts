// Google Places Lead Fetcher (Master Brief §9) — admin-triggered only, low
// volume. Uses Text Search + Details, paginated, with a mandatory 2s wait
// between pages (Google requires this before next_page_token is valid).

type PlaceSummary = { place_id: string };
type PlaceDetails = {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  rating?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function searchPlaces(query: string): Promise<PlaceSummary[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not configured");

  const results: PlaceSummary[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3; page++) {
    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    url.searchParams.set("query", query);
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pagetoken", pageToken);

    const res = await fetch(url.toString());
    const data = await res.json();
    results.push(...(data.results ?? []));

    pageToken = data.next_page_token;
    if (!pageToken) break;
    await sleep(2000);
  }

  return results;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not configured");

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,formatted_address,formatted_phone_number,rating");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();
  return data.result ?? {};
}
