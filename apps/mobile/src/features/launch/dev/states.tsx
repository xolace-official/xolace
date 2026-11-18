/** The launch cover on each launch path, without a cold start: `xolace://dev/launch/<id>`. */
import type { DevState } from "@/dev/dev-state";
import { LaunchHold } from "@/features/launch/launch-hold";
import { LAUNCH_TIMING } from "@/features/launch/launch-model";
import { ReplayScreen } from "./replay-screen";

const NO_HEADER = { headerShown: false };
/** Long enough for the logo's breath to show. */
const SLOW_MS = 3000;
/** Two bootstrap retries (`RETRY_DELAY_MS`) and the remount. */
const RETRY_MS = 2500;

const TODAY = { dismissTo: "/today" } as const;
const FAST = { holdMs: 0, reason: "gate", under: TODAY };
const SLOW = { holdMs: SLOW_MS, reason: "gate", under: TODAY };
const SIGNED_OUT = {
	holdMs: 600,
	reason: "gate",
	under: { replace: "/dev/first-run/promise" },
} as const;
const INTAKE = {
	holdMs: 900,
	reason: "gate",
	under: { replace: "/dev/intake/first-look" },
} as const;
const DEEP_LINK = {
	holdMs: 900,
	reason: "gate",
	under: { replace: "/achievements" },
} as const;
const RETRY = { holdMs: RETRY_MS, reason: "bootstrap", under: TODAY };
const STUCK = { holdMs: 0, reason: "gate" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "fast",
		options: NO_HEADER,
		Screen: () => <ReplayScreen replay={FAST} />,
		title: "Launch, nothing to wait for → Today",
	},
	{
		id: "slow",
		options: NO_HEADER,
		Screen: () => <ReplayScreen replay={SLOW} />,
		title: "Launch, the gate takes 3 s (the breath) → Today",
	},
	{
		id: "signed-out",
		options: NO_HEADER,
		Screen: () => <ReplayScreen replay={SIGNED_OUT} />,
		title: "Signed out → first run's promise",
	},
	{
		id: "intake",
		options: NO_HEADER,
		Screen: () => <ReplayScreen replay={INTAKE} />,
		title: "Signed in, intake not done → intake (first look)",
	},
	{
		id: "deep-link",
		options: NO_HEADER,
		Screen: () => <ReplayScreen replay={DEEP_LINK} />,
		title: "A deep link → its screen (achievements)",
	},
	{
		id: "bootstrap-retry",
		options: NO_HEADER,
		Screen: () => <ReplayScreen replay={RETRY} />,
		title: "Account bootstrap retries, then Today",
	},
	{
		id: "stuck",
		options: NO_HEADER,
		Screen: () => (
			<ReplayScreen replay={STUCK}>
				<LaunchHold reason="gate" />
			</ReplayScreen>
		),
		title: `Loading never ends: the cover leaves at ${LAUNCH_TIMING.maxCoverMs / 1000} s, quiet spinner`,
	},
	{
		id: "after-launch",
		options: NO_HEADER,
		Screen: () => <LaunchHold reason="bootstrap" />,
		title: "After launch: a bootstrap retry's quiet loading state",
	},
];
