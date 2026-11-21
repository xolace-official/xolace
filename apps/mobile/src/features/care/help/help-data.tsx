import { createContext, type ReactNode, use } from "react";
import type {
	HelpChoice,
	HelpView,
	LineView,
} from "@/features/care/help/help-model";
import { useHelp } from "@/features/care/help/use-help";

export type HelpScreenData = {
	state: {
		choice: HelpChoice;
		view: HelpView;
		lastUpdated: string;
	};
	actions: {
		choose: (choice: HelpChoice) => void;
		callEmergency: () => void;
		openLine: (line: LineView) => void;
		reportError: () => void;
	};
};

const Context = createContext<HelpScreenData | null>(null);

export function HelpProvider({
	value,
	children,
}: {
	value: HelpScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function HelpData({ children }: { children: ReactNode }) {
	return <HelpProvider value={useHelp()}>{children}</HelpProvider>;
}

export function useHelpScreen(): HelpScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useHelpScreen outside HelpData");
	}
	return value;
}
