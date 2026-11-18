import { createContext, type ReactNode, use } from "react";
import type { SocialId } from "@/features/settings/follow/copy";
import type { Feedback } from "@/features/settings/follow/follow-model";
import { useFollow } from "@/features/settings/follow/use-follow";

/**
 * Everything Settings › Follow & Support reads and does. Two adapters fill it: Convex, PostHog
 * and the phone's links in the app (`FollowData`), fixtures in its dev states (`dev/`).
 */
export type Follow = {
	state: {
		feedback: Feedback;
	};
	actions: {
		openFeedback: () => void;
		/** Ignored while a note is on its way (production's Cancel waits too). */
		closeFeedback: () => void;
		setDraft: (text: string) => void;
		sendFeedback: () => void;
		emailUs: () => void;
		getHelp: () => void;
		review: () => void;
		openSocial: (id: SocialId) => void;
	};
};

const FollowContext = createContext<Follow | null>(null);

export function FollowProvider({
	value,
	children,
}: {
	value: Follow;
	children: ReactNode;
}) {
	return <FollowContext value={value}>{children}</FollowContext>;
}

/** The app's adapter. */
export function FollowData({ children }: { children: ReactNode }) {
	return <FollowProvider value={useFollow()}>{children}</FollowProvider>;
}

export function useFollowScreen(): Follow {
	const value = use(FollowContext);
	if (!value) {
		throw new Error("useFollowScreen needs a FollowProvider above it");
	}
	return value;
}
