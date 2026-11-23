import { Stack } from "expo-router";
import { COPY } from "@/features/connect/copy";
import { useHeaderOptions } from "@/lib/header-options";

export default function ConnectLayout() {
	const small = useHeaderOptions("small");

	return (
		<Stack screenOptions={small}>
			<Stack.Screen name="index" options={{ title: COPY.title }} />
			<Stack.Screen name="archived" options={{ title: COPY.archivedTitle }} />
		</Stack>
	);
}
