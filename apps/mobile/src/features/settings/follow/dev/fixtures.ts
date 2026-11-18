/** Settings › Follow & Support on fixtures: the board's states (renders 34–38, plus Sent.). */
import type { Follow } from "@/features/settings/follow/follow-data";

const ignore = () => undefined;

export const FOLLOW_ACTIONS: Follow["actions"] = {
	closeFeedback: ignore,
	emailUs: ignore,
	getHelp: ignore,
	openFeedback: ignore,
	openSocial: ignore,
	review: ignore,
	sendFeedback: ignore,
	setDraft: ignore,
};

type State = Follow["state"];

/** The board's note (render 36). */
export const FEEDBACK_NOTE =
	"The breathing one helped last night. Could it keep going a bit longer before it stops?";

/** Renders 34, 35 and 38: the page, dialog closed. */
export const FOLLOW_TOP: State = {
	feedback: {
		canSubmit: true,
		draft: "",
		error: null,
		open: false,
		phase: "idle",
	},
};

/** Render 36: the dialog with a note, ready to send. */
export const FOLLOW_TYPING: State = {
	feedback: { ...FOLLOW_TOP.feedback, draft: FEEDBACK_NOTE, open: true },
};

/** Render 37: already sent today, so the field and Send are locked. */
export const FOLLOW_LIMITED: State = {
	feedback: { ...FOLLOW_TOP.feedback, canSubmit: false, open: true },
};

/** Sent.: the note went; the limit has flipped, the dialog closes in 1.5 s. */
export const FOLLOW_SENT: State = {
	feedback: {
		...FOLLOW_TYPING.feedback,
		canSubmit: false,
		phase: "sent",
	},
};
