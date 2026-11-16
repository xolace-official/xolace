import type { SessionEnd } from "../session-end-data";

/** The board's defaults: from You're not alone, Xolace+, kindling landed, words to share. */
export const STATE: SessionEnd["state"] = {
	canAskFollowUp: true,
	day: { from: 12, to: 13 },
	from: "peers",
	late: false,
	listener: null,
	ready: true,
	slot: {
		kindlingReady: true,
		listen: false,
		listener: "none",
		pitchAllowed: true,
		plus: true,
		qualifies: true,
	},
	words: "I hold everything together, and nobody sees how tired that makes me.",
};

/** Free: the session qualifies for kindling, so the slot holds the one Xolace+ pitch. */
export const FREE: SessionEnd["state"] = {
	...STATE,
	slot: { ...STATE.slot, kindlingReady: false, plus: false },
};

/** A listener matched (the prototype's fixture listener). */
export const LISTENER: SessionEnd["state"] = {
	...STATE,
	listener: { listensTo: "anxiety", name: "Maya" },
	slot: { ...STATE.slot, listener: "found" },
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
