// Zones & leads tests against the real database (rows are tagged ZZTEST and removed at the end).
// Run (tsx cannot load the phone-number library, so bundle with esbuild and run in plain Node):
//   npx esbuild scripts/test-zones-leads.mts --bundle --platform=node --format=cjs --packages=external --alias:@=./src --outfile=scripts/.tmp-test.cjs
//   node --env-file=.env scripts/.tmp-test.cjs   (then delete scripts/.tmp-test.cjs)
import { prisma } from "../src/lib/prisma";
import { seedAreas } from "../src/lib/areaSeed";
import { loadAreas, matchAreaByPoint, matchAreaByText, normalizeAreaText } from "../src/lib/areas";
import { normalizePhone, syncLeadForUser } from "../src/lib/leads";
import { runImport, guessMapping } from "../src/lib/leadImport";
import { mapTrades } from "../src/lib/tradeKeywords";
import { buildExport } from "../src/lib/leadExport";
import { parseFilter } from "../src/lib/leadFilters";
import { pointInRing } from "../src/lib/geofence";
import { jobInActiveZone } from "../src/lib/dispatch";
import type { MarketSnapshot } from "../src/lib/marketConfig";

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} ${extra}`);
};
const eq = (label: string, got: unknown, want: unknown) => check(label, JSON.stringify(got) === JSON.stringify(want), ok(got, want));
function ok(got: unknown, want: unknown) {
  return JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`;
}

