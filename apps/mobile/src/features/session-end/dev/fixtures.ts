import type { NextParts, SessionEnd } from "../session-end-data";

const PARTS: NextParts = {
	listenerAvatar: () => null,
	partIcon: () => "circle",
	partName: (domain) => domain,
};

export const STATE: SessionEnd["state"] = {
	canAskFollowUp: true,
	cards: { listener: null, unlock: null, upsell: null },
	day: { from: 12, to: 13 },
	from: "peers",
	late: false,
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

export const FREE: SessionEnd["state"] = {
	...STATE,
	slot: { ...STATE.slot, kindlingReady: false, plus: false },
};

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

export const UNLOCK: SessionEnd["state"] = {
	...STATE,
	cards: { ...STATE.cards, unlock: ["family"] },
	slot: { ...STATE.slot, unlock: true },
};

export const UPSELL: SessionEnd["state"] = {
	...FREE,
	cards: { ...STATE.cards, upsell: "work" },
	slot: { ...FREE.slot, upsell: true },
};

export const LOADING: SessionEnd["state"] = {
	...STATE,
	slot: { ...STATE.slot, listener: "pending" },
};

export const LISTEN: SessionEnd["state"] = {
	...STATE,
	slot: { ...STATE.slot, listen: true, qualifies: false },
};

export const NOTHING: SessionEnd["state"] = {
	...STATE,
	from: null,
	words: null,
};

export const LATE: SessionEnd["state"] = { ...STATE, late: true };

export const LETTER_WAITING: SessionEnd["state"] = {
	...FREE,
	slot: { ...FREE.slot, letters: { waiting: true, write: true } },
};

export const LETTER_WRITE: SessionEnd["state"] = {
	...FREE,
	slot: { ...FREE.slot, letters: { waiting: false, write: true } },
};
