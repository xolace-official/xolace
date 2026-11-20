import { createContext, type ReactNode, use } from "react";
import type { GreetMode, Items, Outcomes, Row } from "./coming-back-model";
import type { Away } from "./copy";
import { useWelcomeBack as useWelcomeBackData } from "./use-coming-back";

export type WelcomeBack = {
	state: {
		away: Away;
		mode: GreetMode;
		page: "list" | "prompt";
		enter: boolean;
		name: string | null;
		items: Items;
		outcomes: Outcomes;
		ciOpen: boolean;
		just: Row | null;
		tickKey: number;
		reduced: boolean;
	};
	actions: {
		openCheckIn: () => void;
		openPrompt: () => void;
		back: () => void;
		pass: () => void;
		write: () => void;
		article: () => void;
		closed: () => void;
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

export function WelcomeBackData({ children }: { children: ReactNode }) {
	return (
		<WelcomeBackProvider value={useWelcomeBackData()}>
			{children}
		</WelcomeBackProvider>
	);
}
