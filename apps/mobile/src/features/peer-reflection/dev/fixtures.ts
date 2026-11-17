/**
 * You're not alone's fixtures: the board's `SETS` (design/boards/PeersAlive.dc.html),
 * verbatim, as the rows `reflections.matchForSession` and `listRecent` return.
 * Counts are other people (the board's `n`), so a card you haven't felt yet
 * has `resonanceCount` = n.
 */
import type { ReflectionRow } from "../peer-reflection-model";

const row = (
	id: string,
	displayText: string,
	resonanceCount: number
): ReflectionRow => ({ _id: id, displayText, resonanceCount });

export const MATCH: readonly ReflectionRow[] = [
	row(
		"m1",
		"Nobody tells you that being the dependable one is its own kind of lonely.",
		12
	),
	row(
		"m2",
		"I replay conversations from hours ago like I can still fix them. By the time I get home I’m already one step behind tomorrow, and I’m so tired of running to stand still.",
		8
	),
	row("m3", "Tired isn’t lazy. I’m learning the difference slowly.", 21),
	row(
		"m4",
		"I kept waiting for someone to ask if I was okay. Writing it here was me asking.",
		5
	),
];

export const RECENT: readonly ReflectionRow[] = [
	row(
		"r1",
		"Moved cities for this job and it’s been three months of eating dinner standing at the counter.",
		9
	),
	row(
		"r2",
		"I didn’t get the place. I told everyone it was fine. It wasn’t fine.",
		14
	),
	row(
		"r3",
		"Some mornings the hardest part is the first five minutes. Today I got through them.",
		27
	),
	row(
		"r4",
		"I keep saying yes to things and then dreading every one of them. Learning to say not this week.",
		6
	),
];

/** A quote long enough to meet the seven-line clamp and its "Read more". */
export const LONG: readonly ReflectionRow[] = [
	row(
		"l1",
		"Some days I can feel it coming before I’m even out of bed. The weight sits on my chest and every small thing — the shower, the kettle, the bus — feels like it belongs to someone with more in them than I have. I go anyway. Nobody at work would guess, and most days I don’t want them to. But I wish one person would notice without me having to say it, and then not make it a whole thing.",
		3
	),
	...MATCH.slice(1, 3),
];
