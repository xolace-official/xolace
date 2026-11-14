import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexConnectionState, useQuery } from "convex/react";
import { Button } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { LinkSteps } from "@/features/reach-me-on/components/link-steps";
import {
	type OfferContext,
	offerMoment,
	telegramOfferVisible,
} from "@/features/reach-me-on/telegram-offer";
import { useReachMeOnFlag } from "@/features/reach-me-on/use-reach-channels";
import { useTelegramLink } from "@/features/reach-me-on/use-telegram-link";
import { playSoftPress } from "@/lib/haptics";
import { useAccountFlag } from "@/store/use-account-flag";

type Props = Pick<OfferContext, "answer" | "tier" | "escalationDerived">;

/**
 * The one-time "Want the next check-in on Telegram?" offer under a follow-up
 * answer (#777). Link Telegram runs the same three steps as the sheet, with
 * `source: offer_card`; Not now hides it for good on this account.
 */
export const TelegramOfferCard = (props: Props) => {
	const flagOn = useReachMeOnFlag();
	const [dismissed, markDismissed] = useAccountFlag("telegramOfferDismissed");
	// Channels are read only at a moment that allows the offer.
	const channels = useQuery(
		api.outreach.reachMe.listChannels,
		offerMoment({ ...props, dismissed, flagOn }) ? {} : "skip"
	);
	const telegram = channels?.find((c) => c.channel === "telegram");
	const link = useTelegramLink(telegram, "offer_card");
	const offline = !useConvexConnectionState().isWebSocketConnected;
	const posthog = usePostHog();
	const shownLogged = useRef(false);

	const offered = telegramOfferVisible({
		...props,
		channels,
		dismissed,
		flagOn,
	});
	// Mid-link the card stays, through the Linked confirmation.
	const visible = offered || link.step !== "idle";

	useEffect(() => {
		if (offered && !shownLogged.current) {
			shownLogged.current = true;
			posthog.capture("channel_offer_shown", { channel: "telegram" });
		}
	}, [offered, posthog]);

	if (!visible) {
		return null;
	}

	return (
		<View className="bg-surface px-5 pt-4">
			<View className="gap-4 rounded-3xl bg-accent/10 p-5">
				{link.step === "idle" ? (
					<>
						<AppText className="font-semibold text-foreground text-lg">
							Want the next check-in on Telegram?
						</AppText>
						<AppText className="text-foreground/70 text-sm">
							Answer with a tap, or just write back.
						</AppText>
						<View className="flex-row flex-wrap gap-2">
							<Button
								isDisabled={offline}
								onPress={() => {
									playSoftPress();
									posthog.capture("channel_offer_tapped", {
										channel: "telegram",
									});
									link.start();
								}}
							>
								<Button.Label>Link Telegram</Button.Label>
							</Button>
							<Button
								// Still with it has its own "Not now" (close) just above.
								accessibilityLabel="Not now, don't offer Telegram again"
								onPress={() => {
									playSoftPress();
									posthog.capture("channel_offer_dismissed", {
										channel: "telegram",
									});
									markDismissed();
								}}
								variant="ghost"
							>
								<Button.Label>Not now</Button.Label>
							</Button>
						</View>
					</>
				) : (
					<LinkSteps
						disabled={offline}
						minting={link.minting}
						onCancel={link.cancel}
						onCopyLink={link.copyLink}
						onDismiss={link.dismiss}
						onOpenTelegram={link.openTelegram}
						step={link.step}
					/>
				)}
			</View>
		</View>
	);
};
