/**
 * The board's ten entries (`LanternAlive.dc.html`'s `E`, the prototype's `lantern-entries.ts`),
 * as Convex serves a card. The returning reader: `thoughts-at-night` is at .4, `small-things` and
 * `heart` are finished, `panic` and `winter` are saved.
 */
import type { Id } from "@xolace/backend/dataModel";
import { photo } from "@/features/lantern/dev/covers";
import type { CardItem, Kind } from "@/features/lantern/lantern-model";

type Seed = {
	title: string;
	kind: Kind;
	subject: string;
	read: number;
	listen?: number;
	views: number;
	cover: string;
};

const SEEDS = {
	burnout: {
		cover: photo(
			"#8A5A2E",
			"#C99A5B",
			"#F1DDB0",
			74,
			24,
			"rgba(255,240,200,.55)"
		),
		kind: "explainer",
		read: 6,
		subject: "burnout",
		title: "Burnout, in plain words",
		views: 1420,
	},
	exams: {
		cover: photo(
			"#2F5D50",
			"#6E9C82",
			"#E4D9B4",
			28,
			24,
			"rgba(255,250,215,.6)"
		),
		kind: "explainer",
		listen: 5,
		read: 5,
		subject: "exams",
		title: "Exam stress isn’t a character flaw",
		views: 3200,
	},
	fine: {
		cover: photo(
			"#C77D5B",
			"#E7B07E",
			"#F6E2C0",
			60,
			30,
			"rgba(255,248,220,.6)"
		),
		kind: "story",
		read: 6,
		subject: "loneliness",
		title: "When everyone else seems fine",
		views: 940,
	},
	friend: {
		cover: photo(
			"#5A4C8C",
			"#9B88D6",
			"#E6DAF5",
			64,
			28,
			"rgba(255,255,255,.5)"
		),
		kind: "advice",
		read: 3,
		subject: "friendship",
		title: "Texting a friend when you’re not okay",
		views: 690,
	},
	heart: {
		cover: photo(
			"#7A4E6E",
			"#C27D93",
			"#F2C9B8",
			70,
			70,
			"rgba(255,230,220,.5)"
		),
		kind: "advice",
		listen: 4,
		read: 3,
		subject: "anxiety",
		title: "Five ways to steady a racing heart",
		views: 1710,
	},
	panic: {
		cover: photo(
			"#3B5D72",
			"#7FA9B5",
			"#E8D8C4",
			68,
			22,
			"rgba(255,255,255,.55)"
		),
		kind: "explainer",
		listen: 6,
		read: 5,
		subject: "panic",
		title: "What a panic attack actually is",
		views: 2100,
	},
	ready: {
		cover: photo(
			"#3E6E8C",
			"#86B3C9",
			"#F3E6CF",
			50,
			20,
			"rgba(255,246,210,.6)"
		),
		kind: "story",
		read: 5,
		subject: "self-worth",
		title: "I stopped waiting to feel ready",
		views: 410,
	},
	"small-things": {
		cover: photo(
			"#2B2A4A",
			"#5B5687",
			"#C9A27E",
			30,
			30,
			"rgba(255,236,200,.6)"
		),
		kind: "advice",
		read: 4,
		subject: "sleep",
		title: "Small things to try when sleep won’t come",
		views: 860,
	},
	"thoughts-at-night": {
		cover: photo(
			"#141A35",
			"#33386A",
			"#8A6A8C",
			72,
			26,
			"rgba(255,222,160,.75)"
		),
		kind: "explainer",
		listen: 7,
		read: 6,
		subject: "sleep",
		title: "Why your mind gets loud at night",
		views: 1240,
	},
	winter: {
		cover: photo(
			"#5E6B78",
			"#A9B4BC",
			"#E9E4DC",
			36,
			24,
			"rgba(255,255,255,.6)"
		),
		kind: "story",
		read: 7,
		subject: "grief",
		title: "The first winter without her",
		views: 530,
	},
} as const satisfies Record<string, Seed>;

export type EntrySlug = keyof typeof SEEDS;

/** The returning reader's marks and saves. */
const READ: Partial<Record<EntrySlug, Partial<CardItem>>> = {
	heart: { finished: true },
	panic: { saved: true },
	"small-things": { finished: true },
	"thoughts-at-night": { position: 0.4 },
	winter: { saved: true },
};

/** One entry as a card. `fresh`: a first visit, nothing read or saved. */
export function card(slug: EntrySlug, fresh = false): CardItem {
	const s: Seed = SEEDS[slug];
	return {
		_id: `dev-${slug}` as Id<"library_entries">,
		coverThumbhash: undefined,
		coverThumbUrl: undefined,
		coverUrl: s.cover,
		dek: "",
		finished: false,
		kind: s.kind,
		listenMin: s.listen,
		newUntil: undefined,
		primarySubject: s.subject,
		readMin: s.read,
		saved: false,
		slug,
		title: s.title,
		views: s.views,
		...(fresh ? {} : READ[slug]),
	};
}

export const SLUGS = Object.keys(SEEDS) as EntrySlug[];
