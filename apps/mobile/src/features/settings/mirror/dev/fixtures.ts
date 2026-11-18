/** Mirror on fixtures: the board's account (Xolace+, Gentle, Auto, Ember) and its states. */
import type { MirrorSettings } from "@/features/settings/mirror/mirror-data";

const ignore = () => undefined;

export const MIRROR_ACTIONS: MirrorSettings["actions"] = {
	openPlus: ignore,
	play: ignore,
	reachForTone: ignore,
	setDirectness: ignore,
	setPace: ignore,
	setTalkVoice: ignore,
	setTone: ignore,
	setVoice: ignore,
	stop: ignore,
};

/** Render 12: Gentle, Auto, on Xolace+. */
export const MIRROR_GENTLE: MirrorSettings["state"] = {
	companion: "Ember",
	playing: null,
	plus: "plus",
	talk: { directness: "balanced", pace: "normal", voice: "vesper" },
	tone: "gentle",
	voice: "auto",
};

/** Render 13: Poetic. */
export const MIRROR_POETIC: MirrorSettings["state"] = {
	...MIRROR_GENTLE,
	tone: "poetic",
};

/** Render 14: Poetic, Wren chosen and playing (the ring held, no sound). */
export const MIRROR_WREN_PLAYING: MirrorSettings["state"] = {
	...MIRROR_POETIC,
	playing: "wren",
	voice: "wren",
};

/** Render 15 and the locked voice: a free account (Poetic, Auto, no Talk). */
export const MIRROR_FREE: MirrorSettings["state"] = {
	...MIRROR_GENTLE,
	plus: "free",
	talk: null,
	tone: "poetic",
};

/** A free account just tapped Sage: it plays, and the line offers Xolace+. */
export const MIRROR_FREE_SAGE: MirrorSettings["state"] = {
	...MIRROR_FREE,
	playing: "sage",
};
