import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { create } from "zustand";

/** The heavier follow-up the session end has open: its own form-sheet route reads it. */
export type FollowUpAsk = {
	/** The session the answer is for; null in a dev state (nothing is saved). */
	sessionId: Id<"sessions"> | null;
	bucket: "mid" | "high";
	/** Hears the row picked, or null for Not now and a swipe down. Called once. */
	onClosed: (answer: string | null) => void;
};

type Store = {
	ask: FollowUpAsk | null;
	open: (ask: FollowUpAsk) => void;
	/** Closes the ask and tells the session end; a second close does nothing. */
	close: (answer: string | null) => void;
};

/**
 * The one thing two routes share: the session end opens the follow-up sheet
 * with the question it needs, and the sheet hands the answer back. In memory.
 */
export const useFollowUpAsk = create<Store>()((set, get) => ({
	ask: null,
	close: (answer) => {
		const { ask } = get();
		if (!ask) {
			return;
		}
		set({ ask: null });
		ask.onClosed(answer);
	},
	open: (ask) => set({ ask }),
}));
