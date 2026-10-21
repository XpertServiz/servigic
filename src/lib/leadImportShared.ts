// Types and field list shared by the import screen (browser) and the import code (server).
export const IMPORT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone (required)" },
  { key: "altPhone", label: "Alternate phone" },
  { key: "whatsappSame", label: "WhatsApp same as phone (yes/no)" },
  { key: "trade", label: "Trade / service (any wording)" },
  { key: "skills", label: "Other skills" },
  { key: "experience", label: "Years of experience" },
  { key: "shop", label: "Shop / business name" },
  { key: "address", label: "Address" },
  { key: "area", label: "Area / neighbourhood" },
  { key: "city", label: "City" },
  { key: "country", label: "Country (code or name)" },
  { key: "lat", label: "Latitude" },
  { key: "lng", label: "Longitude" },
  { key: "language", label: "Language" },
  { key: "notes", label: "Notes" },
  { key: "consent", label: "Consent (yes/no)" },
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];
export type ColumnMapping = Partial<Record<ImportField, number>>; // field -> column index

export interface ImportReport {
  total: number;
  added: number;
  updated: number;
  duplicatesInFile: number;
  invalid: { rowNo: number; value: string; why: string }[];
  unmatchedAreas: { text: string; count: number }[];
  geocoded: number;
  sample: { rowNo: number; name: string; phone: string; trades: string[]; area: string | null; action: string }[];
  committed: boolean;
}

