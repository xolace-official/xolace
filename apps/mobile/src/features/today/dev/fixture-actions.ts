import { router } from "expo-router";
import type { Today } from "../today-data";

const DOOR_HREF = {
	sit: "/dev/sit-with-this/today",
	talk: "/talk",
	vent: "/voice-vent",
} as const;

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
	seeKindlingPlus: () => undefined,
	talkForKindling: () => router.push(DOOR_HREF.talk),
};
