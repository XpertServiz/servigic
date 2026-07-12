import { prisma } from "@/lib/prisma";

const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "text-accent border-accent/30 bg-accent/10",
  PROVIDER: "text-secondary border-secondary/30 bg-secondary/10",
  ADMIN: "text-danger border-danger/30 bg-danger/10",
  SUPPORT: "text-text-muted border-border-subtle",
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Users</h1>
      <p className="mb-8 text-text-muted">All registered accounts.</p>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Phone</th>
              <th className="p-4">City</th>
              <th className="p-4">Role</th>
              <th className="p-4">Verified</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border-subtle">
                <td className="p-4 font-semibold">{u.name}</td>
                <td className="p-4 text-text-muted">{u.phone}</td>
                <td className="p-4 text-text-muted">{u.city ?? "—"}</td>
                <td className="p-4">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                </td>
                <td className="p-4 text-text-muted">{u.phoneVerified ? "✓" : "—"}</td>
                <td className="p-4 text-text-muted">{u.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
