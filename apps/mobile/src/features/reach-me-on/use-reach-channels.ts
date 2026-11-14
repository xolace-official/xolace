import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useToast } from "heroui-native";
import { useFeatureFlag, usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { deviceRegion } from "@/features/reach-me-on/link-consent";
import { type Channel, sheetOrder } from "@/features/reach-me-on/reach-view";

/** Gates the mobile entry point only; the backend never reads it (plan §Rollout). */
const REACH_ME_ON_FLAG = "reach-me-on";

/** The flag's value: undefined until PostHog has loaded flags. */
export function useReachMeOnFlag(): boolean | undefined {
	const value = useFeatureFlag(REACH_ME_ON_FLAG);
	return value === undefined ? undefined : value === true;
}

/** Everything "Reach me on…" reads and changes, except linking. */
export function useReachChannels() {
	const channels = useQuery(api.outreach.reachMe.listChannels);
	const refreshCountry = useMutation(api.outreach.reachMe.refreshCountry);
	const setFirstChannel = useMutation(api.outreach.reachMe.setFirstChannel);
	const setChannelPaused = useMutation(api.outreach.reachMe.setChannelPaused);
	const unlinkChannel = useMutation(api.outreach.reachMe.unlinkChannel);
	const posthog = usePostHog();
	const { toast } = useToast();

	// Opening the sheet keeps the linked chat's country current (plan §9).
	useEffect(() => {
		posthog.capture("reach_screen_opened");
		const regionCode = deviceRegion();
		if (regionCode) {
			refreshCountry({ regionCode }).catch(() => {
				// Best effort: the next open tries again.
			});
		}
	}, [posthog, refreshCountry]);

	const failed = (label: string) =>
		toast.show({
			description: "Check your connection and try again.",
			label,
			variant: "danger",
		});

	const tryFirst = async (channel: Channel) => {
		try {
			await setFirstChannel({ channel });
			posthog.capture("channel_order_changed", { channel });
		} catch {
			failed("Couldn't change the order");
		}
	};

	const setPaused = async (channel: Channel, paused: boolean) => {
		try {
			await setChannelPaused({ channel, paused });
		} catch {
			failed(paused ? "Couldn't pause" : "Couldn't resume");
		}
	};

	const unlink = async (channel: Channel) => {
		try {
			await unlinkChannel({ channel });
		} catch {
			failed("Couldn't unlink");
		}
	};

	return {
		channels: channels && sheetOrder(channels),
		setPaused,
		tryFirst,
		unlink,
	};
}
