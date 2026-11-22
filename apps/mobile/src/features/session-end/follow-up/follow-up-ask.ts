import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { create } from "zustand";

export type FollowUpAsk = {
	sessionId: Id<"sessions"> | null;
	bucket: "mid" | "high";
	onClosed: (answer: string | null) => void;
};

type Store = {
	ask: FollowUpAsk | null;
	open: (ask: FollowUpAsk) => void;
	close: (answer: string | null) => void;
};

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
