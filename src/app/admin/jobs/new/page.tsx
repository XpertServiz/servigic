import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostJobForm } from "./PostJobForm";
import { getLeadPlaces } from "@/lib/leadPlaces";

export const dynamic = "force-dynamic";

export default async function AdminPostJobPage() {
  const places = await getLeadPlaces();
  const [categories, markets] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, icon: true, subServices: { where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } } },
    }),
    prisma.market.findMany({ where: { enabled: true }, select: { cities: true }, orderBy: { name: "asc" } }),
  ]);
  const cities = Array.from(new Set(markets.flatMap((m) => m.cities)));

  return (
    <div className="max-w-3xl">
      <Link href="/admin/jobs" className="text-sm text-accent">
        ← Jobs
      </Link>
      <h1 className="mb-1 mt-2 font-display text-3xl font-bold">Post a job for a customer</h1>
      <p className="mb-8 text-text-muted">
        For customers who call or message instead of using the app. The job goes to matching pros exactly like an app job; you then see the bids and can confirm one for
        the customer. When they later sign up with the same phone number, this job appears in their history.
      </p>
      <PostJobForm categories={categories} cities={cities} places={places} />
    </div>
  );
}
