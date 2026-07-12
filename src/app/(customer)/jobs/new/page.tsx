import { prisma } from "@/lib/prisma";
import { PostJobForm } from "./PostJobForm";

export default async function PostJobPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" },
    include: { subServices: { where: { active: true } } },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Post a Job</h1>
      <p className="mb-8 text-text-muted">30 seconds. Your exact address stays hidden until you pay.</p>
      <PostJobForm categories={categories} />
    </div>
  );
}
