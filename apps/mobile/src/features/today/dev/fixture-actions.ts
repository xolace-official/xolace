import { router } from "expo-router";
import type { Today } from "../today-data";

const DOOR_HREF = { talk: "/talk", vent: "/voice-vent" } as const;

/**
 * Today's actions in a dev state. Talk, Vent, Get help, the kindling and You open their
 * real screens; a cold Sit isn't offered yet (hero-model's DOORS). The catalogue, Moments
 * and Quotes do nothing here: those reads would reach the backend.
 */
export const FIXTURE_ACTIONS: Today["actions"] = {
	openDoor: (door) =>
		door === "sit" ? undefined : router.push(DOOR_HREF[door]),
	openExplore: () => undefined,
	openHelp: () => router.push("/crisis-resources"),
	openKindling: () => router.push("/kindling"),
	openMoment: () => undefined,
	openMoments: () => undefined,
	openQuotes: () => undefined,
	openReflect: () => router.back(),
	openStreak: () => router.navigate("/you"),
	openTrack: () => undefined,
};
