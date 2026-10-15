// A stable id for this phone, used only to spot repeat sign-ups when a referral code is used
// (Android ID: survives reinstalls, unique per device + app signing key). Shared by apps/customer and apps/pro.
import { Platform } from "react-native";
import * as Application from "expo-application";

export async function getDeviceId(): Promise<string | undefined> {
  try {
    if (Platform.OS === "android") return Application.getAndroidId() ?? undefined;
    return (await Application.getIosIdForVendorAsync()) ?? undefined;
  } catch {
    return undefined;
  }
}
