import { ScrollView } from "react-native";
import { TelegramOfferCard } from "@/features/reach-me-on/components/telegram-offer-card";
import type { LinkStep } from "@/features/reach-me-on/link-flow";
import {
	type TelegramOffer,
	TelegramOfferProvider,
} from "@/features/reach-me-on/telegram-offer-data";

const ignore = () => undefined;
const ACTIONS: TelegramOffer["actions"] = {
	link: {
		cancel: ignore,
		copyLink: ignore,
		dismiss: ignore,
		openTelegram: ignore,
		start: ignore,
	},
	notNow: ignore,
};

export function FixtureOffer({
	step = "idle",
	offline = false,
}: {
	step?: LinkStep;
	offline?: boolean;
}) {
	const value: TelegramOffer = {
		actions: ACTIONS,
		state: { link: { minting: false, step }, offline, visible: true },
	};
	return (
		<ScrollView
			className="flex-1 bg-surface"
			contentInsetAdjustmentBehavior="automatic"
		>
			<TelegramOfferProvider value={value}>
				<TelegramOfferCard />
			</TelegramOfferProvider>
		</ScrollView>
	);
}
