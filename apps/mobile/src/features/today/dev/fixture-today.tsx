/** Today on fixtures: the real screen under a provider filled from `fixtures.ts`.
 * Help and the streak open their real routes; Reflect goes back (a dev state is pushed). */
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScopedTheme } from "uniwind";
import { NIGHT_VARIANT, type ThemeMode, themeVariant } from "@/design/themes";
import type { KindlingOutcome } from "../kindling/kindling-model";
import { useKeptKindling } from "../kindling/use-kept-kindling";
import { type Today, TodayProvider } from "../today-data";
import { headerCopy, type TodayPhase } from "../today-model";
import { TodayScreen } from "../today-screen";
import { FIXTURE_ACTIONS } from "./fixture-actions";
import {
	FIXTURE_CAMPFIRE,
	FIXTURE_DAY,
	FIXTURE_KINDLING,
	FIXTURE_MOMENTS,
	FIXTURE_MONTH_PROMPT,
	FIXTURE_NAME,
	FIXTURE_RAIL,
	FIXTURE_STREAK,
	FIXTURE_WEEKDAY,
	FIXTURE_WORD,
} from "./fixtures";

/** Let the screen land before the streak grows, as coming back to Today does. */
const IGNITE_AFTER_MS = 600;
/** As if back from the kindling's step: the card has landed before the step counts. */
const TEND_AFTER_MS = 900;
/** Long enough for each swap to finish and rest (the night front takes 1.6 s). */
const CYCLE_MS = 4000;
const PHASES: readonly TodayPhase[] = ["dawn", "day", "evening", "late"];

/** The phase, or the next one every few seconds when cycling. */
function usePhase(start: TodayPhase, cycle: boolean): TodayPhase {
	const [index, setIndex] = useState(() => PHASES.indexOf(start));
	useEffect(() => {
		if (!cycle) {
			return;
		}
		const id = setInterval(
			() => setIndex((i) => (i + 1) % PHASES.length),
			CYCLE_MS
		);
		return () => clearInterval(id);
	}, [cycle]);
	return PHASES[index] ?? start;
}

export type FixtureProps = {
	phase: TodayPhase;
	/** Default's light or dark; late is always night mode's theme. */
	theme?: ThemeMode;
	/** The first open of the day: the words, the rise. */
	intro?: boolean;
	/** Offline or still loading: no name, no streak. */
	offline?: boolean;
	/** The streak grows by one just after the screen opens, and the flame ignites. */
	ignite?: boolean;
	/** Step through the four phases, to watch the sky change hour (and night fall). */
	cycle?: boolean;
	/** This month's prompt rides on the card. */
	monthPrompt?: boolean;
	/** The kindling: the board's, or none (S16 draws that), or still loading. */
	kindling?: keyof typeof FIXTURE_KINDLING | "none" | "loading";
	/** A step is tended a moment after the screen opens: the completion plays. */
	tend?: boolean;
	/** With `kindling: "last"`: the kindling is put out instead, so the card goes. */
	putOut?: boolean;
	campfire?: keyof typeof FIXTURE_CAMPFIRE | "none";
	/** The rail, your moments and the word: the board's, none at all, or still loading. */
	modules?: "board" | "none" | "loading";
};

function FixtureToday({
	phase: start,
	theme = "light",
	intro = false,
	offline = false,
	ignite = false,
	cycle = false,
	monthPrompt = false,
	kindling = "board",
	tend = false,
	putOut = false,
	campfire = "count",
	modules = "board",
}: FixtureProps) {
	const phase = usePhase(start, cycle);
	const [grown, setGrown] = useState(false);
	const [tended, setTended] = useState(false);
	useEffect(() => {
		if (!tend) {
			return;
		}
		const id = setTimeout(() => setTended(true), TEND_AFTER_MS);
		return () => clearTimeout(id);
	}, [tend]);
	useEffect(() => {
		if (!ignite) {
			return;
		}
		const id = setTimeout(() => setGrown(true), IGNITE_AFTER_MS);
		return () => clearTimeout(id);
	}, [ignite]);

	const { eyebrow, greeting } = headerCopy(
		phase,
		FIXTURE_WEEKDAY,
		offline ? null : FIXTURE_NAME
	);
	// As the server sends it: tending the last step, or putting the kindling out, closes it,
	// so it goes null; `paths.getLatest` then says how it ended.
	let server: Today["state"]["kindling"] = null;
	const last = FIXTURE_KINDLING.last;
	if (kindling === "loading") {
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
	const kindlingView = useKeptKindling(server, outcome);
	const state: Today["state"] = {
		campfire: campfire === "none" ? null : FIXTURE_CAMPFIRE[campfire],
		card: { monthPrompt: monthPrompt ? FIXTURE_MONTH_PROMPT : null },
		day: FIXTURE_DAY,
		eyebrow,
		greeting,
		intro,
		kindling: kindlingView,
		...lowerModules(offline ? "loading" : modules),
		phase,
		streak: offline
			? null
			: {
					count: FIXTURE_STREAK + (grown ? 1 : 0),
					igniteKey: grown ? 1 : 0,
				},
	};
	return (
		<ScopedTheme
			theme={phase === "late" ? NIGHT_VARIANT : themeVariant("default", theme)}
		>
			<TodayProvider value={{ actions: FIXTURE_ACTIONS, state }}>
				<TodayScreen />
			</TodayProvider>
		</ScopedTheme>
	);
}

/** The rail, moments and word: loading is undefined, none is empty (the word null). */
function lowerModules(
	modules: NonNullable<FixtureProps["modules"]>
): Pick<Today["state"], "rail" | "moments" | "word" | "playingSlug"> {
	if (modules === "loading") {
		return {
			moments: undefined,
			playingSlug: null,
			rail: undefined,
			word: undefined,
		};
	}
	const board = modules === "board";
	return {
		moments: board ? FIXTURE_MOMENTS : [],
		playingSlug: null,
		rail: board ? FIXTURE_RAIL : [],
		word: board ? FIXTURE_WORD : null,
	};
}

/** The real route draws its own chrome: no header. */
const OWN = { headerShown: false };

/** A dev state's options and screen, spread into its entry next to its `id` and `title`. */
export const today = (props: FixtureProps) => ({
	options: OWN,
	Screen: () => <FixtureToday {...props} />,
});
