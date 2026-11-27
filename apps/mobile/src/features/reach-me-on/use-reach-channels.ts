import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useFeatureFlag, usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { toast } from "@/components/shared/toast";
import { deviceRegion } from "@/features/reach-me-on/link-consent";
import { type Channel, sheetOrder } from "@/features/reach-me-on/reach-view";

const REACH_ME_ON_FLAG = "reach-me-on";

export function useReachMeOnFlag(): boolean | undefined {
	const value = useFeatureFlag(REACH_ME_ON_FLAG);
	return value === undefined ? undefined : value === true;
}

export function useReachChannels() {
	const channels = useQuery(api.outreach.reachMe.listChannels);
	const refreshCountry = useMutation(api.outreach.reachMe.refreshCountry);
	const setFirstChannel = useMutation(api.outreach.reachMe.setFirstChannel);
	const setChannelPaused = useMutation(api.outreach.reachMe.setChannelPaused);
	const unlinkChannel = useMutation(api.outreach.reachMe.unlinkChannel);
	const posthog = usePostHog();

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
		toast(label, {
			description: "Check your connection and try again.",
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
