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

export const FEEDBACK_NOTE =
	"The breathing one helped last night. Could it keep going a bit longer before it stops?";

export const FOLLOW_TOP: State = {
	feedback: {
		canSubmit: true,
		draft: "",
		error: null,
		open: false,
		phase: "idle",
	},
};

export const FOLLOW_TYPING: State = {
	feedback: { ...FOLLOW_TOP.feedback, draft: FEEDBACK_NOTE, open: true },
};

export const FOLLOW_LIMITED: State = {
	feedback: { ...FOLLOW_TOP.feedback, canSubmit: false, open: true },
};

export const FOLLOW_SENT: State = {
	feedback: {
		...FOLLOW_TYPING.feedback,
		canSubmit: false,
		phase: "sent",
	},
};
