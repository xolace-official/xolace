import { Stack } from "expo-router";

const OPTIONS = { headerShown: false };

/** Each tab is its own stack, so iOS finds the scroll view (minimize on scroll, edge effects). */
export default function YouLayout() {
	return <Stack screenOptions={OPTIONS} />;
}
