// Opens the right screen when someone taps a push notification. Shared by apps/customer and apps/pro.
//   { bookingId } -> the booking (bid accepted, pro on the way, pro arrived, status updates)
//   { jobId }     -> the job (new job alert for a pro, "N pros have bid" for a customer)
// A new-job alert also carries goOnline: when the pro was offline the job screen offers "Go online and bid".
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { navigationRef } from "../navigation/ref";

function openFromResponse(res: Notifications.NotificationResponse | null) {
  const data = res?.notification.request.content.data as { jobId?: unknown; bookingId?: unknown; goOnline?: unknown; test?: unknown } | undefined;
  if (!data || data.test === true) return; // the "send me a test alert" push has nothing to open
  const bookingId = typeof data.bookingId === "string" ? data.bookingId : null;
  const jobId = typeof data.jobId === "string" ? data.jobId : null;
  if (!bookingId && !jobId) return;

  const target = bookingId
    ? { screen: "BookingDetail", params: { bookingId } }
    : { screen: "JobDetail", params: { jobId, goOnline: data.goOnline === true } };

  // On a cold start the navigator may not be mounted yet - retry briefly instead of dropping the tap.
  let tries = 0;
  const go = () => {
    if (navigationRef.isReady()) {
      (navigationRef.navigate as (n: string, p?: object) => void)("Main", { screen: "JobsTab", params: target });
    } else if (tries++ < 20) {
      setTimeout(go, 250);
    }
  };
  go();
}

export function useNotificationTaps(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let sub: Notifications.EventSubscription | null = null;
    try {
      Notifications.getLastNotificationResponseAsync()
        .then((res) => openFromResponse(res))
        .catch(() => {});
      sub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
    } catch (e) {
      console.warn("[push] tap listener failed", e);
    }
    return () => sub?.remove();
  }, [enabled]);
}
