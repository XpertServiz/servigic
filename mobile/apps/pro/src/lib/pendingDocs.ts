// The ID photo and selfie a pro picks on the sign-up screen. There is no account session until the phone is verified and he signs
// in, so they are kept on the phone (private app storage) and uploaded automatically after the first sign-in (RootNavigator).
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import * as api from "./api";
import { readIdCard } from "./idOcr";

const KEY = "servigic.pendingSignupDocs";
type Pending = { phone: string; cnic: string; cnicBack?: string; selfie: string; photoConsent: boolean };
const digits = (s: string) => s.replace(/\D/g, "");

async function copy(uri: string, name: string): Promise<string> {
  const dest = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export async function savePendingDocs(input: { phone: string; cnicUri: string; cnicBackUri: string; selfieUri: string; photoConsent: boolean }): Promise<void> {
  const stamp = Date.now();
  const pending: Pending = { phone: input.phone, cnic: await copy(input.cnicUri, `signup-${stamp}-id.jpg`), cnicBack: await copy(input.cnicBackUri, `signup-${stamp}-id-back.jpg`), selfie: await copy(input.selfieUri, `signup-${stamp}-selfie.jpg`), photoConsent: input.photoConsent };
  await SecureStore.setItemAsync(KEY, JSON.stringify(pending));
}

async function clearPending(p: Pending) {
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
  await FileSystem.deleteAsync(p.cnic, { idempotent: true }).catch(() => {});
  await FileSystem.deleteAsync(p.selfie, { idempotent: true }).catch(() => {});
  if (p.cnicBack) await FileSystem.deleteAsync(p.cnicBack, { idempotent: true }).catch(() => {});
}

/** After the first sign-in: uploads the documents picked at sign-up and submits them for verification. True when done. */
export async function submitPendingDocs(userPhone: string): Promise<boolean> {
  let pending: Pending | null = null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    pending = raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return false;
  }
  if (!pending || digits(pending.phone) !== digits(userPhone)) return false;
  try {
    const [cnicUrl, selfieUrl, cnicBackUrl] = await Promise.all([
      api.uploadFile(pending.cnic, "id.jpg", "image/jpeg"),
      api.uploadFile(pending.selfie, "selfie.jpg", "image/jpeg"),
      pending.cnicBack ? api.uploadFile(pending.cnicBack, "id-back.jpg", "image/jpeg") : Promise.resolve(undefined),
    ]);
    const ocr = await readIdCard(pending.cnic).catch(() => null);
    await api.updateProviderProfile({ cnicUrl, selfieUrl, ...(cnicBackUrl ? { cnicBackUrl } : {}), agreementAccepted: true, photoConsentPublic: pending.photoConsent, ...(ocr ? { cnicOcr: ocr } : {}) });
    await clearPending(pending);
    return true;
  } catch {
    // The documents screen is the fallback: he can upload them there.
    return false;
  }
}
