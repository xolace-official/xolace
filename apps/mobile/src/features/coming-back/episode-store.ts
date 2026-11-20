import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { playAffirmativePress } from "@/lib/haptics";
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

type State = {
	open: boolean;
	mode: GreetMode;
	page: "list" | "prompt";
	enter: boolean;
	away: Away;
	name: string | null;
	items: Items;
	outcomes: Outcomes;
	ciOpen: boolean;
	deferred: Row | null;
	just: Row | null;
	tickKey: number;
	closeKey: number;
	live: { away: Away; name: string | null; items: Items; due: boolean };
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
	leaveCheckIn: (later: boolean) => void;
	leavePrompt: (how: Exclude<PromptState, "waiting" | "written">) => void;
	writePrompt: () => void;
	landDeferred: () => void;
	setLive: (live: State["live"]) => void;
	markGreeted: (key: string) => void;
};

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
const clearTimers = () => {
	for (const t of timers) {
		clearTimeout(t);
	}
	timers = [];
};

export const useEpisode = create<State & Actions>()(
	persist(
		(set, get) => {
			const tick = (row: Row, prompt?: PromptState) => {
				set((st) => ({
					just: row,
					outcomes:
						row === "ck"
							? { ...st.outcomes, ckDone: true }
							: { ...st.outcomes, prompt: prompt ?? st.outcomes.prompt },
					tickKey: st.tickKey + 1,
				}));
				playAffirmativePress();
			};
			const later = (ms: number, fn: () => void) =>
				timers.push(setTimeout(fn, ms));

			return {
				...FRESH,
				answer: (a) =>
					set((st) => ({ outcomes: { ...st.outcomes, answer: a } })),
				closeGreeting: () => {
					// A row still waiting to tick must not land (and buzz) after the greeting closed.
					clearTimers();
					set((st) =>
						st.open
							? { closeKey: st.closeKey + 1, open: false, page: "list" }
							: {}
					);
				},
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
					clearTimers();
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
