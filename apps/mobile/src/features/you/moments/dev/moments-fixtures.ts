/** Moments on fixtures: the prototype's (`P/src/fixtures/you.ts`, `MOMENTS_PAGE` and
 * `MOMENT_DETAIL`), as the server sends them. */
import type {
	MomentRow,
	MomentSession,
} from "@/features/you/moments/moments-model";

/** Wednesday 18 November 2026, 9 pm. */
export const MO_NOW = new Date(2026, 10, 18, 21, 0);
const at = (day: number, h: number, m: number) =>
	new Date(2026, 10, day, h, m).getTime();

const row = (
	id: string,
	createdAt: number,
	mirrorText: string,
	feeling: string | null,
	path: string | null,
	tone: string | null,
	entryType = "open_prompt"
): MomentRow => ({
	_id: id,
	createdAt,
	entryType,
	granularLabel: feeling,
	mirrorText,
	pathChosen: path,
	primaryEmotion: null,
	toneUsed: tone,
});

export const MOMENT_ROWS: readonly MomentRow[] = [
	row(
		"m-today",
		at(18, 20, 40),
		"It sounds like the day kept asking for more than you had.",
		"tired",
		"exit",
		"gentle"
	),
	row(
		"m-behind",
		at(17, 21, 12),
		"You're not behind. You're tired of running at a pace that was never yours.",
		"overwhelmed",
		"solo",
		"poetic"
	),
	row(
		"m-meeting",
		at(17, 18, 5),
		"The meeting is over, but you're still in the room with it.",
		"restless",
		null,
		"direct",
		"talk"
	),
	row(
		"m-tonight",
		at(16, 23, 20),
		"You can set it down for tonight. It will still be there to look at tomorrow.",
		"stressed",
		"exit",
		"gentle"
	),
	row(
		"m-matters",
		at(15, 19, 48),
		"That it matters this much shows you what you care about.",
		"unsure",
		"solo",
		"witnessed"
	),
	row(
		"m-home",
		at(9, 21, 30),
		"Missing home doesn't mean you chose wrong. It means you had somewhere worth missing.",
		"homesick",
		"peers",
		"poetic"
	),
];

/** What the server can send at the edges: no feeling, no path, an "adaptive" tone (no chip), a
 * long mirror with an em dash, a talk with no path. */
export const EDGE_ROWS: readonly MomentRow[] = [
	row("e-bare", at(18, 9, 2), "You showed up today.", null, null, null),
	row(
		"e-adaptive",
		at(18, 8, 30),
		"There's a lot here — the move, the job, the quiet evenings — and none of it is small. It makes sense that the days feel longer than they used to, and that you're tired in a way sleep doesn't quite reach.",
		"self-doubt",
		null,
		"adaptive"
	),
	row(
		"e-talk",
		at(10, 22, 15),
		"You said it out loud, and it sounded lighter by the end.",
		null,
		"solo",
		"gentle",
		"talk"
	),
];

export const MOMENT_SESSION: MomentSession = {
	createdAt: at(17, 21, 12),
	entryType: "open_prompt",
	granularLabel: "overwhelmed",
	mirrorText:
		"You're not behind. You're tired of running at a pace that was never yours.",
	pathChosen: "solo",
	primaryEmotion: "tired",
	rawInput:
		"Everyone keeps moving and I'm still stuck on the same week. I'm not even sad, just tired of trying to keep up.",
	toneUsed: "poetic",
};

export const TALK_SESSION: MomentSession = {
	companionName: "Haven",
	createdAt: at(17, 18, 5),
	entryType: "talk",
	granularLabel: "restless",
	mirrorText: "The meeting is over, but you're still in the room with it.",
	pathChosen: null,
	primaryEmotion: null,
	rawInput: "I keep replaying the meeting and what I should have said.",
	toneUsed: "direct",
};

export const TALK_LINES = [
	{
		role: "person",
		text: "I keep replaying the meeting and what I should have said.",
	},
	{
		role: "companion",
		text: "What's the part that keeps coming back?",
	},
	{
		role: "person",
		text: "When they asked if I had questions and I just said no.",
	},
	{
		role: "companion",
		text: "It sounds like you had one, and it's still waiting to be asked.",
	},
] as const;

/** A session that never got its mirror or kept your words: what the details query can send. */
export const BARE_SESSION: MomentSession = {
	createdAt: at(18, 9, 2),
	entryType: "open_prompt",
	granularLabel: null,
	primaryEmotion: null,
};