async function main() {
  // ---------- 1. phone normalisation ----------
  eq("0300 1234567 -> +92", normalizePhone("0300 1234567"), "+923001234567");
  eq("3001234567 -> +92", normalizePhone("3001234567"), "+923001234567");
  eq("+92 300 1234567", normalizePhone("+92 300 1234567"), "+923001234567");
  eq("0092 300 1234567", normalizePhone("0092 300 1234567"), "+923001234567");
  eq("too short is rejected", normalizePhone("0300123"), null);
  eq("garbage is rejected", normalizePhone("abc"), null);
  eq("UAE number with country AE", normalizePhone("050 123 4567", "AE"), "+971501234567");

  // ---------- 2. area master list + alias matching ----------
  const seeded = await seedAreas();
  check("starter areas loaded", seeded.cities >= 7);
  const areas = await loadAreas();
  const name = (t: string) => matchAreaByText(t, areas.filter((a) => a.countryCode === "PK" && a.cityName === "Karachi"))?.name ?? null;
  eq("'defence ph 6' -> DHA", name("defence ph 6"), "DHA");
  eq("'DHA Phase 8, Karachi' -> DHA", name("DHA Phase 8, Karachi"), "DHA");
  eq("'Block 5 Clifton' -> Clifton", name("Block 5 Clifton"), "Clifton");
  eq("'Gulshan Block 13' -> Gulshan-e-Iqbal", name("Gulshan Block 13"), "Gulshan-e-Iqbal");
  eq("'Gulshan e Maymar' beats 'Gulshan'", name("Gulshan e Maymar"), "Gulshan-e-Maymar");
  eq("'Johar Mor' -> Gulistan-e-Jauhar", name("Johar Mor"), "Gulistan-e-Jauhar");
  eq("Urdu script alias", name("گلشن اقبال"), "Gulshan-e-Iqbal");
  eq("'F.B Area' -> Federal B Area", name("F.B Area"), "Federal B Area");
  eq("unknown text -> no match", name("Moon base alpha"), null);
  eq("normalisation", normalizeAreaText("Defense   Ph-6"), "defence phase 6");
  eq("pin in Clifton -> Clifton", matchAreaByPoint(24.8139, 67.0301, areas)?.name, "Clifton");
  eq("pin in DHA -> DHA", matchAreaByPoint(24.8, 67.06, areas)?.name, "DHA");
  eq("pin far away -> none", matchAreaByPoint(30, 70, areas), null);

  // ---------- 3. point-in-polygon + dispatch only inside live zones with the right trade ----------
  const square: [number, number][] = [[24.7, 67.0], [24.7, 67.1], [24.9, 67.1], [24.9, 67.0]];
  check("point inside the polygon", pointInRing(24.8, 67.05, square));
  check("point outside the polygon", !pointInRing(25.5, 67.05, square));
  const zone = (over: Partial<MarketSnapshot>): MarketSnapshot => ({
    id: "z1", countryCode: "PK", name: "Test zone", cities: [], enabled: true, status: "LIVE", currency: "PKR", phoneCode: "+92", timezone: "Asia/Karachi",
    polygons: [square], walletCeiling: null, minTopUp: null, trades: { ELECTRICIAN: { enabled: true, maxActivePros: null } }, ...over,
  });
  const job = { lat: 24.8, lng: 67.05, city: "Karachi" };
  check("job inside a live zone with the trade -> sent", jobInActiveZone([zone({})], job, "ELECTRICIAN"));
  check("same zone, trade not enabled -> not sent", !jobInActiveZone([zone({})], job, "PLUMBER"));
  check("zone only recruiting (WAITLIST) -> not sent", !jobInActiveZone([zone({ status: "WAITLIST" })], job, "ELECTRICIAN"));
  check("zone paused (disabled) -> not sent", !jobInActiveZone([zone({ enabled: false })], job, "ELECTRICIAN"));
  check("job outside every zone -> not sent", !jobInActiveZone([zone({})], { lat: 25.5, lng: 67.05, city: "Karachi" }, "ELECTRICIAN"));

  // ---------- 4. trade keywords ----------
  eq("bijli wala -> electrician", mapTrades("bijli wala"), ["ELECTRICIAN"]);
  eq("AC repair + fridge", mapTrades("AC repair / fridge"), ["AC_TECHNICIAN", "APPLIANCE_REPAIR"]);
  eq("nalka -> plumber", mapTrades("nalka"), ["PLUMBER"]);
  eq("lakri / furniture -> carpenter", mapTrades("lakri furniture"), ["CARPENTER"]);
  eq("mistri -> mason", mapTrades("mistri"), ["MASON"]);
  eq("movers / shifting", mapTrades("movers shifting"), ["MOVERS"]);
  eq("unknown -> none", mapTrades("astronaut"), []);

  // ---------- 5. import: dedupe, invalid phones, areas, report; second run does not duplicate ----------
  const headers = ["Name", "Mobile", "Service", "Area", "City"];
  const rows = [
    ["Ali Zz", "0300 1230101", "bijli wala", "Defence ph 6", "Karachi"],
    ["Ali Dup", "+92 300 1230101", "wiring", "", "Karachi"],
    ["Bad Zz", "12345", "plumber", "Clifton", "Karachi"],
    ["Sara Zz", "03001230102", "AC repair / fridge", "Block 2 Gulshan", "Karachi"],
  ];
  const mapping = guessMapping(headers);
  check("column mapping guessed", mapping.name === 0 && mapping.phone === 1 && mapping.trade === 2 && mapping.area === 3 && mapping.city === 4);
  const preview = await runImport({ rows, mapping, sourceName: "ZZTEST", defaultCountry: "PK", geocode: false, commit: false });
  check("preview writes nothing", (await prisma.lead.count({ where: { sourceDetail: "ZZTEST" } })) === 0);
  eq("preview: will add 2, update 1 (dup in file), 1 invalid", [preview.added, preview.updated, preview.invalid.length, preview.duplicatesInFile], [2, 1, 1, 1]);
  const first = await runImport({ rows, mapping, sourceName: "ZZTEST", defaultCountry: "PK", geocode: false, commit: true });
  eq("import: added 2, updated 1, invalid 1", [first.added, first.updated, first.invalid.length], [2, 1, 1]);
  const leadA = await prisma.lead.findFirst({ where: { phone: "+923001230101" } });
  const leadD = await prisma.lead.findFirst({ where: { phone: "+923001230102" } });
  check("lead A stored as E.164 once", !!leadA && (await prisma.lead.count({ where: { phone: "+923001230101" } })) === 1);
  eq("lead A trades", leadA?.trades, ["ELECTRICIAN"]);
  eq("lead D trades", leadD?.trades, ["AC_TECHNICIAN", "APPLIANCE_REPAIR"]);
  eq("lead A area matched to DHA (raw text kept)", [areas.find((a) => a.id === leadA?.areaId)?.name, leadA?.areaRaw], ["DHA", "Defence ph 6"]);
  eq("lead D area matched to Gulshan-e-Iqbal", areas.find((a) => a.id === leadD?.areaId)?.name, "Gulshan-e-Iqbal");
  eq("lead A source first import, kept once", [leadA?.source, leadA?.sources.length], ["IMPORT", 1]);
  const second = await runImport({ rows, mapping, sourceName: "ZZTEST2", defaultCountry: "PK", geocode: false, commit: true });
  eq("re-import: nothing added, all updated", [second.added, second.updated], [0, 3]);
  const leadA2 = await prisma.lead.findFirst({ where: { phone: "+923001230101" } });
  check("re-import keeps first source and appends the new one", leadA2?.source === "IMPORT" && leadA2.sources.some((s) => s.endsWith("ZZTEST2")) && leadA2.sources.some((s) => s.endsWith("ZZTEST")), JSON.stringify(leadA2?.sources));
  check("each lead has a join ref code", !!leadA2?.refCode && /^LD[A-Z0-9]{6}$/.test(leadA2.refCode));

  // ---------- 6. do-not-contact is excluded from every export; export is audited ----------
  await prisma.lead.update({ where: { id: leadA!.id }, data: { doNotContact: true, status: "DO_NOT_CONTACT" } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, name: true } });
  const before = await prisma.exportAudit.count();
  const out = await buildExport("leads", parseFilter({ q: "30012301" }), [], "csv", { id: admin?.id ?? "test", name: admin?.name ?? "test" });
  const text = typeof out.body === "string" ? out.body : out.body.toString("utf8");
  check("export leaves out the do-not-contact lead", !text.includes("+923001230101") && text.includes("+923001230102"));
  check("export wrote an audit row (rows, filter, who)", (await prisma.exportAudit.count()) === before + 1);
  const audit = await prisma.exportAudit.findFirst({ orderBy: { createdAt: "desc" } });
  check("audit has row count and filter", audit?.rowCount === 1 && JSON.stringify(audit.filter).includes("30012301"));
  check("file name carries the filter and date", /^pro_leads_.*\d{4}-\d{2}-\d{2}\.csv$/.test(out.filename), out.filename);
  const xl = await buildExport("leads", parseFilter({ q: "30012301" }), ["name", "phone"], "xlsx", { id: admin?.id ?? "test", name: admin?.name ?? "test" });
  check("xlsx export builds a workbook", Buffer.isBuffer(xl.body) && xl.body.length > 1000 && xl.filename.endsWith(".xlsx"));

  // ---------- 7. status moves forward automatically when the lead registers / is verified / works ----------
  const user = await prisma.user.create({ data: { role: "PROVIDER", name: "ZZTEST Pro", phone: "+923001230102", passwordHash: "x", city: "Karachi" } });
  await syncLeadForUser(user.id, "REGISTERED");
  let d = await prisma.lead.findUnique({ where: { id: leadD!.id } });
  eq("registered: status + account link", [d?.status, d?.proUserId], ["REGISTERED", user.id]);
  await syncLeadForUser(user.id, "VERIFIED");
  d = await prisma.lead.findUnique({ where: { id: leadD!.id } });
  eq("verified", d?.status, "VERIFIED");
  await syncLeadForUser(user.id, "ACTIVE");
  d = await prisma.lead.findUnique({ where: { id: leadD!.id } });
  eq("active after a completed job", d?.status, "ACTIVE");
  await syncLeadForUser(user.id, "REGISTERED");
  d = await prisma.lead.findUnique({ where: { id: leadD!.id } });
  eq("never moves backwards", d?.status, "ACTIVE");
  const acts = await prisma.leadActivity.count({ where: { leadId: leadD!.id } });
  check("status moves are logged", acts >= 3);
  // a brand-new Pro with no lead becomes one (source APP)
  const user2 = await prisma.user.create({ data: { role: "PROVIDER", name: "ZZTEST New", phone: "+923001230103", passwordHash: "x", city: "Karachi" } });
  await prisma.providerProfile.create({ data: { userId: user2.id, displayName: "ZZTEST New" } });
  await syncLeadForUser(user2.id, "REGISTERED");
  const created = await prisma.lead.findFirst({ where: { phone: "+923001230103" } });
  eq("app registration without a lead creates one", [created?.source, created?.status], ["APP", "REGISTERED"]);
  // do-not-contact stays flagged even if he registers
  await prisma.user.create({ data: { role: "PROVIDER", name: "ZZTEST Dnc", phone: "+923001230101", passwordHash: "x" } }).then((u) => syncLeadForUser(u.id, "REGISTERED"));
  const a3 = await prisma.lead.findUnique({ where: { id: leadA!.id } });
  check("do-not-contact flag survives registration", a3?.doNotContact === true);

  // ---------- cleanup ----------
  const ids = (await prisma.lead.findMany({ where: { OR: [{ sourceDetail: "ZZTEST" }, { phone: { in: ["+923001230101", "+923001230102", "+923001230103"] } }] }, select: { id: true } })).map((l) => l.id);
  await prisma.leadActivity.deleteMany({ where: { leadId: { in: ids } } });
  await prisma.lead.deleteMany({ where: { id: { in: ids } } });
  await prisma.providerProfile.deleteMany({ where: { user: { name: { startsWith: "ZZTEST" } } } });
  await prisma.user.deleteMany({ where: { name: { startsWith: "ZZTEST" } } });
  await prisma.exportAudit.deleteMany({ where: { id: { in: audit ? [audit.id] : [] } } });
  const stray = await prisma.exportAudit.findMany({ orderBy: { createdAt: "desc" }, take: 2 });
  await prisma.exportAudit.deleteMany({ where: { id: { in: stray.filter((s) => JSON.stringify(s.filter).includes("30012301")).map((s) => s.id) } } });

  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
