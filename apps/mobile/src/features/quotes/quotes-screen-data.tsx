import { createContext, type ReactNode, use } from "react";
import type { QuoteUi, ShareFmt } from "./motion/quote-ui";
import type { DailyQuoteSlot } from "./offer/daily-quote-offer";
import type { KeptCard, QuoteBackground, Reason } from "./quotes-model";
import { useQuotes } from "./use-quotes";

/** What the quote screen shows, from Convex through `useQuotes` or from a dev state's fixtures. */
export type QuotesState = {
	status: "loading" | "error" | "ready";
	quote: { title?: string; text: string } | null;
	reason: Reason;
	resonated: boolean;
	saved: boolean;
	/** Keeping is Xolace+: the star opens the gate. Locked while loading, so a cold tap never writes. */
	saveLocked: boolean;
	isPlus: boolean;
	keptCount: number;
	/** Today's reply, if written: the button reads "Your reply" and the sheet opens on it. */
	reply?: string;
	/** That reply was flagged: it's never seeded into Reflect. */
	replyFlagged: boolean;
	/** The reply shapes tomorrow's words (Xolace+ with a session in the window). */
	replyReaches: boolean;
	sending: boolean;
	backgrounds: readonly QuoteBackground[];
	/** What the screen draws: the saved choice, or Poster when it can't be shown. */
	background: QuoteBackground;
	lowPower: boolean;
	/** The app is in the foreground. */
	active: boolean;
	soundOn: boolean;
	kept: readonly KeptCard[];
	/**
	 * The daily quote was never chosen and this device hasn't offered it: the first resonate or
	 * keep raises the offer (B19).
	 */
	offerDailyQuote: boolean;
	/** A dev state opens on a sheet, Words you kept, or Clear view. */
	initialUi?: Partial<QuoteUi>;
};

export type ReplyOutcome = "sent" | "flagged" | "failed";

export type QuotesActions = {
	close: () => void;
	retry: () => void;
	setResonated: (on: boolean) => void;
	/** Keep or let go of today's quote; resolves false when the write didn't land. */
	setSaved: (on: boolean) => Promise<boolean>;
	reply: (text: string) => Promise<ReplyOutcome>;
	/** Apply a background; resolves false when the write didn't land. */
	pickBackground: (b: QuoteBackground) => Promise<boolean>;
	setSoundOn: (on: boolean) => void;
	openPlus: (from: "keep" | "background" | "reason") => void;
	/** Reflect, seeded with a reply when it may be (never flagged, never over a live session). */
	reflect: (reply: string | undefined, flagged: boolean) => void;
	talk: () => void;
	/** Words you kept is at card `index`: load more when it nears the end. */
	keptAt: (index: number) => void;
	/** The still, saved or shared; resolves with an error to show, or null. */
	saveImage: (fmt: ShareFmt) => Promise<string | null>;
	shareImage: (fmt: ShareFmt) => Promise<string | null>;
	/** The daily quote offer is up: this device won't show it again. */
	offerShown: () => void;
	/** Its answer: a time turns it on, null is Not now. Resolves with a line to show. */
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

/** Fills the screen from Convex. A dev state renders `QuotesScreenProvider` with fixtures. */
export function QuotesScreenData({
	initialUi,
	tappedQuoteId,
	children,
}: {
	/** A link's way in: `/quotes?view=kept` opens on Words you kept. */
	initialUi?: Partial<QuoteUi>;
	/** The quote a daily quote push opened (`/quotes?quote=<id>`): counted as opened. */
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
