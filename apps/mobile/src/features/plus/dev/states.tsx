/** The Xolace+ paywall on sample plans: `xolace://dev/plus/<id>`. */
import type { ComponentProps } from "react";
import type { DevState } from "@/dev/dev-state";
import { FixturePlus } from "./fixture-plus";
import { DISCOUNT, MONTHLY_ONLY, NONE, OFFERS_USED } from "./sample-plans";

/** The real route's options (`../screens.ts`): no header. */
const OPTIONS = { headerShown: false };

const show = (props: ComponentProps<typeof FixturePlus>) => () => (
	<FixturePlus {...props} />
);

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "plus",
		options: OPTIONS,
		Screen: show({ surface: "settings_row" }),
		title: "With Plus, yearly's free week",
	},
	{
		id: "free-side",
		options: OPTIONS,
		Screen: show({ side: "free", surface: "settings_row" }),
		title: "The week on Free",
	},
	{
		id: "monthly",
		options: OPTIONS,
		Screen: show({ plan: "monthly", surface: "settings_row" }),
		title: "Monthly picked",
	},
	{
		id: "discount",
		options: OPTIONS,
		Screen: show({ plan: "monthly", plans: DISCOUNT }),
		title: "A monthly discount, picked",
	},
	{
		id: "offers-used",
		options: OPTIONS,
		Screen: show({ plans: OFFERS_USED }),
		title: "Free week and discount already used",
	},
	{
		id: "monthly-only",
		options: OPTIONS,
		Screen: show({ plans: MONTHLY_ONLY }),
		title: "The store sells only monthly",
	},
	{
		id: "talk-door",
		options: OPTIONS,
		Screen: show({ surface: "talk_door" }),
		title: "From the talk door: its own line",
	},
	{
		id: "premium-theme",
		options: OPTIONS,
		Screen: show({ surface: "premium_theme" }),
		title: "From a premium theme: themes lit",
	},
	{
		id: "buying",
		options: OPTIONS,
		Screen: show({ buying: true }),
		title: "Buying: the button spins",
	},
	{
		id: "restoring",
		options: OPTIONS,
		Screen: show({ restoring: true }),
		title: "Restoring",
	},
	{
		id: "owned",
		options: OPTIONS,
		Screen: show({ owned: true }),
		title: "Xolace+ already theirs",
	},
	{
		id: "unavailable",
		options: OPTIONS,
		Screen: show({ plans: NONE, unavailable: true }),
		title: "Plans didn't load",
	},
	{
		id: "retrying",
		options: OPTIONS,
		Screen: show({ plans: NONE, retrying: true, unavailable: true }),
		title: "Plans didn't load: trying again",
	},
	{
		id: "payments-off",
		options: OPTIONS,
		Screen: show({ plans: NONE }),
		title: "Payments off: nothing to sell",
	},
	{
		id: "intake",
		options: OPTIONS,
		Screen: show({ surface: "intake" }),
		title: "Intake's plans step",
	},
];
