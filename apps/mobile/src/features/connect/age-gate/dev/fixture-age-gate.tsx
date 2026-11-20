/** The age gate's sheet on fixtures, through the same provider as the app. The wheel and "Prefer
 * not to say" work; Continue answers as an adult would (nothing happens), the ways on do nothing. */
import { useState } from "react";
import { View } from "react-native";
import { AgeSheetProvider } from "../age-gate-data";
import { AgeGateSheet } from "../age-gate-sheet";
import type { AgeGateStep, AgeGateSurface } from "../age-gate-step";

const noop = () => undefined;

export function FixtureAgeGate({
	step = "ask",
	surface = "xolacer_chat",
}: {
	step?: AgeGateStep;
	surface?: AgeGateSurface;
}) {
	const [at, setAt] = useState(step);
	const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
	return (
		// Pushed, not a form sheet: the sheet's content sits at the top of a surface page.
		<View className="flex-1 bg-surface pt-safe">
			<AgeSheetProvider
				value={{
					actions: {
						close: noop,
						decline: () => setAt("declined"),
						go: noop,
						setDateOfBirth,
						submit: noop,
					},
					state: { dateOfBirth, saving: false, step: at, surface },
				}}
			>
				<AgeGateSheet />
			</AgeSheetProvider>
		</View>
	);
}
