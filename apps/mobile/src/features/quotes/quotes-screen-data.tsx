import { createContext, type ReactNode, use } from "react";
import type { PlusStatus } from "@/features/purchases/plus-status";
import type { QuoteUi, ShareFmt } from "./motion/quote-ui";
import type { DailyQuoteSlot, OfferTrigger } from "./offer/daily-quote-offer";
import type { KeptCard, QuoteBackground, Reason } from "./quotes-model";
import { useQuotes } from "./use-quotes";

export type QuotesState = {
	status: "loading" | "error" | "ready";
	quote: { title?: string; text: string } | null;
	reason: Reason;
	resonated: boolean;
	saved: boolean;
	saveLocked: boolean;
	plus: PlusStatus;
	keptCount: number;
	reply?: string;
	replyFlagged: boolean;
	replyReaches: boolean;
	sending: boolean;
	backgrounds: readonly QuoteBackground[];
	background: QuoteBackground;
	/** `background` is the server's answer, not the one remembered on the phone. */
	backgroundSettled: boolean;
	lowPower: boolean;
	active: boolean;
	soundOn: boolean;
	kept: readonly KeptCard[];
	offerDailyQuote: boolean;
	initialUi?: Partial<QuoteUi>;
};

export type ReplyOutcome = "sent" | "flagged" | "failed";

export type QuotesActions = {
	close: () => void;
	retry: () => void;
	setResonated: (on: boolean) => void;
	setSaved: (on: boolean) => Promise<boolean>;
	reply: (text: string) => Promise<ReplyOutcome>;
	pickBackground: (b: QuoteBackground) => Promise<boolean>;
	setSoundOn: (on: boolean) => void;
	openPlus: (from: "keep" | "background" | "reason") => void;
	reflect: (reply: string | undefined, flagged: boolean) => void;
	talk: () => void;
	keptAt: (index: number) => void;
	saveImage: (fmt: ShareFmt) => Promise<string | null>;
	shareImage: (fmt: ShareFmt) => Promise<string | null>;
	offerShown: (trigger: OfferTrigger) => void;
	answerOffer: (slot: DailyQuoteSlot | null) => Promise<string | null>;
};

export type QuotesScreenValue = { state: QuotesState; actions: QuotesActions };

const Context = createContext<QuotesScreenValue | null>(null);

export function useQuotesScreen(): QuotesScreenValue {
	const v = use(Context);
	if (!v) {
		throw new Error("useQuotesScreen outside QuotesScreenData");
	}
	return v;
}

export function QuotesScreenData({
	initialUi,
	tappedQuoteId,
	children,
}: {
	initialUi?: Partial<QuoteUi>;
	tappedQuoteId?: string;
	children: ReactNode;
}) {
	const { state, actions } = useQuotes(tappedQuoteId);
	return (
		<Context value={{ actions, state: { ...state, initialUi } }}>
			{children}
		</Context>
	);
}

export function QuotesScreenProvider({
	value,
	children,
}: {
	value: QuotesScreenValue;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}
