/** The sheet's fixture adapter: the real `ReachMeOnSheet` under a provider filled
 * from fixtures. Taps change nothing and reach nothing: the backend decides what a
 * pause, an unlink or a link leaves, and a dev state only draws. */
import { ReachMeOnSheet } from "@/features/reach-me-on/components/reach-me-on-sheet";
import type { LinkStep } from "@/features/reach-me-on/link-flow";
import {
	type ReachSheet,
	ReachSheetProvider,
} from "@/features/reach-me-on/reach-sheet-data";
import {
	type ChannelEntry,
	sheetOrder,
} from "@/features/reach-me-on/reach-view";

const ignore = () => undefined;
const ACTIONS: ReachSheet["actions"] = {
	getPlus: ignore,
	link: {
		cancel: ignore,
		copyLink: ignore,
		dismiss: ignore,
		openTelegram: ignore,
		start: ignore,
	},
	setPaused: ignore,
	tryFirst: ignore,
	unlink: ignore,
};

export function FixtureSheet({
	channels,
	step = "idle",
	offline = false,
}: {
	channels: readonly ChannelEntry[];
	/** Where the Telegram card's link flow stands. */
	step?: LinkStep;
	/** No connection: the banner, and every action but Get Xolace+ dimmed. */
	offline?: boolean;
}) {
	const value: ReachSheet = {
		actions: ACTIONS,
		state: {
			channels: sheetOrder(channels),
			link: { minting: false, step },
			offline,
		},
	};
	return (
		<ReachSheetProvider value={value}>
			<ReachMeOnSheet />
		</ReachSheetProvider>
	);
}
