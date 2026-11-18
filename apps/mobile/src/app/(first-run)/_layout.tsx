import { Stack } from "expo-router";

/** First run: the promise, the story and the seat, one screen for anyone signed out. */
const SCREEN_OPTIONS = {
	animation: "fade" as const,
	contentStyle: { backgroundColor: "transparent" },
	headerShown: false,
};

export default function FirstRunLayout() {
	return (
		<Stack screenOptions={SCREEN_OPTIONS}>
			<Stack.Screen name="index" />
		</Stack>
	);
}
