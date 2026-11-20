import { create } from "zustand";

export type QuoteView =
	| "today"
	| "themes"
	| "writing"
	| "sent"
	| "flagged"
	| "kept"
	| "share"
	| "gate"
	| "gateBackground"
	| "offer";
export type ShareFmt = "story" | "square";

export type QuoteUi = {
	view: QuoteView;
	fmt: ShareFmt;
	draft: string;
	hist: number;
	clear: boolean;
	paused: boolean;
	making: boolean;
	cat: "still" | "loop";
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
	"offer",
];
export const isSheetView = (v: QuoteView) => SHEETS.includes(v);
export const isSoftView = (v: QuoteView) =>
	v === "writing" ||
	v === "sent" ||
	v === "flagged" ||
	v === "kept" ||
	v === "share";
export const isWriteView = (v: QuoteView) =>
	v === "writing" || v === "sent" || v === "flagged";
