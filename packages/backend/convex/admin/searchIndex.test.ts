// @vitest-environment edge-runtime
/**
 * The admin Search index page's backend: each meaning namespace's source rows
 * against the keys indexed in it, and the backfill buttons, which only
 * schedule. The rag and migrations components aren't registered in the test
 * backend, so both are faked at their client seams: a namespace is a list of
 * ready keys, a migration a status row.
 */
import type { MigrationStatus } from "@convex-dev/migrations";
import type { EntryId } from "@convex-dev/rag";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { migrations } from "../migrations";
import { rag } from "../rag";
import {
	asAdmin,
	asNewUser,
	asUnauthed,
	asUser,
} from "../test/harness.helpers";

// `migrations.ts` imports the aggregate, so the mock loads before the helpers would.
vi.mock("../lib/aggregates", async () =>
	(await import("../test/mocks.helpers")).aggregatesMock()
);

/** namespace → its ready keys. */
let indexed: Map<string, string[]>;
/** migration name → status; anything unset has never run. */
let migrationState: Map<string, Partial<MigrationStatus>>;

beforeEach(() => {
	vi.useFakeTimers();
	indexed = new Map();
	migrationState = new Map();
	vi.spyOn(rag, "getNamespace").mockImplementation(
		async (_ctx, { namespace }) =>
			await Promise.resolve(
				indexed.has(namespace)
					? ({ namespaceId: namespace } as Awaited<
							ReturnType<typeof rag.getNamespace>
						>)
					: null
			)
	);
	vi.spyOn(rag, "list").mockImplementation(
		async (_ctx, args) =>
			await Promise.resolve({
				continueCursor: "",
				isDone: true,
				page: (indexed.get(args.namespaceId ?? "") ?? []).map((key) => ({
					entryId: `entry-${key}` as EntryId,
					filterValues: [],
					importance: 1,
					key,
					status: "ready" as const,
				})),
			})
	);
	vi.spyOn(rag, "add").mockResolvedValue(
		{} as Awaited<ReturnType<typeof rag.add>>
	);
	// Reversed, like the component's own `getStatus`.
	vi.spyOn(migrations, "getStatus").mockImplementation(
		async (_ctx, { migrations: names = [] }) =>
			await Promise.resolve(
				[...names].reverse().map((ref) => {
					const name = typeof ref === "string" ? ref : getFunctionName(ref);
					return {
						isDone: false,
						latestStart: 0,
						name,
						processed: 0,
						state: "unknown" as const,
						...migrationState.get(name),
					};
				})
			)
	);
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const TRACK = {
	durationSec: 300,
	family: "support" as const,
	key: "support/x.m4a",
	sha256: "audio-sha",
	sourceTags: [],
	tags: ["calm"],
	thumbKey: "thumb/x.webp",
	thumbSha256: "thumb-sha",
	title: "Track",
};

const ENTRY = {
	dek: "D",
	kind: "advice" as const,
	lastReviewedAt: 1,
	primarySubject: "grief",
	readMin: 4,
	reuse: "adapted" as const,
};

async function seed() {
	const root = asUnauthed();
	const t = asAdmin(1, root);
	const ids = await t.run(async (ctx) => {
		const track = (slug: string, topic: string, extra = {}) =>
			ctx.db.insert("audio_tracks", {
				...TRACK,
				active: true,
				slug,
				title: slug.toUpperCase(),
				topic,
				...extra,
			});
		await track("calm-one", "audio_topic_grief");
		await track("calm-two", "audio_topic_grief", {
			series: "reality-not-false-hope",
		});
		// Retired: belongs nowhere, but its topic's namespace still shows.
		await track("old", "audio_topic_anger", { active: false });

		const entry = (slug: string, active: boolean) =>
			ctx.db.insert("library_entries", { ...ENTRY, active, slug, title: slug });
		const live = await entry("on-loss", true);
		const unindexed = await entry("on-anger", true);
		const retired = await entry("on-fear", false);

		for (const [title, active] of [
			["box_breathing", true],
			["body_scan", true],
			["old_exercise", false],
		] as const) {
			await ctx.db.insert("exercises", {
				active,
				createdAt: 0,
				estimatedMinutes: 2,
				intensityRange: { max: 10, min: 0 },
				steps: [],
				targetEmotions: [],
				title,
				type: "grounding",
				updatedAt: 0,
			});
		}
		return { live, retired, unindexed };
	});

	const xolacer = async (
		n: number,
		fields: Partial<Doc<"xolacer_profiles">> = {}
	): Promise<Id<"emotional_profiles">> => {
		const { profileId } = await asNewUser(n, root);
		await t.run((ctx) =>
			ctx.db.insert("xolacer_profiles", {
				active: true,
				bio: "I've sat where you are.",
				complete: true,
				createdAt: 0,
				displayName: `Xolacer ${n}`,
				emotionalProfileId: profileId,
				updatedAt: 0,
				...fields,
			})
		);
		return profileId;
	};
	const listening = await xolacer(2);
	const paused = await xolacer(3, { active: false });
	const noBio = await xolacer(4, { bio: undefined });
	return { ...ids, listening, noBio, paused, t };
}

const byIndex = (rows: Awaited<ReturnType<typeof statusOf>>, index: string) => {
	const row = rows.find((r) => r.index === index);
	if (!row) {
		throw new Error(`no ${index} row`);
	}
	return row;
};

const statusOf = (t: ReturnType<typeof asAdmin>) =>
	t.query(api.admin.searchIndex.status, {});

describe("admin/searchIndex gate", () => {
	it("rejects anyone without the admin role", async () => {
		await expect(
			asUnauthed().query(api.admin.searchIndex.status, {})
		).rejects.toThrow(/not_authenticated|Not authenticated/);
		await expect(
			asUser().mutation(api.admin.searchIndex.start, { index: "exercises" })
		).rejects.toThrow(/forbidden|Admin role required/);
	});
});

describe("admin/searchIndex status", () => {
	it("flags every namespace that is empty while it has active rows", async () => {
		const { t } = await seed();
		const rows = await statusOf(t);

		expect(
			byIndex(rows, "tracks").namespaces.map((n) => ({
				indexed: n.indexed,
				missing: n.missing.map((m) => m.label),
				namespace: n.namespace,
				source: n.source,
			}))
		).toEqual([
			// The retired track's topic: nothing belongs, nothing indexed.
			{
				indexed: 0,
				missing: [],
				namespace: "track:audio_topic_anger",
				source: 0,
			},
			{
				indexed: 0,
				missing: ["CALM-ONE", "CALM-TWO"],
				namespace: "track:audio_topic_grief",
				source: 2,
			},
			{
				indexed: 0,
				missing: ["CALM-TWO"],
				namespace: "track:reality-not-false-hope",
				source: 1,
			},
		]);
		expect(byIndex(rows, "library").namespaces[0]).toMatchObject({
			indexed: 0,
			missingCount: 2,
			namespace: "library",
			source: 2,
		});
		expect(byIndex(rows, "exercises").namespaces[0]).toMatchObject({
			indexed: 0,
			missingCount: 2,
			source: 2,
		});
		expect(byIndex(rows, "xolacers").namespaces[0]).toMatchObject({
			indexed: 0,
			missing: [{ label: "Xolacer 2" }],
			source: 1,
		});
	});

	it("counts indexed keys and lists what's missing and stale by slug", async () => {
		const { t, live, retired, listening, paused } = await seed();
		indexed.set("track:audio_topic_grief", ["calm-one", "calm-two"]);
		indexed.set("track:reality-not-false-hope", ["calm-two"]);
		indexed.set("track:audio_topic_anger", ["old"]);
		indexed.set("library", [live, retired, "gone-entry-id"]);
		indexed.set("exercises", ["box_breathing", "body_scan"]);
		indexed.set("xolacer", [listening, paused]);

		const rows = await statusOf(t);

		const tracks = byIndex(rows, "tracks").namespaces;
		expect(
			tracks.map((n) => [n.namespace, n.missingCount, n.staleCount])
		).toEqual([
			["track:audio_topic_anger", 0, 1],
			["track:audio_topic_grief", 0, 0],
			["track:reality-not-false-hope", 0, 0],
		]);
		expect(tracks[0]?.stale).toEqual([{ key: "old", label: "OLD" }]);

		const [library] = byIndex(rows, "library").namespaces;
		expect(library).toMatchObject({
			indexed: 3,
			missing: [{ label: "on-anger" }],
			missingCount: 1,
			source: 2,
			// A deleted row has no slug left; its key stands in.
			stale: [
				{ key: "gone-entry-id", label: "gone-entry-id" },
				{ key: retired, label: "on-fear" },
			],
			staleCount: 2,
			truncated: false,
		});

		expect(byIndex(rows, "exercises").namespaces[0]).toMatchObject({
			indexed: 2,
			missingCount: 0,
			staleCount: 0,
		});
		expect(byIndex(rows, "xolacers").namespaces[0]).toMatchObject({
			indexed: 2,
			missingCount: 0,
			stale: [{ key: paused, label: "Xolacer 3" }],
		});
	});

	it("shows the migrations component's status of the library and track series", async () => {
		const { t } = await seed();
		migrationState.set("migrations:backfillLibraryIndex", {
			isDone: true,
			latestEnd: 1000,
			processed: 3,
			state: "success",
		});
		migrationState.set("migrations:backfillTrackSearchText", {
			processed: 100,
			state: "inProgress",
		});

		const rows = await statusOf(t);

		const library = byIndex(rows, "library");
		expect(library.migrations.map((m) => [m.name, m.state])).toEqual([
			["migrations:backfillLibrarySearchText", "unknown"],
			["migrations:backfillLibraryIndex", "success"],
		]);
		// Embeds trail the index step by up to five minutes.
		expect(library.embedsUntil).toBe(1000 + 5 * 60 * 1000);
		expect(byIndex(rows, "tracks").migrations[0]).toMatchObject({
			processed: 100,
			state: "inProgress",
		});
		expect(byIndex(rows, "tracks").embedsUntil).toBeUndefined();
	});
});

describe("admin/searchIndex start", () => {
	const scheduled = (t: ReturnType<typeof asAdmin>) =>
		t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());

	it("re-runs a series through the migrations runner, searchText first", async () => {
		const t = asAdmin();
		await t.mutation(api.admin.searchIndex.start, { index: "library" });

		const [job] = await scheduled(t);
		expect(job?.name).toBe("migrations:run");
		expect(job?.args[0]).toEqual({
			fn: "migrations:backfillLibrarySearchText",
			next: ["migrations:backfillLibraryIndex"],
			reset: true,
		});
	});

	it("won't start a series that's already running", async () => {
		const t = asAdmin();
		migrationState.set("migrations:backfillTrackIndex", {
			state: "inProgress",
		});
		await expect(
			t.mutation(api.admin.searchIndex.start, { index: "tracks" })
		).rejects.toThrow(/already backfilling/);
		expect(await scheduled(t)).toEqual([]);
	});

	it("schedules the exercise re-index, shows it running, then done", async () => {
		const { t } = await seed();
		await t.mutation(api.admin.searchIndex.start, { index: "exercises" });

		expect(byIndex(await statusOf(t), "exercises").job).toMatchObject({
			startedByName: expect.any(String),
			state: "pending",
		});
		await expect(
			t.mutation(api.admin.searchIndex.start, { index: "exercises" })
		).rejects.toThrow(/already backfilling/);

		await t.finishAllScheduledFunctions(vi.runAllTimers);

		expect(byIndex(await statusOf(t), "exercises").job?.state).toBe("success");
		// The real indexExercises ran: one add per active exercise.
		expect(vi.mocked(rag.add)).toHaveBeenCalledTimes(2);
	});

	it("schedules the xolacer re-index as its own job", async () => {
		const t = asAdmin();
		await t.mutation(api.admin.searchIndex.start, { index: "xolacers" });

		const [job] = await scheduled(t);
		expect(job?.name).toBe("ai/xolacers/embed:indexAll");
		const rows = await statusOf(t);
		expect(byIndex(rows, "xolacers").job?.state).toBe("pending");
		expect(byIndex(rows, "exercises").job).toBeNull();
	});
});
