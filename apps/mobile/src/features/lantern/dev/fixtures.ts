import type { Id } from "@xolace/backend/dataModel";
import { photo } from "@/features/lantern/dev/covers";
import { card, type EntrySlug, SLUGS } from "@/features/lantern/dev/entries";
import type { HomeView } from "@/features/lantern/home/home-data";
import type { HubTrack, HubView } from "@/features/lantern/hub/hub-data";
import type { CardItem, Subject } from "@/features/lantern/lantern-model";

const AWAKE: HubTrack = {
	_id: "dev-awake" as Id<"audio_tracks">,
	attribution: "Sage",
	durationSec: 300,
	episodeNumber: undefined,
	family: "support",
	series: undefined,
	seriesTitle: undefined,
	slug: "not-the-only-one-awake",
	thumbhash: undefined,
	thumbUrl: photo(
		"#2C2550",
		"#5B4C9A",
		"#9D8CE0",
		70,
		30,
		"rgba(255,255,255,.35)"
	),
	title: "You’re not the only one awake",
	topicTitle: "Sleep",
};
const LISTEN = "listen" as const;

type HubSeed = {
	slug: string;
	title: string;
	intro: string;
	cover: string;
	items: readonly (EntrySlug | typeof LISTEN)[];
};

const HUB_SEEDS: readonly HubSeed[] = [
	{
		cover: photo(
			"#1B2142",
			"#41447A",
			"#B07F86",
			66,
			30,
			"rgba(255,214,160,.7)"
		),
		intro: "For the hours when sleep won’t come and your thoughts won’t stop.",
		items: [
			"thoughts-at-night",
			"small-things",
			LISTEN,
			"heart",
			"ready",
			"friend",
		],
		slug: "nights",
		title: "Nights that won’t end",
	},
	{
		cover: photo(
			"#2F5D50",
			"#79A88C",
			"#EBDDB2",
			30,
			26,
			"rgba(255,250,215,.6)"
		),
		intro: "Pressure, panic and the space between papers.",
		items: ["exams", "panic", "heart", "friend", "ready"],
		slug: "exams",
		title: "Exam season",
	},
	{
		cover: photo(
			"#5E6B78",
			"#AAB5BD",
			"#EDE6DC",
			40,
			24,
			"rgba(255,255,255,.6)"
		),
		intro: "Grief keeps its own time. These go at its pace.",
		items: ["winter", "fine", "friend"],
		slug: "loss",
		title: "After a loss",
	},
];

const hubBase = (h: HubSeed) => ({
	_id: `dev-hub-${h.slug}` as Id<"library_hubs">,
	coverThumbhash: undefined,
	coverUrl: h.cover,
	intro: h.intro,
	slug: h.slug,
	title: h.title,
});

export function hub(slug = "nights", fresh = false): HubView {
	const h = HUB_SEEDS.find((s) => s.slug === slug) ?? HUB_SEEDS[0];
	return {
		...hubBase(h),
		items: h.items.map((it) =>
			it === LISTEN
				? { kind: "audio" as const, track: AWAKE }
				: { entry: card(it, fresh), kind: "entry" as const }
		),
	};
}

const FOR_YOU: readonly [EntrySlug, HomeView["forYou"][number]["reason"]][] = [
	["exams", { axis: "audience", slug: "student" }],
	["panic", { axis: "emotion", slug: "anxious" }],
	["small-things", { axis: "lifeArea", slug: "sleep" }],
	["fine", { axis: "audience", slug: "student" }],
	["burnout", { axis: "lifeArea", slug: "stress" }],
];

const AUDIENCES = ["student", "parent", "carer", "worker"];

export function home(first = false): HomeView {
	const night = card("thoughts-at-night", first);
	return {
		audiences: AUDIENCES.map((slug) => ({ count: 1, slug })),
		continue: first ? null : { ...night, position: night.position ?? 0 },
		forYou: FOR_YOU.map(([slug, reason]) => ({
			entry: card(slug, first),
			reason,
		})),
		hubs: HUB_SEEDS.map((h) => ({
			...hubBase(h),
			entries: h.items.filter((i) => i !== LISTEN).length,
			listens: h.items.filter((i) => i === LISTEN).length,
		})),
		readingAs: first ? null : ["student"],
	};
}

export const SUBJECTS: readonly Subject[] = [
	["anxiety", 3],
	["asking-for-help", 1],
	["body", 2],
	["burnout", 1],
	["confidence", 1],
	["exams", 1],
	["family", 1],
	["friendship", 2],
	["grief", 1],
	["loneliness", 2],
	["overthinking", 1],
	["panic", 2],
	["routines", 1],
	["self-worth", 1],
	["sleep", 2],
	["stress", 2],
	["university", 2],
	["work", 1],
].map(([slug, count]) => ({ count: count as number, slug: slug as string }));

export const ofKind = (kind: CardItem["kind"]) =>
	SLUGS.map((s) => card(s)).filter((e) => e.kind === kind);

export const SAVED: readonly CardItem[] = [card("panic"), card("winter")];
