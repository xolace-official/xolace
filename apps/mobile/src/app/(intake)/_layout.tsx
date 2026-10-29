import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

/** Post-signup intake (T6, #263): a root-level group, not under `(protected)` (Stream,
 * presence, push). Forward-only. */
const SCREEN_OPTIONS = {
	contentStyle: { backgroundColor: "transparent" },
	gestureEnabled: false,
	headerShown: false,
};

export default function IntakeLayout() {
	// "Intake wins, a pending deep link is not preserved" (T3, #234). `(protected)`
	// recovers the launch tap from the native cache, which would fling a user
	// out of intake the instant they finished it.
	useEffect(() => {
		if (Platform.OS === "web") {
			return;
		}
		Notifications.clearLastNotificationResponse();
	}, []);

	return (
		<Stack screenOptions={SCREEN_OPTIONS}>
			<Stack.Screen name="index" />
			<Stack.Screen name="questionnaire" />
			<Stack.Screen name="paywall" />
			{/* The one intake screen with a header: PaywallScreen hangs its buttons
          off the native toolbar. Still a linear step, so forward-only. */}
			<Stack.Screen
				name="plans"
				options={{
					headerShadowVisible: false,
					headerShown: true,
					headerTransparent: true,
					title: "",
				}}
			/>
		</Stack>
	);
}
