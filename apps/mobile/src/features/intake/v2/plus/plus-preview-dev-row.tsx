/** Dev tools row that opens intake v2's Xolace+ step on sample plans (#713). */
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { SettingsRow } from "@/components/shared/settings-row";
import { useTokenColor } from "@/lib/use-token-color";

const PLUS_ICON = {
	android: "workspace_premium",
	ios: "sparkles",
	web: "workspace_premium",
} as const;

export function PlusPreviewDevRow() {
	const muted = useTokenColor("muted");
	return (
		<SettingsRow
			icon={<SymbolView name={PLUS_ICON} size={17} tintColor={muted} />}
			label="Preview Xolace+ step"
			onPress={() => router.push("/intake-plus-preview")}
			variant="action"
		/>
	);
}
