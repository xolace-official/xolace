import type { Resource } from "@xolace/backend/convex/lib/crisisResources";

export const SAMPLE =
	"I keep replaying the meeting and what I should have said, and my head won’t let it go. Everyone else seemed fine. I’m just tired of always feeling one step behind.";

export const MIRROR_TEXT =
	"It sounds like replaying the meeting is still with you, and part of you keeps rewriting what you should have said. Underneath it there’s a tiredness, of always feeling one step behind while everyone else seemed fine. That’s a lot to carry quietly.";

/** Long enough to run past the actions on a small phone: the mirror has no length cap. */
export const LONG_MIRROR_TEXT =
	"It sounds like replaying the meeting is still with you, and part of you keeps rewriting what you should have said. Underneath it there’s a tiredness, of always feeling one step behind while everyone else seemed fine. You went in hoping to be heard and came out feeling small, and that stayed with you on the drive home. When you asked yourself what to do next, the answer that came back wasn’t a plan at all, just “keep going, quietly.” That’s a gentle answer from the part of you that’s usually carrying the most. It might be worth noticing how often that part does the carrying on its own. And it might be worth letting tonight be a night it gets to set some of it down.";

export const REVISED_TEXT =
	"It sounds like the meeting is still with you, mostly the moment you went quiet. Underneath it there’s something closer to embarrassment, as if everyone saw you fall behind. And you’ve been carrying it on your own all day.";

export const HEAVY_SAMPLE =
	"I don’t know how much longer I can keep doing this. Everything feels too heavy and I’m so tired all the time.";
export const HEAVY_MIRROR_TEXT =
	"It sounds like tonight everything feels too heavy to hold. You’re tired in a way that sleep doesn’t seem to fix.";

export const SPOKEN = "And honestly, I just want to stop thinking about it.";

export const LONG_TEXT = Array.from(
	{ length: 18 },
	(_, i) =>
		`${i === 0 ? "" : "And "}I keep replaying the meeting, every version of what I should have said, and the quiet after it when nobody looked up. Everyone else seemed fine.`
).join(" ");

export const RESOURCES: Resource[] = [
	{
		description: "free, 24/7",
		label: "Mental Health Authority",
		priority: 2,
		source: "crisis_line",
		type: "phone",
		value: "0800 678 678",
	},
	{
		label: "Ghana emergency line",
		priority: 3,
		source: "crisis_line",
		type: "phone",
		value: "112",
	},
	{
		label: "Xolace support",
		priority: 1,
		source: "xolace_support",
		type: "email",
		value: "support@xolaceinc.com",
	},
	{
		description: "Find one, wherever you are",
		label: "A crisis centre near you",
		priority: 4,
		source: "online_resource",
		type: "url",
		value: "https://findahelpline.com",
	},
];

export const STREAK = 13;

export type Answer = "quick" | "usual" | "slow" | "heavy" | "offline";
export const TIMES: Record<
	Exclude<Answer, "offline">,
	{ s1: number; s2: number; slow?: number; land: number }
> = {
	heavy: { land: 4.4, s1: 1.2, s2: 2.6 },
	quick: { land: 1.6, s1: -1, s2: 0.5 },
	slow: { land: 14, s1: 1.2, s2: 2.6, slow: 10 },
	usual: { land: 4.2, s1: 1.2, s2: 2.6 },
};

export const LIMIT_MESSAGE =
	"You've reached the limit for reflections. Try again in about 40 minutes.";
