import Constants from "expo-constants";
import { SymbolView } from "expo-symbols";
import * as Updates from "expo-updates";
import { useThemeColor } from "heroui-native";
import { useState } from "react";
import { REPLAY_ICON } from "@/src/features/settings/components/settings-icons";
import { SettingsRow } from "@/src/features/settings/components/settings-row";

// Dev clients load JS from Metro, so there is nothing for EAS Update to swap in.
const updatesEnabled = Updates.isEnabled && !__DEV__;

/**
 * Manual EAS Update check. Only *checks*: once `isUpdateAvailable` flips,
 * `useOtaUpdate` in the root layout fetches it and shows the "Update Ready"
 * sheet, so there is one fetch path. No `reloadAsync` here, for the same
 * crash reason documented in `update-bottom-sheet.tsx` — it applies on next open.
 */
export const UpdateRow = ({ isLast }: { isLast?: boolean }) => {
	const mutedColor = useThemeColor("muted") as string;
	const { isChecking, isDownloading, isUpdateAvailable, isUpdatePending } =
		Updates.useUpdates();
	const [status, setStatus] = useState<string | null>(null);

	const check = async () => {
		if (!updatesEnabled || isChecking || isDownloading || isUpdatePending) {
			return;
		}
		setStatus(null);
		try {
			const result = await Updates.checkForUpdateAsync();
			if (!result.isAvailable) {
				setStatus("Up to date");
			}
		} catch {
			setStatus("Couldn't check");
		}
	};

	const value = updatesEnabled
		? isChecking
			? "Checking…"
			: isDownloading
				? "Downloading…"
				: isUpdatePending
					? "Reopen to apply"
					: isUpdateAvailable
						? "Available"
						: (status ?? "")
		: "Off in dev";

	return (
		<SettingsRow
			icon={<SymbolView name={REPLAY_ICON} size={17} tintColor={mutedColor} />}
			isLast={isLast}
			label={isUpdatePending ? "Update ready" : "Check for updates"}
			onPress={() => void check()}
			value={value}
			variant="value"
		/>
	);
};

/** "Version 1.14.0 · Update Oct 12, 2026 · preview" — channel omitted on production. */
export function useVersionLabel() {
	const { currentlyRunning } = Updates.useUpdates();
	const update =
		updatesEnabled &&
		!currentlyRunning.isEmbeddedLaunch &&
		currentlyRunning.createdAt
			? `Update ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(currentlyRunning.createdAt)}`
			: null;
	const version = Constants.expoConfig?.version;
	const channel = currentlyRunning.channel ?? Updates.channel;
	return [
		version && `Version ${version}`,
		update,
		channel !== "production" && channel,
	]
		.filter(Boolean)
		.join(" · ");
}
