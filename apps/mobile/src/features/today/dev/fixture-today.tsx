import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScopedTheme } from "uniwind";
import { NIGHT_VARIANT, type ThemeMode, themeVariant } from "@/design/themes";
import { type Today, TodayProvider } from "../today-data";
import { type CardMode, headerCopy, type TodayPhase } from "../today-model";
import { TodayScreen } from "../today-screen";
import { useFixtureCovers } from "./covers";
import { FIXTURE_ACTIONS } from "./fixture-actions";
import { FixtureFinding } from "./fixture-finding";
import { type FixtureKindling, useFixtureKindling } from "./fixture-kindling";
import {
	FIXTURE_CAMPFIRE,
	FIXTURE_DAY,
	FIXTURE_HOUR,
	FIXTURE_MONTH_PROMPT,
	FIXTURE_NAME,
	FIXTURE_STREAK,
	FIXTURE_WEEKDAY,
	type FixtureModules,
	lowerModules,
	reflectState,
} from "./fixtures";

const WORD_AFTER_MS = 1200;
const IGNITE_AFTER_MS = 600;
const CYCLE_MS = 4000;
const PHASES: readonly TodayPhase[] = ["dawn", "day", "evening", "late"];

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

export type FixtureProps = FixtureKindling & {
	phase: TodayPhase;
	theme?: ThemeMode;
	intro?: boolean;
	offline?: boolean;
	ignite?: boolean;
	rekindle?: boolean;
	cycle?: boolean;
	monthPrompt?: boolean;
	reflect?: CardMode;
	campfire?: keyof typeof FIXTURE_CAMPFIRE | "none";
	free?: boolean;
	lateWord?: boolean;
	finding?: boolean;
	modules?: FixtureModules;
};

function FixtureToday({
	phase: start,
	theme = "light",
	intro = false,
	offline = false,
	ignite = false,
	cycle = false,
	monthPrompt = false,
	reflect = "idle",
	campfire = "count",
	modules = "board",
	finding = false,
	lateWord = false,
	free = false,
	rekindle = false,
	...kindlingProps
}: FixtureProps) {
	const covers = useFixtureCovers();
	const [wordIn, setWordIn] = useState(!lateWord);
	useEffect(() => {
		if (wordIn) {
			return;
		}
		const id = setTimeout(() => setWordIn(true), WORD_AFTER_MS);
		return () => clearTimeout(id);
	}, [wordIn]);
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
		FIXTURE_HOUR[phase],
		FIXTURE_WEEKDAY,
		offline ? null : FIXTURE_NAME
	);
	const kindling = useFixtureKindling(kindlingProps);
	const state: Today["state"] = {
		campfire: campfire === "none" ? null : FIXTURE_CAMPFIRE[campfire],
		card: {
			mode: reflect,
			monthPrompt: monthPrompt ? FIXTURE_MONTH_PROMPT : null,
			reflect: reflectState(reflect, phase, theme),
		},
		day: FIXTURE_DAY,
		eyebrow,
		greeting,
		intro,
		...kindling,
		...lowerModules(offline ? "loading" : modules, covers),
		...(wordIn ? {} : { word: undefined }),
		listenLocked: free,
		phase,
		ready: true,
		rekindle:
			rekindle && !offline ? { busy: false, streak: FIXTURE_STREAK } : null,
		streak: offline
			? null
			: {
					count: rekindle ? 0 : FIXTURE_STREAK + (grown ? 1 : 0),
					igniteKey: grown ? 1 : 0,
				},
	};
	return (
		<ScopedTheme
			theme={phase === "late" ? NIGHT_VARIANT : themeVariant("default", theme)}
		>
			<TodayProvider value={{ actions: FIXTURE_ACTIONS, state }}>
				<TodayScreen finding={finding ? <FixtureFinding /> : undefined} />
			</TodayProvider>
		</ScopedTheme>
	);
}

export const today = (props: FixtureProps) => ({
	options: { headerShown: false },
	Screen: () => <FixtureToday {...props} />,
});
