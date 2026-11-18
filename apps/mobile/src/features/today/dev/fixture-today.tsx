/** Today on fixtures: the real screen under a provider filled from `fixtures.ts`.
 * Help and the streak open their real routes; Reflect goes back (a dev state is pushed). */
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScopedTheme } from "uniwind";
import { NIGHT_VARIANT, type ThemeMode, themeVariant } from "@/design/themes";
import { type Today, TodayProvider } from "../today-data";
import { headerCopy, type TodayPhase } from "../today-model";
import { TodayScreen } from "../today-screen";
import {
	FIXTURE_DAY,
	FIXTURE_MONTH_PROMPT,
	FIXTURE_NAME,
	FIXTURE_STREAK,
	FIXTURE_WEEKDAY,
} from "./fixtures";

const ACTIONS: Today["actions"] = {
	openDoor: (door) => router.push(DOOR_HREF[door]),
	openHelp: () => router.push("/crisis-resources"),
	openReflect: () => router.back(),
	openStreak: () => router.navigate("/you"),
};

/** The doors open their real screens, as in the app. */
const DOOR_HREF = {
	sit: "/sit-with-this",
	talk: "/talk",
	vent: "/voice-vent",
} as const;

/** Let the screen land before the streak grows, as coming back to Today does. */
const IGNITE_AFTER_MS = 600;
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
};

function FixtureToday({
	phase: start,
	theme = "light",
	intro = false,
	offline = false,
	ignite = false,
	cycle = false,
	monthPrompt = false,
}: FixtureProps) {
	const phase = usePhase(start, cycle);
	const [grown, setGrown] = useState(false);
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
	const state: Today["state"] = {
		card: { monthPrompt: monthPrompt ? FIXTURE_MONTH_PROMPT : null },
		day: FIXTURE_DAY,
		eyebrow,
		greeting,
		intro,
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
			<TodayProvider value={{ actions: ACTIONS, state }}>
				<TodayScreen />
			</TodayProvider>
		</ScopedTheme>
	);
}

/** The real route draws its own chrome: no header. */
const OWN = { headerShown: false };

/** A dev state's options and screen, spread into its entry next to its `id` and `title`. */
export const today = (props: FixtureProps) => ({
	options: OWN,
	Screen: () => <FixtureToday {...props} />,
});
