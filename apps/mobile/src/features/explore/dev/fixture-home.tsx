/**
 * Explore home on fixtures, through the same `{ state, actions }` as the app. A play button or a
 * ring plays and pauses on screen (no sound), Remove from here and Don't use my sessions here
 * take their shelf away, and a hold shows the preview; nothing reaches Convex.
 */
import { Stack } from "expo-router";
import { useState } from "react";
import {
	CONT,
	FEATURED,
	FOR_YOU,
	FRESH,
	HOUR,
	SHORT,
} from "@/features/explore/dev/home-fixtures";
import {
	type HomeActions,
	HomeProvider,
	type HomeState,
} from "@/features/explore/home/home-data";
import { HomeScreen } from "@/features/explore/home/home-screen";
import type { DayPhase } from "@/lib/day-phase";

type Options = {
	phase?: DayPhase;
	locked?: boolean;
	/** A new member: nothing to pick up, no sessions to name. */
	fresh?: boolean;
	/** "Don't use my sessions here" is on. */
	noSessions?: boolean;
	loading?: boolean;
	/** This slug is in the mini player, playing. */
	playing?: string;
	startPicked?: boolean;
	/** Hold to hear turned on, with this cover heard. */
	hearing?: string;
};

export function FixtureHome({
	phase = "day",
	locked = false,
	fresh = false,
	noSessions = false,
	loading = false,
	playing,
	startPicked,
	hearing,
}: Options) {
	const [cont, setCont] = useState(fresh ? [] : [...CONT]);
	const [named, setNamed] = useState(!(fresh || noSessions));
	const [now, setNow] = useState<string | null>(playing ?? null);
	const [isPlaying, setIsPlaying] = useState(playing !== undefined);
	const [heard, setHeard] = useState<string | null>(hearing ?? null);
	const play = (slug: string) => {
		if (locked) {
			return;
		}
		if (slug === now) {
			setIsPlaying((p) => !p);
			return;
		}
		setNow(slug);
		setIsPlaying(true);
	};
	const state: HomeState = {
		canPreview: hearing !== undefined,
		cont: loading ? undefined : cont,
		featured: loading ? undefined : FEATURED,
		forYou: loading ? undefined : named ? FOR_YOU : null,
		fresh: loading ? undefined : FRESH,
		hearing: heard,
		hour: loading ? undefined : HOUR[phase],
		locked,
		nowPlaying: now,
		phase,
		playing: isPlaying,
		short: loading ? undefined : SHORT,
		startPicked,
	};
	const actions: HomeActions = {
		door: () => undefined,
		hearEnd: (key) => setHeard((h) => (h === key ? null : h)),
		hearStart: setHeard,
		open: () => undefined,
		playHere: (t) => play(t.slug),
		removeContinue: (c) => setCont((all) => all.filter((x) => x.id !== c.id)),
		resume: () => undefined,
		stopUsingSessions: () => setNamed(false),
	};
	return (
		<HomeProvider value={{ actions, state }}>
			<Stack.SearchBar
				hideWhenScrolling={false}
				placeholder="Search audio, music and Lantern"
			/>
			<HomeScreen />
		</HomeProvider>
	);
}
