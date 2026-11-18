import type { Id } from "@xolace/backend/dataModel";
import { createContext, type ReactNode, use } from "react";
import type { Channel, LocalMessage } from "stream-chat";
import type { AgeGate } from "../age-gate/use-age-gate";
import type { StatusBar, ThreadBody, ThreadConversation } from "./thread-model";
import type { FeedbackContext } from "./use-flag-message";
import { useThread } from "./use-thread";

/** What a report is about: the person, and the conversation when it's from a thread. */
export type ReportSubject = {
	name: string;
	profileId: Id<"emotional_profiles">;
	conversationId?: Id<"xolacer_conversations">;
};

/** The concern tray, handed in by the route: the tray is its own feature. */
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
			/** Null until the channel has state; the skeleton holds till then. */
			channel: Channel | null;
			rate: "hidden" | "prompt" | "rated";
			blocking: { open: boolean; pending: boolean; history: boolean };
			/** An accept or decline is in flight. */
			answering: boolean;
	  };

/** Everything the thread reads and does. Convex and Stream fill it in the app (`ThreadData`),
 * fixtures in its dev states. */
export type ThreadScreenData = {
	state: ThreadState;
	ageGate: AgeGate;
	actions: {
		/** Stream couldn't connect: try the token again. */
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
		/** A crisis resource's call, email or link; says so if the phone can't. */
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
