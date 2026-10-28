import type { Trade } from "@prisma/client";

// Free-text trade -> Trade, in English, Urdu script and Roman Urdu. A sheet cell like "AC repair / bijli wala" gives
// two trades. Nothing matched -> no trade (the importer then uses "HANDYMAN" as "Other" and keeps the raw text).
const RULES: { trade: Trade; re: RegExp }[] = [
  { trade: "AC_TECHNICIAN", re: /(\bac\b|\ba\/c\b|air ?condition|split ac|اے ?سی|ایئر کنڈیشن)/i },
  { trade: "ELECTRICIAN", re: /(electric|\bbijli\b|bijli ?wala|wiring|\bwireman\b|الیکٹریشن|بجلی)/i },
  { trade: "PLUMBER", re: /(plumb|\bnalka\b|\bnalkay\b|sanitary|\bnal\b|پلمبر|نلکا|نل\b)/i },
  { trade: "CARPENTER", re: /(carpent|\blakri\b|furniture|woodwork|\bbarhai\b|کارپینٹر|بڑھئی|لکڑی)/i },
  { trade: "PAINTER", re: /(paint|\brang\b|\brangsaz\b|پینٹر|رنگ)/i },
  { trade: "MASON", re: /(\bmason\b|\bmistri\b|\bmistry\b|\braaj\b|مستری|راج)/i },
  { trade: "APPLIANCE_REPAIR", re: /(fridge|refrigerat|washing machine|appliance|microwave|geyser|\bgeezer\b|گیزر|فریج|واشنگ)/i },
  { trade: "MOVERS", re: /(mover|shifting|packers|سامان شفٹ)/i },
  { trade: "SOLAR_INSTALLER", re: /(solar|سولر)/i },
  { trade: "CLEANER", re: /(cleaning|cleaner|safai|صفائی)/i },
  { trade: "PEST_CONTROL", re: /(pest|fumigat|termite|deemak|دیمک)/i },
  { trade: "LOCKSMITH", re: /(lock ?smith|\bkey maker\b|تالا)/i },
  { trade: "CAR_MECHANIC", re: /(car mechanic|auto mechanic|mechanic|گاڑی)/i },
  { trade: "WATER_TANK_CLEANING", re: /(water tank|tank clean|ٹینکی)/i },
  { trade: "GENERATOR_REPAIR", re: /(generator|جنریٹر)/i },
  { trade: "WELDING", re: /(weld|ویلڈ)/i },
  { trade: "TILING", re: /(\btile|\btiling\b|ٹائل)/i },
  { trade: "GLASS_REPAIR", re: /(glass|شیشہ)/i },
  { trade: "ROOFING", re: /(roof)/i },
  { trade: "GARDENING", re: /(garden|\bmali\b|مالی)/i },
  { trade: "UPHOLSTERY", re: /(upholster|sofa repair)/i },
  { trade: "TOWING", re: /(\btow(ing)?\b|tow truck|roadside|breakdown|recovery truck|\bwinch\b|ٹو ?ٹرک|کرین|سحب|ونش)/i },
  { trade: "HANDYMAN", re: /(handyman|all rounder|general repair)/i },
];

/** Every trade named in the text, in rule order, without duplicates. */
export function mapTrades(text: string | null | undefined): Trade[] {
  if (!text) return [];
  const found: Trade[] = [];
  for (const r of RULES) if (r.re.test(text) && !found.includes(r.trade)) found.push(r.trade);
  return found;
}
