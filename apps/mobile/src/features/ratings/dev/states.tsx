/** What's New, the rating screen and Tell us on fixtures: `xolace://dev/ratings/<id>`. */
import type { DevState } from "@/dev/dev-state";
import { FixtureRate, FixtureTellUs, FixtureWhatsNew } from "./fixture-screens";
import { TELL_US_NOTE } from "./fixtures";

const OPTIONS = { headerShown: false };
/** The ember scene is always dark. */
const RATE_OPTIONS = { headerShown: false, statusBarStyle: "light" } as const;

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "whats-new",
		options: OPTIONS,
		Screen: FixtureWhatsNew,
		title: "What's New",
	},
	{
		id: "rate",
		options: RATE_OPTIONS,
		Screen: () => <FixtureRate />,
		title: "Help someone find Xolace (the stars light)",
	},
	{
		id: "rate-rated",
		options: RATE_OPTIONS,
		Screen: () => <FixtureRate rated />,
		title: "Rated: Write a review, with the thank-you",
	},
	{
		id: "tell-us",
		options: OPTIONS,
		Screen: () => <FixtureTellUs />,
		title: "Tell us, empty",
	},
	{
		id: "tell-us-typed",
		options: OPTIONS,
		Screen: () => <FixtureTellUs text={TELL_US_NOTE} />,
		title: "Tell us, a note ready to send",
	},
	{
		id: "tell-us-sent",
		options: OPTIONS,
		Screen: () => <FixtureTellUs sent />,
		title: "Tell us, sent: the thank-you",
	},
	{
		id: "tell-us-limited",
		options: OPTIONS,
		Screen: () => <FixtureTellUs limited />,
		title: "Tell us, today's note already sent",
	},
];
