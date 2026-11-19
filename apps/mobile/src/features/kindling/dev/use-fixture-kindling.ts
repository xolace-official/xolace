import { useEffect, useState } from "react";
import { goHome } from "@/lib/landing";
import { COPY } from "../copy";
import type { Kindling } from "../kindling-data";
import { heldOn, type TrailView, type TwigState } from "../kindling-model";

/** Coming back from a twig's screen: it lands tended a moment after the tap. */
const RETURN_MS = 700;
/** "Tend on return": the server's word arrives after the screen has settled. */
const ARRIVE_MS = 400;

export type FixtureProps = {
	view?: TrailView;
	status?: Kindling["state"]["status"];
	/** A xolacer match in flight, on this twig index. */
	matching?: number;
	/** Twigs the server marks done once the screen is up: their tends play. */
	arrive?: readonly number[];
	/** Loading for this long first (a cold open from a notification), then `status`. */
	loadsMs?: number;
};

const set = (states: readonly TwigState[], i: number, s: TwigState) =>
	states.map((x, j) => (j === i ? s : x));

/** The kindling on fixtures: taps change the states as the server would, and nothing is sent. */
export function useFixtureKindling({
	view,
	status: given = "ready",
	matching,
	arrive,
	loadsMs,
}: FixtureProps): Kindling {
	const [loaded, setLoaded] = useState(!loadsMs);
	useEffect(() => {
		if (!loadsMs) {
			return;
		}
		const timer = setTimeout(() => setLoaded(true), loadsMs);
		return () => clearTimeout(timer);
	}, [loadsMs]);
	const status = loaded ? given : "loading";
	const [states, setStates] = useState<readonly TwigState[]>(
		view?.states ?? []
	);
	const indexOf = (id: string) =>
		view?.twigs.findIndex((t) => t.id === id) ?? -1;
	const mark = (id: string, s: TwigState) =>
		setStates((now) => set(now, indexOf(id), s));

	useEffect(() => {
		if (!arrive?.length) {
			return;
		}
		const timer = setTimeout(
			() =>
				setStates((now) => arrive.reduce((acc, i) => set(acc, i, "done"), now)),
			ARRIVE_MS
		);
		return () => clearTimeout(timer);
	}, [arrive]);

	const shown = view ? { ...view, states: [...states] } : null;
	return {
		actions: {
			back: goHome,
			browse: () => undefined,
			open: (id, again) => {
				if (!again) {
					setTimeout(() => mark(id, "done"), RETURN_MS);
				}
			},
			putOut: goHome,
			skip: (id) => {
				mark(id, "passed");
				return Promise.resolve(true);
			},
			tend: (id) => {
				mark(id, "done");
				return Promise.resolve(true);
			},
		},
		state: {
			held: shown ? heldOn(shown.generatedAt, Date.now()) : COPY.lastSession,
			matching:
				matching === undefined ? null : (view?.twigs[matching]?.id ?? null),
			status,
			view: status === "ready" ? shown : null,
		},
	};
}
