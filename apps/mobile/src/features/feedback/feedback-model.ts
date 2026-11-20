import type { Id } from "@xolace/backend/dataModel";
import { ERROR_CODES, FEEDBACK_MAX_CHARS } from "@xolace/backend/shared";
import { convexErrorCode } from "@/lib/convex-error-code";
import { FEEDBACK_COPY } from "./copy";

export type FeedbackKind = "bug" | "idea" | "concern";
export type FeedbackStep = "menu" | "report";

export type ConcernSubject = {
	name: string;
	profileId: Id<"emotional_profiles">;
	conversationId?: Id<"xolacer_conversations">;
};

export type FeedbackStart =
	| { step: "menu" }
	| { step: "report"; kind: FeedbackKind; subject?: ConcernSubject };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
	typeof v === "string" && v.length > 0 ? v : undefined;

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

const UNCAUGHT_BEFORE_CODES = /Uncaught Error: (.+?)(?:\n|$)/;

export function errorMessageOf(e: unknown, kind: FeedbackKind): string {
	if (convexErrorCode(e) === ERROR_CODES.rateLimited) {
		return FEEDBACK_COPY.report[kind].rateLimited;
	}
	const before =
		e instanceof Error ? UNCAUGHT_BEFORE_CODES.exec(e.message)?.[1] : undefined;
	return before ?? FEEDBACK_COPY.report.somethingWrong;
}

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
		count: `${text.length} / ${FEEDBACK_MAX_CHARS}`,
		send: saving ? FEEDBACK_COPY.report.sending : FEEDBACK_COPY.report.send,
		sendDisabled: saving || !text.trim() || limited,
	};
}
