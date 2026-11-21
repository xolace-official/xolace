import { createContext, type ReactNode, use } from "react";
import type { PromiseScene } from "./promise/use-promise-scene";
import type { StoryScene } from "./story/story-view";
import { useFirstRun } from "./use-first-run";
import type { AuthProvider, SignInOutcome } from "./use-sign-in";

export type FirstRun = {
	state: {
		start: "promise" | "story" | "seat";
		day: boolean;
		reduced: boolean;
		sessionHeld: boolean;
		scene?: { promise?: PromiseScene; story?: StoryScene };
	};
	actions: {
		acceptPromise: () => void;
		signIn: (provider: AuthProvider) => Promise<SignInOutcome>;
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
