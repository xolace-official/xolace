import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsSection } from "@/components/shared/settings-section";
import { reachRowValue } from "@/features/reach-me-on/reach-view";
import { useReachMeOnFlag } from "@/features/reach-me-on/use-reach-channels";

/**
 * Settings → Notifications' "Check-ins" section: one row opening "Reach me
 * on…". Hidden behind the flag, and where the deployment offers no Telegram.
 */
export const ReachMeOnRow = ({ icon }: { icon?: ReactNode }) => {
	const enabled = useReachMeOnFlag() === true;
	const channels = useQuery(
		api.outreach.reachMe.listChannels,
		enabled ? {} : "skip"
	);
	if (!channels?.some((c) => c.channel === "telegram")) {
		return null;
	}
	return (
		<SettingsSection title="Check-ins">
			<SettingsRow
				icon={icon}
				isLast
				label="Reach me on…"
				onPress={() => router.push("/settings/reach")}
				value={reachRowValue(channels)}
				variant="nav"
			/>
		</SettingsSection>
	);
};
