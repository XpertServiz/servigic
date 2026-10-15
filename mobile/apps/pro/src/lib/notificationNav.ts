// Opens the right screen when a pro taps a push notification (handoff §11.5 item 3).
// A new-job alert carries { jobId, goOnline }: the app opens straight on that job, and when the pro
// was offline the job screen offers a one-tap "Go online and bid".
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { navigationRef } from "../navigation/ref";

function openFromResponse(res: Notifications.NotificationResponse | null) {
  const data = res?.notification.request.content.data as { jobId?: unknown; goOnline?: unknown } | undefined;
  const jobId = typeof data?.jobId === "string" ? data.jobId : null;
  if (!jobId) return;
  const params = { jobId, goOnline: data?.goOnline === true };
  // On a cold start the navigator may not be mounted yet — retry briefly instead of dropping the tap.
  let tries = 0;
  const go = () => {
    if (navigationRef.isReady()) {
      (navigationRef.navigate as (n: string, p?: object) => void)("Main", { screen: "JobsTab", params: { screen: "JobDetail", params } });
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
