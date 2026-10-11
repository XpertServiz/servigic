import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

// Backs the bell icon in the mobile apps: the signed-in user's latest in-app
// notifications (the same rows notify() writes for the web bell).
export async function GET() {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, title: true, body: true, linkUrl: true, isRead: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: auth.session.user.id, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

// Marks everything read (called when the notifications screen is opened).
export async function POST() {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;

  await prisma.notification.updateMany({ where: { userId: auth.session.user.id, isRead: false }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
