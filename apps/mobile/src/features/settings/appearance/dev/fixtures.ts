import type { Appearance } from "@/features/settings/appearance/appearance-data";
import {
	modeNote,
	motionNote,
	profileRows,
	stripStart,
	themeCards,
	themeNote,
} from "@/features/settings/appearance/appearance-model";

const ignore = () => undefined;

export const APPEARANCE_ACTIONS: Appearance["actions"] = {
	pickTheme: ignore,
	replayIntro: ignore,
	setMode: ignore,
	setMotion: ignore,
	setNightMode: ignore,
	setReplayOpen: ignore,
	showProfileCard: ignore,
};

const themeState = (id: string, isPlus: boolean) => ({
	themeNote: themeNote(id, isPlus),
	themeStart: stripStart(id),
	themes: themeCards(id, isPlus),
});

export const APPEARANCE_TOP: Appearance["state"] = {
	mode: "system",
	modeNote: modeNote("system", false),
	motion: "system",
	motionNote: motionNote("system", false),
	nightMode: true,
	previewScheme: "light",
	profileCards: profileRows([]),
	replayOpen: false,
	...themeState("default", true),
};

export const APPEARANCE_FREE: Appearance["state"] = {
	...APPEARANCE_TOP,
	...themeState("default", false),
	themeStart: stripStart("human"),
};

export const APPEARANCE_DARK_ROSE: Appearance["state"] = {
	...APPEARANCE_TOP,
	mode: "dark",
	modeNote: modeNote("dark", false),
	previewScheme: "dark",
	...themeState("rose", true),
};

export const APPEARANCE_REPLAY: Appearance["state"] = {
	...APPEARANCE_TOP,
	replayOpen: true,
};

export const APPEARANCE_CALMED: Appearance["state"] = {
	...APPEARANCE_TOP,
	motion: "reduced",
	motionNote: motionNote("reduced", true),
	nightMode: false,
	profileCards: profileRows(["rank"]),
};
