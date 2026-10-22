import { useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const TIME_MAP: Record<string, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  afternoon: { hour: 13, minute: 0 },
  evening: { hour: 19, minute: 0 },
};

// weekday: 1=Sunday … 7=Saturday (Expo / iOS convention)
const WEEKLY_MESSAGES: { title: string; body: string }[] = [
  { title: "Your quote is ready.",        body: "A reflection picked for today. Open when you're ready." },
  { title: "Something's waiting.",        body: "Today's quote might be exactly what you need." },
  { title: "A moment for yourself.",      body: "Your daily reflection is here. Take it slow." },
  { title: "Today's reflection.",         body: "Open Xolace when you have a quiet moment." },
  { title: "Something to sit with.",      body: "A quote picked just for you is waiting." },
  { title: "Words for today.",            body: "Your quote is here whenever you need it." },
  { title: "A thought is waiting.",       body: "Today's reflection. Open it when the time feels right." },
];

export type NotifSetupState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "scheduled";

/**
 * Handles requesting permission and scheduling the daily quote notification.
 * Returns a setup function to call after preference setup completes.
 */
export function useQuoteNotifications() {
  const [state, setState] = useState<NotifSetupState>("idle");
  const updateQuotePrefs = useMutation(api.preferences.updateQuotePreferences);

  const scheduleNotification = async (
    themes: string[],
    notificationEnabled: boolean,
    notificationTime?: string
  ) => {
      // Always save preferences first
      await updateQuotePrefs({ themes, notificationEnabled, notificationTime });

      if (!notificationEnabled || !notificationTime || notificationTime === "none") {
        setState("scheduled");
        return { granted: false };
      }

      if (!Device.isDevice) {
        // Simulator — skip permission, just save
        setState("scheduled");
        return { granted: false };
      }

      setState("requesting");

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        setState("denied");
        // Preferences already saved with notificationEnabled=false effective
        await updateQuotePrefs({
          themes,
          notificationEnabled: false,
          notificationTime,
        });
        return { granted: false, denied: true };
      }

      setState("granted");

      // Cancel any previously scheduled daily quote notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduled.filter((n) =>
        n.identifier.startsWith("daily-quote-")
      );
      for (const n of existing) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }

      const timeConfig = TIME_MAP[notificationTime] ?? { hour: 8, minute: 0 };

      // Schedule one notification per weekday (1=Sun…7=Sat), each with distinct copy.
      await Promise.all(
        WEEKLY_MESSAGES.map((msg, i) =>
          Notifications.scheduleNotificationAsync({
            identifier: `daily-quote-${notificationTime}-${i + 1}`,
            content: {
              title: msg.title,
              body: msg.body,
              data: { screen: "quotes" },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: i + 1,
              hour: timeConfig.hour,
              minute: timeConfig.minute,
            },
          })
        )
      );

      setState("scheduled");
      return { granted: true };
  };

  return { state, scheduleNotification };
}
