/** Dev tools row for the badge unlock moment (#693); the server honours it only with DEV_TOOLS_ENABLED. */
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { SymbolView } from "expo-symbols";
import { useToast } from "heroui-native";
import { SettingsRow } from "@/components/shared/settings-row";
import { useTokenColor } from "@/lib/use-token-color";

const BADGE_ICON = {
	android: "military_tech",
	ios: "medal",
	web: "military_tech",
} as const;

export function BadgeUnlockDevRow() {
	const { toast } = useToast();
	const muted = useTokenColor("muted");
	const seedBadgeUnlock = useMutation(api.devTools.seedBadgeUnlock);

	// Settings is not a held route, so the moment opens right over it.
	const replay = () =>
		seedBadgeUnlock().catch((e: unknown) => {
			toast.show({
				description:
					e instanceof Error ? e.message : "Is DEV_TOOLS_ENABLED set?",
				label: "Badge unlock replay failed",
				variant: "danger",
			});
		});

	return (
		<SettingsRow
			icon={<SymbolView name={BADGE_ICON} size={17} tintColor={muted} />}
			label="Replay badge unlock"
			onPress={replay}
			variant="action"
		/>
	);
}
