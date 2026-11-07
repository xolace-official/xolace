import { streakMilestoneCopy } from "../streaks/milestones";

/**
 * The launch achievement catalog (#683, art keys #687), in code: never
 * admin-edited at runtime. An `achievementId` is permanent once shipped
 * (`user_achievements` rows hold it), so rename a title or copy freely but
 * never an id. `artKey` names the image in `badge_art`; several open-ended
 * streak rungs share one.
 *
 * If an id ever must go (dropping an entry, or a streak rung off the ladder),
 * ship a migration that stamps its rows `seenAt`. The unlock moment skips ids it
 * can't find, but the summary would still count them.
 */

export type AchievementCategory =
	| "getting_started"
	| "streak"
	| "showing_up"
	| "exploring"
	| "understanding";

/** Screen order. */
export const ACHIEVEMENT_CATEGORIES: readonly {
	category: AchievementCategory;
	title: string;
}[] = [
	{ category: "getting_started", title: "Getting started" },
	{ category: "streak", title: "Streak" },
	{ category: "showing_up", title: "Showing up" },
	{ category: "exploring", title: "Exploring" },
	{ category: "understanding", title: "Understanding" },
];

/** The only spark sizes an achievement awards, growing with how much showing up it took. */
type Sparks = 10 | 25 | 50 | 100;

/**
 * What a ladder rung counts toward. Rungs sharing a counter in a category form
 * one ladder; only its first unearned rung shows progress (#678).
 */
export type GoalCounter =
	| "sessions"
	| "streak"
	| "days_showed_up"
	| "pieces_read"
	| "areas_unlocked";

export type Achievement = {
	achievementId: string;
	artKey: string;
	category: AchievementCategory;
	title: string;
	copy: string;
	sparks: Sparks;
	/** Absent on one-offs with nothing to count toward (Joined, First talk, …). */
	goal?: { counter: GoalCounter; target: number };
};

const showingUp = (days: number, sparks: Sparks) =>
	({
		achievementId: `showing-up-${days}`,
		artKey: `showing-up-${days}`,
		category: "showing_up",
		copy: `You've come back ${days} different days.`,
		goal: { counter: "days_showed_up", target: days },
		sparks,
		title: `${days} days showing up`,
	}) as const;

const read = (pieces: number, sparks: Sparks) =>
	({
		achievementId: `read-${pieces}`,
		artKey: `read-${pieces}`,
		category: "exploring",
		copy: `${pieces} different pieces read.`,
		goal: { counter: "pieces_read", target: pieces },
		sparks,
		title: `Read ${pieces}`,
	}) as const;

const exploring = (achievementId: string, title: string, copy: string) => ({
	achievementId,
	artKey: achievementId,
	category: "exploring" as const,
	copy,
	sparks: 10 as const,
	title,
});

const understanding = (areas: number, title: string, copy: string) =>
	({
		achievementId: `understanding-${areas}`,
		artKey: `understanding-${areas}`,
		category: "understanding",
		copy,
		goal: { counter: "areas_unlocked", target: areas },
		sparks: 50,
		title,
	}) as const;

/**
 * Every achievement except the streak ladder, which is open-ended and built by
 * `streakAchievement`. Within a category, in screen order.
 */
