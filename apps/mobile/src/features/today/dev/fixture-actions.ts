import { router } from "expo-router";
import type { Today } from "../today-data";

/** Sit opens its own `today` dev state: Three breaths on fixtures, so no read reaches the
 * backend. */
const DOOR_HREF = {
	sit: "/dev/sit-with-this/today",
	talk: "/talk",
	vent: "/voice-vent",
} as const;

/**
 * Today's actions in a dev state. Talk, Vent, Get help, the kindling and You open their real
 * screens. The card zooms into a Reflect dev state (`reflectState`, in `fixtures.ts`); Sit opens its
 * `today` dev state (the `from=today` flow, no session). The catalogue, Moments and Quotes
 * do nothing here: those reads would reach the backend.
 */
export const FIXTURE_ACTIONS: Today["actions"] = {
	openDoor: (door) => router.push(DOOR_HREF[door]),
	openExplore: () => undefined,
	openHelp: () => router.push("/crisis-resources"),
	openKindling: () => router.push("/kindling"),
	openMoment: () => undefined,
	openMoments: () => undefined,
	openQuotes: () => undefined,
	openStreak: () => router.navigate("/you"),
	openTrack: () => undefined,
	pressReflect: () => undefined,
	rekindle: () => undefined,
};
