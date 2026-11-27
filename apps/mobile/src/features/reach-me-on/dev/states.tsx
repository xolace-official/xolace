import type { DevState } from "@/dev/dev-state";
import { FixtureOffer } from "@/features/reach-me-on/dev/fixture-offer";
import { FixtureSheet } from "@/features/reach-me-on/dev/fixture-sheet";
import {
	LINKED,
	NEEDS_PLUS,
	NOT_LINKED,
} from "@/features/reach-me-on/dev/fixtures";

const OPTIONS = { title: "Reach me on…" };
const OFFER_OPTIONS = { title: "Check-in" };

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
		Screen: () => <FixtureSheet channels={LINKED} reach="offline" />,
		title: "Offline: the banner, actions dimmed",
	},
	{
		id: "cant-reach",
		options: OPTIONS,
		Screen: () => <FixtureSheet channels={LINKED} reach="cant_reach" />,
		title: "Can't reach Xolace (internet works): the banner, actions dimmed",
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
	{
		id: "offer",
		options: OFFER_OPTIONS,
		Screen: () => <FixtureOffer />,
		title: "Check-in offer: link Telegram?",
	},
	{
		id: "offer-offline",
		options: OFFER_OPTIONS,
		Screen: () => <FixtureOffer cantReach />,
		title: "Check-in offer, can't reach Xolace: Link dimmed",
	},
	{
		id: "offer-linking",
		options: OFFER_OPTIONS,
		Screen: () => <FixtureOffer step="disclose" />,
		title: "Check-in offer, step 1: what Telegram gets",
	},
];
