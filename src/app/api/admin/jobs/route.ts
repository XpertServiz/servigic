import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { toE164, phoneVariants } from "@/lib/phone";
import { checkJobAvailability } from "@/lib/marketConfig";
import { cityCenter, parseLatLng } from "@/lib/cityCenters";
import { createAndDispatchJob } from "@/lib/jobCreate";

// Post a job on behalf of a customer (admin concierge): the job is created and sent to matching pros by the
// same code path as a job posted from the Customer app. The customer is found by phone number, or a
// placeholder account is created that the real customer claims when they register with that number.
const schema = z.object({
  customerName: z.string().trim().min(2, "Enter the customer name").max(80),
  phone: z.string().trim().min(5, "Enter the customer phone number"),
  categoryId: z.string().cuid("Pick a service category"),
  subServiceId: z.string().cuid().optional(),
  city: z.string().trim().min(2, "Pick the zone / city"),
  areaLabel: z.string().trim().min(2, "Enter the area").max(80),
  exactAddress: z.string().trim().min(5, "Enter the address").max(200),
  coords: z.string().trim().optional(),
  urgency: z.enum(["EMERGENCY", "TODAY", "SCHEDULED"]),
  scheduledAt: z.string().datetime().optional(),
  description: z.string().trim().min(10, "Describe the job (at least 10 characters)").max(1000),
  budgetPKR: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;

  if (d.urgency === "SCHEDULED" && !d.scheduledAt) return NextResponse.json({ error: "Pick the preferred date and time" }, { status: 400 });
  const phone = toE164(d.phone);
  if (!phone) {
    return NextResponse.json({ error: "That phone number is not valid. Include the country code for non-Pakistani numbers (e.g. +49...)." }, { status: 400 });
  }

  const category = await prisma.serviceCategory.findUnique({ where: { id: d.categoryId }, select: { trade: true, name: true } });
  if (!category) return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  if (d.subServiceId) {
    const sub = await prisma.subService.findFirst({ where: { id: d.subServiceId, categoryId: d.categoryId }, select: { id: true } });
    if (!sub) return NextResponse.json({ error: "That sub-service does not belong to the category" }, { status: 400 });
  }

  const typed = parseLatLng(d.coords);
  if (d.coords && !typed) return NextResponse.json({ error: "Coordinates must look like: 24.8607, 67.0011" }, { status: 400 });
  const point = typed ?? cityCenter(d.city);
  if (!point) {
    return NextResponse.json({ error: `No map position known for ${d.city}. Paste the coordinates (right-click the spot in Google Maps and copy them).` }, { status: 400 });
  }

  // Same zone / category rules as the app (including the drawn geofence): a switched-off area cannot receive jobs.
  const availability = await checkJobAvailability(d.city, category.trade, point);
  if (!availability.ok) return NextResponse.json({ error: availability.message, code: availability.code }, { status: 422 });

  // Find the customer by phone, or create the placeholder account.
  // A number can now hold a customer and a pro account: only the customer account counts here.
  const holders = await prisma.user.findMany({ where: { phone: { in: phoneVariants(phone) } } });
  let customer = holders.find((u) => u.role === "CUSTOMER") ?? null;
  let createdPlaceholder = false;
  if (!customer && holders.some((u) => u.role === "ADMIN" || u.role === "SUPPORT")) {
    return NextResponse.json({ error: "That phone number belongs to a staff account, not a customer." }, { status: 409 });
  }
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        role: "CUSTOMER",
        name: d.customerName,
        phone,
        city: d.city,
        // Unusable on purpose: nobody can log in until the real customer registers and verifies the phone.
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
        managedByAdmin: true,
      },
    });
    createdPlaceholder = true;
  }

  const title = `${category.name} - ${d.areaLabel}`.slice(0, 120);
  const { job, dispatchedCount } = await createAndDispatchJob(
    customer.id,
    {
      categoryId: d.categoryId,
      subServiceId: d.subServiceId,
      title,
      description: d.description,
      photos: [],
      urgency: d.urgency,
      scheduledAt: d.scheduledAt,
      city: d.city,
      areaLabel: d.areaLabel,
      exactAddress: d.exactAddress,
      lat: point.lat,
      lng: point.lng,
      budgetPKR: d.budgetPKR,
    },
    { postedByAdminId: auth.session.user.id },
  );

  return NextResponse.json({ jobId: job.id, dispatchedCount, createdPlaceholder, usedCityCenter: !typed });
}
