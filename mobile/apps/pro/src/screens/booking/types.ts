// Shape of GET /api/mobile/bookings/[id] as the Pro app uses it. Fields added
// by the redesign are optional so the app keeps working against a backend that
// hasn't been updated yet.
export interface BookingData {
  id: string;
  status: string;
  paymentMode?: "CASH_WALLET" | "PROTECTED";
  totalPKR: number;
  payoutPKR: number;
  commissionPKR?: number;
  commissionPct?: number;
  /** Customer ad-reward already taken off the price (PKR) - funded from Servigic's commission. */
  rewardDiscountPKR?: number;
  areaLabel?: string;
  timeline?: Record<string, string> | null;
  completionPhotoUrl?: string | null;
  jobsCompleted?: number;
  jobTitle: string;
  categoryIcon: string;
  jobLat: number;
  jobLng: number;
  exactAddress: string | null;
  otherPartyName: string;
  otherPartyPhone: string | null;
  revealStage: "LOCKED" | "MASKED" | "FULL";
  hasReview: boolean;
  totalDurationMinutes?: number | null;
  workDurationMinutes?: number | null;
  estimatedPartsNote?: string | null;
}

export interface BookingActions {
  advance: () => void;
  busy: boolean;
  openMessages: () => void;
  openCancel: () => void;
}
