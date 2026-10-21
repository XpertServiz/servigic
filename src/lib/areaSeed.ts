import { prisma } from "@/lib/prisma";

// Starter area master list. Centres are approximate (good enough for "nearest area within 3 km"); an admin can
// correct any centre, alias or status in Admin > Areas. Aliases are what free-text addresses are matched against.
type A = { name: string; aliases: string[]; lat: number; lng: number };
type C = { countryCode: string; name: string; lat: number; lng: number; status: string; areas: A[] };

const KARACHI: A[] = [
  { name: "DHA", aliases: ["DHA", "Defence", "Defense", "Defence Housing Authority", "DHA Phase 1", "DHA Phase 2", "DHA Phase 3", "DHA Phase 4", "DHA Phase 5", "DHA Phase 6", "DHA Phase 7", "DHA Phase 8", "DHA City", "Phase 6 DHA", "Khayaban-e-Ittehad"], lat: 24.8, lng: 67.06 },
  { name: "Clifton", aliases: ["Clifton", "Block 1 Clifton", "Block 2 Clifton", "Block 3 Clifton", "Block 4 Clifton", "Block 5 Clifton", "Block 6 Clifton", "Block 7 Clifton", "Block 8 Clifton", "Block 9 Clifton", "Boat Basin", "Sea View", "Seaview"], lat: 24.8138, lng: 67.03 },
  { name: "Gulshan-e-Iqbal", aliases: ["Gulshan", "Gulshan e Iqbal", "Gulshan Iqbal", "Gulshan Block 1", "Gulshan Block 2", "Gulshan Block 3", "Gulshan Block 4", "Gulshan Block 5", "Gulshan Block 6", "Gulshan Block 7", "Gulshan Block 10", "Gulshan Block 13", "Gulshan Block 15", "Gulshan Block 17", "Gulshan Block 19", "گلشن اقبال", "گلشن"], lat: 24.9215, lng: 67.0924 },
  { name: "Gulistan-e-Jauhar", aliases: ["Jauhar", "Johar", "Gulistan e Jauhar", "Gulistan-e-Johar", "Gulistan Jauhar", "Johar Mor", "گلستان جوہر", "جوہر"], lat: 24.918, lng: 67.129 },
  { name: "North Nazimabad", aliases: ["North Nazimabad", "N Nazimabad", "North Nazim Abad", "ناظم آباد شمالی"], lat: 24.946, lng: 67.039 },
  { name: "Nazimabad", aliases: ["Nazimabad", "Nazim Abad", "ناظم آباد"], lat: 24.91, lng: 67.031 },
  { name: "PECHS", aliases: ["PECHS", "P.E.C.H.S", "Pechs Block 2", "Pechs Block 6", "Karachi Society", "Tariq Road PECHS"], lat: 24.865, lng: 67.065 },
  { name: "Bahadurabad", aliases: ["Bahadurabad", "Bahadur Abad", "بہادر آباد"], lat: 24.8806, lng: 67.0663 },
  { name: "Tariq Road", aliases: ["Tariq Road", "Tareeq Road", "طارق روڈ"], lat: 24.871, lng: 67.064 },
  { name: "Saddar", aliases: ["Saddar", "Sadar", "Saddar Town", "Empress Market", "صدر"], lat: 24.8546, lng: 67.0099 },
  { name: "Korangi", aliases: ["Korangi", "Korangi Industrial", "Korangi Crossing", "کورنگی"], lat: 24.83, lng: 67.13 },
  { name: "Malir", aliases: ["Malir", "Malir Cantt", "Malir Halt", "Model Colony", "ملیر"], lat: 24.895, lng: 67.2 },
  { name: "Bahria Town Karachi", aliases: ["Bahria Town Karachi", "Bahria Town", "Bahria Karachi", "Bahria Precinct"], lat: 25.01, lng: 67.31 },
  { name: "Scheme 33", aliases: ["Scheme 33", "Scheme33", "KDA Scheme 33", "Sector 33"], lat: 24.965, lng: 67.118 },
  { name: "North Karachi", aliases: ["North Karachi", "N Karachi", "Sector 11-A", "Sector 11A", "شمالی کراچی"], lat: 24.98, lng: 67.065 },
  { name: "Federal B Area", aliases: ["FB Area", "F.B Area", "Federal B Area", "Federal B. Area", "Block 16 FB Area", "Azizabad"], lat: 24.93, lng: 67.085 },
  { name: "Shah Faisal Colony", aliases: ["Shah Faisal", "Shah Faisal Colony", "Shahfaisal", "شاہ فیصل"], lat: 24.875, lng: 67.15 },
  { name: "Landhi", aliases: ["Landhi", "Landhi Industrial", "لانڈھی"], lat: 24.85, lng: 67.2 },
  { name: "Orangi Town", aliases: ["Orangi", "Orangi Town", "اورنگی"], lat: 24.95, lng: 66.99 },
  { name: "Lyari", aliases: ["Lyari", "Layari", "لیاری"], lat: 24.86, lng: 66.99 },
  { name: "Kemari", aliases: ["Kemari", "Keamari", "Kemari Town", "کیماڑی"], lat: 24.83, lng: 66.98 },
  { name: "Garden", aliases: ["Garden", "Garden East", "Garden West", "Karachi Garden", "گارڈن"], lat: 24.873, lng: 67.015 },
  { name: "Liaquatabad", aliases: ["Liaquatabad", "Liaqat Abad", "Lasbela", "لیاقت آباد"], lat: 24.9, lng: 67.045 },
  { name: "Gulberg", aliases: ["Gulberg Karachi", "Gulberg Town", "Gulberg"], lat: 24.9, lng: 67.06 },
  { name: "Gulshan-e-Maymar", aliases: ["Gulshan e Maymar", "Maymar", "Gulshan-e-Maymar", "Gulshan Maymar"], lat: 25.0, lng: 67.1 },
  { name: "Surjani Town", aliases: ["Surjani", "Surjani Town"], lat: 25.03, lng: 67.04 },
  { name: "Baldia Town", aliases: ["Baldia", "Baldia Town"], lat: 24.9, lng: 66.95 },
  { name: "Saadi Town", aliases: ["Saadi Town", "Sadi Town"], lat: 24.93, lng: 67.18 },
  { name: "Gadap", aliases: ["Gadap", "Gadap Town"], lat: 25.1, lng: 67.18 },
  { name: "Bin Qasim", aliases: ["Bin Qasim", "Port Qasim", "Bin Qasim Town"], lat: 24.78, lng: 67.3 },
  { name: "Mauripur", aliases: ["Mauripur", "Hawksbay", "Hawks Bay"], lat: 24.87, lng: 66.94 },
  { name: "Defence View", aliases: ["Defence View", "Defense View", "Defence View Society"], lat: 24.89, lng: 67.07 },
  { name: "Sharifabad", aliases: ["Sharifabad", "Shareef Abad"], lat: 24.92, lng: 67.05 },
];

