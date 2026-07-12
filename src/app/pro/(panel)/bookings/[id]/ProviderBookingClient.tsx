"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusTimeline } from "@/components/booking/StatusTimeline";
import { LiveMap } from "@/components/booking/LiveMap";
import { ChatBox } from "@/components/booking/ChatBox";
import { PROVIDER_REVIEW_TAGS } from "@/lib/validation/booking";

type BookingView = {
  id: string;
  status: string;
  payoutPKR: number;
  jobTitle: string;
  categoryIcon: string;
  exactAddress: string | null;
  jobLat: number;
  jobLng: number;
  customerName: string;
  customerPhone: string | null;
  hasReview: boolean;
  unlocked: boolean;
};

const NEXT_ACTION: Record<string, { next: string; label: string } | undefined> = {
  CONFIRMED: { next: "ON_MY_WAY", label: "On My Way" },
  ON_MY_WAY: { next: "ARRIVED", label: "Arrived" },
  ARRIVED: { next: "WORKING", label: "Start Working" },
  WORKING: { next: "DONE", label: "Mark Done" },
};

const PING_INTERVAL_MS = 45000;

export function ProviderBookingClient({ booking, currentUserId }: { booking: BookingView; currentUserId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (booking.status !== "ON_MY_WAY" || !navigator.geolocation) return;

    function sendPing() {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyLocation({ lat, lng });
        await fetch(`/api/bookings/${booking.id}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
      });
    }

    sendPing();
    const interval = setInterval(sendPing, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [booking.id, booking.status]);

  async function advanceStatus() {
    const action = NEXT_ACTION[booking.status];
    if (!action) return;
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }
      toast.success(`Status: ${action.next.replace("_", " ")}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const action = NEXT_ACTION[booking.status];

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-2xl">{booking.categoryIcon}</span>
        <div>
          <h1 className="font-display text-2xl font-bold">{booking.jobTitle}</h1>
          <p className="text-sm text-text-muted">
            Payout PKR {booking.payoutPKR.toLocaleString()} · {booking.customerName}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <StatusTimeline status={booking.status} />
      </div>

      {booking.status === "PENDING_PAYMENT" && (
        <div className="mb-6 rounded-[12px] border border-accent/30 bg-accent/10 p-4 text-sm font-semibold text-accent">
          Waiting for the customer to complete payment.
        </div>
      )}

      {booking.unlocked && (
        <div className="mb-6 rounded-[12px] border border-secondary/30 bg-secondary/10 p-4 text-sm">
          <p className="font-bold text-secondary">Contact unlocked</p>
          <p className="text-text-muted">{booking.customerName} · {booking.customerPhone}</p>
          <p className="text-text-muted">{booking.exactAddress}</p>
          {booking.exactAddress && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${booking.jobLat},${booking.jobLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-accent"
            >
              Open in Google Maps →
            </a>
          )}
        </div>
      )}

      {["ON_MY_WAY", "ARRIVED", "WORKING"].includes(booking.status) && (
        <div className="mb-6">
          <LiveMap destLat={booking.jobLat} destLng={booking.jobLng} proLat={myLocation?.lat} proLng={myLocation?.lng} />
        </div>
      )}

      {action && (
        <button
          onClick={advanceStatus}
          disabled={pending}
          className="mb-6 rounded-[10px] bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Updating…" : action.label}
        </button>
      )}

      {booking.status === "DONE" && (
        <div className="mb-6 rounded-[12px] border border-border-subtle bg-bg-elevated p-4 text-sm text-text-muted">
          Waiting for the customer to confirm the job is done.
        </div>
      )}

      {booking.status === "COMPLETED" && !booking.hasReview && <RateCustomerForm bookingId={booking.id} />}

      {booking.unlocked && (
        <div className="mt-6">
          <ChatBox bookingId={booking.id} currentUserId={currentUserId} unlocked={booking.unlocked} />
        </div>
      )}
    </div>
  );
}

function RateCustomerForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleTag(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  async function submit() {
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, tags }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      router.refresh();
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="mb-6 rounded-[14px] border border-secondary/30 bg-secondary/10 p-5 text-center text-secondary">
        Thanks for rating the customer! 🎉
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <h3 className="mb-3 font-bold">Rate this customer</h3>
      <div className="mb-3 flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} className={n <= rating ? "text-accent" : "text-border-subtle"}>
            ★
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {PROVIDER_REVIEW_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              tags.includes(t) ? "border-accent bg-accent/10 text-accent" : "border-border-subtle text-text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={pending}
        className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
      >
        Submit Rating
      </button>
    </div>
  );
}
