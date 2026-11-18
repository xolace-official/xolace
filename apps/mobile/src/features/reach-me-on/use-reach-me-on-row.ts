import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { reachRowValue } from "@/features/reach-me-on/reach-view";
import { useReachMeOnFlag } from "@/features/reach-me-on/use-reach-channels";

/**
 * Notifications' "Reach me on…" row, as production's `ReachMeOnRow` showed it: behind the
 * `reach-me-on` flag (hidden while flags load), and only where the deployment offers Telegram.
 * Null hides the row. Not `useReachChannels`: that one counts as opening the sheet
 * (`reach_screen_opened`) and refreshes the country.
 */
export function useReachMeOnRow(): { value: string } | null {
	const enabled = useReachMeOnFlag() === true;
	const channels = useQuery(
		api.outreach.reachMe.listChannels,
		enabled ? {} : "skip"
	);
	return channels?.some((c) => c.channel === "telegram")
		? { value: reachRowValue(channels) }
		: null;
}
