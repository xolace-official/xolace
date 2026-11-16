/** "Reach me on…" on fixtures: `xolace://dev/reach-me-on/<id>`. The sheet is the
 * real one; only its provider's adapter changes. Taps change nothing: the
 * backend decides what a pause or an unlink leaves. */
import type { DevState } from "@/dev/dev-state";
import { ReachMeOnSheet } from "@/features/reach-me-on/components/reach-me-on-sheet";
import { push, telegram } from "@/features/reach-me-on/dev/fixtures";
import {
	type ReachSheet,
	ReachSheetProvider,
} from "@/features/reach-me-on/reach-sheet";
import {
	type ChannelEntry,
	sheetOrder,
} from "@/features/reach-me-on/reach-view";

const ignore = () => undefined;
const ACTIONS: ReachSheet["actions"] = {
	setPaused: ignore,
	tryFirst: ignore,
	unlink: ignore,
};
/** The real route's header (`settings/_layout.tsx`). */
const OPTIONS = { title: "Reach me on…" };

function Sheet({ channels }: { channels: readonly ChannelEntry[] }) {
	return (
		<ReachSheetProvider
			value={{
				actions: ACTIONS,
				state: { channels: sheetOrder(channels), offline: false },
			}}
		>
			<ReachMeOnSheet />
		</ReachSheetProvider>
	);
}

const NOT_LINKED = [push({ isFirst: true }), telegram()];
const LINKED = [
	telegram({
		displayHandle: "river_stone",
		everLinked: true,
		isFirst: true,
		linked: true,
		status: "linked",
	}),
	push(),
];
/** A kept link after Telegram became Xolace+-only. */
const NEEDS_PLUS = [
	push({ isFirst: true }),
	telegram({
		available: false,
		everLinked: true,
		linked: true,
		requiresPlus: true,
		status: "needs_plus",
	}),
];

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "not-linked",
		options: OPTIONS,
		Screen: () => <Sheet channels={NOT_LINKED} />,
		title: "Telegram not linked",
	},
	{
		id: "linked",
		options: OPTIONS,
		Screen: () => <Sheet channels={LINKED} />,
		title: "Telegram linked, tried first",
	},
	{
		id: "needs-plus",
		options: OPTIONS,
		Screen: () => <Sheet channels={NEEDS_PLUS} />,
		title: "Telegram kept, needs Xolace+",
	},
];
