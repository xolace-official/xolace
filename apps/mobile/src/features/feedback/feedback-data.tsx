import { createContext, type ReactNode, use } from "react";
import type {
	FeedbackKind,
	FeedbackStart,
	FeedbackStep,
} from "./feedback-model";
import { useFeedback } from "./use-feedback";

export type FeedbackState = {
	step: FeedbackStep;
	canGoBack: boolean;
	kind: FeedbackKind;
	subjectName: string | null;
	text: string;
	saving: boolean;
	error: string | null;
	limited: boolean;
	whatsNewUnseen: boolean;
};

export type FeedbackActions = {
	openReport: (kind: "bug" | "idea") => void;
	openWhatsNew: () => void;
	back: () => void;
	setKind: (kind: "bug" | "idea") => void;
	setText: (text: string) => void;
	send: () => void;
};

export type FeedbackScreen = { state: FeedbackState; actions: FeedbackActions };

const FeedbackContext = createContext<FeedbackScreen | null>(null);

export function FeedbackProvider({
	value,
	children,
}: {
	value: FeedbackScreen;
	children: ReactNode;
}) {
	return <FeedbackContext value={value}>{children}</FeedbackContext>;
}

export function useFeedbackScreen(): FeedbackScreen {
	const screen = use(FeedbackContext);
	if (!screen) {
		throw new Error("useFeedbackScreen must be used inside FeedbackData");
	}
	return screen;
}

export function FeedbackData({
	start,
	from,
	children,
}: {
	start: FeedbackStart;
	from: string | undefined;
	children: ReactNode;
}) {
	return (
		<FeedbackProvider value={useFeedback(start, from)}>
			{children}
		</FeedbackProvider>
	);
}
