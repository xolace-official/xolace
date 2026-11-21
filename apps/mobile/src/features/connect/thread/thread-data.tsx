import type { Id } from "@xolace/backend/dataModel";
import { createContext, type ReactNode, use } from "react";
import type { Channel, LocalMessage } from "stream-chat";
import type { StatusBar, ThreadBody, ThreadConversation } from "./thread-model";
import type { FeedbackContext } from "./use-flag-message";
import { useThread } from "./use-thread";

export type ReportSubject = {
	name: string;
	profileId: Id<"emotional_profiles">;
	conversationId?: Id<"xolacer_conversations">;
};

export type ReportTo = (subject: ReportSubject) => void;

export type ThreadState =
	| { phase: "loading" }
	/** Closed, or not yours to open. */
	| { phase: "gone" }
	| {
			phase: "ready";
			conversation: ThreadConversation;
			body: ThreadBody;
			bar: StatusBar;
			channel: Channel | null;
			rate: "hidden" | "prompt" | "rated";
			blocking: { open: boolean; pending: boolean; history: boolean };
			answering: boolean;
	  };

export type ThreadScreenData = {
	state: ThreadState;
	actions: {
		retry: () => void;
		openProfile: () => void;
		openHelp: () => void;
		rate: () => void;
		report: () => void;
		askBlock: () => void;
		confirmBlock: () => void;
		cancelBlock: () => void;
		accept: () => void;
		decline: () => void;
		resume: () => void;
		findAnother: () => void;
		flag: (message: LocalMessage) => void;
		openResource: (url: string, failure: string) => void;
	};
};

const Context = createContext<ThreadScreenData | null>(null);

export function ThreadProvider({
	value,
	children,
}: {
	value: ThreadScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function ThreadData({
	conversationId,
	reportTo,
	feedbackContext,
	children,
}: {
	conversationId: string;
	reportTo: ReportTo;
	feedbackContext: FeedbackContext;
	children: ReactNode;
}) {
	return (
		<ThreadProvider
			value={useThread(conversationId, reportTo, feedbackContext)}
		>
			{children}
		</ThreadProvider>
	);
}

export function useThreadScreen(): ThreadScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useThreadScreen outside ThreadData");
	}
	return value;
}
