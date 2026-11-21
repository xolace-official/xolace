import { View } from "react-native";
import type { DevState } from "@/dev/dev-state";
import type { UpdateMode } from "../update-model";
import { UpdateSheet } from "../update-sheet";

const SHEET_RADIUS = 40;
const noop = () => undefined;

function FixtureUpdate({ mode }: { mode: UpdateMode }) {
	return (
		<View className="flex-1 justify-end bg-scrim">
			<View
				className="bg-surface"
				style={{
					borderCurve: "continuous",
					borderTopLeftRadius: SHEET_RADIUS,
					borderTopRightRadius: SHEET_RADIUS,
				}}
			>
				<UpdateSheet mode={mode} onLater={noop} onPrimary={noop} />
			</View>
		</View>
	);
}

const sheet = (mode: UpdateMode) => ({
	options: { headerShown: false },
	Screen: () => <FixtureUpdate mode={mode} />,
});

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "new-version",
		title: "New version in the store",
		...sheet("new-version"),
	},
	{ id: "ota-update", title: "Update ready (OTA)", ...sheet("ota-update") },
];
