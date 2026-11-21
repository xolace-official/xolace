import type { DevState } from "@/dev/dev-state";
import { FixtureBadges } from "@/features/achievements/badges/dev/fixture-badges";

const OPTIONS = { headerShown: false };
const OPEN_MS = 700;
const HALF_TURN = Math.PI;
const PULLED = 140;
const fromLatest = { below: false, latest: true };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "list",
		options: OPTIONS,
		Screen: () => <FixtureBadges />,
		title: "Achievements, at the top",
	},
	{
		id: "held",
		options: OPTIONS,
		Screen: () => (
			<FixtureBadges
				open={{ afterMs: OPEN_MS, id: "streak-10", opts: fromLatest }}
			/>
		),
		title: "10 days by the fire, held",
	},
	{
		id: "turned",
		options: OPTIONS,
		Screen: () => (
			<FixtureBadges
				open={{
					afterMs: OPEN_MS,
					id: "streak-10",
					opts: { ...fromLatest, spin: HALF_TURN, still: true },
				}}
			/>
		),
		title: "Turned over: the engraved back",
	},
	{
		id: "pulled",
		options: OPTIONS,
		Screen: () => (
			<FixtureBadges
				open={{
					afterMs: OPEN_MS,
					id: "streak-10",
					opts: { ...fromLatest, dragY: PULLED, still: true },
				}}
			/>
		),
		title: "Swiped down 140 pt",
	},
	{
		id: "locked",
		options: OPTIONS,
		Screen: () => (
			<FixtureBadges open={{ afterMs: OPEN_MS, id: "streak-14" }} />
		),
		title: "Locked: 14 days by the fire",
	},
	{
		id: "first-talk",
		options: OPTIONS,
		Screen: () => (
			<FixtureBadges open={{ afterMs: OPEN_MS, id: "first-talk" }} />
		),
		title: "First talk (green)",
	},
	{
		id: "showing-up",
		options: OPTIONS,
		Screen: () => (
			<FixtureBadges open={{ afterMs: OPEN_MS, id: "showing-up-10" }} />
		),
		title: "10 days showing up (dawn), three pinned: Pin is refused",
	},
	{
		id: "from-you",
		options: OPTIONS,
		Screen: () => <FixtureBadges open={{ id: "streak-10" }} />,
		title: "From You: no slot, it rises from below",
	},
];
