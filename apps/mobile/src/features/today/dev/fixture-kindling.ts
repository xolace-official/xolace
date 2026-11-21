import { useEffect, useState } from "react";
import type { KindlingEmptyMode } from "../kindling/card-mode";
import type { KindlingOutcome } from "../kindling/kindling-model";
import { useKeptKindling } from "../kindling/use-kept-kindling";
import type { Today } from "../today-data";
import { FIXTURE_KINDLING } from "./fixtures";

const TEND_AFTER_MS = 900;
const ARRIVE_AFTER_MS = 3000;

export type FixtureKindling = {
	kindling?: keyof typeof FIXTURE_KINDLING | "none" | "loading";
	empty?: KindlingEmptyMode;
	arrives?: boolean;
	tend?: boolean;
	putOut?: boolean;
};

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

export function useFixtureKindling({
	kindling = "board",
	empty = "plus",
	arrives = false,
	tend = false,
	putOut = false,
}: FixtureKindling): Pick<Today["state"], "kindling" | "kindlingEmpty"> {
	const tended = useAfter(tend, TEND_AFTER_MS);
	const arrived = useAfter(arrives, ARRIVE_AFTER_MS);
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
