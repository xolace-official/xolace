import { Stack } from "expo-router";
import { useLargeHeaderOptions } from "@/lib/navigation-options";

// The poster masthead runs full-bleed under the status bar and carries its own
// datestamp, so the stack header would only duplicate it.
const TODAY_OPTIONS = { headerShown: false, title: "Today" };

export default function TodayLayout() {
	const largeHeaderOptions = useLargeHeaderOptions();

	return (
		<Stack screenOptions={largeHeaderOptions}>
			<Stack.Screen name="index" options={TODAY_OPTIONS} />
		</Stack>
	);
}
