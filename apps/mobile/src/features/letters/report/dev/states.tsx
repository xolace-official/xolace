import { View } from "react-native";
import type { DevState } from "@/dev/dev-state";
import type { ReportReason } from "../../copy";
import { ReportProvider } from "../report-data";
import { ReportSheet } from "../report-sheet";

const OPTIONS = { headerShown: false };
const sheet = (reason: ReportReason | null) => () => (
	<ReportProvider
		value={{ actions: { report: () => undefined }, state: { reason } }}
	>
		<View className="flex-1 justify-end pb-8">
			<ReportSheet />
		</View>
	</ReportProvider>
);

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "report",
		options: OPTIONS,
		Screen: sheet(null),
		title: "25 · Report",
	},
	{
		id: "report-picked",
		options: OPTIONS,
		Screen: sheet("unkind"),
		title: "25 · Report, a reason picked",
	},
];
