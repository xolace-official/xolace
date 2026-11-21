import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

const SCREEN_OPTIONS = {
	contentStyle: { backgroundColor: "transparent" },
	gestureEnabled: false,
	headerShown: false,
};

export default function IntakeLayout() {
	useEffect(() => {
		if (Platform.OS === "web") {
			return;
		}
		Notifications.clearLastNotificationResponse();
	}, []);

	return (
		<Stack screenOptions={SCREEN_OPTIONS}>
			<Stack.Screen name="index" />
			<Stack.Screen name="flux" />
		</Stack>
	);
}
