import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import {
	type GreetMode,
	type Items,
	NO_ITEMS,
	NO_OUTCOMES,
	type Outcomes,
	type PromptState,
	type Row,
} from "./coming-back-model";
import type { Answer, Away } from "./copy";

/**
 * The return episode on this device (handoff §1): the greeting's UI across its two routes and
 * Today's pill. Server truth (the waiting card, this month's event, the freeze) comes from the
 * data hook, which pins what an opening lists here; no Convex call is made from this store.
 * Only `greeted` is kept across launches, so a return greets once.
 */
type State = {
	open: boolean;
	mode: GreetMode;
	page: "list" | "prompt";
	/** The greeting plays its entrance (off when reopened by a dev state). */
	enter: boolean;
	away: Away;
	name: string | null;
	items: Items;
	outcomes: Outcomes;
	ciOpen: boolean;
	/** A tick that lands when the greeting is in front again (after Vent or crisis help). */
	deferred: Row | null;
	/** The row that just ticked, bumped per tick so the row and the face replay. */
	just: Row | null;
	tickKey: number;
	/** Bumped each time the greeting closes, so the pill rises again. */
	closeKey: number;
	/** What this return holds on the server now, and whether Today is about to greet (set by Today's host). */
	live: { away: Away; name: string | null; items: Items; due: boolean };
	/** `<account>|<episode>` last greeted (kept). */
	greeted: string | null;
};

type Actions = {
	openGreeting: (
		mode: GreetMode,
		snap: Pick<State, "away" | "name" | "items">
	) => void;
	closeGreeting: () => void;
	setPage: (page: State["page"]) => void;
	setCheckInOpen: (open: boolean) => void;
	answer: (a: Answer) => void;
	/** The check-in is leaving. `later`: the tick waits for the greeting to be in front. */
	leaveCheckIn: (later: boolean) => void;
	/** Back (read) or Let it pass from the prompt page. */
	leavePrompt: (how: Exclude<PromptState, "waiting" | "written">) => void;
	writePrompt: () => void;
	landDeferred: () => void;
	setLive: (live: State["live"]) => void;
	markGreeted: (key: string) => void;
};

/** Board `finishCk` / `pmLeave`: the tick lands 440 ms after the check-in starts closing, 320 ms after the prompt page. */
const TICK_AFTER = { ck: 440, pm: 320 } as const;

const FRESH = {
	away: "next",
	ciOpen: false,
	closeKey: 0,
	deferred: null,
	enter: true,
	greeted: null,
	items: NO_ITEMS,
	just: null,
	live: { away: "next", due: false, items: NO_ITEMS, name: null },
	mode: "greet",
	name: null,
	open: false,
	outcomes: NO_OUTCOMES,
	page: "list",
	tickKey: 0,
} as const satisfies State;

let timers: ReturnType<typeof setTimeout>[] = [];

export const useEpisode = create<State & Actions>()(
	persist(
		(set, get) => {
			const tick = (row: Row, prompt?: PromptState) =>
				set((st) => ({
					just: row,
					outcomes:
						row === "ck"
							? { ...st.outcomes, ckDone: true }
							: { ...st.outcomes, prompt: prompt ?? st.outcomes.prompt },
					tickKey: st.tickKey + 1,
				}));
			const later = (ms: number, fn: () => void) =>
				timers.push(setTimeout(fn, ms));

			return {
				...FRESH,
				answer: (a) =>
					set((st) => ({ outcomes: { ...st.outcomes, answer: a } })),
				closeGreeting: () =>
					set((st) =>
						st.open
							? { closeKey: st.closeKey + 1, open: false, page: "list" }
							: {}
					),
				landDeferred: () => {
					const row = get().deferred;
					if (row) {
						set({ deferred: null });
						tick(row);
					}
				},
				leaveCheckIn: (deferUntilFront) => {
					const st = get();
					set({ ciOpen: false });
					if (!st.outcomes.answer || st.outcomes.ckDone) {
						return;
					}
					if (deferUntilFront) {
						set({ deferred: "ck" });
					} else {
						later(TICK_AFTER.ck, () => tick("ck"));
					}
				},
				leavePrompt: (how) => {
					set({ page: "list" });
					later(TICK_AFTER.pm, () => tick("pm", how));
				},
				markGreeted: (key) => set({ greeted: key }),
				openGreeting: (mode, snap) => {
					for (const t of timers) {
						clearTimeout(t);
					}
					timers = [];
					set({
						...snap,
						ciOpen: false,
						deferred: null,
						enter: true,
						just: null,
						mode,
						open: true,
						outcomes: NO_OUTCOMES,
						page: "list",
					});
				},
				setCheckInOpen: (ciOpen) => set({ ciOpen }),
				setLive: (live) => set({ live }),
				setPage: (page) => set({ page }),
				writePrompt: () =>
					set((st) => ({ outcomes: { ...st.outcomes, prompt: "written" } })),
			};
		},
		{
			name: "xolace-coming-back",
			partialize: (s) => ({ greeted: s.greeted }),
			storage: createJSONStorage(() => zustandJSONStorage),
			version: 1,
		}
	)
);
