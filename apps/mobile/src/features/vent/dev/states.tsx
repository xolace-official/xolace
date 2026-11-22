import type { ComponentProps } from "react";
import type { DevState } from "@/dev/dev-state";
import { FixtureVent } from "@/features/vent/dev/fixture-vent";
import { CEILING_MS, NEAR_LEFT_MS } from "@/features/vent/dev/fixtures";
import type { VentFixture } from "@/features/vent/dev/use-fixture-backend";

const OPTIONS = {
	animation: "fade",
	gestureEnabled: false,
	headerShown: false,
} as const;

const BASE: VentFixture = { answer: "reply", introSeen: true, voice: "normal" };
const SETTLED = { field: "field", settled: true } as const;
const AFTER = { field: "none" } as const;

const vent = (props: ComponentProps<typeof FixtureVent>) => ({
	options: OPTIONS,
	Screen: () => <FixtureVent {...props} />,
});

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "first-time",
		title: "The first time",
		...vent({
			fixture: { ...BASE, introSeen: false },
		}),
	},
	{
		id: "ready",
		title: "The field gathers, then the hint",
		...vent({ fixture: BASE }),
	},
	{
		id: "mic-off",
		title: "Mic turned off",
		...vent({
			fixture: { ...BASE, micOff: true },
			play: "mic",
			seed: SETTLED,
		}),
	},
	{
		id: "replies-used-before",
		title: "Replies used, before",
		...vent({
			fixture: { ...BASE, answer: "cap", capBefore: true },
			seed: SETTLED,
		}),
	},
	{
		id: "speaking-softly",
		title: "Speaking softly",
		...vent({
			fixture: { ...BASE, voice: "soft" },
			play: "speak",
			seed: SETTLED,
		}),
	},
	{
		id: "speaking",
		title: "Speaking",
		...vent({
			fixture: BASE,
			play: "speak",
			seed: SETTLED,
		}),
	},
	{
		id: "speaking-loud",
		title: "Saying it loud",
		...vent({
			fixture: { ...BASE, voice: "loud" },
			play: "speak",
			seed: SETTLED,
		}),
	},
	{
		id: "near-the-limit",
		title: "Near the limit (14 s left), through the release",
		...vent({
			fixture: { ...BASE, recordedFrom: CEILING_MS - NEAR_LEFT_MS },
			play: "speak",
			seed: SETTLED,
		}),
	},
	{
		id: "let-go",
		title: "Let it go, through to Gone.",
		...vent({
			fixture: BASE,
			play: "tap",
			seed: SETTLED,
		}),
	},
	{
		id: "pinch-to-burst",
		title: "Pinch to burst",
		...vent({
			fixture: BASE,
			play: "pinch",
			seed: SETTLED,
		}),
	},
	{
		id: "flick-away",
		title: "Flick it away",
		...vent({
			fixture: BASE,
			play: "flick",
			seed: SETTLED,
		}),
	},
	{
		id: "reply",
		title: "The reply, lit word by word",
		...vent({
			fixture: { ...BASE, stage: "heard" },
			play: "reply",
			seed: AFTER,
		}),
	},
	{
		id: "words-to-ash",
		title: "Words to ash",
		...vent({
			fixture: { ...BASE, stage: "heard" },
			play: "ash",
			seed: AFTER,
		}),
	},
	{
		id: "gone",
		title: "Gone.",
		...vent({
			fixture: { ...BASE, stage: "heard" },
			play: "gone",
			seed: AFTER,
		}),
	},
	{
		id: "crisis",
		title: "Crisis",
		...vent({
			fixture: { ...BASE, answer: "crisis", stage: "heard" },
			play: "reply",
			seed: AFTER,
		}),
	},
	{
		id: "replies-used-after",
		title: "Replies used, after",
		...vent({
			fixture: { ...BASE, answer: "cap", stage: "gone" },
			play: "gone",
			seed: AFTER,
		}),
	},
	{
		id: "no-reply",
		title: "The reply fails: it burns, then Gone.",
		...vent({
			fixture: { ...BASE, answer: "error" },
			play: "tap",
			seed: SETTLED,
		}),
	},
	{
		id: "reduce-motion-ready",
		title: "Reduce Motion, ready",
		...vent({
			fixture: BASE,
			reduced: true,
		}),
	},
	{
		id: "reduce-motion-let-go",
		title: "Reduce Motion, letting go",
		...vent({
			fixture: BASE,
			play: "tap",
			reduced: true,
			seed: SETTLED,
		}),
	},
];
