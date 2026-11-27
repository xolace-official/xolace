import { Stack } from "expo-router";
import { COPY } from "@/features/care/help/copy";
import { useHeaderOptions } from "@/lib/header-options";

const MESSAGE_OPTIONS = { headerShown: false };
const HELP_OPTIONS = { headerBackTitle: "Back", title: COPY.title };

/**
 * Open only while the launch gate can't reach Xolace (`rootGate`). Crisis resources sit here too,
 * a second way in to the same bundled screen, so they open without passing the gate.
 */
export default function CantReachLayout() {
	const headerOptions = useHeaderOptions();
	return (
		<Stack screenOptions={headerOptions}>
			<Stack.Screen name="index" options={MESSAGE_OPTIONS} />
			<Stack.Screen name="need-help" options={HELP_OPTIONS} />
		</Stack>
	);
}