const CITIES: C[] = [
  { countryCode: "PK", name: "Karachi", lat: 24.8607, lng: 67.0011, status: "live", areas: KARACHI },
  {
    countryCode: "PK", name: "Lahore", lat: 31.5204, lng: 74.3587, status: "waitlist",
    areas: [
      { name: "DHA Lahore", aliases: ["DHA", "Defence", "DHA Lahore", "DHA Phase 5", "DHA Phase 6"], lat: 31.47, lng: 74.4 },
      { name: "Gulberg", aliases: ["Gulberg", "Gulberg 3", "Gulberg Lahore", "MM Alam"], lat: 31.5, lng: 74.34 },
      { name: "Johar Town", aliases: ["Johar Town", "Jauhar Town"], lat: 31.47, lng: 74.27 },
      { name: "Model Town", aliases: ["Model Town"], lat: 31.48, lng: 74.32 },
      { name: "Bahria Town Lahore", aliases: ["Bahria Town", "Bahria Town Lahore"], lat: 31.37, lng: 74.18 },
      { name: "Lahore Cantt", aliases: ["Cantt", "Lahore Cantt", "Cantonment"], lat: 31.52, lng: 74.4 },
      { name: "Wapda Town", aliases: ["Wapda Town"], lat: 31.44, lng: 74.26 },
      { name: "Faisal Town", aliases: ["Faisal Town"], lat: 31.48, lng: 74.31 },
      { name: "Iqbal Town", aliases: ["Iqbal Town"], lat: 31.51, lng: 74.28 },
      { name: "Township", aliases: ["Township"], lat: 31.45, lng: 74.31 },
    ],
  },
  {
    countryCode: "PK", name: "Islamabad", lat: 33.6844, lng: 73.0479, status: "waitlist",
    areas: [
      { name: "F-6", aliases: ["F6", "F-6", "F 6"], lat: 33.73, lng: 73.08 },
      { name: "F-7", aliases: ["F7", "F-7", "F 7", "Jinnah Super"], lat: 33.72, lng: 73.06 },
      { name: "F-10", aliases: ["F10", "F-10"], lat: 33.69, lng: 73.01 },
      { name: "G-9", aliases: ["G9", "G-9"], lat: 33.69, lng: 73.03 },
      { name: "G-11", aliases: ["G11", "G-11"], lat: 33.67, lng: 72.99 },
      { name: "I-8", aliases: ["I8", "I-8"], lat: 33.66, lng: 73.07 },
      { name: "E-11", aliases: ["E11", "E-11"], lat: 33.7, lng: 72.97 },
      { name: "DHA Islamabad", aliases: ["DHA", "DHA Islamabad", "DHA Phase 2"], lat: 33.53, lng: 73.12 },
      { name: "Bahria Town Islamabad", aliases: ["Bahria Town", "Bahria Town Islamabad"], lat: 33.52, lng: 73.1 },
      { name: "Blue Area", aliases: ["Blue Area"], lat: 33.71, lng: 73.06 },
    ],
  },
  {
    countryCode: "PK", name: "Rawalpindi", lat: 33.5651, lng: 73.0169, status: "waitlist",
    areas: [
      { name: "Saddar Rawalpindi", aliases: ["Saddar", "Saddar Rawalpindi"], lat: 33.6, lng: 73.05 },
      { name: "Satellite Town", aliases: ["Satellite Town"], lat: 33.64, lng: 73.07 },
      { name: "Bahria Town Rawalpindi", aliases: ["Bahria Town", "Bahria Town Rawalpindi"], lat: 33.52, lng: 73.1 },
      { name: "Chaklala", aliases: ["Chaklala", "Chaklala Scheme"], lat: 33.59, lng: 73.09 },
      { name: "Westridge", aliases: ["Westridge", "West Ridge"], lat: 33.6, lng: 73.02 },
    ],
  },
  {
    countryCode: "SA", name: "Riyadh", lat: 24.7136, lng: 46.6753, status: "waitlist",
    areas: [
      { name: "Olaya", aliases: ["Olaya", "Al Olaya"], lat: 24.69, lng: 46.68 },
      { name: "Al Malaz", aliases: ["Malaz", "Al Malaz"], lat: 24.66, lng: 46.73 },
      { name: "Al Nakheel", aliases: ["Nakheel", "Al Nakheel"], lat: 24.75, lng: 46.64 },
      { name: "Al Yasmin", aliases: ["Yasmin", "Al Yasmin"], lat: 24.82, lng: 46.65 },
      { name: "Al Malqa", aliases: ["Malqa", "Al Malqa"], lat: 24.81, lng: 46.6 },
    ],
  },
  {
    countryCode: "SA", name: "Jeddah", lat: 21.4858, lng: 39.1925, status: "waitlist",
    areas: [
      { name: "Al Hamra", aliases: ["Hamra", "Al Hamra"], lat: 21.54, lng: 39.16 },
      { name: "Al Rawdah", aliases: ["Rawdah", "Al Rawdah"], lat: 21.57, lng: 39.15 },
      { name: "Al Salamah", aliases: ["Salamah", "Al Salamah"], lat: 21.59, lng: 39.14 },
      { name: "Al Zahra", aliases: ["Zahra", "Al Zahra"], lat: 21.58, lng: 39.12 },
      { name: "Al Shati", aliases: ["Shati", "Al Shati"], lat: 21.6, lng: 39.11 },
    ],
  },
  {
    countryCode: "AE", name: "Dubai", lat: 25.2048, lng: 55.2708, status: "waitlist",
    areas: [
      { name: "Deira", aliases: ["Deira"], lat: 25.27, lng: 55.31 },
      { name: "Bur Dubai", aliases: ["Bur Dubai", "Burdubai"], lat: 25.25, lng: 55.3 },
      { name: "Dubai Marina", aliases: ["Marina", "Dubai Marina"], lat: 25.08, lng: 55.14 },
      { name: "JLT", aliases: ["JLT", "Jumeirah Lake Towers"], lat: 25.07, lng: 55.14 },
      { name: "Downtown Dubai", aliases: ["Downtown", "Downtown Dubai", "Burj Khalifa"], lat: 25.19, lng: 55.27 },
      { name: "Al Barsha", aliases: ["Barsha", "Al Barsha"], lat: 25.11, lng: 55.2 },
      { name: "Jumeirah", aliases: ["Jumeirah"], lat: 25.2, lng: 55.25 },
    ],
  },
  {
    countryCode: "CA", name: "Toronto", lat: 43.6532, lng: -79.3832, status: "waitlist",
    areas: [
      { name: "Downtown Toronto", aliases: ["Downtown", "Downtown Toronto"], lat: 43.65, lng: -79.38 },
      { name: "North York", aliases: ["North York"], lat: 43.76, lng: -79.41 },
      { name: "Scarborough", aliases: ["Scarborough"], lat: 43.77, lng: -79.26 },
      { name: "Etobicoke", aliases: ["Etobicoke"], lat: 43.65, lng: -79.57 },
      { name: "Mississauga", aliases: ["Mississauga"], lat: 43.59, lng: -79.64 },
    ],
  },
];

/** Idempotent: creates missing cities/areas and adds missing aliases; never removes or overwrites an admin edit. */
export async function seedAreas(): Promise<{ cities: number; areas: number }> {
  let cities = 0;
  let areas = 0;
  for (const c of CITIES) {
    const city = await prisma.city.upsert({
      where: { countryCode_name: { countryCode: c.countryCode, name: c.name } },
      update: {},
      create: { countryCode: c.countryCode, name: c.name, lat: c.lat, lng: c.lng, status: c.status },
    });
    cities++;
    for (const a of c.areas) {
      const existing = await prisma.area.findUnique({ where: { cityId_name: { cityId: city.id, name: a.name } } });
      if (!existing) {
        await prisma.area.create({ data: { cityId: city.id, name: a.name, aliases: a.aliases, lat: a.lat, lng: a.lng, status: c.status } });
        areas++;
      } else {
        const merged = Array.from(new Set([...existing.aliases, ...a.aliases]));
        if (merged.length !== existing.aliases.length) await prisma.area.update({ where: { id: existing.id }, data: { aliases: merged } });
      }
    }
  }
  return { cities, areas };
}
