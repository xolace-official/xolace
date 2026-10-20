import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import {
  DEFAULT_CHANNEL_ID,
  SOUND_CHANNELS,
} from "@/convex/lib/notificationSounds";

export type PushPermissionState = "granted" | "undetermined" | "blocked";

/**
 * Which of the three permission states this device is in.
 *
 * `blocked` is the one worth naming: iOS allows exactly one ask and Android
 * hard-denies after two dismissals, so no dialog will ever appear again and
 * the only route back is device settings. A toggle that flips anyway would
 * read ON while delivering nothing.
 */
export async function getPushPermissionState(): Promise<PushPermissionState> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  return canAskAgain ? "undetermined" : "blocked";
}

/**
 * This installation's Expo push token, or null when permission isn't granted.
 *
 * Never prompts, unlike `requestPushToken`. Used by the unregister paths —
 * turning notifications off and signing out — where a permission dialog would
 * be absurd, and where the token is what scopes removal to this installation
 * instead of every device on the account.
 */
export async function getGrantedPushToken(): Promise<string | null> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;
  return requestPushToken();
}

/**
 * Request OS push notification permission and return the Expo push token.
 * Exported so settings can trigger re-registration when notifications are enabled.
 */
export async function requestPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  if (Platform.OS === "android") {
    // Left exactly as it was. Nothing targets it any more, but it stays created
    // as the landing spot for any notification that arrives without a channel.
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: "default",
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6C63FF",
    });

    // One channel per sound, because on Android a sound belongs to the channel
    // rather than to the payload. Splitting them also buys the user real
    // OS-level control: chatter can be silenced without silencing a person
    // asking to talk, or the AI's reaching out.
    //
    // A channel's sound is fixed the moment it is first created on a device, so
    // re-running this with a different sound changes nothing for anyone who
    // already has the app. Replacing a sound needs a new id, and that discards
    // whatever tuning the user had applied to the old one.
    for (const channel of SOUND_CHANNELS) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6C63FF",
        sound: channel.sound,
      });
    }
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.error("No EAS projectId found for push token registration");
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return token;
  } catch (err) {
    console.log("Failed to fetch Expo push token (will retry on next launch):", err);
    return null;
  }
}
