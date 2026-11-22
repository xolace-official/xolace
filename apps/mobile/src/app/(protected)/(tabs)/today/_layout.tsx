import { Stack } from "expo-router";
import { useLargeHeaderOptions } from "@/lib/navigation-options";

const TODAY_OPTIONS = { headerShown: false, title: "Today" };

export default function TodayLayout() {
	const largeHeaderOptions = useLargeHeaderOptions();

	return (
		<Stack screenOptions={largeHeaderOptions}>
			<Stack.Screen name="index" options={TODAY_OPTIONS} />
		</Stack>
	);
}
