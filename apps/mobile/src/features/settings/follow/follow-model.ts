import {
	FOLLOW_COPY as C,
	FOLLOW_LINKS as L,
} from "@/features/settings/follow/copy";
import { storeOf } from "@/lib/store-review";

export const FEEDBACK_MAX = 1000;
export const SENT_CLOSE_MS = 1500;

export type SendPhase = "idle" | "busy" | "sent";

export type Feedback = {
	open: boolean;
	draft: string;
	phase: SendPhase;
	canSubmit: boolean | undefined;
	error: string | null;
};

export type FeedbackView = {
	ok: string;
	okDisabled: boolean;
	limited: boolean;
	editable: boolean;
	count: string;
};

const OK_LABEL: Record<SendPhase, string> = {
	busy: C.dialog.sending,
	idle: C.dialog.send,
	sent: C.dialog.sent,
};

export const isLimited = (f: Pick<Feedback, "canSubmit" | "phase">) =>
	f.canSubmit === false && f.phase === "idle";

export const canSendFeedback = (
	f: Pick<Feedback, "canSubmit" | "phase" | "draft">
) => f.phase === "idle" && !isLimited(f) && f.draft.trim() !== "";

export function feedbackView(f: Feedback): FeedbackView {
	const limited = isLimited(f);
	return {
		count: C.dialog.count(f.draft.length),
		editable: f.phase === "idle" && !limited,
		limited,
		ok: OK_LABEL[f.phase],
		okDisabled: f.phase === "idle" && !canSendFeedback(f),
	};
}

const CONVEX_ERROR = /Uncaught Error: (.+?)(?:\n|$)/;

export function sendErrorMessage(e: unknown): string {
	if (!(e instanceof Error)) {
		return C.somethingWrong;
	}
	return CONVEX_ERROR.exec(e.message)?.[1] ?? e.message;
}

export const feedbackMailto = () =>
	`mailto:${C.email}?subject=${encodeURIComponent(L.mailSubject)}&body=${encodeURIComponent(L.mailBody)}`;

export function reviewRow(os: string | undefined) {
	const sub = C.reviewSub[storeOf(os)];
	const spoken = `${sub.charAt(0).toLowerCase()}${sub.slice(1)}`;
	return { a11y: `${C.review}, ${spoken}`, sub };
}

export const outside = (label: string) => `${label}, opens outside Xolace`;
