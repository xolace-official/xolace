import type { Id } from "@xolace/backend/dataModel";
import { FEEDBACK_COPY } from "./copy";

/** A bug or an idea from the shake menu; a concern about a person from a thread or a profile. */
export type FeedbackKind = "bug" | "idea" | "concern";
export type FeedbackStep = "menu" | "report";

/** What a concern is about: the person, and the conversation when it's from a thread. The name is
 * the form's words only; the ids are what gets sent. */
export type ConcernSubject = {
	name: string;
	profileId: Id<"emotional_profiles">;
	conversationId?: Id<"xolacer_conversations">;
};

/** Where the sheet opens: the menu, or straight on a form (a concern has no menu). */
export type FeedbackStart =
	| { step: "menu" }
	| { step: "report"; kind: FeedbackKind; subject?: ConcernSubject };

export const FEEDBACK_MAX = 1000;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
	typeof v === "string" && v.length > 0 ? v : undefined;

/** The `/feedback` route's params, as `feedbackParams` wrote them. */
export function feedbackStartOf(params: Params): FeedbackStart {
	const kind = one(params.kind);
	if (kind === "concern") {
		const profileId = one(params.profileId);
		const name = one(params.name);
		const conversationId = one(params.conversationId);
		return {
			kind,
			step: "report",
			subject:
				profileId && name
					? {
							conversationId: conversationId as
								| Id<"xolacer_conversations">
								| undefined,
							name,
							profileId: profileId as Id<"emotional_profiles">,
						}
					: undefined,
		};
	}
	if (kind === "bug" || kind === "idea") {
		return { kind, step: "report" };
	}
	return { step: "menu" };
}

/** `/feedback`'s params for a concern: `from` is the screen it was raised on, for triage. */
export function concernParams(subject: ConcernSubject, from: string) {
	return {
		from,
		kind: "concern",
		name: subject.name,
		profileId: subject.profileId,
		...(subject.conversationId
			? { conversationId: subject.conversationId }
			: {}),
	};
}

/** The server's words from a failed send, without Convex's wrapping. */
export function errorMessageOf(e: unknown): string {
	if (!(e instanceof Error)) {
		return FEEDBACK_COPY.report.somethingWrong;
	}
	const match = e.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
	return match ? match[1] : e.message;
}

/** The form's derived lines: what Send says, whether it can be pressed, the count. */
export function reportView({
	text,
	saving,
	limited,
}: {
	text: string;
	saving: boolean;
	limited: boolean;
}) {
	return {
		count: `${text.length} / ${FEEDBACK_MAX}`,
		send: saving ? FEEDBACK_COPY.report.sending : FEEDBACK_COPY.report.send,
		sendDisabled: saving || !text.trim() || limited,
	};
}
