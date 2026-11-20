import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { reachRowValue } from "@/features/reach-me-on/reach-view";
import { useReachMeOnFlag } from "@/features/reach-me-on/use-reach-channels";

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
