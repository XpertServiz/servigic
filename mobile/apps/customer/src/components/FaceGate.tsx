// The face check is for pros only (apps/pro has the real one). App.tsx is shared by both apps, so the Customer app gets
// this empty placeholder - not in sync-shared.mjs on purpose, so it is never overwritten.
export function FaceGate() {
  return null;
}
