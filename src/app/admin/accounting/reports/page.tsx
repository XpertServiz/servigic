import Link from "next/link";
import { clsx } from "clsx";
import { getTrialBalance, getIncomeStatement, getBalanceSheet, getCashFlow } from "@/lib/accounting/reports";

const REPORTS = [
  { key: "trial-balance", label: "Trial Balance" },
  { key: "income-statement", label: "Income Statement (P&L)" },
  { key: "balance-sheet", label: "Balance Sheet" },
  { key: "cash-flow", label: "Cash Flow" },
] as const;

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; from?: string; to?: string }>;
}) {
  const { report = "trial-balance", from, to } = await searchParams;
  const fromDate = from ? new Date(from) : startOfMonth();
  const toDate = to ? new Date(to) : new Date();

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Financial Reports</h1>
      <p className="mb-6 text-text-muted">Derived live from the General Journal — nothing here is stored separately.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <Link
            key={r.key}
            href={`/admin/accounting/reports?report=${r.key}`}
            className={clsx(
              "rounded-full border px-4 py-2 text-sm font-semibold",
              report === r.key ? "border-accent bg-accent/10 text-accent" : "border-border-subtle text-text-muted"
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {(report === "income-statement" || report === "cash-flow") && (
        <form className="mb-6 flex items-end gap-3 rounded-[10px] border border-border-subtle bg-bg-elevated p-4">
          <input type="hidden" name="report" value={report} />
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">From</label>
            <input
              type="date"
              name="from"
              defaultValue={fromDate.toISOString().slice(0, 10)}
              className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-muted">To</label>
            <input
              type="date"
              name="to"
              defaultValue={toDate.toISOString().slice(0, 10)}
              className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">
            Apply
          </button>
        </form>
      )}

      {report === "trial-balance" && <TrialBalanceView />}
      {report === "income-statement" && <IncomeStatementView fromDate={fromDate} toDate={toDate} />}
      {report === "balance-sheet" && <BalanceSheetView />}
      {report === "cash-flow" && <CashFlowView fromDate={fromDate} toDate={toDate} />}
    </div>
  );
}

async function TrialBalanceView() {
  const tb = await getTrialBalance();
  return (
    <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="p-4">Account</th>
            <th className="p-4 text-right">Debit</th>
            <th className="p-4 text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {tb.rows.map((r) => (
            <tr key={r.code} className="border-t border-border-subtle">
              <td className="p-4">
                {r.code} · {r.name}
              </td>
              <td className="p-4 text-right text-accent">{r.debitColumn > 0 ? r.debitColumn.toLocaleString() : "—"}</td>
              <td className="p-4 text-right text-secondary">{r.creditColumn > 0 ? r.creditColumn.toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border-subtle font-bold">
            <td className="p-4">Total</td>
            <td className="p-4 text-right text-accent">{tb.totalDebit.toLocaleString()}</td>
            <td className="p-4 text-right text-secondary">{tb.totalCredit.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
      <div className={clsx("p-4 text-sm font-bold", tb.balanced ? "text-secondary" : "text-danger")}>
        {tb.balanced ? "✓ Balanced" : "✕ Out of balance — this should never happen, check recent manual entries"}
      </div>
    </div>
  );
}

async function IncomeStatementView({ fromDate, toDate }: { fromDate: Date; toDate: Date }) {
  const stmt = await getIncomeStatement(fromDate, toDate);
  return (
    <div className="max-w-lg rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
      <h3 className="mb-3 font-bold">Revenue</h3>
      {stmt.revenue.map((r) => (
        <Row key={r.code} label={r.name} value={r.amountPKR} />
      ))}
      <Row label="Total Revenue" value={stmt.totalRevenue} bold />

      <h3 className="mb-3 mt-6 font-bold">Expenses</h3>
      {stmt.expenses.map((r) => (
        <Row key={r.code} label={r.name} value={r.amountPKR} />
      ))}
      <Row label="Total Expenses" value={stmt.totalExpenses} bold />

      <div className="mt-6 border-t border-border-subtle pt-4">
        <Row label="Net Income" value={stmt.netIncome} bold accent />
      </div>
    </div>
  );
}

async function BalanceSheetView() {
  const bs = await getBalanceSheet(new Date());
  return (
    <div className="grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
      <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
        <h3 className="mb-3 font-bold">Assets</h3>
        {bs.assets.map((r) => (
          <Row key={r.code} label={r.name} value={r.amountPKR} />
        ))}
        <Row label="Total Assets" value={bs.totalAssets} bold />
      </div>
      <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
        <h3 className="mb-3 font-bold">Liabilities</h3>
        {bs.liabilities.map((r) => (
          <Row key={r.code} label={r.name} value={r.amountPKR} />
        ))}
        <Row label="Total Liabilities" value={bs.totalLiabilities} bold />

        <h3 className="mb-3 mt-6 font-bold">Equity</h3>
        {bs.equity.map((r) => (
          <Row key={r.code} label={r.name} value={r.amountPKR} />
        ))}
        <Row label="Retained Earnings (Net Income to Date)" value={bs.retainedEarnings} />
        <Row label="Total Equity" value={bs.totalEquity} bold />
      </div>
      <div className="md:col-span-2">
        <div className={clsx("rounded-[10px] p-4 text-sm font-bold", bs.balanced ? "text-secondary" : "text-danger")}>
          {bs.balanced
            ? `✓ Assets (PKR ${bs.totalAssets.toLocaleString()}) = Liabilities + Equity (PKR ${(bs.totalLiabilities + bs.totalEquity).toLocaleString()})`
            : "✕ Out of balance — this should never happen, check recent manual entries"}
        </div>
      </div>
    </div>
  );
}

async function CashFlowView({ fromDate, toDate }: { fromDate: Date; toDate: Date }) {
  const cf = await getCashFlow(fromDate, toDate);
  if (!cf) return <p className="text-text-muted">Cash account not found.</p>;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Stat label="Beginning balance" value={cf.beginningBalance} />
        <Stat label="Net change" value={cf.netChange} />
        <Stat label="Ending balance" value={cf.endingBalance} />
      </div>
      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Memo</th>
              <th className="p-4 text-right">Change</th>
              <th className="p-4 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {cf.rows.map((r, i) => (
              <tr key={i} className="border-t border-border-subtle">
                <td className="p-4 text-text-muted">{r.date.toLocaleDateString()}</td>
                <td className="p-4">{r.memo}</td>
                <td className={clsx("p-4 text-right font-semibold", r.changePKR >= 0 ? "text-secondary" : "text-danger")}>
                  {r.changePKR >= 0 ? "+" : ""}
                  {r.changePKR.toLocaleString()}
                </td>
                <td className="p-4 text-right">{r.runningBalance.toLocaleString()}</td>
              </tr>
            ))}
            {cf.rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-text-muted">
                  No cash movements in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: number; bold?: boolean; accent?: boolean }) {
  return (
    <div className={clsx("flex justify-between py-1.5 text-sm", bold && "border-t border-border-subtle pt-2 font-bold")}>
      <span className={accent ? "text-accent" : ""}>{label}</span>
      <span className={accent ? "text-accent" : ""}>PKR {value.toLocaleString()}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6 text-center">
      <div className="font-display text-2xl font-bold text-accent">PKR {value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-text-muted">{label}</div>
    </div>
  );
}
