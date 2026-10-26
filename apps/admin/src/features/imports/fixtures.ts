// Sample import runs for the admin v1 UI. The run in review is a plausible next drop
// of the prod library tree: one edited explainer, a new exam-season set, and one
// record for each hard gate the backend rejects. Replaced by Convex reads.
import { FIXTURE_ENTRIES, FIXTURE_SOURCES } from "@/features/library/fixtures";

import type { ImportItem, ImportRun, MediaFile } from "./types";

const MB = 1024 * 1024;

const SLEEP_BODY_BEFORE = `# Sleep: why it matters

Sometimes the problem isn't that you don't want to sleep.

- Your body is tired.
- But your mind is still awake.
- You're thinking about tomorrow.
- Replaying yesterday.
- Checking your phone.

Eventually, morning arrives and you wonder why you're exhausted.

## Why does sleep matter?

Sleep gives your body and brain time to recover.

When you consistently don't get enough quality sleep, you may notice changes in your energy, concentration, mood and ability to handle everyday challenges.

You may become more irritable. Small problems may feel bigger. Concentration may become harder.

## The relationship goes both ways

Mental-health difficulties can interfere with sleep.`;

const SLEEP_BODY_AFTER = `# Sleep: why it matters

Sometimes the problem isn't that you don't want to sleep.

- Your body is tired.
- But your mind is still awake.
- You're thinking about tomorrow.
- Replaying yesterday.
- Checking your phone.

Eventually, morning arrives and you wonder why you're exhausted.

## Why does sleep matter?

Sleep gives your body and brain time to recover. Most students need seven to nine hours, and a regular wake-up time matters as much as the total.

When you consistently don't get enough quality sleep, you may notice changes in your energy, concentration, mood and ability to handle everyday challenges.

You may become more irritable. Small problems may feel bigger.

![A week of sleep logged in a notebook](sleep-log.png)

## The relationship goes both ways

Mental-health difficulties can interfere with sleep.`;

const cover = (name: string, bytes = 2.4 * MB): MediaFile => ({
	bytes: Math.round(bytes),
	kind: "cover",
	name,
});

const TOUCHED = new Set([
	"anxiety-what-helps",
	"nhs",
	"sleep-why-it-matters",
	"before-you-arrive",
	"stress-what-helps",
]);

// Everything already stored and identical in the drop: the bulk of a real re-run.
const UNCHANGED: ImportItem[] = [
	...FIXTURE_SOURCES.filter((source) => !TOUCHED.has(source.slug)).map(
		(source): ImportItem => ({
			action: "unchanged",
			id: `source:${source.slug}`,
			slug: source.slug,
			title: source.name,
			type: "source",
		})
	),
	...FIXTURE_ENTRIES.filter((entry) => !TOUCHED.has(entry.slug)).map(
		(entry): ImportItem => ({
			action: "unchanged",
			id: `entry:${entry.slug}`,
			slug: entry.slug,
			title: entry.title,
			type: "entry",
		})
	),
	{
		action: "unchanged",
		id: "hub:back-at-university",
		slug: "back-at-university",
		title: "Back at university",
		type: "hub",
	},
	{
		action: "unchanged",
		id: "hub:when-you-cant-switch-off",
		slug: "when-you-cant-switch-off",
		title: "When you can't switch off",
		type: "hub",
	},
	...FIXTURE_ENTRIES.filter((entry) => entry.narration).map(
		(entry): ImportItem => ({
			action: "unchanged",
			id: `narration:${entry.slug}`,
			slug: entry.slug,
			title: entry.title,
			type: "narration",
		})
	),
];

