import type { NextParts, SessionEnd } from "../session-end-data";

/** The route composes Connect's and Steadiness's pieces in; the fixture screen draws the real
 * ones (`@/dev/session-end-slots`), so these only stand in for tests. */
const PARTS: NextParts = {
	listenerAvatar: () => null,
	partIcon: () => "circle",
	partName: (domain) => domain,
};

/** The board's defaults: from You're not alone, Xolace+, kindling landed, words to share. */
export const STATE: SessionEnd["state"] = {
	canAskFollowUp: true,
	cards: { listener: null, unlock: null, upsell: null },
	day: { from: 12, to: 13 },
	from: "peers",
	late: false,
	/** Letters' tile is composed in by the route; the letter states draw the real one. */
	letterTile: null,
	parts: PARTS,
	ready: true,
	slot: {
		kindlingReady: true,
		letters: { waiting: false, write: false },
		listen: false,
		listener: "none",
		pitchAllowed: true,
		plus: true,
		qualifies: true,
		unlock: false,
		upsell: false,
		waitedOut: false,
	},
	words: "I hold everything together, and nobody sees how tired that makes me.",
};

/** Free: the session qualifies for kindling, so the slot holds the one Xolace+ pitch. */
export const FREE: SessionEnd["state"] = {
	...STATE,
	slot: { ...STATE.slot, kindlingReady: false, plus: false },
};

/** A listener matched (the prototype's fixture listener): new, so no rating yet. */
export const LISTENER: SessionEnd["state"] = {
	...STATE,
	cards: {
		...STATE.cards,
		listener: {
			id: "maya",
			listensTo: "anxiety",
			name: "Maya",
			present: false,
		},
	},
	slot: { ...STATE.slot, listener: "found" },
};

/** C2: the Xolacer suggestion, rated and here now. */
export const XOLACER: SessionEnd["state"] = {
	...LISTENER,
	cards: {
		...STATE.cards,
		listener: {
			id: "maya",
			listensTo: "anxiety",
			name: "Maya",
			present: true,
			rating: 4.9,
		},
	},
};

/** C2: a part of life came into focus this session (every plan); it outranks kindling. */
export const UNLOCK: SessionEnd["state"] = {
	...STATE,
	cards: { ...STATE.cards, unlock: ["family"] },
	slot: { ...STATE.slot, unlock: true },
};

/** C2, free: the insights upsell takes the kindling pitch's place. */
export const UPSELL: SessionEnd["state"] = {
	...FREE,
	cards: { ...STATE.cards, upsell: "work" },
	slot: { ...FREE.slot, upsell: true },
};

/** The listener match still pending: the slot holds a shimmer. */
export const LOADING: SessionEnd["state"] = {
	...STATE,
	slot: { ...STATE.slot, listener: "pending" },
};

/** Xolace+, a session that isn't kindling's, and a track to suggest (none live yet: open question 8). */
export const LISTEN: SessionEnd["state"] = {
	...STATE,
	slot: { ...STATE.slot, listen: true, qualifies: false },
};

/** The mirror's exit, or a session with nothing distilled: "Go gently." */
export const NOTHING: SessionEnd["state"] = {
	...STATE,
	from: null,
	words: null,
};

export const LATE: SessionEnd["state"] = { ...STATE, late: true };

/** Render 30 (Letters): free, a letter waiting to be opened; it outranks the pitch. */
export const LETTER_WAITING: SessionEnd["state"] = {
	...FREE,
	slot: { ...FREE.slot, letters: { waiting: true, write: true } },
};

/** Render 29 (Letters): free, nothing waiting, the sender can write; it outranks the pitch. */
export const LETTER_WRITE: SessionEnd["state"] = {
	...FREE,
	slot: { ...FREE.slot, letters: { waiting: false, write: true } },
};
