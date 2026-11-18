/** Settings › Follow & Support on fixtures: `xolace://dev/settings/<id>` (handoff settings-sections.md §8–§9). */

import { themeVariant } from "@/design/themes";
import type { DevState } from "@/dev/dev-state";
import { FixtureFollow } from "@/features/settings/follow/dev/fixture-follow";
import {
	FOLLOW_LIMITED,
	FOLLOW_SENT,
	FOLLOW_TOP,
	FOLLOW_TYPING,
} from "@/features/settings/follow/dev/fixtures";

/** The real route's header (`settings/_layout.tsx`). */
const OPTIONS = { title: "Follow & Support" };
const DEFAULT_DARK = themeVariant("default", "dark");

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "follow-top",
		options: OPTIONS,
		Screen: () => <FixtureFollow state={FOLLOW_TOP} />,
		title: "Follow & Support, top (render 34)",
	},
	{
		id: "follow-scrolled",
		options: OPTIONS,
		Screen: () => <FixtureFollow atEnd state={FOLLOW_TOP} />,
		title: "Follow & Support, scrolled to the socials (render 35)",
	},
	{
		id: "follow-feedback-typing",
		options: OPTIONS,
		Screen: () => <FixtureFollow state={FOLLOW_TYPING} />,
		title: "Follow & Support, feedback with a note (render 36)",
	},
	{
		id: "follow-feedback-limited",
		options: OPTIONS,
		Screen: () => <FixtureFollow state={FOLLOW_LIMITED} />,
		title: "Follow & Support, feedback already sent today (render 37)",
	},
	{
		id: "follow-dark",
		options: OPTIONS,
		Screen: () => <FixtureFollow state={FOLLOW_TOP} theme={DEFAULT_DARK} />,
		title: "Follow & Support, dark (render 38)",
	},
	{
		id: "follow-feedback-sent",
		options: OPTIONS,
		Screen: () => <FixtureFollow state={FOLLOW_SENT} />,
		title: "Follow & Support, feedback Sent.",
	},
];
