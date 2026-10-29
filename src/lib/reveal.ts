// Anti-Disintermediation System — staged contact reveal (v7 §2.2).
//
// Replaces the single UNLOCKED_STATUSES boolean that used to flip true the
// instant a booking hit CONFIRMED (revealing name+phone+exact address
// together). Now: masked in-app chat only from CONFIRMED, full reveal only
// once the pro marks ON_MY_WAY — closing the acceptance-to-departure window
// where most bypass collusion happens. EMERGENCY jobs skip straight to FULL
// at CONFIRMED since speed matters more there than the anti-bypass window.
export type RevealStage = "LOCKED" | "MASKED" | "FULL";

const FULL_STATUSES = ["ON_MY_WAY", "ARRIVED", "WORKING", "DONE", "COMPLETED", "DISPUTED", "CANCELLED"];
const MASKED_STATUSES = ["CONFIRMED"];

export function computeRevealStage(bookingStatus: string, jobUrgency: string): RevealStage {
  if (FULL_STATUSES.includes(bookingStatus)) return "FULL";
  if (MASKED_STATUSES.includes(bookingStatus)) return "MASKED"; // never earlier than "On my way", emergency or not
  return "LOCKED";
}
