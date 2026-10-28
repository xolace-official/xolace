import { Stack } from "expo-router";
import { useLargeHeaderOptions } from "@/lib/navigation-options";

// The poster masthead runs full-bleed under the status bar and carries its own
// datestamp, so the stack header would only duplicate it.
const DISCOVERY_OPTIONS = { headerShown: false, title: "Discovery" };

export default function DiscoveryLayout() {
	const largeHeaderOptions = useLargeHeaderOptions();

	return (
		<Stack screenOptions={largeHeaderOptions}>
			<Stack.Screen name="index" options={DISCOVERY_OPTIONS} />
		</Stack>
	);
}
