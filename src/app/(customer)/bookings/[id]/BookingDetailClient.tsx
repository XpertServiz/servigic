"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusTimeline } from "@/components/booking/StatusTimeline";
import { LiveMap } from "@/components/booking/LiveMap";
import { ChatBox } from "@/components/booking/ChatBox";
import { PhotoUploadField } from "@/components/ui/PhotoUploadField";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { LegalDisclaimer } from "@/components/ui/LegalDisclaimer";
import { CUSTOMER_REVIEW_TAGS } from "@/lib/validation/booking";
import { estimateEtaMinutes } from "@/lib/eta";

const TRACKED_STATUSES = ["ON_MY_WAY", "ARRIVED", "WORKING"];

type ChangeOrderView = {
  id: string;
  description: string;
  photoUrl: string | null;
  extraAmountPKR: number;
  status: string;
  proofImageUrl: string | null;
};

type BookingView = {
  id: string;
  status: string;
  totalPKR: number;
  estimatedPartsNote: string | null;
  jobTitle: string;
  categoryIcon: string;
  exactAddress: string | null;
  jobLat: number;
  jobLng: number;
  providerName: string;
  providerPhone: string | null;
  paymentDeadline: string;
  payment: { status: string } | null;
  hasReview: boolean;
  dispute: { resolution: string | null } | null;
  unlocked: boolean;
  changeOrders: ChangeOrderView[];
  totalDurationMinutes: number | null;
  workDurationMinutes: number | null;
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
}

const PAYMENT_METHODS = [
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "EasyPaisa" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
] as const;

// Placeholder numbers until real business accounts are swapped in via env —
// see .env.example for what to replace.
const PAYMENT_ACCOUNTS: Record<(typeof PAYMENT_METHODS)[number]["value"], { label: string; value: string }[]> = {
  JAZZCASH: [{ label: "JazzCash number", value: process.env.NEXT_PUBLIC_JAZZCASH_NUMBER ?? "Not configured yet" }],
  EASYPAISA: [{ label: "EasyPaisa number", value: process.env.NEXT_PUBLIC_EASYPAISA_NUMBER ?? "Not configured yet" }],
  BANK_TRANSFER: [
    { label: "Account title", value: process.env.NEXT_PUBLIC_BANK_ACCOUNT_TITLE ?? "Not configured yet" },
    { label: "Account number", value: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "Not configured yet" },
    { label: "Bank", value: process.env.NEXT_PUBLIC_BANK_NAME ?? "Not configured yet" },
  ],
};

