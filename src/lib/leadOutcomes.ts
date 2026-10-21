import type { LeadStatus } from "@prisma/client";

// The quick outcome picker after a call or WhatsApp message. Each outcome moves the lead's status.
export const LEAD_OUTCOMES: { key: string; label: string; status: LeadStatus | null }[] = [
  { key: "NO_ANSWER", label: "No answer", status: "CONTACTED" },
  { key: "SPOKE", label: "Spoke to him", status: "CONTACTED" },
  { key: "INTERESTED", label: "Interested", status: "INTERESTED" },
  { key: "INVITED", label: "Join link sent", status: "INVITED" },
  { key: "CALL_BACK", label: "Call back later", status: "CALLBACK" },
  { key: "NOT_INTERESTED", label: "Not interested", status: "NOT_INTERESTED" },
  { key: "WRONG_NUMBER", label: "Wrong number", status: "WRONG_NUMBER" },
  { key: "DO_NOT_CONTACT", label: "Asked not to be contacted (STOP)", status: "DO_NOT_CONTACT" },
];
