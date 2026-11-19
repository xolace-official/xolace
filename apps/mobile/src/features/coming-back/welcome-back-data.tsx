import { createContext, type ReactNode, use } from "react";
import type { GreetMode, Items, Outcomes, Row } from "./coming-back-model";
import type { Away } from "./copy";
import { useWelcomeBack as useWelcomeBackData } from "./use-coming-back";

/**
 * Everything the greeting reads and does. `WelcomeBackData` fills it from the episode and
 * Convex; a dev state fills it from fixtures (`dev/`), so a tap there never reaches the backend.
 */
export type WelcomeBack = {
	state: {
		away: Away;
		mode: GreetMode;
		page: "list" | "prompt";
		/** The face rises and the settle tap plays (off for a dev state that holds a moment). */
		enter: boolean;
		name: string | null;
		/** What this opening lists, pinned when it opened. */
		items: Items;
		outcomes: Outcomes;
		ciOpen: boolean;
		/** The row that just ticked, and the tick's count (the row and the face replay on it). */
		just: Row | null;
		tickKey: number;
		reduced: boolean;
	};
	actions: {
		/** The check-in row: opens the check-in over the card, 130 ms after the press. */
		openCheckIn: () => void;
		/** The prompt row: the prompt page slides in, 130 ms after the press. */
		openPrompt: () => void;
		/** The prompt page's Back: read, carried on the reflect card for the week. */
		back: () => void;
		/** Let it pass: never carried, never back. */
		pass: () => void;
		/** Write about it: carried (the page then closes the sheet). */
		write: () => void;
		/** The prompt page's arrow: the event's article, in the in-app browser. */
		article: () => void;
		/** The sheet has closed, any way. */
		closed: () => void;
		/** Back in front after Vent or crisis help: a deferred tick lands. */
		landDeferred: () => void;
	};
};

const WelcomeBackContext = createContext<WelcomeBack | null>(null);

export function WelcomeBackProvider({
	value,
	children,
}: {
	value: WelcomeBack;
	children: ReactNode;
}) {
	return <WelcomeBackContext value={value}>{children}</WelcomeBackContext>;
}

export function useWelcomeBack(): WelcomeBack {
	const value = use(WelcomeBackContext);
	if (!value) {
		throw new Error("useWelcomeBack outside WelcomeBackData");
	}
	return value;
}

/** The app's adapter: the greeting on the episode store and Convex. */
export function WelcomeBackData({ children }: { children: ReactNode }) {
	return (
		<WelcomeBackProvider value={useWelcomeBackData()}>
			{children}
		</WelcomeBackProvider>
	);
}
