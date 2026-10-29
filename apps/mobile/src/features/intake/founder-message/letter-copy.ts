// The founder's own words (#264). Edit only with him. One message for everyone (#236);
// returning users (sessionCount > 0) get the same message plus a highlighted callout.

export type Segment = { text: string; highlight?: true };
export type AudienceKey = "new" | "existing";

/** The heart of the message, identical for everyone. */
export const FOUNDER_MESSAGE = {
	closing: "with care,",
	/** One CTA for everyone; the callout is the only sanctioned audience split. */
	cta: "I’m ready",
	greeting: "hey friend, I’m Nathaniel; Xolace’s CEO.",
	paragraphs: [
		[
			{
				text: "This is my personal letter to you. I spent years carrying something in silence, and then watched people I care about do the same, close enough to see it and not close enough to help. Xolace started with them. It didn’t take long to see how many others are in that same quiet place: not bad enough for therapy, not leaving you alone either.",
			},
		],
		[
			{
				text: "You don’t have to bring the right words to it. Put down whatever’s actually there, in fragments if that’s what it is. ",
			},
			{ highlight: true, text: "The more honest, the clearer it gets." },
		],
		[
			{
				text: "It’s still not perfect. It’s a journey to find what actually helps, for me and for everyone who trusts us enough to be here. We know how much it takes to trust something new with the feelings you’ve spent years burying or brushing past. We don’t take that lightly. ",
			},
			{ highlight: true, text: "Earning that trust is the whole job." },
		],
		[
			{
				text: "And long term, we’re not building AI to replace the people in your life. We’re building it to help you get clear enough to actually reach them.",
			},
		],
		[
			{
				text: "We’d love to walk this journey with you. You can reach me anytime at ",
			},
			{ highlight: true, text: "nathan@xolaceinc.com or +233-55-821-8741" },
			{ text: " via email or WhatsApp/SMS." },
		],
	] as Segment[][],
	signature: "Nathaniel & the Xolace team ♡",
	/** The line that hands off to the questionnaire. */
	transition:
		"In a minute we’ll ask you a few short questions, so Xolace can meet you where you actually are.",
};

/** Returning-user callout between the message and the hand-off line, only when sessionCount > 0. */
export const RETURNING_CALLOUT_LABEL = "since you’ve been here";

export const RETURNING_CALLOUT: Segment[] = [
	{
		text: "You’ve been here a while, and that already means a lot, nothing you’ve done needs redoing. ",
	},
	{
		highlight: true,
		text: "What’s changed is us: our sense of how far Xolace can go to help has grown, and these questions let it catch up to you.",
	},
];
