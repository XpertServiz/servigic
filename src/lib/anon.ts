// Anonymous public-facing identity for providers/customers before a job is paid.
export function proSerial(serialNumber: number): string {
  return `Pro #${serialNumber}`;
}

export function firstNameOnly(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function distanceBand(km: number): string {
  if (km <= 2) return "0–2 km";
  if (km <= 4) return "2–4 km";
  if (km <= 7) return "4–7 km";
  return "7+ km";
}
