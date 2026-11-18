/** Settings › Appearance on fixtures: the board's account (Xolace+, System, Default). */
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

/** A theme's part of the state, for an account on or off Plus. */
const themeState = (id: string, isPlus: boolean) => ({
	themeNote: themeNote(id, isPlus),
	themeStart: stripStart(id),
	themes: themeCards(id, isPlus),
});

/** Render 07: Plus, System on a light phone, Default, Match my phone with Reduce Motion off. */
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

/** Render 09: a free account on Default, opened at the line so the locked Plus themes show. */
export const APPEARANCE_FREE: Appearance["state"] = {
	...APPEARANCE_TOP,
	...themeState("default", false),
	themeStart: stripStart("human"),
};

/** Render 10: Dark, Rosé picked (Plus). */
export const APPEARANCE_DARK_ROSE: Appearance["state"] = {
	...APPEARANCE_TOP,
	mode: "dark",
	modeNote: modeNote("dark", false),
	previewScheme: "dark",
	...themeState("rose", true),
};

/** Render 11: the Replay intro alert. */
export const APPEARANCE_REPLAY: Appearance["state"] = {
	...APPEARANCE_TOP,
	replayOpen: true,
};

/** Reduced motion chosen while the phone asks for it, one Profile card hidden. */
export const APPEARANCE_CALMED: Appearance["state"] = {
	...APPEARANCE_TOP,
	motion: "reduced",
	motionNote: motionNote("reduced", true),
	nightMode: false,
	profileCards: profileRows(["rank"]),
};
