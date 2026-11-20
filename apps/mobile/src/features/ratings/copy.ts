/**
 * What's New and "Help someone find Xolace" (P/design/boards/RatingsAlive.dc.html; when they show:
 * RatingsRules.dc.html), word for word from the prototype's `src/fixtures/ratings.ts`. The release
 * notes themselves are `@/lib/release-notes`.
 */

export const WHATS_NEW_COPY = {
	continue: "Continue",
	eyebrow: "New in Xolace",
	lede: "A few things we made since you were last here.",
	title: "What's new",
} as const;

export const RATE_COPY = {
	body: "A rating on the App Store helps the next person who's carrying something find a quiet place to put it down.",
	close: "Close",
	rate: "Rate Xolace",
	reviewsLabel: "What people have written",
	starsA11y: "Five stars in a laurel",
	store: "App Store",
	tellUs: "Tell us",
	tellUsLead: "Not quite right? ",
	thanks: "Thank you. A few words help even more, if you have a minute.",
	titleAfter: " Xolace",
	titleBefore: "Help someone ",
	titleItalic: "find",
	write: "Write a review",
	writeHint: "Opens the App Store",
} as const;

export const TELL_US_COPY = {
	body: "It goes straight to the people who make Xolace, without your name.",
	cancel: "Cancel",
	done: "Done",
	/** Not in the canvas: the note couldn't be sent (offline, or today's notes are used up). */
	failed: "That didn't send. Try again in a moment.",
	label: "Your note",
	limited: "You've sent a few notes today. Try again tomorrow.",
	placeholder: "Something that didn't work, or didn't feel right",
	send: "Send",
	thanksBody: "Someone on the team reads every note.",
	thanksTitle: "Thank you",
	title: "What could be better?",
} as const;

/** Real App Store reviews: short excerpts with the reviewer's App Store name. */
export const REVIEWS: readonly { body: string; by: string }[] = [
	{
		body: "I've always hated opening up to someone because I feel like I'd be laughed at or ignored. Just a few days on Xolace and I've realized that I don't really need a lot of words to express myself.",
		by: "RosieeeBD",
	},
	{
		body: "I downloaded Xolace on a rough day and stayed for the vibe. No pressure, no judgement, just good energy and actual helpful replies.",
		by: "Stylish",
	},
	{
		body: "Sometimes I'm blown away by how easy it is to gain clarity on how I'm feeling without needing to have a conversation.",
		by: "s-kvng",
	},
	{
		body: "I downloaded and signed into the app this morning. Am already feeling the effect of it. Ember AI is great.",
		by: "Cloud optimum",
	},
	{ body: "This app really understands me.", by: "@Quame" },
];
