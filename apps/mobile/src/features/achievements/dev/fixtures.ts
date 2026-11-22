import type { Id } from "@xolace/backend/dataModel";
import type {
	AchievementsOverview,
	AchievementView,
} from "@/features/achievements/achievements-model";

const on = (month: number, day: number) => Date.UTC(2026, month - 1, day, 12);

const NO_ART = { fallback: false, thumbhash: null, url: null };

type Row = Omit<AchievementView, "art" | "pinned"> & { pinned?: boolean };

const badge = ({ pinned = false, ...row }: Row): AchievementView => ({
	...row,
	art: NO_ART,
	pinned,
});

type Locked = readonly [
	id: string,
	title: string,
	copy: string,
	sparks: number,
];
const locked = ([achievementId, title, copy, sparks]: Locked) =>
	badge({ achievementId, copy, sparks, title });

const progress = (current: number, target: number, unit: string) => ({
	current,
	target,
	unit,
});

const JOINED = badge({
	achievementId: "joined",
	copy: "You found your way to the fire.",
	earnedAt: on(7, 18),
	sparks: 10,
	title: "Joined Xolace",
});
const FIRST_SESSION = badge({
	achievementId: "first-session",
	copy: "You said what was there. That's the hardest part.",
	earnedAt: on(7, 18),
	sparks: 10,
	title: "First session",
});
const S3 = badge({
	achievementId: "streak-3",
	copy: "Three days in. The spark is catching.",
	earnedAt: on(10, 28),
	sparks: 10,
	title: "3 days by the fire",
});
const S5 = badge({
	achievementId: "streak-5",
	copy: "Five days. It's starting to glow.",
	earnedAt: on(10, 30),
	sparks: 10,
	title: "5 days by the fire",
});
const S7 = badge({
	achievementId: "streak-7",
	copy: "7 days by the fire. The flame's holding steady.",
	earnedAt: on(11, 1),
	sparks: 10,
	title: "7 days by the fire",
});
const S10 = badge({
	achievementId: "streak-10",
	copy: "Ten days. You keep coming back.",
	earnedAt: on(11, 4),
	pinned: true,
	sparks: 25,
	title: "10 days by the fire",
});
const S14 = badge({
	achievementId: "streak-14",
	copy: "Two weeks by the fire.",
	progress: progress(12, 14, "days in a row"),
	sparks: 25,
	title: "14 days by the fire",
});
const S30 = locked([
	"streak-30",
	"30 days by the fire",
	"30 days. This is a rhythm now.",
	25,
]);
const LATER_STREAK: readonly Locked[] = [
	[
		"streak-21",
		"21 days by the fire",
		"Three weeks. This is becoming yours.",
		25,
	],
	["streak-40", "40 days by the fire", "40 days. Still here.", 50],
	["streak-50", "50 days by the fire", "50 days. Still here.", 50],
	["streak-60", "60 days by the fire", "60 days. Still here.", 50],
	["streak-70", "70 days by the fire", "70 days. Still here.", 50],
	["streak-80", "80 days by the fire", "80 days. Still here.", 50],
	["streak-90", "90 days by the fire", "90 days. Still here.", 50],
	[
		"streak-100",
		"100 days by the fire",
		"100 days. The fire hasn't gone out once — not because you didn't stumble, but because you came back.",
		50,
	],
	...[120, 140, 160, 180, 200, 230, 260, 290, 320, 350].map(
		(d): Locked => [
			`streak-${d}`,
			`${d} days by the fire`,
			`${d} days. Still here.`,
			100,
		]
	),
	["streak-365", "A year by the fire", "365 days. Still here.", 100],
];
const U5 = badge({
	achievementId: "showing-up-5",
	copy: "You've come back 5 different days.",
	earnedAt: on(7, 24),
	sparks: 25,
	title: "5 days showing up",
});
const U10 = badge({
	achievementId: "showing-up-10",
	copy: "You've come back 10 different days.",
	earnedAt: on(10, 29),
	sparks: 25,
	title: "10 days showing up",
});
const U25 = badge({
	achievementId: "showing-up-25",
	copy: "You've come back 25 different days.",
	progress: progress(14, 25, "days showing up"),
	sparks: 25,
	title: "25 days showing up",
});
const LATER_SHOWING_UP = [50, 100, 250, 500, 1000].map(
	(d): Locked => [
		`showing-up-${d}`,
		`${d} days showing up`,
		`You've come back ${d} different days.`,
		d < 250 ? 50 : 100,
	]
);
const TALK = badge({
	achievementId: "first-talk",
	copy: "You talked it through out loud.",
	earnedAt: on(8, 2),
	pinned: true,
	sparks: 10,
	title: "First talk",
});
const READ_1 = badge({
	achievementId: "first-read",
	copy: "You finished something from the library.",
	earnedAt: on(8, 15),
	sparks: 10,
	title: "First read",
});
const READ_5 = badge({
	achievementId: "read-5",
	copy: "5 different pieces read.",
	progress: progress(2, 5, "pieces read"),
	sparks: 25,
	title: "Read 5",
});
const QUOTE = locked([
	"first-quote",
	"First quote saved",
	"You saved words that spoke to you.",
	10,
]);
const LATER_EXPLORING: readonly Locked[] = [
	["read-10", "Read 10", "10 different pieces read.", 25],
	["read-25", "Read 25", "25 different pieces read.", 50],
	["read-50", "Read 50", "50 different pieces read.", 50],
	["sat-with-it", "Sat with it", "You stayed with what came up.", 10],
	["first-exercise", "First exercise", "You tried something new.", 10],
	["first-kindling", "First kindling finished", "You followed it through.", 10],
	[
		"asked-for-chat",
		"Asked for a chat",
		"You reached out. That takes courage.",
		10,
	],
	[
		"first-xolacer-chat",
		"First Xolacer chat",
		"You had your first conversation with a Xolacer.",
		10,
	],
	[
		"shared-reflection",
		"Shared a reflection",
		"Your words might help someone feel less alone.",
		10,
	],
	[
		"first-listen",
		"First listen",
		"You let something carry you for a while.",
		10,
	],
];
const UND_1 = badge({
	achievementId: "understanding-1",
	copy: "Xolace is starting to understand you.",
	earnedAt: on(8, 20),
	pinned: true,
	sparks: 50,
	title: "First area unlocked",
});
const UND_3 = badge({
	achievementId: "understanding-3",
	copy: "The picture is filling in.",
	progress: progress(2, 3, "areas unlocked"),
	sparks: 50,
	title: "Three areas unlocked",
});
const UND_8 = locked([
	"understanding-8",
	"Every area unlocked",
	"Xolace sees the whole of you.",
	50,
]);

