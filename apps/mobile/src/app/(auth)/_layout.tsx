import { Stack } from "expo-router";

const SCREEN_OPTIONS = {
	animation: "fade" as const,
	contentStyle: { backgroundColor: "transparent" },
	headerShown: false,
};

export default function AuthLayout() {
	return (
		<Stack screenOptions={SCREEN_OPTIONS}>
			<Stack.Screen name="index" />
		</Stack>
	);
}
