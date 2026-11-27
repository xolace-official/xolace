import { createContext, type ReactNode, use } from "react";
import type { LinkStep } from "@/features/reach-me-on/link-flow";
import {
	type OfferMoment,
	useTelegramOffer,
} from "@/features/reach-me-on/use-telegram-offer";

export type TelegramOffer = {
	state: {
		visible: boolean;
		offline: boolean;
		link: { step: LinkStep; minting: boolean };
	};
	actions: {
		notNow: () => void;
		link: {
			start: () => void;
			openTelegram: () => void;
			copyLink: () => void;
			cancel: () => void;
			dismiss: () => void;
		};
	};
};

const TelegramOfferContext = createContext<TelegramOffer | null>(null);

export function TelegramOfferProvider({
	value,
	children,
}: {
	value: TelegramOffer;
	children: ReactNode;
}) {
	return <TelegramOfferContext value={value}>{children}</TelegramOfferContext>;
}

export function TelegramOfferData({
	children,
	...moment
}: OfferMoment & { children: ReactNode }) {
	const value = useTelegramOffer(moment);
	return (
		<TelegramOfferProvider value={value}>{children}</TelegramOfferProvider>
	);
}

export function useTelegramOfferCard(): TelegramOffer {
	const offer = use(TelegramOfferContext);
	if (!offer) {
		throw new Error(
			"useTelegramOfferCard needs a TelegramOfferProvider above it"
		);
	}
	return offer;
}
