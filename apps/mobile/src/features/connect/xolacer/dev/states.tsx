/** A Xolacer's profile on fixtures: `xolace://dev/connect/<id>`. Shares the thread's fixtures. */
import type { DevState } from "@/dev/dev-state";
import { NOW } from "../../dev/fixtures";
import { FixtureXolacer } from "../../thread/dev/fixture-thread";
import {
	OPEN,
	PROFILE_KOJO,
	PROFILE_MAYA,
} from "../../thread/dev/thread-fixtures";

const PROFILE = { headerShown: true, title: "" };
const DAY_MS = 86_400_000;

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "xolacer",
		options: PROFILE,
		Screen: () => <FixtureXolacer profile={PROFILE_MAYA} specialty="anxiety" />,
		title: "Xolacer: ask to talk, others listen too",
	},
	{
		id: "xolacer-new",
		options: PROFILE,
		Screen: () => <FixtureXolacer profile={PROFILE_KOJO} />,
		title: "Xolacer, new, away",
	},
	{
		id: "xolacer-talked",
		options: PROFILE,
		Screen: () => (
			<FixtureXolacer
				profile={{
					...PROFILE_MAYA,
					canRate: true,
					conversation: {
						closedReason: undefined,
						id: OPEN.id,
						retryAvailableAt: undefined,
						status: "resting",
					},
				}}
			/>
		),
		title: "Xolacer you've talked to: open chat, rate",
	},
	{
		id: "xolacer-cooldown",
		options: PROFILE,
		Screen: () => (
			<FixtureXolacer
				profile={{
					...PROFILE_MAYA,
					conversation: {
						closedReason: "declined",
						id: OPEN.id,
						retryAvailableAt: NOW + 2 * DAY_MS,
						status: "closed",
					},
				}}
			/>
		),
		title: "Xolacer after a decline: the cooldown",
	},
	{
		id: "xolacer-full",
		options: PROFILE,
		Screen: () => (
			<FixtureXolacer
				profile={{ ...PROFILE_MAYA, available: false, present: false }}
			/>
		),
		title: "Xolacer not taking conversations",
	},
	{
		id: "xolacer-self",
		options: PROFILE,
		Screen: () => (
			<FixtureXolacer profile={{ ...PROFILE_MAYA, isSelf: true }} />
		),
		title: "Your own Xolacer profile",
	},
	{
		id: "xolacer-loading",
		options: PROFILE,
		Screen: () => <FixtureXolacer phase="loading" profile={PROFILE_MAYA} />,
		title: "Xolacer loading",
	},
	{
		id: "xolacer-gone",
		options: PROFILE,
		Screen: () => <FixtureXolacer phase="gone" profile={PROFILE_MAYA} />,
		title: "Xolacer unpublished",
	},
];
