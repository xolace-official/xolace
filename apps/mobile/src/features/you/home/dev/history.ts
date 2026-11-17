/**
 * The board's history (`P/src/fixtures/you-v2.ts` `history(kind)`), as `streaks/history.get`
 * returns it: 16 weeks from Monday 27 July 2026 to today, Thursday 12 November. Same seeded
 * draw, so Your days matches the renders cell for cell. Dev only.
 */
import type { History } from "@/features/you/home/days-model";

export type HistoryKind = "regular" | "ended" | "new";

const JOIN = new Date(2026, 6, 27);
export const FIXTURE_TODAY = "2026-11-12";
const WEEKS = 16;
const TODAY_INDEX = 108;
/** Minimal standard generator constants (Park–Miller), as the board's `rng`. */
const RNG_MULTIPLIER = 16_807;
const RNG_MODULUS = 2_147_483_647;
const ACTIONS = [
	"reflect",
	"daily_mood",
	"listen",
	"vent",
	"sit_with_this",
	"quotes",
	"library",
] as const;

function rng(seed: number) {
	let x = seed;
	return () => {
		x = (x * RNG_MULTIPLIER) % RNG_MODULUS;
		return x / RNG_MODULUS;
	};
}

const keyOf = (i: number) => {
	const d = new Date(JOIN);
	d.setDate(JOIN.getDate() + i);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type State = "pre" | "lit" | "frozen" | "quiet";

/** The board's state per day index (0 = the join Monday). */
function stateOf(kind: HistoryKind, i: number, r: () => number): State {
	if (kind === "new") {
		return i < TODAY_INDEX ? "pre" : "quiet";
	}
	if (i < 2) {
		return "pre";
	}
	if (i >= 20 && i <= 40) {
		return "lit";
	}
	if (i === 19 || i === 41 || i === 95) {
		return "quiet";
	}
	if (i === 61 || i === 78) {
		return "frozen";
	}
	if (i >= 96) {
		if (kind === "ended") {
			return i <= 100 ? "lit" : "quiet";
		}
		return i === 107 ? "frozen" : "lit";
	}
	return r() < 0.58 ? "lit" : "quiet";
}

export function fixtureHistory(kind: HistoryKind): History {
	const r = rng(kind === "ended" ? 41 : 17);
	const days: History["days"] = [];
	const frozenDays: string[] = [];
	const join = kind === "new" ? TODAY_INDEX : 2;
	for (let i = 0; i <= TODAY_INDEX && i < WEEKS * 7; i++) {
		const state = stateOf(kind, i, r);
		if (state === "frozen") {
			frozenDays.push(keyOf(i));
		}
		if (state !== "lit") {
			continue;
		}
		const v = r();
		const breadth = v < 0.38 ? 1 : v < 0.68 ? 2 : v < 0.88 ? 3 : 4;
		const pool = [...ACTIONS];
		const actions: History["days"][number]["actions"] = [];
		for (let k = 0; k < breadth; k++) {
			const [type] = pool.splice(Math.floor(r() * pool.length), 1);
			if (type) {
				actions.push({ count: k === 0 && r() < 0.3 ? 2 : 1, type });
			}
		}
		days.push({ actions, breadth, dayKey: keyOf(i) });
	}
	return {
		days,
		daysShowedUp: days.length,
		frozenDays,
		joinDay: keyOf(join),
		timezone: "UTC",
	};
}
