import { createContext, type ReactNode, use } from "react";
import type { PromiseScene } from "./promise/use-promise-scene";
import type { StoryScene } from "./story/story-view";
import { useFirstRun } from "./use-first-run";
import type { AuthProvider, SignInOutcome } from "./use-sign-in";

/**
 * Everything first run reads and does: the promise, the story and the seat. Two adapters fill
 * it: Clerk, PostHog and the store in the app (`FirstRunData`), fixtures in its dev states, where
 * a tap on a sign-in button never reaches Clerk.
 */
export type FirstRun = {
	state: {
		/** The promise, the story from its first beat, or the story opened on the seat. */
		start: "promise" | "story" | "seat";
		/** The theme's light: the promise has a day and a dusk; the story is always night. */
		day: boolean;
		reduced: boolean;
		/** A sign-in's session is still held for the seated moment: false once the hold lets go or
		 * Clerk signs out, which sends a seat that already succeeded back to its buttons. */
		sessionHeld: boolean;
		/** Dev states: an age or a step held still. */
		scene?: { promise?: PromiseScene; story?: StoryScene };
	};
	actions: {
		/** "I'd like that" or the account link: the promise is seen. */
		acceptPromise: () => void;
		/** A provider button: resolves once the native sheet is done with. */
		signIn: (provider: AuthProvider) => Promise<SignInOutcome>;
		/** The seated moment is over: the root gate may move on to intake. */
		seated: () => void;
	};
};

const FirstRunContext = createContext<FirstRun | null>(null);

export function FirstRunProvider({
	value,
	children,
}: {
	value: FirstRun;
	children: ReactNode;
}) {
	return <FirstRunContext value={value}>{children}</FirstRunContext>;
}

/** The app's adapter. */
export function FirstRunData({ children }: { children: ReactNode }) {
	return <FirstRunProvider value={useFirstRun()}>{children}</FirstRunProvider>;
}

export function useFirstRunContext(): FirstRun {
	const value = use(FirstRunContext);
	if (!value) {
		throw new Error("useFirstRunContext needs a FirstRunProvider above it");
	}
	return value;
}
