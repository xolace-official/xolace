import { useLayoutEffect, useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import {
	playAffirmativePress,
	playResonanceToggle,
	playSoftPress,
	tap,
} from "@/lib/haptics";
import { QUOTE_COPY } from "../copy";
import {
	type DailyQuoteSlot,
	type OfferTrigger,
	offerRisesAfter,
} from "../offer/daily-quote-offer";
import type { KeptCard, QuoteBackground } from "../quotes-model";
import { tileTap } from "../quotes-model";
import type { QuotesScreenValue } from "../quotes-screen-data";
import { isSheetView, useQuoteUi } from "./quote-ui";

export type QuoteHandlers = ReturnType<typeof quoteHandlers>;

function quoteHandlers(live: { current: QuotesScreenValue }) {
	const ui = () => useQuoteUi.getState();
	const now = () => live.current.state;
	const act = () => live.current.actions;

	const maybeOffer = (trigger: OfferTrigger) => {
		const after = offerRisesAfter(trigger, now().offerDailyQuote);
		if (after === null) {
			return;
		}
		act().offerShown(trigger);
		setTimeout(() => {
			if (ui().view === "today" && !ui().clear) {
				ui().set({ view: "offer" });
			}
		}, after);
	};

	const resonate = () => {
		const on = !now().resonated;
		act().setResonated(on);
		playResonanceToggle();
		if (on) {
			ui().burst();
			ui().showToast(QUOTE_COPY.toasts.resonate);
			maybeOffer("resonate");
		}
	};

	const answerOffer = async (slot: DailyQuoteSlot | null) => {
		ui().set({ view: "today" });
		if (slot) {
			playAffirmativePress();
		}
		const line = await act().answerOffer(slot);
		if (line) {
			ui().showToast(line);
		}
	};

	const star = async () => {
		const s = now();
		if (s.saved) {
			Presets.System.selection();
			ui().showToast(QUOTE_COPY.toasts.removed);
			if (!(await act().setSaved(false))) {
				ui().showToast(QUOTE_COPY.errors.generic);
			}
			return;
		}
		if (s.saveLocked) {
			ui().set({ clear: false, view: "gate" });
			return;
		}
		playResonanceToggle();
		ui().showToast(QUOTE_COPY.toasts.kept);
		if (!(await act().setSaved(true))) {
			ui().showToast(QUOTE_COPY.errors.generic);
			return;
		}
		maybeOffer("keep");
	};

	const pick = async (b: QuoteBackground) => {
		const s = now();
		const next = tileTap(b, s.background.key, s.isPlus);
		if (next === "none") {
			return;
		}
		Presets.System.selection();
		if (next === "plus") {
			ui().set({ view: "gateBackground" });
			return;
		}
		ui().set({ paused: false });
		if (!(await act().pickBackground(b))) {
			ui().showToast(QUOTE_COPY.errors.generic);
		}
	};

	const send = async () => {
		const text = ui().draft.trim();
		if (!text || now().sending) {
			return;
		}
		playAffirmativePress();
		const outcome = await act().reply(text);
		if (outcome === "failed") {
			ui().showToast(QUOTE_COPY.errors.reply);
			return;
		}
		ui().set({ view: outcome });
	};

	const make = async (go: "save" | "share") => {
		ui().set({ making: true });
		const fmt = ui().fmt;
		const error = await (go === "save"
			? act().saveImage(fmt)
			: act().shareImage(fmt));
		ui().set({ making: false });
		if (error) {
			ui().showToast(error);
			return;
		}
		ui().set({ view: "today" });
		if (go === "save") {
			ui().showToast(QUOTE_COPY.toasts.savedImage);
			playAffirmativePress();
			return;
		}
		maybeOffer("share");
	};

	const plus = (from: "keep" | "background" | "reason") => {
		ui().set({ view: "today" });
		act().openPlus(from);
	};

	return {
		close: () => act().close(),
		double: () => {
			if (!now().resonated) {
				resonate();
				return;
			}
			tap();
			ui().burst();
		},
		heart: resonate,
		hold: () => {
			const s = ui();
			if (s.clear) {
				return;
			}
			playSoftPress();
			s.set({ clear: true, view: isSheetView(s.view) ? "today" : s.view });
		},
		kept: () => ui().set({ clear: false, hist: 0, view: "kept" }),
		keptAt: (hist: number) => {
			ui().set({ hist });
			act().keptAt(hist);
		},
		offerAnswer: (slot: DailyQuoteSlot | null) => {
			answerOffer(slot).catch(() => ui().showToast(QUOTE_COPY.errors.generic));
		},
		pause: () => ui().set({ paused: !ui().paused }),
		pick: (b: QuoteBackground) => {
			pick(b).catch(() => ui().showToast(QUOTE_COPY.errors.generic));
		},
		plusBackground: () => plus("background"),
		plusKeep: () => plus("keep"),
		plusReason: () => plus("reason"),
		reflect: () => {
			const s = now();
			const flagged = ui().view === "flagged" || s.replyFlagged;
			act().reflect(ui().draft.trim() || s.reply, flagged);
		},
		reflectKept: (c: KeptCard) => act().reflect(c.reply, c.flagged),
		retry: () => act().retry(),
		save: () => {
			make("save").catch(() => ui().set({ making: false }));
		},
		send: () => {
			send().catch(() => ui().showToast(QUOTE_COPY.errors.reply));
		},
		share: () => ui().set({ clear: false, view: "share" }),
		shareGo: () => {
			make("share").catch(() => ui().set({ making: false }));
		},
		sound: () => act().setSoundOn(!now().soundOn),
		star: () => {
			star().catch(() => ui().showToast(QUOTE_COPY.errors.generic));
		},
		talk: () => act().talk(),
		tap: () => {
			const s = ui();
			if (s.clear) {
				s.set({ clear: false });
				return;
			}
			if (isSheetView(s.view)) {
				s.set({ view: "today" });
			}
		},
		themes: () =>
			ui().set({
				cat: now().background.kind,
				clear: false,
				view: "themes",
			}),
		toToday: () => ui().set({ view: "today" }),
		write: () => {
			const s = ui();
			s.set({
				clear: false,
				draft: s.draft || now().reply || "",
				view: "writing",
			});
		},
	};
}

export function useQuoteHandlers(value: QuotesScreenValue): QuoteHandlers {
	const live = useRef(value);
	useLayoutEffect(() => {
		live.current = value;
	});
	const [h] = useState(() => quoteHandlers(live));
	return h;
}