const REVIEW_ITEMS: ImportItem[] = [
	{
		action: "rejected",
		id: "entry:a-term-of-small-wins",
		rejection:
			"A first-hand story (kind story, reuse original) needs consentRecordedAt before it can be imported.",
		slug: "a-term-of-small-wins",
		title: "A term of small wins",
		type: "entry",
	},
	{
		action: "rejected",
		id: "entry:revision-without-burning-out",
		rejection:
			'The image "revision-plan.png" has no alt text. Add alt text, or list it in decorativeImages if it is decorative.',
		slug: "revision-without-burning-out",
		title: "Revision without burning out",
		type: "entry",
	},
	{
		action: "rejected",
		id: "entry:what-the-numbers-say-about-exams",
		rejection:
			'Credits an unknown source "hesa". Add it to sources.json first.',
		slug: "what-the-numbers-say-about-exams",
		title: "What the numbers say about exams",
		type: "entry",
	},
	{
		action: "changed",
		changes: [
			{ after: "7 days", before: "Not set", field: "Refresh every" },
			{
				after:
					"Contains public sector information licensed under the Open Government Licence v3.0.",
				before: "Contains public sector information from nhs.uk.",
				field: "Attribution",
			},
		],
		id: "source:nhs",
		slug: "nhs",
		title: "NHS",
		type: "source",
	},
	{
		action: "changed",
		changes: [
			{
				after:
					"How sleep and mental health shape each other, the cycle that keeps you awake, and how much sleep you actually need.",
				before:
					"Why sleep and mental health affect each other, the cycle that keeps you awake, and the signs your sleep needs attention.",
				field: "Dek",
			},
			{
				after: "sleep, health, studies, routine",
				before: "sleep, health, studies",
				field: "Facets · life area",
			},
			{
				after: SLEEP_BODY_AFTER,
				before: SLEEP_BODY_BEFORE,
				field: "Body",
				long: true,
			},
		],
		id: "entry:sleep-why-it-matters",
		slug: "sleep-why-it-matters",
		title: "Sleep: why it matters",
		type: "entry",
		warnings: [
			"The body changed, so the safety review is cleared. This explainer goes back to Needs review and stays live on its old body until someone signs off.",
		],
	},
	{
		action: "changed",
		changes: [
			{
				after: "advice/anxiety-what-helps-v2.png",
				before: "advice/anxiety-what-helps.png",
				field: "Cover",
			},
		],
		id: "entry:anxiety-what-helps",
		media: [cover("anxiety-what-helps-v2.png", 2.1 * MB)],
		slug: "anxiety-what-helps",
		title: "Anxiety: what helps",
		type: "entry",
	},
	{
		action: "changed",
		changes: [
			{
				after:
					"Not knowing feels so stressful, why? · Setting expectations you can adjust · Am I good enough for this? · Decoding the place, words and people · Exam stress: what helps",
				before:
					"Not knowing feels so stressful, why? · Setting expectations you can adjust · Am I good enough for this? · Decoding the place, words and people",
				field: "Items",
			},
		],
		id: "hub:before-you-arrive",
		slug: "before-you-arrive",
		title: "Before you arrive",
		type: "hub",
	},
	{
		action: "new",
		id: "source:anxiety-uk",
		slug: "anxiety-uk",
		title: "Anxiety UK",
		type: "source",
	},
	{
		action: "new",
		id: "entry:exam-stress-why-it-builds",
		media: [cover("exam-stress-why-it-builds.png")],
		slug: "exam-stress-why-it-builds",
		title: "Exam stress: why it builds",
		type: "entry",
		warnings: [
			"Explainers go in as Needs review. It can't go live until its body is safety-reviewed.",
		],
	},
	{
		action: "new",
		id: "entry:exam-stress-what-helps",
		media: [cover("exam-stress-what-helps.png", 2.6 * MB)],
		slug: "exam-stress-what-helps",
		title: "Exam stress: what helps",
		type: "entry",
	},
	{
		action: "new",
		id: "entry:sleep-tips-from-the-nhs",
		slug: "sleep-tips-from-the-nhs",
		title: "Sleep tips from the NHS",
		type: "entry",
		warnings: [
			"Verbatim copy retrieved 54 days ago; NHS asks for a refresh every 7 days. Re-pull it from nhs.uk.",
		],
	},
	{
		action: "new",
		id: "hub:exam-season",
		media: [cover("exam-season.png", 3.1 * MB)],
		slug: "exam-season",
		title: "Exam season",
		type: "hub",
	},
	{
		action: "new",
		id: "narration:exam-stress-what-helps",
		media: [
			{
				bytes: Math.round(6.2 * MB),
				kind: "audio",
				name: "Exam stress - what helps.mp3",
			},
			{
				bytes: 4800,
				kind: "transcript",
				name: "Exam stress - what helps.txt",
			},
		],
		slug: "exam-stress-what-helps",
		title: "Exam stress: what helps",
		type: "narration",
	},
	{
		action: "changed",
		changes: [
			{ after: "4:12", before: "3:58", field: "Duration" },
			{
				after: "Re-recorded with the new intro.",
				before: "Original recording.",
				field: "Audio",
			},
		],
		id: "narration:stress-what-helps",
		media: [
			{
				bytes: Math.round(5.8 * MB),
				kind: "audio",
				name: "Stress - what helps.mp3",
			},
		],
		slug: "stress-what-helps",
		title: "Stress: what helps",
		type: "narration",
	},
	...UNCHANGED,
];

