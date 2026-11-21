const ART: Record<string, number> = {
	"first-exercise": require("@/assets/images/badges/fixtures/first-exercise.webp"),
	"first-kindling": require("@/assets/images/badges/fixtures/first-kindling.webp"),
	"first-listen": require("@/assets/images/badges/fixtures/first-listen.webp"),
	"first-quote": require("@/assets/images/badges/fixtures/first-quote.webp"),
	"first-read": require("@/assets/images/badges/fixtures/first-read.webp"),
	"first-session": require("@/assets/images/badges/fixtures/first-session.webp"),
	"first-talk": require("@/assets/images/badges/fixtures/first-talk.webp"),
	"first-xolacer-chat": require("@/assets/images/badges/fixtures/first-xolacer-chat.webp"),
	joined: require("@/assets/images/badges/fixtures/joined.webp"),
	"read-5": require("@/assets/images/badges/fixtures/read-5.webp"),
	"sat-with-it": require("@/assets/images/badges/fixtures/sat-with-it.webp"),
	"showing-up-5": require("@/assets/images/badges/fixtures/showing-up-5.webp"),
	"showing-up-10": require("@/assets/images/badges/fixtures/showing-up-10.webp"),
	"showing-up-25": require("@/assets/images/badges/fixtures/showing-up-25.webp"),
	"showing-up-50": require("@/assets/images/badges/fixtures/showing-up-50.webp"),
	"showing-up-100": require("@/assets/images/badges/fixtures/showing-up-100.webp"),
	"streak-3": require("@/assets/images/badges/fixtures/streak-spark-1.webp"),
	"streak-5": require("@/assets/images/badges/fixtures/streak-spark-2.webp"),
	"streak-7": require("@/assets/images/badges/fixtures/streak-spark-3.webp"),
	"streak-10": require("@/assets/images/badges/fixtures/streak-kindling-1.webp"),
	"streak-14": require("@/assets/images/badges/fixtures/streak-kindling-2.webp"),
	"streak-21": require("@/assets/images/badges/fixtures/streak-kindling-3.webp"),
	"streak-30": require("@/assets/images/badges/fixtures/streak-campfire-1.webp"),
	"understanding-1": require("@/assets/images/badges/fixtures/understanding-1.webp"),
	"understanding-3": require("@/assets/images/badges/fixtures/understanding-3.webp"),
	"understanding-8": require("@/assets/images/badges/fixtures/understanding-8.webp"),
};

const BORROWED: Record<string, string> = {
	"asked-for-chat": "first-xolacer-chat",
	"read-10": "read-5",
	"read-25": "read-5",
	"read-50": "read-5",
	"shared-reflection": "first-talk",
	"showing-up-250": "showing-up-100",
	"showing-up-500": "showing-up-100",
	"showing-up-1000": "showing-up-100",
};

export const fixtureArt = (id: string): number | null =>
	ART[id] ?? ART[BORROWED[id] ?? ""] ?? ART["streak-30"] ?? null;