export function BookingDetailClient({
  booking,
  currentUserId,
  legalDisclaimer,
}: {
  booking: BookingView;
  currentUserId: string;
  legalDisclaimer: string;
}) {
  const router = useRouter();
  const [proLocation, setProLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!TRACKED_STATUSES.includes(booking.status)) return;
    async function poll() {
      const res = await fetch(`/api/bookings/${booking.id}/location`);
      if (res.ok) {
        const data = await res.json();
        if (data.ping) setProLocation({ lat: data.ping.lat, lng: data.ping.lng });
      }
    }
    poll(); // always fetch the last known position once, even after tracking has stopped
    // Only keep polling for new positions while the pro is actually en route —
    // they stop sending pings once Arrived, so repeat-polling after that is wasted.
    if (booking.status !== "ON_MY_WAY") return;
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [booking.id, booking.status]);

  const etaMinutes =
    booking.status === "ON_MY_WAY" && proLocation
      ? estimateEtaMinutes(proLocation.lat, proLocation.lng, booking.jobLat, booking.jobLng)
      : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-2xl">{booking.categoryIcon}</span>
        <div>
          <h1 className="font-display text-2xl font-bold">{booking.jobTitle}</h1>
          <p className="text-sm text-text-muted">PKR {booking.totalPKR.toLocaleString()} · {booking.providerName}</p>
        </div>
      </div>

      <div className="mb-6">
        <StatusTimeline status={booking.status} />
      </div>

      {booking.status === "PENDING_PAYMENT" && <PaymentSection booking={booking} />}

      {booking.unlocked && (
        <div className="mb-6 rounded-[12px] border border-secondary/30 bg-secondary/10 p-4 text-sm">
          <p className="font-bold text-secondary">Contact unlocked</p>
          <p className="text-text-muted">{booking.providerName} · {booking.providerPhone}</p>
          <p className="text-text-muted">{booking.exactAddress}</p>
        </div>
      )}

      {TRACKED_STATUSES.includes(booking.status) && (
        <div className="mb-6">
          <LiveMap
            destLat={booking.jobLat}
            destLng={booking.jobLng}
            proLat={proLocation?.lat}
            proLng={proLocation?.lng}
            etaMinutes={etaMinutes}
          />
        </div>
      )}

      {booking.changeOrders.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {booking.changeOrders.map((co) => (
            <ChangeOrderCard key={co.id} changeOrder={co} />
          ))}
        </div>
      )}

      {booking.status === "DONE" && <ConfirmDisputeSection bookingId={booking.id} />}

      {booking.status === "COMPLETED" && booking.totalDurationMinutes !== null && (
        <div className="mb-6 rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
          <h3 className="mb-2 font-bold">Job summary</h3>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Total time</span>
            <span className="font-semibold">{formatDuration(booking.totalDurationMinutes)}</span>
          </div>
          {booking.workDurationMinutes !== null && (
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-text-muted">Work time</span>
              <span className="font-semibold">{formatDuration(booking.workDurationMinutes)}</span>
            </div>
          )}
        </div>
      )}

      {booking.status === "COMPLETED" && !booking.hasReview && <RatingForm bookingId={booking.id} />}

      {booking.status === "DISPUTED" && (
        <div className="mb-6 rounded-[12px] border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Dispute under review by Servigic support.
        </div>
      )}

      {booking.unlocked && (
        <div className="mt-6">
          <ChatBox bookingId={booking.id} currentUserId={currentUserId} unlocked={booking.unlocked} />
        </div>
      )}
    </div>
  );

  function PaymentSection({ booking }: { booking: BookingView }) {
    const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("EASYPAISA");
    const [proofUrl, setProofUrl] = useState("");
    const [pending, setPending] = useState(false);

    if (booking.payment?.status === "SUBMITTED") {
      return (
        <div className="mb-6 rounded-[12px] border border-accent/30 bg-accent/10 p-5 text-sm">
          <p className="font-bold text-accent">Payment proof submitted — awaiting admin verification.</p>
        </div>
      );
    }

    async function submit() {
      if (!proofUrl) {
        toast.error("Upload your payment proof screenshot first");
        return;
      }
      setPending(true);
      try {
        const res = await fetch(`/api/bookings/${booking.id}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method, proofImageUrl: proofUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to submit payment");
          return;
        }
        toast.success("Payment submitted for verification");
        router.refresh();
      } finally {
        setPending(false);
      }
    }

    return (
      <div className="mb-6 rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
        <h3 className="mb-1 font-bold">Secure Payment</h3>
        <p className="mb-3 text-sm text-text-muted">
          PKR {booking.totalPKR.toLocaleString()} · Deadline: {new Date(booking.paymentDeadline).toLocaleString()}
        </p>
        <div className="mb-3 flex items-start gap-2.5 rounded-[10px] border border-secondary/30 bg-secondary/10 px-4 py-3">
          <span className="mt-0.5 text-secondary" aria-hidden="true">🔒</span>
          <p className="text-sm font-semibold text-secondary">
            Your payment is held safely and only released to the provider once you confirm the job is done.
          </p>
        </div>
        {booking.estimatedPartsNote && (
          <p className="mb-4 text-xs text-text-muted">
            Estimated parts/materials: <span className="font-semibold">{booking.estimatedPartsNote}</span> — this is
            not collected by Servigic. Please arrange payment for parts directly with your pro.
          </p>
        )}
        <div className="mb-4 flex gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={`rounded-[8px] border px-4 py-2 text-sm font-semibold ${
                method === m.value ? "border-accent bg-accent/10" : "border-border-subtle"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="mb-4 rounded-[10px] border border-border-subtle bg-bg-elevated-2 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Send payment to</p>
          {PAYMENT_ACCOUNTS[method].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1 text-sm">
              <span className="text-text-muted">{row.label}</span>
              <span className="font-mono font-semibold">{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <PhotoUploadField
            endpoint="paymentProof"
            urls={proofUrl ? [proofUrl] : []}
            maxCount={1}
            label="Payment proof"
            thumbClassName="h-24 w-24"
            onAdd={(newUrls) => newUrls[0] && setProofUrl(newUrls[0])}
          />
        </div>
        <button
          onClick={submit}
          disabled={pending || !proofUrl}
          className="w-full rounded-[10px] bg-accent px-6 py-3 font-bold text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit Payment"}
        </button>
        {legalDisclaimer && <LegalDisclaimer text={legalDisclaimer} className="mt-3" />}
      </div>
    );
  }
}

function ChangeOrderCard({ changeOrder }: { changeOrder: ChangeOrderView }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("EASYPAISA");
  const [proofUrl, setProofUrl] = useState("");

  async function respond(action: "APPROVE" | "DECLINE") {
    setPending(true);
    try {
      const res = await fetch(`/api/change-orders/${changeOrder.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "APPROVE" ? "Approved — pay the difference to fund it" : "Declined");
      router.refresh();
    } catch {
      toast.error("Failed to respond");
    } finally {
      setPending(false);
    }
  }

  async function submitPayment() {
    if (!proofUrl) {
      toast.error("Upload your payment proof screenshot first");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/change-orders/${changeOrder.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, proofImageUrl: proofUrl }),
      });
      if (!res.ok) throw new Error();
      toast.success("Payment submitted for verification");
      router.refresh();
    } catch {
      toast.error("Failed to submit payment");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-accent/30 bg-accent/10 p-5">
      <h3 className="mb-1 font-bold">Your pro proposed extra work</h3>
      <p className="mb-3 text-sm text-text-muted">{changeOrder.description}</p>
      {changeOrder.photoUrl && (
        <div className="mb-3">
          <PhotoGallery urls={[changeOrder.photoUrl]} label="Extra work photo" thumbClassName="h-20 w-20" />
        </div>
      )}
      <div className="mb-4 font-display text-xl font-bold text-accent">
        + PKR {changeOrder.extraAmountPKR.toLocaleString()}
      </div>

      {changeOrder.status === "PENDING" && (
        <div className="flex gap-2">
          <button
            onClick={() => respond("APPROVE")}
            disabled={pending}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            Approve & Pay
          </button>
          <button
            onClick={() => respond("DECLINE")}
            disabled={pending}
            className="rounded-[8px] border border-danger/40 px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      )}

      {changeOrder.status === "DECLINED" && <p className="text-sm text-danger">You declined this extra work.</p>}

      {changeOrder.status === "AWAITING_PAYMENT" && (
        <div>
          <div className="mb-3 flex gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`rounded-[8px] border px-3 py-1.5 text-xs font-semibold ${
                  method === m.value ? "border-accent bg-accent/10" : "border-border-subtle"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="mb-3">
            <PhotoUploadField
              endpoint="paymentProof"
              urls={proofUrl ? [proofUrl] : []}
              maxCount={1}
              label="Payment proof"
              thumbClassName="h-20 w-20"
              onAdd={(newUrls) => newUrls[0] && setProofUrl(newUrls[0])}
            />
          </div>
          <button
            onClick={submitPayment}
            disabled={pending || !proofUrl}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit Payment"}
          </button>
        </div>
      )}

      {changeOrder.status === "PAID" && (
        <p className="text-sm font-semibold text-accent">Payment submitted — awaiting admin verification.</p>
      )}

      {changeOrder.status === "CONFIRMED" && (
        <p className="text-sm font-semibold text-secondary">✓ Funded — your pro can go ahead with the extra work.</p>
      )}
    </div>
  );
}

function ConfirmDisputeSection({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Job confirmed — payout queued for your pro");
      router.refresh();
    } catch {
      toast.error("Failed to confirm");
    } finally {
      setPending(false);
    }
  }

  async function openDispute() {
    if (!reason.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dispute opened — our team will review");
      router.refresh();
    } catch {
      toast.error("Failed to open dispute");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-6 rounded-[14px] border border-accent/30 bg-accent/10 p-5">
      <h3 className="mb-3 font-bold">Your pro marked the job done</h3>
      {!showDispute ? (
        <div className="flex gap-2">
          <button
            onClick={confirm}
            disabled={pending}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
          >
            Confirm job done
          </button>
          <button
            onClick={() => setShowDispute(true)}
            className="rounded-[8px] border border-danger/40 px-4 py-2 text-sm font-semibold text-danger"
          >
            There&apos;s a problem
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What went wrong?"
            rows={3}
            className="mb-3 w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={openDispute}
            disabled={pending || !reason.trim()}
            className="rounded-[8px] bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Open Dispute
          </button>
        </div>
      )}
    </div>
  );
}

function RatingForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
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
        body: JSON.stringify({ rating, tags, comment }),
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
        Thanks for rating! 🎉
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <h3 className="mb-3 font-bold">Rate your pro</h3>
      <div className="mb-3 flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} className={n <= rating ? "text-accent" : "text-border-subtle"}>
            ★
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {CUSTOMER_REVIEW_TAGS.map((t) => (
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
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a comment (optional)"
        rows={2}
        className="mb-3 w-full rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm outline-none focus:border-accent"
      />
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
