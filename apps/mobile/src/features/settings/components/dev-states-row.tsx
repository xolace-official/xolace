/** Dev tools row that lists every screen state on fixtures (`src/dev`). It only
 * navigates: the dev routes exist only under `__DEV__`. */
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { SettingsRow } from "@/components/shared/settings-row";
import { useTokenColor } from "@/lib/use-token-color";

const DEV_STATES_ICON = {
	android: "view_carousel",
	ios: "rectangle.stack",
	web: "view_carousel",
} as const;

export function DevStatesRow() {
	const muted = useTokenColor("muted");
	return (
		<SettingsRow
			icon={<SymbolView name={DEV_STATES_ICON} size={17} tintColor={muted} />}
			label="Dev states"
			onPress={() => router.push("/dev")}
			variant="action"
		/>
	);
}
