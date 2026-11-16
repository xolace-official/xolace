/** Dev tools row that picks the shell (`redesign-v2`) for this device, then reloads, since
 * a launch keeps the shell it started with. */
import { reloadAppAsync } from "expo";
import { SymbolView } from "expo-symbols";
import { Alert } from "react-native";
import { SettingsRow } from "@/components/shared/settings-row";
import {
	currentShell,
	setStoredShell,
	storedShell,
} from "@/lib/redesign/shell";
import type { Shell } from "@/lib/redesign/shell-gate";
import { useTokenColor } from "@/lib/use-token-color";

const SHELL_ICON = {
	android: "dashboard_customize",
	ios: "rectangle.3.group",
	web: "dashboard_customize",
} as const;

const SHELL_NAMES: Record<Shell, string> = {
	v1: "Old shell (v1)",
	v2: "Redesign (v2)",
};

export function RedesignDevRow() {
	const muted = useTokenColor("muted");
	const shell = currentShell();
	const forced = storedShell() !== null;

	const pick = async (next: Shell | null) => {
		await setStoredShell(next);
		await reloadAppAsync("Redesign shell changed");
	};

	const choose = () =>
		Alert.alert(
			"Shell",
			"v2 is Today · Explore · Connect · You. The app reloads to switch. Following the flag reads EXPO_PUBLIC_REDESIGN_V2, then PostHog (off in dev).",
			[
				{ onPress: () => pick("v2"), text: SHELL_NAMES.v2 },
				{ onPress: () => pick("v1"), text: SHELL_NAMES.v1 },
				{ onPress: () => pick(null), text: "Follow the flag" },
				{ style: "cancel", text: "Cancel" },
			]
		);

	return (
		<SettingsRow
			icon={<SymbolView name={SHELL_ICON} size={17} tintColor={muted} />}
			label={`Shell: ${shell}${forced ? " (forced here)" : ""}`}
			onPress={choose}
			variant="action"
		/>
	);
}
