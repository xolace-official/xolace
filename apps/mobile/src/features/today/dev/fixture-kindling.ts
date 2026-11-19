import { useEffect, useState } from "react";
import type { KindlingEmptyMode } from "../kindling/card-mode";
import type { KindlingOutcome } from "../kindling/kindling-model";
import { useKeptKindling } from "../kindling/use-kept-kindling";
import type { Today } from "../today-data";
import { FIXTURE_KINDLING } from "./fixtures";

/** As if back from the kindling's step: the card has landed before the step counts. */
const TEND_AFTER_MS = 900;
/** Setting up, then the kindling lands (as `getActive` catching up). */
const ARRIVE_AFTER_MS = 3000;

export type FixtureKindling = {
	/** The kindling: the board's, or none, or still loading. */
	kindling?: keyof typeof FIXTURE_KINDLING | "none" | "loading";
	/** With no kindling (or after one closes): Xolace+ with none right now, free, or setting up. */
	empty?: KindlingEmptyMode;
	/** Setting up, then the board's kindling lands 3 s in (the card swaps to live, at rest). */
	arrives?: boolean;
	/** A step is tended a moment after the screen opens: the completion plays. */
	tend?: boolean;
	/** With `kindling: "last"`: the kindling is put out instead, so the card swaps to none. */
	putOut?: boolean;
};

/** One `setTimeout` flag: false until `ms` after mount, when `on`. */
function useAfter(on: boolean, ms: number): boolean {
	const [done, setDone] = useState(false);
	useEffect(() => {
		if (!on) {
			return;
		}
		const id = setTimeout(() => setDone(true), ms);
		return () => clearTimeout(id);
	}, [on, ms]);
	return done;
}

/** Today's kindling card on fixtures: what the server would send, kept as the app keeps it. */
export function useFixtureKindling({
	kindling = "board",
	empty = "plus",
	arrives = false,
	tend = false,
	putOut = false,
}: FixtureKindling): Pick<Today["state"], "kindling" | "kindlingEmpty"> {
	const tended = useAfter(tend, TEND_AFTER_MS);
	const arrived = useAfter(arrives, ARRIVE_AFTER_MS);
	// Tending the last step or putting it out closes it: null, and `paths.getLatest` says how.
	let server: Today["state"]["kindling"] = null;
	const last = FIXTURE_KINDLING.last;
	if (arrives) {
		server = arrived ? FIXTURE_KINDLING.board : null;
	} else if (kindling === "loading") {
		server = undefined;
	} else if (kindling === "last") {
		server = tended ? null : last;
	} else if (kindling !== "none") {
		server = FIXTURE_KINDLING[tended ? "tended" : kindling];
	}
	const outcome: KindlingOutcome = {
		completed: !putOut,
		id: last.id,
		states: Object.fromEntries(
			last.twigs.map((t) => [t.id, putOut ? t.state : "done"])
		),
	};
	return {
		kindling: useKeptKindling(server, outcome),
		kindlingEmpty: arrives && !arrived ? "setting-up" : empty,
	};
}
