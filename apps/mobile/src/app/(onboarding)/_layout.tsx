import { Stack } from "expo-router";

/** The promise screen, before `introSeen` is set. Once the CTA sets it, Stack.Protected swaps
 * to `(auth)` on its own. */
const SCREEN_OPTIONS = {
	animation: "fade" as const,
	contentStyle: { backgroundColor: "transparent" },
	headerShown: false,
};

export default function OnboardingLayout() {
	return (
		<Stack screenOptions={SCREEN_OPTIONS}>
			<Stack.Screen name="index" />
		</Stack>
	);
}
