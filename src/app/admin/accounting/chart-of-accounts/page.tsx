import { getChartOfAccounts } from "@/lib/accounting/reports";
import { ChartOfAccountsClient } from "./ChartOfAccountsClient";

export default async function ChartOfAccountsPage() {
  const accounts = await getChartOfAccounts();

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Chart of Accounts</h1>
      <p className="mb-8 text-text-muted">
        Every account journal entries can be posted to. System accounts (marked 🔒) are used by auto-posting on
        payments, payouts, and dispute refunds — they can&apos;t be deleted.
      </p>
      <ChartOfAccountsClient accounts={accounts} />
    </div>
  );
}
