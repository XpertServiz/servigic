// Fixed lists used by the waitlist form (data only, so client components can import them).
export const KARACHI_AREAS = [
  "Gulshan-e-Iqbal", "Gulistan-e-Jauhar", "North Nazimabad", "Nazimabad", "DHA Phase 1-4", "DHA Phase 5-6", "DHA Phase 7-8", "Clifton",
  "Saddar", "PECHS", "Bahadurabad", "Tariq Road", "Malir", "Landhi", "Korangi", "North Karachi", "Surjani Town", "Orangi Town",
  "Federal B Area", "Liaquatabad", "Gulberg", "Lyari", "Shah Faisal Colony", "Johar Mor", "Scheme 33", "Gadap", "Gulshan-e-Maymar",
  "Bin Qasim", "Baldia Town", "Saadi Town", "Kemari", "Mauripur", "Defence View", "Sharifabad",
] as const;

export const WAITLIST_TRADES = ["ELECTRICIAN", "PLUMBER", "AC_TECHNICIAN", "CARPENTER", "PAINTER", "MASON", "APPLIANCE_REPAIR", "OTHER"] as const;
export const TRADE_LABELS: Record<(typeof WAITLIST_TRADES)[number], string> = {
  ELECTRICIAN: "Electrician",
  PLUMBER: "Plumber",
  AC_TECHNICIAN: "AC technician",
  CARPENTER: "Carpenter",
  PAINTER: "Painter",
  MASON: "Mason",
  APPLIANCE_REPAIR: "Appliance repair",
  OTHER: "Other",
};

/** Countries offered in the form (the rest can be reached with "Other" + a +country-code number). */
export const FORM_COUNTRIES: { code: string; name: string }[] = [
  { code: "PK", name: "Pakistan" }, { code: "SA", name: "Saudi Arabia" }, { code: "AE", name: "United Arab Emirates" }, { code: "QA", name: "Qatar" },
  { code: "KW", name: "Kuwait" }, { code: "BH", name: "Bahrain" }, { code: "OM", name: "Oman" }, { code: "CA", name: "Canada" }, { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" }, { code: "DE", name: "Germany" }, { code: "FR", name: "France" }, { code: "ES", name: "Spain" }, { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" }, { code: "AU", name: "Australia" }, { code: "IN", name: "India" }, { code: "EG", name: "Egypt" }, { code: "TR", name: "Turkey" },
  { code: "MX", name: "Mexico" }, { code: "XX", name: "Other" },
];

