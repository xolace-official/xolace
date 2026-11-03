// PROTOTYPE (#684), throwaway: never merge. Mock catalog + one sample user's
// progress, from the catalog decision (#683). Only three badges have art yet,
// so each achievement borrows one of them.

const ART = {
	campfire: require("./art/master.webp"),
	door: require("./art/joined.webp"),
	spark: require("./art/streak5.webp"),
};

export type Achievement = {
	id: string;
	title: string;
	copy: string;
	sparks: number;
	art: number;
	/** ISO date when earned; absent = locked. */
	earnedAt?: string;
	/** Only on the next rung of a ladder. */
	progress?: { current: number; target: number; unit: string };
	plus?: boolean;
};

export type Category = { id: string; title: string; items: Achievement[] };

const STREAK_SPARKS = (n: number) =>
	n <= 7 ? 10 : n <= 30 ? 25 : n <= 100 ? 50 : 100;
const STREAK_RUNGS = [
	3, 5, 7, 10, 14, 21, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200,
	365,
];
const CURRENT_STREAK = 12;
const STREAK_EARNED: Record<number, string> = {
	3: "2026-10-14",
	5: "2026-10-16",
	7: "2026-10-18",
	10: "2026-10-21",
};

const streak: Achievement[] = STREAK_RUNGS.map((n) => {
	const next = STREAK_RUNGS.find((r) => !STREAK_EARNED[r]);
	return {
		art: n < 10 ? ART.spark : ART.campfire,
		copy: n === 7 ? "A week by the fire." : `${n} days. Still here.`,
		earnedAt: STREAK_EARNED[n],
		id: `streak-${n}`,
		progress:
			n === next
				? { current: CURRENT_STREAK, target: n, unit: "days in a row" }
				: undefined,
		sparks: STREAK_SPARKS(n),
		title: n === 365 ? "A year by the fire" : `${n} days by the fire`,
	};
});

const DAYS_ACTIVE = 18;
const showingUp: Achievement[] = [5, 10, 25, 50, 100, 250, 500, 1000].map(
	(n) => ({
		art: ART.campfire,
		copy: `You've come back ${n} different days.`,
		earnedAt: { 5: "2026-10-16", 10: "2026-10-24" }[n],
		id: `days-${n}`,
		progress:
			n === 25
				? { current: DAYS_ACTIVE, target: 25, unit: "days showing up" }
				: undefined,
		sparks: n <= 25 ? 25 : n <= 100 ? 50 : 100,
		title: `${n} days showing up`,
	})
);

export const CATALOG: Category[] = [
	{
		id: "start",
		items: [
			{
				art: ART.door,
				copy: "You found your way to the fire.",
				earnedAt: "2026-10-12",
				id: "joined",
				sparks: 10,
				title: "Joined Xolace",
			},
			{
				art: ART.spark,
				copy: "You said what was there. That's the hardest part.",
				earnedAt: "2026-10-12",
				id: "first-session",
				sparks: 10,
				title: "First session",
			},
			{
				art: ART.door,
				copy: "You noticed how today feels.",
				earnedAt: "2026-10-13",
				id: "first-checkin",
				sparks: 10,
				title: "First check-in",
			},
		],
		title: "Getting started",
	},
	{ id: "streak", items: streak, title: "Streak" },
	{ id: "showing-up", items: showingUp, title: "Showing up" },
	{
		id: "exploring",
		items: [
			{
				art: ART.door,
				copy: "You finished something from the library.",
				earnedAt: "2026-10-15",
				id: "first-read",
				sparks: 10,
				title: "First read",
			},
			{
				art: ART.door,
				copy: "5 different pieces read.",
				earnedAt: "2026-10-27",
				id: "read-5",
				sparks: 25,
				title: "Read 5 pieces",
			},
			{
				art: ART.door,
				copy: "10 different pieces read.",
				id: "read-10",
				progress: { current: 7, target: 10, unit: "pieces read" },
				sparks: 25,
				title: "Read 10 pieces",
			},
			{
				art: ART.door,
				copy: "You saved words that spoke to you.",
				earnedAt: "2026-10-19",
				id: "first-quote",
				sparks: 10,
				title: "First quote saved",
			},
			{
				art: ART.spark,
				copy: "You stayed with what came up.",
				id: "sat-with-it",
				sparks: 10,
				title: "Sat with it",
			},
			{
				art: ART.spark,
				copy: "You tried something new.",
				id: "first-exercise",
				sparks: 10,
				title: "First exercise",
			},
			{
				art: ART.campfire,
				copy: "You talked it through out loud.",
				id: "first-talk",
				plus: true,
				sparks: 10,
				title: "First talk",
			},
			{
				art: ART.door,
				copy: "You reached out. That takes courage.",
				id: "asked-chat",
				sparks: 10,
				title: "Asked for a chat",
			},
		],
		title: "Exploring",
	},
	{
		id: "understanding",
		items: [
			{
				art: ART.campfire,
				copy: "Xolace is starting to understand you.",
				earnedAt: "2026-10-22",
				id: "area-1",
				sparks: 50,
				title: "First area unlocked",
			},
			{
				art: ART.campfire,
				copy: "The picture is filling in.",
				id: "area-3",
				progress: { current: 2, target: 3, unit: "areas unlocked" },
				sparks: 50,
				title: "Three areas unlocked",
			},
			{
				art: ART.campfire,
				copy: "Xolace sees the whole of you.",
				id: "area-8",
				sparks: 50,
				title: "Every area unlocked",
			},
		],
		title: "Understanding",
	},
];

export const ALL = CATALOG.flatMap((c) => c.items);
export const EARNED = ALL.filter((a) => a.earnedAt).sort((a, b) =>
	(b.earnedAt ?? "").localeCompare(a.earnedAt ?? "")
);
export const SPARKS_EARNED = EARNED.reduce((sum, a) => sum + a.sparks, 0);
/** One freeze already bought. */
export const SPARK_BALANCE = SPARKS_EARNED - 50;
export const FREEZE_PRICE = 50;

/** What the unlock sheet shows: one badge, or a session that earned three. */
export const UNLOCK_ONE = [ALL.find((a) => a.id === "streak-14")];
export const UNLOCK_MANY = ["streak-14", "days-25", "read-10"].map((id) =>
	ALL.find((a) => a.id === id)
);

export const byId = (id: string) => ALL.find((a) => a.id === id);

export const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
