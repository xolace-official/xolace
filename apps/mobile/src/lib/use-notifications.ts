import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/expo";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  notificationTapPlan,
  subscribeToNotificationTaps,
} from "@/src/lib/notification-tap";
import { requestPushToken } from "@/src/lib/push-token";
import { useRouter } from "expo-router";
import { useAppStore } from "@/src/store/store";
import { suppressedInForeground } from "@/src/lib/notification-suppression";

// Configure how notifications appear when the app is in the foreground.
//
// This handler runs *only* while the app is foregrounded. The currently focused
// thread handles its own events, but chat arrivals for other threads still need
// the OS banner, list entry, and sound. Backgrounded arrivals display as normal.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = !suppressedInForeground(notification.request.content.data);
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      // Only a chat push carries `badge` (Stream's unread total); the rest
      // leave the icon alone whatever this says.
      shouldSetBadge: show,
    };
  },
});

/**
 * Manages push notification permissions, token registration,
 * and notification response handling.
 *
 * Must be rendered inside an authenticated Convex context
 * (i.e. within the protected route group).
 */
export function useNotifications() {
  const { isSignedIn } = useAuth();
  const registerToken = useMutation(api.notifications.registerToken);
  const markResultedInSession = useMutation(api.notifications.markResultedInSession);
  const updatePreferences = useMutation(api.preferences.update);
  const router = useRouter();
  const setLastNotification = useAppStore((s) => s.setLastNotification);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const preferences = useQuery(api.preferences.get);
  const notificationsEnabled = preferences?.notifications.enabled;

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;

    async function register() {
      // This path is token *refresh* for someone already opted in — never an
      // opt-in of its own. The contextual moments (session end, quote setup,
      // Settings) each register their own token, and that first registration
      // is what auto-enables the preferences.
      //
      // Without the switch check, turning notifications off did not survive a
      // relaunch: `removeToken` drops the token but the OS grant remains, so
      // the next launch re-registered and `registerToken` flipped every
      // preference back on. The master switch has to mean what it says.
      if (notificationsEnabled !== true) return;

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      const token = await requestPushToken();
      if (token && !cancelled) {
        setExpoPushToken(token);
        await registerToken({ pushToken: token });

        // Sync the device's IANA timezone so the server can compute Quiet Window gates.
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (timezone) {
            await updatePreferences({ notificationTimezone: timezone });
          }
        } catch {
          // Non-blocking; timezone is best-effort
        }
      }
    }

    register();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, notificationsEnabled, registerToken, updatePreferences]);

  // Tap handling, deliberately its own effect. It must not be torn down and
  // re-subscribed every time a preference query resolves, and it must not be
  // gated on `notificationsEnabled` — a tap means the notification was already
  // delivered, so refusing to act on it only strands the user.
  //
  // `subscribeToNotificationTaps` is what makes cold starts work: the tap that
  // launched the app fired natively long before this layout mounted, so it
  // reaches us through `getLastNotificationResponse` rather than the listener.
  useEffect(() => {
    if (!isSignedIn) return;

    // Web resolves the emitter stub, which implements neither of these and
    // throws UnavailabilityError synchronously — from inside an effect body,
    // that takes the whole protected layout down. The listener is the only
    // part of this the stub tolerates.
    const native = Platform.OS !== "web";

    return subscribeToNotificationTaps(
      {
        getLast: native ? Notifications.getLastNotificationResponse : () => null,
        subscribe: Notifications.addNotificationResponseReceivedListener,
        clear: native ? Notifications.clearLastNotificationResponse : () => {},
      },
      (response) => {
        const { content } = response.notification.request;
        const plan = notificationTapPlan(content.data, content.body, Date.now());

        if (plan.logId) {
          markResultedInSession({ logId: plan.logId as Id<"notification_log"> });
        }
        if (plan.banner) {
          setLastNotification({
            content: plan.banner.content,
            notificationId: plan.banner.notificationId as Id<"notification_log">,
          });
        }
        if (plan.navigation?.action === "navigate") {
          router.navigate(plan.navigation.href);
        } else if (plan.navigation) {
          router.push(plan.navigation.href);
        }
      },
    );
  }, [isSignedIn, markResultedInSession, router, setLastNotification]);

  return { expoPushToken };
}
