import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { chatNotificationsAllowed } from "@/convex/lib/chatNotifications";
import {
  getGrantedPushToken,
  getPushPermissionState,
  requestPushToken,
} from "@/src/lib/push-token";
import {
  chatChoice,
  gentleChoice,
  gentleRemindersOn,
  nextNotificationPrefs,
} from "@/src/features/settings/notification-prefs";
import { usePreferenceMutation } from "./use-preference-mutation";

export type NotificationReach = "warm" | "direct" | "quiet";
export type QuietWindow = { dontReachBefore: number; dontReachAfter: number };

export const useNotificationSettings = () => {
  const preferences = useQuery(api.preferences.get);
  const updatePreferences = usePreferenceMutation();
  const registerToken = useMutation(api.notifications.registerToken);
  const removeToken = useMutation(api.notifications.removeToken);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [osBlocked, setOsBlocked] = useState(false);

  // Permission can be revoked in device settings, which no preference knows
  // about — that is the state where a toggle reads ON and delivers nothing.
  // Re-checked on every foreground, so returning from the Settings app (our
  // own "Open Settings" included) settles the toggles without a relaunch.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const state = await getPushPermissionState();
      if (!cancelled) setOsBlocked(state === "blocked");
    };

    check();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") check();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const notifications = preferences?.notifications;

  // What each toggle shows: what actually gets delivered. A blocked OS makes
  // both read off, so flipping one runs the enable path and explains itself
  // rather than leaving a switch that promises delivery.
  const gentleReminders = !osBlocked && gentleRemindersOn(notifications);
  const chatNotifications = !osBlocked && chatNotificationsAllowed(notifications);

  const reach = (notifications?.reach ?? "warm") as NotificationReach;
  const quietWindow = notifications?.quietWindow ?? null;

  const setReach = (next: NotificationReach) => {
    updatePreferences({ notificationReach: next });
  };

  const setQuietWindow = (window: QuietWindow | null) => {
    updatePreferences({ notificationQuietWindow: window });
  };

  const syncTimezone = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) await updatePreferences({ notificationTimezone: timezone });
    } catch {
      // Non-blocking
    }
  };

  /**
   * Move both toggles to a new position at once.
   *
   * Only turning something on has to clear the OS, and only from a state that
   * isn't already delivering: a user who granted permission and merely muted
   * one family is not re-prompted. Turning something off never consults the OS
   * at all, so a blocked device can still mute what it isn't delivering.
   *
   * Nothing is written when the permission route runs out — the toggle is
   * driven off the stored preference, so it stays where it was rather than
   * flipping to a promise the device can't keep.
   */
  const applyToggles = async (next: { gentle: boolean; chat: boolean }) => {
    const turningOn =
      (next.gentle && !gentleReminders) || (next.chat && !chatNotifications);
    const alreadyDelivering = gentleReminders || chatNotifications;

    if (turningOn) {
      const permission = await getPushPermissionState();
      if (permission === "blocked") {
        setOsBlocked(true);
        setPermissionBlocked(true);
        return;
      }
      setOsBlocked(false);

      // The token is dropped whenever both families go quiet, so coming back
      // from that needs a fresh registration even though permission stands.
      if (permission === "undetermined" || !alreadyDelivering) {
        const token = await requestPushToken();
        if (!token) return;
        try {
          await registerToken({ pushToken: token });
        } catch {
          // Same answer as no token at all: nothing is written, so the toggle
          // stays where it was rather than promising delivery to a server that
          // has no token to deliver against.
          return;
        }
        await syncTimezone();
      }
    }

    // Lands after registerToken, whose first-grant auto-enable would otherwise
    // switch on a family the user didn't ask for.
    updatePreferences({ notifications: nextNotificationPrefs(next) });

    if (!next.gentle && !next.chat) {
      try {
        // Scoped to this installation. The preference above is what silences
        // the account; dropping another device's token here would mute a phone
        // the user never touched.
        const token = await getGrantedPushToken();
        if (token) await removeToken({ pushToken: token });
      } catch {
        // Best-effort
      }
    }
  };

  // Each setter carries the other family's *stored choice*, never its
  // displayed value: from all-off, or with the OS blocking, both read off, and
  // writing that back would mute a family the user never touched.
  const setGentleReminders = (enabled: boolean) =>
    applyToggles({ gentle: enabled, chat: chatChoice(notifications) });

  const setChatNotifications = (enabled: boolean) =>
    applyToggles({ gentle: gentleChoice(notifications), chat: enabled });

  const reachDisplay =
    reach === "warm" ? "Warm" : reach === "direct" ? "Direct" : "Quiet";

  const quietWindowDisplay = quietWindow
    ? `${quietWindow.dontReachBefore}–${quietWindow.dontReachAfter}h`
    : "Off";

  return {
    gentleReminders,
    setGentleReminders,
    chatNotifications,
    setChatNotifications,
    permissionBlocked,
    dismissPermissionBlocked: () => setPermissionBlocked(false),
    reach,
    reachDisplay,
    setReach,
    quietWindow,
    quietWindowDisplay,
    setQuietWindow,
  };
};
