import { prisma } from "@/lib/prisma";

// Countries, cities and major areas offered in Admin > Leads CRM for fetching pro contacts. Starter list below; the
// cities and areas an admin adds in Admin > Areas, and the cities of Markets & Launch, are merged in. Any city or area
// can also be typed by hand, so this list never limits what can be searched.
export type LeadPlaceCity = { name: string; areas: string[] };
export type LeadPlaceCountry = { code: string; name: string; cities: LeadPlaceCity[] };

const STARTER: Record<string, { name: string; cities: Record<string, string[]> }> = {
  PK: {
    name: "Pakistan",
    cities: {
      Karachi: ["DHA", "Clifton", "Gulshan-e-Iqbal", "Gulistan-e-Jauhar", "North Nazimabad", "Nazimabad", "PECHS", "Bahadurabad", "Tariq Road", "Saddar", "Korangi", "Malir", "Bahria Town Karachi", "Scheme 33", "North Karachi", "Federal B Area", "Shah Faisal Colony", "Landhi", "Orangi Town", "Gulberg", "Surjani Town", "Defence View", "Garden"],
      Lahore: ["DHA", "Gulberg", "Johar Town", "Model Town", "Bahria Town Lahore", "Iqbal Town", "Garden Town", "Faisal Town", "Cantt", "Wapda Town", "Township", "Valencia", "Shadman", "Samanabad", "Allama Iqbal Town", "Raiwind Road"],
      Islamabad: ["F-6", "F-7", "F-8", "F-10", "F-11", "G-6", "G-7", "G-8", "G-9", "G-10", "G-11", "G-13", "I-8", "I-10", "E-11", "DHA Islamabad", "Bahria Town Islamabad", "Bani Gala", "PWD"],
      Rawalpindi: ["Saddar", "Satellite Town", "Bahria Town Rawalpindi", "Chaklala", "Westridge", "Peshawar Road", "Adiala Road", "Gulraiz", "Commercial Market"],
      Faisalabad: ["D Ground", "Peoples Colony", "Madina Town", "Susan Road", "Gulberg", "Jinnah Colony", "Samanabad"],
      Multan: ["Cantt", "Gulgasht Colony", "Bosan Road", "Shah Rukn-e-Alam", "New Multan"],
      Peshawar: ["Hayatabad", "University Town", "Saddar", "Gulbahar", "Warsak Road"],
      Quetta: ["Jinnah Town", "Satellite Town", "Samungli Road", "Cantt"],
      Hyderabad: ["Latifabad", "Qasimabad", "Saddar", "Citizen Colony"],
      Gujranwala: ["Satellite Town", "Model Town", "Peoples Colony", "DC Road"],
      Sialkot: ["Cantt", "Paris Road", "Model Town", "Defence Road"],
      Sargodha: [], Bahawalpur: [], Sukkur: [], Larkana: [], Abbottabad: [], Mardan: [], Sahiwal: [], Gujrat: [], Jhelum: [], "Rahim Yar Khan": [], "Dera Ghazi Khan": [], Mirpur: [], Muzaffarabad: [], Jamshoro: [], Nawabshah: [], Okara: [], Kasur: [], Sheikhupura: [], "Wah Cantt": [], Taxila: [],
    },
  },
  SA: {
    name: "Saudi Arabia",
    cities: {
      Madinah: ["Aziziyah", "Quba", "Al Awali", "Al Haram", "Al Khalidiyyah", "Sultanah", "Al Iskan", "Al Uyun", "Bani Haritha", "Shuran", "Al Aqiq", "Al Jamiah", "Qurban", "Al Anabis", "Mudhainib", "Al Dua", "King Fahd District", "Al Rawabi"],
      Makkah: ["Aziziyah", "Al Awali", "Al Shoqiyah", "Al Naseem", "Al Zahir", "Al Shisha", "Batha Quraish", "Al Kakiyah", "Al Rusaifah", "Al Hajlah", "Jarwal", "Al Utaybiyyah", "Al Umrah", "Kudai"],
      Jeddah: ["Al Rawdah", "Al Safa", "Al Hamra", "Al Salamah", "Al Naeem", "Al Aziziyah", "Al Faisaliyah", "Al Zahra", "Obhur", "Al Rehab", "Al Marwah", "Al Basateen", "Al Shati", "Al Naseem", "Al Baghdadiyah", "Al Sharafiyah", "Al Balad", "Al Andalus", "Al Rabwah"],
      Riyadh: ["Al Olaya", "Al Malaz", "Al Nakheel", "Al Yasmin", "Al Narjis", "Al Sulaimaniyah", "Al Murabba", "Al Naseem", "Al Rawdah", "Al Wurud", "Al Sahafa", "Al Aqiq", "Al Rabwah", "Al Batha", "Al Malqa", "Hittin", "Al Muruj", "Al Shifa", "Al Aziziyah", "Al Suwaidi", "Dirab"],
      Dammam: ["Al Faisaliyah", "Al Shati", "Al Muraikabat", "Al Adamah", "Al Jalawiyah", "Al Nuzha", "Al Badiyah"],
      Khobar: ["Al Aqrabiyah", "Al Thuqbah", "Al Rakah", "Al Khobar Al Shamaliyah", "Al Olaya"],
      Dhahran: [], Taif: ["Al Hawiyah", "Shihar", "Al Faisaliyah", "Al Qamariyah"], Tabuk: [], Buraidah: [], Unaizah: [], "Khamis Mushait": [], Abha: [], Hail: [], Jazan: [], Najran: [], "Al Ahsa": [], Hofuf: [], Jubail: [], Yanbu: [], "Al Kharj": [], Qatif: [], Rabigh: [], "Al Ula": [], Sakaka: [], Arar: [], "Al Baha": [], "Hafar Al Batin": [],
    },
  },
  AE: {
    name: "United Arab Emirates",
    cities: {
      Dubai: ["Deira", "Bur Dubai", "Al Barsha", "Jumeirah", "Dubai Marina", "JLT", "Business Bay", "Downtown Dubai", "Al Quoz", "Karama", "Al Nahda", "Mirdif", "International City", "Silicon Oasis", "JVC", "Al Qusais", "Satwa"],
      "Abu Dhabi": ["Khalifa City", "Al Reem Island", "Mussafah", "Al Khalidiyah", "Al Mushrif", "Mohammed Bin Zayed City", "Al Raha", "Yas Island", "Al Shamkha"],
      Sharjah: ["Al Nahda", "Al Majaz", "Al Taawun", "Al Khan", "Muwaileh", "Al Qasimia", "Rolla", "Industrial Area"],
      Ajman: [], "Ras Al Khaimah": [], Fujairah: [], "Umm Al Quwain": [], "Al Ain": [],
    },
  },
  QA: { name: "Qatar", cities: { Doha: ["West Bay", "Al Sadd", "The Pearl", "Al Waab", "Al Rayyan", "Bin Mahmoud", "Najma", "Old Airport", "Al Hilal", "Madinat Khalifa"], "Al Rayyan": [], "Al Wakrah": [], "Al Khor": [], Lusail: [] } },
  KW: { name: "Kuwait", cities: { "Kuwait City": ["Salmiya", "Hawalli", "Farwaniya", "Jabriya", "Fahaheel", "Mangaf", "Abbasiya"], "Al Ahmadi": [], "Al Jahra": [] } },
  OM: { name: "Oman", cities: { Muscat: ["Ruwi", "Al Khuwair", "Qurum", "Al Ghubra", "Seeb", "Bawshar", "Al Amerat"], Salalah: [], Sohar: [], Nizwa: [] } },
  BH: { name: "Bahrain", cities: { Manama: ["Juffair", "Adliya", "Seef", "Gudaibiya", "Hoora"], Muharraq: [], Riffa: [], "Isa Town": [] } },
  CA: { name: "Canada", cities: { Toronto: ["Downtown", "Scarborough", "North York", "Etobicoke", "Mississauga", "Brampton", "Markham", "Vaughan"], Vancouver: ["Downtown", "Burnaby", "Surrey", "Richmond", "Coquitlam"], Montreal: [], Calgary: [], Ottawa: [], Edmonton: [], Winnipeg: [], Hamilton: [], "Quebec City": [], Halifax: [] } },
  US: { name: "United States", cities: { "New York": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"], "Los Angeles": [], Chicago: [], Houston: [], Dallas: [], Phoenix: [], Philadelphia: [], "San Antonio": [], "San Diego": [], "San Jose": [], Austin: [], Miami: [], Atlanta: [], Seattle: [], Boston: [] } },
  GB: { name: "United Kingdom", cities: { London: ["Westminster", "Camden", "Hackney", "Croydon", "Ealing", "Newham", "Tower Hamlets", "Barnet"], Birmingham: [], Manchester: [], Leeds: [], Glasgow: [], Liverpool: [], Bradford: [], Leicester: [], Sheffield: [], Bristol: [] } },
  DE: { name: "Germany", cities: { Berlin: ["Mitte", "Kreuzberg", "Neukölln", "Charlottenburg", "Prenzlauer Berg", "Spandau"], Munich: [], Hamburg: [], Cologne: [], Frankfurt: [], Stuttgart: [], Düsseldorf: [], Leipzig: [], Dortmund: [], Essen: [] } },
  PL: { name: "Poland", cities: { Warsaw: ["Mokotów", "Śródmieście", "Wola", "Praga", "Ursynów", "Bemowo"], Krakow: [], Wroclaw: [], Lodz: [], Poznan: [], Gdansk: [], Szczecin: [], Lublin: [] } },
  FR: { name: "France", cities: { Paris: [], Marseille: [], Lyon: [], Toulouse: [], Nice: [], Nantes: [], Strasbourg: [], Lille: [] } },
  ES: { name: "Spain", cities: { Madrid: [], Barcelona: [], Valencia: [], Seville: [], Malaga: [], Bilbao: [] } },
  IN: { name: "India", cities: { Mumbai: [], Delhi: [], Bengaluru: [], Hyderabad: [], Chennai: [], Kolkata: [], Pune: [], Ahmedabad: [], Jaipur: [], Lucknow: [] } },
};

/** Starter list + Admin > Areas + Markets & Launch, one entry per country, cities and areas sorted, no duplicates. */
export async function getLeadPlaces(): Promise<LeadPlaceCountry[]> {
  const [cities, markets, locales] = await Promise.all([
    prisma.city.findMany({ select: { countryCode: true, name: true, areas: { select: { name: true } } } }),
    prisma.market.findMany({ select: { countryCode: true, cities: true } }),
    prisma.localeConfig.findMany({ select: { countryCode: true, countryName: true, citiesLive: true } }),
  ]);

  const byCode = new Map<string, { name: string; cities: Map<string, Set<string>> }>();
  const country = (code: string, name?: string) => {
    const c = code.toUpperCase();
    let entry = byCode.get(c);
    if (!entry) byCode.set(c, (entry = { name: name ?? STARTER[c]?.name ?? c, cities: new Map() }));
    return entry;
  };
  const addCity = (code: string, city: string, areas: string[] = []) => {
    const entry = country(code);
    const key = [...entry.cities.keys()].find((k) => k.toLowerCase() === city.trim().toLowerCase()) ?? city.trim();
    if (!key) return;
    const set = entry.cities.get(key) ?? new Set<string>();
    areas.forEach((a) => a.trim() && set.add(a.trim()));
    entry.cities.set(key, set);
  };

  for (const [code, c] of Object.entries(STARTER)) {
    country(code, c.name);
    for (const [city, areas] of Object.entries(c.cities)) addCity(code, city, areas);
  }
  for (const l of locales) {
    country(l.countryCode, STARTER[l.countryCode]?.name ?? l.countryName);
    l.citiesLive.forEach((city) => addCity(l.countryCode, city));
  }
  for (const m of markets) m.cities.forEach((city) => addCity(m.countryCode, city));
  for (const c of cities) addCity(c.countryCode, c.name, c.areas.map((a) => a.name));

  return [...byCode.entries()]
    .map(([code, c]) => ({
      code,
      name: c.name,
      cities: [...c.cities.entries()].map(([name, areas]) => ({ name, areas: [...areas].sort((a, b) => a.localeCompare(b)) })).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