export const FIXED_ACHIEVEMENTS = [
	{
		achievementId: "joined",
		artKey: "joined",
		category: "getting_started",
		copy: "You found your way to the fire.",
		sparks: 10,
		title: "Joined Xolace",
	},
	{
		achievementId: "first-session",
		artKey: "first-session",
		category: "getting_started",
		copy: "You said what was there. That's the hardest part.",
		goal: { counter: "sessions", target: 1 },
		sparks: 10,
		title: "First session",
	},
	showingUp(5, 25),
	showingUp(10, 25),
	showingUp(25, 25),
	showingUp(50, 50),
	showingUp(100, 50),
	showingUp(250, 100),
	showingUp(500, 100),
	showingUp(1000, 100),
	exploring("first-talk", "First talk", "You talked it through out loud."),
	{
		...exploring(
			"first-read",
			"First read",
			"You finished something from the library."
		),
		goal: { counter: "pieces_read", target: 1 },
	},
	read(5, 25),
	read(10, 25),
	read(25, 50),
	read(50, 50),
	exploring(
		"first-quote",
		"First quote saved",
		"You saved words that spoke to you."
	),
	exploring("sat-with-it", "Sat with it", "You stayed with what came up."),
	exploring("first-exercise", "First exercise", "You tried something new."),
	exploring(
		"first-kindling",
		"First kindling finished",
		"You followed it through."
	),
	exploring(
		"asked-for-chat",
		"Asked for a chat",
		"You reached out. That takes courage."
	),
	exploring(
		"first-xolacer-chat",
		"First Xolacer chat",
		"You had your first conversation with a Xolacer."
	),
	exploring(
		"shared-reflection",
		"Shared a reflection",
		"Your words might help someone feel less alone."
	),
	exploring(
		"first-listen",
		"First listen",
		"You let something carry you for a while."
	),
	understanding(
		1,
		"First area unlocked",
		"Xolace is starting to understand you."
	),
	understanding(3, "Three areas unlocked", "The picture is filling in."),
	understanding(8, "Every area unlocked", "Xolace sees the whole of you."),
] as const satisfies readonly Achievement[];

export type FixedAchievementId =
	(typeof FIXED_ACHIEVEMENTS)[number]["achievementId"];
/** Any id the catalog knows, checked at compile time at every award site. */
export type AchievementId = FixedAchievementId | `streak-${number}`;

/** The fixed rungs counting `counter`, in catalog (lowest-first) order. */
export function rungsCounting(counter: GoalCounter) {
	return FIXED_ACHIEVEMENTS.flatMap((a) =>
		"goal" in a && a.goal.counter === counter
			? [{ achievementId: a.achievementId, target: a.goal.target }]
			: []
	);
}

/** The Showing up rung at exactly `days` days showed up, if it is one. */
export function showingUpRungAt(days: number): FixedAchievementId | undefined {
	return rungsCounting("days_showed_up").find((r) => r.target === days)
		?.achievementId;
}

/** Every fixed rung counting `counter` that `count` has reached, lowest first. */
export function ladderRungsThrough(
	counter: GoalCounter,
	count: number
): FixedAchievementId[] {
	return rungsCounting(counter)
		.filter((r) => r.target <= count)
		.map((r) => r.achievementId);
}

/** The top fixed rung counting `counter`: past it, the count earns nothing new. */
export function ladderTop(counter: GoalCounter): number {
	return Math.max(0, ...rungsCounting(counter).map((r) => r.target));
}

// ── Streak ladder ────────────────────────────────────────────────

/** Rungs up to 200, each a fire stage with 1…n rim pips (#687). */
const STREAK_STAGES: readonly { stage: string; rungs: readonly number[] }[] = [
	{ rungs: [3, 5, 7], stage: "spark" },
	{ rungs: [10, 14, 21], stage: "kindling" },
	{ rungs: [30, 40, 50, 60], stage: "campfire" },
	{ rungs: [70, 80, 90], stage: "moon" },
	{ rungs: [100, 120, 140, 160, 180], stage: "hearth" },
];
/** The last fixed rung, and the first to share the open-ended bonfire art. */
const STREAK_BONFIRE_FROM = 200;
/** Past the bonfire, one rung lands every this many days (230, 260, …). */
const STREAK_EVERY_AFTER_BONFIRE = 30;
const DAYS_PER_YEAR = 365;
/** Year k shows k stars, but art and stars stop growing here. */
const STREAK_YEAR_ART_CAP = 5;

/** Warmer copy for the early rungs, where people most need a nudge. */
const EARLY_STREAK_COPY: Readonly<Record<number, string>> = {
	3: "Three days in. The spark is catching.",
	5: "Five days. It's starting to glow.",
	10: "Ten days. You keep coming back.",
	14: "Two weeks by the fire.",
	21: "Three weeks. This is becoming yours.",
};

/** Sparks per rung: the first tier whose `upTo` covers the streak (#683). */
const STREAK_SPARK_TIERS: readonly { upTo: number; sparks: Sparks }[] = [
	{ sparks: 10, upTo: 7 },
	{ sparks: 25, upTo: 30 },
	{ sparks: 50, upTo: 100 },
	{ sparks: 100, upTo: Number.POSITIVE_INFINITY },
];

