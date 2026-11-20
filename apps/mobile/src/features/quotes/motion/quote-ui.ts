import { createContext, use, useState } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

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
	starKey: number;
	toast: { text: string; key: number } | null;
};

const QUOTE_UI_DEFAULTS: QuoteUi = {
	burstKey: 0,
	cat: "still",
	clear: false,
	draft: "",
	fmt: "story",
	hist: 0,
	making: false,
	paused: false,
	starKey: 0,
	toast: null,
	view: "today",
};

type Actions = {
	set: (patch: Partial<QuoteUi>) => void;
	showToast: (text: string) => void;
	burst: () => void;
	popStar: () => void;
};

export type QuoteUiState = QuoteUi & Actions;
export type QuoteUiStore = StoreApi<QuoteUiState>;

const createQuoteUi = (initial: QuoteUi): QuoteUiStore =>
	createStore<QuoteUiState>()((set, get) => ({
		...initial,
		burst: () => set({ burstKey: get().burstKey + 1 }),
		popStar: () => set({ starKey: get().starKey + 1 }),
		set: (patch) => set(patch),
		showToast: (text) =>
			set({ toast: { key: (get().toast?.key ?? 0) + 1, text } }),
	}));

/**
 * A fresh store for each time Quotes opens, so a visit never starts from the last one's view,
 * sheet or draft, and a timer a closed visit left running can't reach the next.
 */
export function useOpenQuoteUi(initialUi?: Partial<QuoteUi>): QuoteUiStore {
	const [store] = useState(() =>
		createQuoteUi({ ...QUOTE_UI_DEFAULTS, ...initialUi })
	);
	return store;
}

export const QuoteUiContext = createContext<QuoteUiStore | null>(null);

export function useQuoteUi<T>(select: (s: QuoteUiState) => T): T {
	const store = use(QuoteUiContext);
	if (!store) {
		throw new Error("useQuoteUi outside QuotesScreen");
	}
	return useStore(store, select);
}

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
