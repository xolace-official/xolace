import {
	DEFAULT_CHANNEL_ID,
	SOUND_CHANNELS,
} from "@xolace/backend/convex/lib/notificationSounds";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

export type PushPermissionState = "granted" | "undetermined" | "blocked";

/** Permission state. `blocked`: iOS allows one ask and Android hard-denies after two, so only
 * device settings restore it. */
export async function getPushPermissionState(): Promise<PushPermissionState> {
	const { status, canAskAgain } = await Notifications.getPermissionsAsync();
	if (status === "granted") {
		return "granted";
	}
	return canAskAgain ? "undetermined" : "blocked";
}

/** This installation's Expo push token, or null without permission. Never prompts; for the
 * unregister paths. */
export async function getGrantedPushToken(): Promise<string | null> {
	const { status } = await Notifications.getPermissionsAsync();
	if (status !== "granted") {
		return null;
	}
	return requestPushToken();
}

/** Requests OS push permission and returns the Expo push token. Settings uses it to re-register. */
export async function requestPushToken(): Promise<string | null> {
	if (!Device.isDevice) {
		console.log("Push notifications require a physical device");
		return null;
	}

	if (Platform.OS === "android") {
		// Nothing targets it any more; stays as the landing spot for a notification without a
		// channel.
		await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
			importance: AndroidImportance.MAX,
			lightColor: "#6C63FF",
			name: "default",
			vibrationPattern: [0, 250, 250, 250],
		});

		// One channel per sound: on Android the sound belongs to the channel, not the payload.
		// A channel's sound is fixed once created on a device; replacing a sound needs a new id.
		for (const channel of SOUND_CHANNELS) {
			await Notifications.setNotificationChannelAsync(channel.id, {
				importance: AndroidImportance.MAX,
				lightColor: "#6C63FF",
				name: channel.name,
				sound: channel.sound,
				vibrationPattern: [0, 250, 250, 250],
			});
		}
	}

	const { status: existingStatus } = await Notifications.getPermissionsAsync();

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
		console.log(
			"Failed to fetch Expo push token (will retry on next launch):",
			err
		);
		return null;
	}
}