const isYearRung = (days: number) => days % DAYS_PER_YEAR === 0;

/** Is a streak of `days` a badge rung? Earned the first time the streak reaches it. */
export function isStreakRung(days: number): boolean {
	if (!Number.isInteger(days) || days <= 0) {
		return false;
	}
	if (isYearRung(days)) {
		return true;
	}
	if (days >= STREAK_BONFIRE_FROM) {
		return (days - STREAK_BONFIRE_FROM) % STREAK_EVERY_AFTER_BONFIRE === 0;
	}
	return STREAK_STAGES.some(({ rungs }) => rungs.includes(days));
}

/** Yearly rungs win where the every-30 rule lands on one too (1460). */
function streakArtKey(days: number): string {
	if (isYearRung(days)) {
		return `streak-year-${Math.min(days / DAYS_PER_YEAR, STREAK_YEAR_ART_CAP)}`;
	}
	for (const { stage, rungs } of STREAK_STAGES) {
		const pip = rungs.indexOf(days);
		if (pip !== -1) {
			return `streak-${stage}-${pip + 1}`;
		}
	}
	return "streak-bonfire";
}

function streakSparks(days: number): Sparks {
	const tier = STREAK_SPARK_TIERS.find(({ upTo }) => days <= upTo);
	return tier?.sparks ?? 100;
}

function streakTitle(days: number): string {
	if (!isYearRung(days)) {
		return `${days} days by the fire`;
	}
	const years = days / DAYS_PER_YEAR;
	return years === 1 ? "A year by the fire" : `${years} years by the fire`;
}

/** The rung at `days`, or undefined when `days` isn't one. */
function streakAchievement(days: number): Achievement | undefined {
	if (!isStreakRung(days)) {
		return;
	}
	return {
		achievementId: `streak-${days}`,
		artKey: streakArtKey(days),
		category: "streak",
		copy: EARLY_STREAK_COPY[days] ?? streakMilestoneCopy(days),
		goal: { counter: "streak", target: days },
		sparks: streakSparks(days),
		title: streakTitle(days),
	};
}

/** The first streak rung longer than `days`. */
export function nextStreakRungAfter(days: number): number {
	let next = Math.max(Math.floor(days), 0) + 1;
	while (!isStreakRung(next)) {
		next++;
	}
	return next;
}

/** Every streak rung up to and including `days`, shortest first. */
export function streakAchievementsThrough(days: number): Achievement[] {
	const rungs: Achievement[] = [];
	for (let n = 1; n <= days; n++) {
		const rung = streakAchievement(n);
		if (rung) {
			rungs.push(rung);
		}
	}
	return rungs;
}

const STREAK_ID = /^streak-([1-9]\d*)$/;

/** Look up any achievement by id, streak rungs included. */
export function findAchievement(
	achievementId: string
): Achievement | undefined {
	const streak = STREAK_ID.exec(achievementId);
	if (streak?.[1]) {
		return streakAchievement(Number(streak[1]));
	}
	return FIXED_ACHIEVEMENTS.find((a) => a.achievementId === achievementId);
}

/**
 * The generic badge (the pinned master), shown as a locked silhouette for any
 * artKey whose image isn't uploaded to this deployment yet.
 */
export const BADGE_ART_FALLBACK = "fallback";

/**
 * Every distinct image an achievement can show (#687): one `badge_art` row
 * each, so the upload script has a finite list however long the ladder runs.
 */
export const BADGE_ART_KEYS: readonly string[] = [
	...FIXED_ACHIEVEMENTS.map((a) => a.artKey),
	...STREAK_STAGES.flatMap(({ stage, rungs }) =>
		rungs.map((_, pip) => `streak-${stage}-${pip + 1}`)
	),
	"streak-bonfire",
	...Array.from(
		{ length: STREAK_YEAR_ART_CAP },
		(_, year) => `streak-year-${year + 1}`
	),
];

/** What `badge_art` may hold: every badge's image plus the fallback. */
export const UPLOADABLE_ART_KEYS: ReadonlySet<string> = new Set([
	...BADGE_ART_KEYS,
	BADGE_ART_FALLBACK,
]);
