import type { TalkLook } from "@xolace/backend/convex/lib/voices";
import type { BodyName } from "@/components/xolace-face/bodies";
import type { EyeStyle } from "@/components/xolace-face/face-geo";
import type { PaletteName } from "@/components/xolace-face/face-palette";
import { TALK_LOOKS } from "@/lib/talk/talk-looks";

/**
 * The companion's seven looks, in production's order (handoff §2.2). Two labels changed:
 * Xolace is now Flux and Ember is now Marigold, so it no longer shares a name with the
 * companion. Only the labels: the saved values stay `xolace` and `ember`.
 */
type Look = {
	label: string;
	body: BodyName;
	eyes: EyeStyle;
	palette: PaletteName;
	/**
	 * The soft glow behind the centred face: one of the face's own palette tokens
	 * (`--color-talk-glow-*`), or the theme's accent or ink for the two theme looks.
	 */
	glow: `talk-glow-${string}` | "accent" | "foreground";
};

export const LOOKS: Record<TalkLook, Look> = {
	chalk: {
		body: "square",
		eyes: "round",
		glow: "foreground",
		label: "Chalk",
		palette: "theme",
	},
	dusk: {
		body: "cloud",
		eyes: "sparkle",
		glow: "talk-glow-dusk",
		label: "Dusk",
		palette: "dusk",
	},
	ember: {
		body: "flame",
		eyes: "sparkle",
		glow: "talk-glow-marigold",
		label: "Marigold",
		palette: "ember",
	},
	moss: {
		body: "orb",
		eyes: "sleepy",
		glow: "talk-glow-moss",
		label: "Moss",
		palette: "moss",
	},
	// The orb follows the app's accent; the square is flat, in the theme's text colour.
	theme: {
		body: "orb",
		eyes: "round",
		glow: "accent",
		label: "Theme",
		palette: "theme",
	},
	tide: {
		body: "drop",
		eyes: "round",
		glow: "talk-glow-tide",
		label: "Tide",
		palette: "sea",
	},
	xolace: {
		body: "flame",
		eyes: "round",
		glow: "talk-glow-flux",
		label: "Flux",
		palette: "brand",
	},
};

/** The carousel's order. */
export const LOOK_ORDER = TALK_LOOKS;

export const lookIndex = (look: TalkLook): number =>
	Math.max(0, LOOK_ORDER.indexOf(look));

export const lookAt = (index: number): TalkLook =>
	LOOK_ORDER[index] ?? "xolace";

/** The face props for a look. */
export const faceProps = (look: TalkLook) => {
	const { body, eyes, palette } = LOOKS[look];
	return { body, eyes, palette };
};
