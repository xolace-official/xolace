/** The feedback sheet on fixtures: `xolace://dev/feedback/<id>`. The real sheet opens with
 * `xolace://feedback` (or a shake); these draw its frame in a pushed screen. */
import type { DevState } from "@/dev/dev-state";
import { feedbackSheet } from "./fixture-feedback";

const NOTE = "The audio cut out when I locked my phone mid-session.";

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{ id: "menu", title: "Menu", ...feedbackSheet({ step: "menu" }) },
	{
		id: "report",
		title: "Report a bug, written",
		...feedbackSheet({ step: "report", text: NOTE }),
	},
	{
		id: "limited",
		title: "Today's limit reached",
		...feedbackSheet({ limited: true, step: "report", text: NOTE }),
	},
	{
		id: "error",
		title: "Send failed",
		...feedbackSheet({
			error: "Feedback is too long.",
			step: "report",
			text: NOTE,
		}),
	},
	{
		id: "concern",
		title: "Report a concern (from a thread)",
		...feedbackSheet({
			canGoBack: false,
			kind: "concern",
			step: "report",
			subjectName: "Ama",
		}),
	},
	{
		id: "whats-new",
		title: "What's new",
		...feedbackSheet({ step: "whatsNew" }),
	},
];
