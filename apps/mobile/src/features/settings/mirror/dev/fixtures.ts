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

export const MIRROR_GENTLE: MirrorSettings["state"] = {
	companion: "Ember",
	playing: null,
	plus: "plus",
	saved: { tone: "gentle", voice: "auto" },
	talk: { directness: "balanced", pace: "normal", voice: "vesper" },
	tone: "gentle",
	voice: "auto",
};

export const MIRROR_POETIC: MirrorSettings["state"] = {
	...MIRROR_GENTLE,
	saved: { tone: "poetic", voice: "auto" },
	tone: "poetic",
};

export const MIRROR_WREN_PLAYING: MirrorSettings["state"] = {
	...MIRROR_POETIC,
	playing: "wren",
	saved: { tone: "poetic", voice: "wren" },
	voice: "wren",
};

export const MIRROR_FREE: MirrorSettings["state"] = {
	...MIRROR_GENTLE,
	plus: "free",
	saved: { tone: "poetic", voice: "auto" },
	talk: null,
	tone: "poetic",
};

export const MIRROR_FREE_SAGE: MirrorSettings["state"] = {
	...MIRROR_FREE,
	playing: "sage",
};
