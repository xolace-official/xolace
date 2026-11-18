/** Settings › Follow & Support: what the feedback dialog shows and allows, and where each row
 * leads. Pure. */
import {
	FOLLOW_COPY as C,
	FOLLOW_LINKS as L,
} from "@/features/settings/follow/copy";

/** Production's limit, and the backend's (`feedback.submit` refuses more for "general"). */
export const FEEDBACK_MAX = 1000;
/** After "Sent." the dialog closes on its own (production). */
export const SENT_CLOSE_MS = 1500;

/** Where a send is: not started, waiting on the backend, done (the dialog closes soon). */
export type SendPhase = "idle" | "busy" | "sent";

export type Feedback = {
	open: boolean;
	draft: string;
	phase: SendPhase;
	/** `feedback.canSubmitGeneral`: false once today's note is sent; undefined while it loads. */
	canSubmit: boolean | undefined;
	/** Why the last send failed (the backend's own words), or null. */
	error: string | null;
};

export type FeedbackView = {
	ok: string;
	okDisabled: boolean;
	/** "You've sent feedback today…" shows, and the field is locked. */
	limited: boolean;
	editable: boolean;
	count: string;
};

const OK_LABEL: Record<SendPhase, string> = {
	busy: C.dialog.sending,
	idle: C.dialog.send,
	sent: C.dialog.sent,
};

/**
 * Production treats a loading limit as not limited (the backend still refuses a second note).
 * Once a send starts, the limit's own flip to false doesn't count: it's this note's.
 */
export const isLimited = (f: Pick<Feedback, "canSubmit" | "phase">) =>
	f.canSubmit === false && f.phase === "idle";

/** Send needs words, no note today, and nothing already on its way. */
export const canSendFeedback = (
	f: Pick<Feedback, "canSubmit" | "phase" | "draft">
) => f.phase === "idle" && !isLimited(f) && f.draft.trim() !== "";

/** The board keeps the button solid through Sending… and Sent. (it just stops answering). */
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

/** Production's: the backend's message without Convex's wrapping. */
export function sendErrorMessage(e: unknown): string {
	if (!(e instanceof Error)) {
		return C.somethingWrong;
	}
	return CONVEX_ERROR.exec(e.message)?.[1] ?? e.message;
}

/** Production's "Email us": its subject and starter body. */
export const feedbackMailto = () =>
	`mailto:${C.email}?subject=${encodeURIComponent(L.mailSubject)}&body=${encodeURIComponent(L.mailBody)}`;

type Store = "ios" | "android";

/** Production's choice: the App Store on iOS, Google Play everywhere else. */
const storeOf = (os: string | undefined): Store =>
	os === "ios" ? "ios" : "android";

export const reviewUrl = (os: string | undefined) =>
	storeOf(os) === "ios" ? L.reviewIos : L.reviewAndroid;

/** The review row's subtitle, and what VoiceOver reads (the 🎁 stays silent). */
export function reviewRow(os: string | undefined) {
	const sub = C.reviewSub[storeOf(os)];
	const spoken = `${sub.charAt(0).toLowerCase()}${sub.slice(1)}`;
	return { a11y: `${C.review}, ${spoken}`, sub };
}

/** Rows that leave the app say so to VoiceOver. */
export const outside = (label: string) => `${label}, opens outside Xolace`;
