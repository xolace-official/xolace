// The companion's looks (Talk's voice-and-look sheet). A preference keeps only the name;
// the drawing behind it stays ours to change.

import type { TalkLook } from "@xolace/backend/convex/lib/voices";
import type { BodyName } from "@/features/xolace-face/bodies";
import type { EyeStyle } from "@/features/xolace-face/face-geo";
import type { PaletteName } from "@/features/xolace-face/face-palette";

type Look = { body: BodyName; eyes: EyeStyle; palette: PaletteName };

export const DEFAULT_LOOK: TalkLook = "xolace";

export const LOOKS: Record<TalkLook, { label: string; look: Look }> = {
	// The square is flat, in the theme's text colour (white in dark mode, ink in light), so
	// it ignores the palette.
	chalk: {
		label: "Chalk",
		look: { body: "square", eyes: "round", palette: "theme" },
	},
	dusk: {
		label: "Dusk",
		look: { body: "cloud", eyes: "sparkle", palette: "dusk" },
	},
	ember: {
		label: "Ember",
		look: { body: "flame", eyes: "sparkle", palette: "ember" },
	},
	moss: {
		label: "Moss",
		look: { body: "orb", eyes: "sleepy", palette: "moss" },
	},
	theme: {
		label: "Theme",
		look: { body: "orb", eyes: "round", palette: "theme" },
	},
	tide: {
		label: "Tide",
		look: { body: "drop", eyes: "round", palette: "sea" },
	},
	xolace: {
		label: "Xolace",
		look: { body: "flame", eyes: "round", palette: "brand" },
	},
};

/** A saved look this build doesn't know (one added after it shipped) shows as the default. */
export function lookOf(name: string | undefined): TalkLook {
	return name !== undefined && isLook(name) ? name : DEFAULT_LOOK;
}

function isLook(name: string): name is TalkLook {
	return Object.hasOwn(LOOKS, name);
}

/** The order the sheet shows them in. */
export const LOOK_ORDER: TalkLook[] = [
	"xolace",
	"tide",
	"moss",
	"dusk",
	"ember",
	"theme",
	"chalk",
];
