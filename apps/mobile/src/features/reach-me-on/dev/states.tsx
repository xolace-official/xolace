/** "Reach me on…" on fixtures: `xolace://dev/reach-me-on/<id>`. */
import type { DevState } from "@/dev/dev-state";
import { FixtureSheet } from "@/features/reach-me-on/dev/fixture-sheet";
import {
	LINKED,
	NEEDS_PLUS,
	NOT_LINKED,
} from "@/features/reach-me-on/dev/fixtures";

/** The real route's header (`settings/_layout.tsx`). */
const OPTIONS = { title: "Reach me on…" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "not-linked",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={NOT_LINKED} />,
		title: "Telegram not linked",
	},
	{
		id: "linked",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={LINKED} />,
		title: "Telegram linked, tried first",
	},
	{
		id: "offline",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={LINKED} offline />,
		title: "Offline: the banner, actions dimmed",
	},
	{
		id: "needs-plus",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={NEEDS_PLUS} />,
		title: "Telegram kept, needs Xolace+",
	},
	{
		id: "link-disclose",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={NOT_LINKED} step="disclose" />,
		title: "Linking, step 1: what Telegram gets",
	},
	{
		id: "link-waiting",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={NOT_LINKED} step="waiting" />,
		title: "Linking, step 2: waiting for Start",
	},
	{
		id: "link-expired",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={NOT_LINKED} step="expired" />,
		title: "Linking, step 2: the link expired",
	},
	{
		id: "link-done",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={LINKED} step="linked" />,
		title: "Linking, step 3: linked",
	},
];