export const OVERVIEW: AchievementsOverview = {
	categories: [
		{
			achievements: [JOINED, FIRST_SESSION],
			category: "getting_started",
			title: "Getting started",
		},
		{
			achievements: [
				S3,
				S5,
				S7,
				S10,
				S14,
				locked(LATER_STREAK[0] as Locked),
				S30,
				...LATER_STREAK.slice(1).map(locked),
			],
			category: "streak",
			title: "Streak",
		},
		{
			achievements: [U5, U10, U25, ...LATER_SHOWING_UP.map(locked)],
			category: "showing_up",
			title: "Showing up",
		},
		{
			achievements: [
				TALK,
				READ_1,
				READ_5,
				...LATER_EXPLORING.slice(0, 3).map(locked),
				QUOTE,
				...LATER_EXPLORING.slice(3).map(locked),
			],
			category: "exploring",
			title: "Exploring",
		},
		{
			achievements: [UND_1, UND_3, UND_8],
			category: "understanding",
			title: "Understanding",
		},
	],
	sparks: {
		badgeCount: 11,
		balance: 145,
		earned: 195,
		freezePrice: 50,
		latest: S10,
		nextUp: S14,
	},
};

export const SHELF = {
	badgeCount: 11,
	badges: [S10, TALK, UND_1],
	balance: 145,
	earned: 195,
	freezeCap: 2,
	freezePrice: 50,
	freezes: 2,
	streakLapsed: false,
};

const unseen = (a: AchievementView, n: number) => ({
	achievementId: a.achievementId,
	art: NO_ART,
	copy: a.copy,
	earnedAt: on(11, 9),
	id: `fixture_${n}` as Id<"user_achievements">,
	sparks: a.sparks,
	title: a.title,
});

export const ONE = [unseen(QUOTE, 1)];
export const TWO = [unseen(QUOTE, 1), unseen(UND_3, 2)];
export const DAY_7 = [unseen(S7, 3)];
export const DAY_30 = [unseen(S30, 4)];
export const ARRIVAL_DAY = new Date(Date.UTC(2026, 10, 9, 12));

export const BACKFILL = {
	badges: 4,
	firstSight: true,
	ids: [
		"fixture_5",
		"fixture_6",
		"fixture_7",
		"fixture_8",
	] as Id<"user_achievements">[],
	sparks: 55,
	thumbnails: [JOINED, S3, S5, TALK].map((a) => ({
		achievementId: a.achievementId,
		art: NO_ART,
		title: a.title,
	})),
};
