import { useState } from "react";
import { FIXTURE_LAST_UPDATED } from "@/features/care/help/dev/fixtures";
import {
	HelpProvider,
	type HelpScreenData,
} from "@/features/care/help/help-data";
import { type HelpChoice, helpView } from "@/features/care/help/help-model";
import { HelpScreen } from "@/features/care/help/help-screen";

const noop = () => undefined;

/** Get help now on fixtures: the menu switches countries, nothing dials. */
export function FixtureHelp({ choice: start }: { choice: HelpChoice }) {
	const [choice, setChoice] = useState(start);
	const value: HelpScreenData = {
		actions: {
			callEmergency: noop,
			choose: setChoice,
			openLine: noop,
			reportError: noop,
		},
		state: {
			choice,
			lastUpdated: FIXTURE_LAST_UPDATED,
			view: helpView(choice),
		},
	};
	return (
		<HelpProvider value={value}>
			<HelpScreen />
		</HelpProvider>
	);
}
