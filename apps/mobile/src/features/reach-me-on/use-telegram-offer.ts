import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import {
	type OfferContext,
	offerMoment,
	telegramOfferVisible,
} from "@/features/reach-me-on/telegram-offer";
import { useOffline } from "@/features/reach-me-on/use-offline";
import { useReachMeOnFlag } from "@/features/reach-me-on/use-reach-channels";
import { useTelegramLink } from "@/features/reach-me-on/use-telegram-link";
import { useAccountFlag } from "@/store/use-account-flag";

export type OfferMoment = Pick<
	OfferContext,
	"answer" | "tier" | "escalationDerived"
>;

export function useTelegramOffer(moment: OfferMoment) {
	const flagOn = useReachMeOnFlag();
	const [dismissed, markDismissed] = useAccountFlag("telegramOfferDismissed");
	const channels = useQuery(
		api.outreach.reachMe.listChannels,
		offerMoment({ ...moment, dismissed, flagOn }) ? {} : "skip"
	);
	const telegram = channels?.find((c) => c.channel === "telegram");
	const { step, minting, ...link } = useTelegramLink(telegram, "offer_card");
	const offline = useOffline();
	const posthog = usePostHog();
	const shownLogged = useRef(false);

	const offered = telegramOfferVisible({
		...moment,
		channels,
		dismissed,
		flagOn,
	});

	useEffect(() => {
		if (offered && !shownLogged.current) {
			shownLogged.current = true;
			posthog.capture("channel_offer_shown", { channel: "telegram" });
		}
	}, [offered, posthog]);

	return {
		actions: {
			link: {
				...link,
				start: () => {
					posthog.capture("channel_offer_tapped", { channel: "telegram" });
					link.start();
				},
			},
			notNow: () => {
				posthog.capture("channel_offer_dismissed", { channel: "telegram" });
				markDismissed();
			},
		},
		state: {
			link: { minting, step },
			offline,
			visible: offered || step !== "idle",
		},
	};
}
