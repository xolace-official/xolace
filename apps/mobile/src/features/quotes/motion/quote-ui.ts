import { create } from "zustand";

/**
 * The quote screen's own UI state (the board's `state`), in one small store so each part reads
 * only what it draws. Nothing here comes from or goes to Convex: the screen resets it on every
 * open, from `initialUi` (a dev state's) or the defaults.
 */
export type QuoteView =
	| "today"
	| "themes"
	| "writing"
	| "sent"
	| "flagged"
	| "kept"
	| "share"
	| "gate"
	| "gateBackground";
export type ShareFmt = "story" | "square";

export type QuoteUi = {
	view: QuoteView;
	fmt: ShareFmt;
	draft: string;
	hist: number;
	clear: boolean;
	paused: boolean;
	making: boolean;
	/** The Background sheet's tab. */
	cat: "still" | "loop";
	/** Bumped to replay the heart's burst. */
	burstKey: number;
	toast: { text: string; key: number } | null;
};

export const QUOTE_UI_DEFAULTS: QuoteUi = {
	burstKey: 0,
	cat: "still",
	clear: false,
	draft: "",
	fmt: "story",
	hist: 0,
	making: false,
	paused: false,
	toast: null,
	view: "today",
};

type Actions = {
	set: (patch: Partial<QuoteUi>) => void;
	showToast: (text: string) => void;
	burst: () => void;
};

export const useQuoteUi = create<QuoteUi & Actions>()((set, get) => ({
	...QUOTE_UI_DEFAULTS,
	burst: () => set({ burstKey: get().burstKey + 1 }),
	set: (patch) => set(patch),
	showToast: (text) =>
		set({ toast: { key: (get().toast?.key ?? 0) + 1, text } }),
}));

const SHEETS: readonly QuoteView[] = [
	"themes",
	"writing",
	"sent",
	"flagged",
	"share",
	"gate",
	"gateBackground",
];
/** Views that raise a sheet over the quote. */
export const isSheetView = (v: QuoteView) => SHEETS.includes(v);
/** Views whose background softens. */
export const isSoftView = (v: QuoteView) =>
	v === "writing" ||
	v === "sent" ||
	v === "flagged" ||
	v === "kept" ||
	v === "share";
/** The write sheet's three steps lift the quote furthest. */
export const isWriteView = (v: QuoteView) =>
	v === "writing" || v === "sent" || v === "flagged";