const TRACK_TITLES = [
	"Meditation Mindfulness Ambient",
	"Sacred Fire of Mindfulness",
	"Cultivation | Music for Growth",
	"The Noise That Doesn't Turn Off",
	"Too Many Small Doors",
	"The Flatness No One Warned You About",
];

export const FIXTURE_RUNS: ImportRun[] = [
	{
		createdAt: 1_793_007_600_000,
		createdBy: "Nathaniel",
		files: "Library tree · 4 JSON, 6 bodies, 6 media",
		id: "run-0426",
		items: REVIEW_ITEMS,
		state: "review",
		target: "library",
	},
	{
		appliedAt: 1_792_768_500_000,
		createdAt: 1_792_768_200_000,
		createdBy: "Nathaniel",
		files: "Library tree · 3 JSON, 2 bodies, 3 media",
		id: "run-0425",
		items: [
			{
				action: "new",
				id: "entry:what-they-dont-put-on-the-transcript",
				run: { status: "live" },
				slug: "what-they-dont-put-on-the-transcript",
				title: "What they don't put on the transcript",
				type: "entry",
			},
			{
				action: "changed",
				id: "entry:depression-what-it-is",
				run: { status: "live" },
				slug: "depression-what-it-is",
				title: "Depression: what it is",
				type: "entry",
			},
			{
				action: "new",
				id: "narration:depression-what-it-is",
				run: {
					failure: {
						message: "ffmpeg exited with code 1: the file has no audio stream.",
						step: "Transcode narration",
					},
					status: "failed",
				},
				slug: "depression-what-it-is",
				title: "Depression: what it is",
				type: "narration",
			},
			{
				action: "new",
				id: "narration:anxiety-what-helps",
				run: { status: "live" },
				slug: "anxiety-what-helps",
				title: "Anxiety: what helps",
				type: "narration",
			},
			{
				action: "unchanged",
				id: "source:nhs",
				slug: "nhs",
				title: "NHS",
				type: "source",
			},
		],
		state: "done",
		target: "library",
	},
	{
		appliedAt: 1_792_236_000_000,
		createdAt: 1_792_235_100_000,
		createdBy: "Ama",
		files: "Kindling tree · 2 JSON, 12 audio, 12 thumbnails",
		id: "run-0417",
		items: [
			...TRACK_TITLES.map(
				(title, index): ImportItem => ({
					action: index < 3 ? "new" : "changed",
					id: `track:${title}`,
					run: { status: "live" },
					slug: title.toLowerCase().replaceAll(/[^a-z]+/g, "-"),
					title,
					type: "track",
				})
			),
			{
				action: "changed",
				id: "topic:sleep_rest",
				run: { status: "live" },
				slug: "sleep_rest",
				title: "Sleep and rest",
				type: "topic",
			},
		],
		state: "done",
		target: "audio",
	},
	{
		createdAt: 1_788_307_200_000,
		createdBy: "Ama",
		files: "Library tree · 1 JSON",
		id: "run-0402",
		items: [
			{
				action: "changed",
				id: "source:student-minds",
				slug: "student-minds",
				title: "Student Minds",
				type: "source",
			},
		],
		state: "discarded",
		target: "library",
	},
];

/** The steps the ingest workflow runs per record type, in order. */
export const WORKFLOW_STEPS: Record<ImportItem["type"], string[]> = {
	entry: ["Upload cover", "Resize cover", "Upsert entry", "Index for search"],
	hub: ["Upload cover", "Upsert hub"],
	narration: ["Upload audio", "Transcode narration", "Cut preview", "Upsert"],
	source: ["Upsert source"],
	topic: ["Upload cover", "Upsert topic"],
	track: ["Upload audio", "Resize thumbnail", "Embed tags", "Upsert track"],
};

/** Where an item settles once processed, when it isn't simply Live. */
export const SETTLES_AS: Record<string, "needs_review"> = {
	"entry:exam-stress-why-it-builds": "needs_review",
	"entry:sleep-why-it-matters": "needs_review",
};

/** Fails at this step on the first attempt, so the Retry path shows up. */
export const FAILS_FIRST_TIME: Record<string, string> = {
	"narration:stress-what-helps": "Transcode narration",
};
