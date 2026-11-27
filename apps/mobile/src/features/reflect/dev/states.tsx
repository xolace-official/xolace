import type { DevState } from "@/dev/dev-state";
import { COPY } from "../copy";
import { waitError } from "../reflect-model";
import { reflect } from "./fixture-reflect";
import {
	HEAVY_MIRROR_TEXT,
	HEAVY_SAMPLE,
	LIMIT_MESSAGE,
	LONG_MIRROR_TEXT,
	LONG_TEXT,
	REVISED_TEXT,
	SAMPLE,
} from "./fixtures";

const SENT = { sent: SAMPLE };
const MIRROR = { ...SENT, landN: 1, stage: "mirror" as const };
const HEAVY = {
	heavy: true,
	landN: 1,
	mirrorText: HEAVY_MIRROR_TEXT,
	sent: HEAVY_SAMPLE,
	stage: "mirror" as const,
};
const SEED = "I said I was fine, and I wasn’t.";

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{ id: "first-open", title: "First open: the field, empty", ...reflect({}) },
	{
		id: "first-open-dark",
		title: "First open, dark",
		...reflect({ theme: "dark" }),
	},
	{
		id: "late",
		title: "Late (night mode)",
		...reflect({ late: true, prompt: COPY.write.prompt.late }),
	},
	{
		id: "draft",
		title: "A kept draft (send it to watch the wait)",
		...reflect({ text: SAMPLE }),
	},
	{
		id: "picks",
		title: "Three feelings picked",
		...reflect({ picks: ["heavy", "tired", "restless"] }),
	},
	{
		id: "nudge",
		title: "A pause in the writing (the nudge)",
		...reflect({ nudge: true, text: "I keep replaying" }),
	},
	{
		id: "seeded",
		title: "Seeded: a quote reply's line as the question",
		...reflect({ prompt: COPY.write.replySeed(SEED) }),
	},
	{
		id: "long-text",
		title: "Long text, near the cap",
		...reflect({ text: LONG_TEXT }),
	},
	{
		id: "streaming",
		title: "The wait (streaming, then the mirror lands)",
		...reflect({ ...SENT, stage: "wait" }),
	},
	{
		id: "streaming-dark",
		title: "The wait, dark",
		...reflect({ ...SENT, stage: "wait", theme: "dark" }),
	},
	{
		id: "slow",
		title: "A slow wait (10 s)",
		...reflect({ ...SENT, slow: true, stage: "wait", waitStage: 2 }),
	},
	{
		id: "offline",
		title: "Offline during the wait",
		...reflect({ ...SENT, reach: "offline", stage: "wait" }),
	},
	{
		id: "cant-reach",
		title: "Xolace can't be reached during the wait (internet works)",
		...reflect({ ...SENT, reach: "cant_reach", stage: "wait" }),
	},
	{
		id: "error",
		title: "The session failed (Try again)",
		...reflect({ ...SENT, error: waitError("", "free"), stage: "wait" }),
	},
	{
		id: "error-rejected",
		title: "The safeguard said no (Talk to someone)",
		...reflect({
			...SENT,
			error: waitError("content_policy_violation", "free"),
			stage: "wait",
		}),
	},
	{
		id: "error-limit",
		title: "A free account hit the hourly cap (See Xolace+)",
		...reflect({
			...SENT,
			error: waitError(LIMIT_MESSAGE, "free"),
			stage: "wait",
		}),
	},
	{ id: "mirror", title: "The mirror", ...reflect(MIRROR) },
	{
		id: "mirror-dark",
		title: "The mirror, dark",
		...reflect({ ...MIRROR, theme: "dark" }),
	},
	{
		id: "mirror-late",
		title: "The mirror, late",
		...reflect({ ...MIRROR, late: true }),
	},
	{
		id: "mirror-long",
		title: "The mirror under long text",
		...reflect({ ...MIRROR, sent: LONG_TEXT }),
	},
	{
		id: "mirror-long-mirror",
		title: "A long mirror (scrolls above the actions)",
		...reflect({ ...MIRROR, mirrorText: LONG_MIRROR_TEXT }),
	},
	{
		id: "heavy-long-mirror",
		title: "Heavy: a long mirror above the care card",
		...reflect({ ...HEAVY, mirrorText: LONG_MIRROR_TEXT }),
	},
	{
		id: "pick-line",
		title: "Not quite: which line missed?",
		...reflect({ ...MIRROR, pickMode: true }),
	},
	{
		id: "not-quite",
		title: "Not quite: the panel on line 2",
		...reflect({ ...MIRROR, nq: true, sel: 1 }),
	},
	{
		id: "say-more",
		title: "Say more",
		...reflect({ ...MIRROR, sayMore: true }),
	},
	{
		id: "at-cap",
		title: "Two tries: Leave it here",
		...reflect({
			...MIRROR,
			atCap: true,
			mv: 2,
			revisedText: REVISED_TEXT,
			turns: 2,
		}),
	},
	{
		id: "talk-mirror",
		title: "A talk's mirror",
		...reflect({ ...MIRROR, companionName: "Wren" }),
	},
	{ id: "heavy", title: "Heavy: the care card", ...reflect(HEAVY) },
	{
		id: "resources",
		title: "Heavy: people who answer",
		...reflect({ ...HEAVY, care: "res" }),
	},
	{
		id: "breathe",
		title: "Heavy: breathe with me",
		...reflect({ ...HEAVY, care: "breath" }),
	},
	{
		id: "where-next",
		title: "Where next",
		...reflect({ ...SENT, stage: "next" }),
	},
	{
		id: "where-next-dark",
		title: "Where next, dark",
		...reflect({ ...SENT, stage: "next", theme: "dark" }),
	},
	{
		id: "gave-up-next",
		title: "Where next after Leave it here: what happened?",
		...reflect({ ...SENT, stage: "next", whatHappened: true }),
	},
	{
		id: "space-name",
		title: "Where next: the space-name prompt",
		...reflect({ ...SENT, spaceNameOpen: true, stage: "next" }),
	},
	{ id: "heard", title: "Heard", ...reflect({ ...SENT, stage: "heard" }) },
	{
		id: "heard-late",
		title: "Heard, late",
		...reflect({ ...SENT, late: true, stage: "heard" }),
	},
];
