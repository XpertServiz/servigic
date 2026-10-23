import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Permanent deletion for the admin "Delete user" button and the "Wipe test data" reset. It reads the foreign keys from the
// database itself, so every row that depends on a deleted row is handled, including tables added later:
//   - a NOT NULL reference (a bid's job, a booking's customer...) is deleted with it, recursively;
//   - a nullable reference (who referred whom, an optional link) is just cleared, so nothing unrelated is lost.
// Everything runs in one transaction: it either all happens or nothing does.

type Tx = Prisma.TransactionClient;

interface ForeignKey {
  child: string;
  childCol: string;
  parent: string;
  parentCol: string;
  nullable: boolean;
}

async function foreignKeys(tx: Tx): Promise<ForeignKey[]> {
  return tx.$queryRawUnsafe<ForeignKey[]>(`
    SELECT cl.relname AS "child", att.attname AS "childCol", pcl.relname AS "parent", patt.attname AS "parentCol", NOT att.attnotnull AS "nullable"
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_class pcl ON pcl.oid = con.confrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
    JOIN pg_attribute patt ON patt.attrelid = con.confrelid AND patt.attnum = con.confkey[1]
    WHERE con.contype = 'f' AND ns.nspname = current_schema()`);
}

async function hasIdColumn(tx: Tx, table: string, cache: Map<string, boolean>): Promise<boolean> {
  if (!cache.has(table)) {
    const rows = await tx.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'id'`,
      table,
    );
    cache.set(table, (rows[0]?.n ?? 0) > 0);
  }
  return cache.get(table)!;
}

const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

// A dry run does the whole deletion inside the transaction, counts it, and then rolls everything back.
class DryRun extends Error {
  constructor(public counts: PurgeCounts) {
    super("dry run");
  }
}
async function runPurge(work: (tx: Tx, counts: PurgeCounts) => Promise<void>, dryRun: boolean, timeout: number): Promise<PurgeCounts> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const counts: PurgeCounts = {};
        await work(tx, counts);
        if (dryRun) throw new DryRun(counts);
        return counts;
      },
      { timeout, maxWait: 15_000 },
    );
  } catch (e) {
    if (e instanceof DryRun) return e.counts;
    throw e;
  }
}

export type PurgeCounts = Record<string, number>;

async function purgeRows(tx: Tx, fks: ForeignKey[], table: string, col: string, values: string[], counts: PurgeCounts, idCache: Map<string, boolean>, depth = 0): Promise<void> {
  if (values.length === 0) return;
  if (depth > 25) throw new Error(`Purge went too deep at ${table}`);
  for (const fk of fks.filter((f) => f.parent === table)) {
    const parentValues =
      fk.parentCol === col
        ? values
        : (await tx.$queryRawUnsafe<{ v: string }[]>(`SELECT ${q(fk.parentCol)}::text AS v FROM ${q(table)} WHERE ${q(col)}::text = ANY($1::text[])`, values)).map((r) => r.v);
    if (parentValues.length === 0) continue;
    if (fk.nullable) {
      await tx.$executeRawUnsafe(`UPDATE ${q(fk.child)} SET ${q(fk.childCol)} = NULL WHERE ${q(fk.childCol)}::text = ANY($1::text[])`, parentValues);
    } else if (await hasIdColumn(tx, fk.child, idCache)) {
      const ids = (await tx.$queryRawUnsafe<{ id: string }[]>(`SELECT id::text AS id FROM ${q(fk.child)} WHERE ${q(fk.childCol)}::text = ANY($1::text[])`, parentValues)).map((r) => r.id);
      await purgeRows(tx, fks, fk.child, "id", ids, counts, idCache, depth + 1);
    } else {
      const n = await tx.$executeRawUnsafe(`DELETE FROM ${q(fk.child)} WHERE ${q(fk.childCol)}::text = ANY($1::text[])`, parentValues);
      if (n) counts[fk.child] = (counts[fk.child] ?? 0) + n;
    }
  }
  const n = await tx.$executeRawUnsafe(`DELETE FROM ${q(table)} WHERE ${q(col)}::text = ANY($1::text[])`, values);
  if (n) counts[table] = (counts[table] ?? 0) + n;
}

async function purgeTable(tx: Tx, fks: ForeignKey[], table: string, counts: PurgeCounts, idCache: Map<string, boolean>, where = "TRUE", params: unknown[] = []) {
  const ids = (await tx.$queryRawUnsafe<{ id: string }[]>(`SELECT id::text AS id FROM ${q(table)} WHERE ${where}`, ...params)).map((r) => r.id);
  await purgeRows(tx, fks, table, "id", ids, counts, idCache);
}

/** Deletes a customer or pro account and everything that depends on it. Admin accounts can never be deleted this way. */
export async function deleteUserCompletely(userId: string, dryRun = false): Promise<PurgeCounts> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw new Error("User not found");
  if (user.role !== "CUSTOMER" && user.role !== "PROVIDER") throw new Error("Admin and support accounts cannot be deleted here");
  return runPurge(async (tx, counts) => purgeRows(tx, await foreignKeys(tx), "User", "id", [userId], counts, new Map()), dryRun, 120_000);
}

/** What the reset can wipe. Admin accounts, settings, markets, countries, categories, areas, zones and exchange rates are always kept. */
export const WIPE_PARTS = {
  users: { label: "All customers and pros, with their jobs, bids, bookings, reviews, messages, payments, wallets, top-ups, payouts, referrals, disputes, notifications and signed agreements", tables: [] as string[] },
  earlyList: { label: "Early list / waitlist sign-ups (all countries and businesses)", tables: ["WaitlistSignup", "CountryWaitlistEntry", "BusinessWaitlistEntry"] },
  visitors: { label: "Website visitor statistics (page views, visitors)", tables: ["SiteVisitor"] },
  accounting: { label: "Accounting journal entries (the chart of accounts is kept)", tables: ["JournalEntry"] },
  priceData: { label: "Price benchmarks calculated from past jobs", tables: ["PriceBenchmark"] },
  chatCache: { label: "Saved chatbot answers", tables: ["ChatAnswer"] },
  security: { label: "Verification codes, rate-limit counters and export logs", tables: ["OtpCode", "RateLimitHit", "ExportAudit"] },
  proLeads: { label: "Pro leads CRM (imported and Google Places leads, with their activity)", tables: ["Lead"] },
} as const;
export type WipePart = keyof typeof WIPE_PARTS;

async function tableCount(table: string, where = "TRUE", params: unknown[] = []): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${q(table)} WHERE ${where}`, ...params).catch(() => [{ n: 0 }]);
  return rows[0]?.n ?? 0;
}

/** How much each part would delete (for the confirmation screen). */
export async function wipePreview(): Promise<Record<WipePart, number>> {
  const out = {} as Record<WipePart, number>;
  for (const part of Object.keys(WIPE_PARTS) as WipePart[]) {
    if (part === "users") out[part] = await tableCount("User", `role IN ('CUSTOMER','PROVIDER')`);
    else out[part] = (await Promise.all(WIPE_PARTS[part].tables.map((t) => tableCount(t)))).reduce((a, b) => a + b, 0);
  }
  return out;
}

export async function wipeTestData(parts: WipePart[], dryRun = false): Promise<PurgeCounts> {
  return runPurge(
    async (tx, counts) => {
      const fks = await foreignKeys(tx);
      const idCache = new Map<string, boolean>();
      if (parts.includes("users")) await purgeTable(tx, fks, "User", counts, idCache, `role IN ('CUSTOMER','PROVIDER')`);
      for (const part of parts) {
        if (part === "users") continue;
        for (const table of WIPE_PARTS[part].tables) await purgeTable(tx, fks, table, counts, idCache);
      }
    },
    dryRun,
    300_000,
  );
}
