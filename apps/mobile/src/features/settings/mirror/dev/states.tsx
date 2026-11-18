/** Mirror on fixtures: `xolace://dev/settings/<id>` (handoff settings.md §9, §10: renders 12–16). */
import type { DevState } from "@/dev/dev-state";
import { FixtureMirror } from "@/features/settings/mirror/dev/fixture-mirror";
import {
	MIRROR_FREE,
	MIRROR_FREE_SAGE,
	MIRROR_GENTLE,
	MIRROR_POETIC,
	MIRROR_WREN_PLAYING,
} from "@/features/settings/mirror/dev/fixtures";

/** The real route's header (`settings/_layout.tsx`). */
const OPTIONS = { title: "Mirror" };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "mirror-gentle",
		options: OPTIONS,
		Screen: () => <FixtureMirror state={MIRROR_GENTLE} />,
		title: "Mirror on Gentle, Auto",
	},
	{
		id: "mirror-poetic",
		options: OPTIONS,
		Screen: () => <FixtureMirror state={MIRROR_POETIC} />,
		title: "Mirror on Poetic",
	},
	{
		id: "mirror-wren-playing",
		options: OPTIONS,
		Screen: () => <FixtureMirror state={MIRROR_WREN_PLAYING} />,
		title: "Mirror, Wren chosen and playing",
	},
	{
		id: "mirror-free-witnessed",
		options: OPTIONS,
		Screen: () => (
			<FixtureMirror opens={{ peek: "witnessed" }} state={MIRROR_FREE} />
		),
		title: "Mirror, free, Witnessed shown",
	},
	{
		id: "mirror-free-locked-voice",
		options: OPTIONS,
		Screen: () => (
			<FixtureMirror opens={{ focus: "sage" }} state={MIRROR_FREE_SAGE} />
		),
		title: "Mirror, free, a locked voice played",
	},
	{
		id: "mirror-talk",
		options: OPTIONS,
		Screen: () => (
			<FixtureMirror opens={{ scrollToTalk: true }} state={MIRROR_POETIC} />
		),
		title: "Mirror, scrolled to Talk",
	},
];
