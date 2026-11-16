import {
	PLAYER_OPTIONS,
	type RootScreen,
	riseOrFade,
	TOOLBAR_HEADER,
} from "@/lib/root-screen";

/** Dismissed like follow-up; reduced motion fades them in instead (#693, #701). */
const celebration: RootScreen["options"] = (context) => ({
	...PLAYER_OPTIONS,
	...TOOLBAR_HEADER,
	...riseOrFade(context),
});

export const achievementsScreens: readonly RootScreen[] = [
	{ name: "badge-unlock", options: celebration },
	// The backfill's one-time summary.
	{ name: "badge-backfill", options: celebration },
];
