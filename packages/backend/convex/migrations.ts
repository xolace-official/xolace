import { Migrations } from "@convex-dev/migrations";
// After every deploy, run all of these. The meaning indexes (#568-#572) stay
// empty until they do, and an empty namespace logs as search "ran" with no
// topScore, which pollutes floor calibration:
//   bunx convex run migrations:runAll            (includes both index backfills)
//   bunx convex run ai/exercises/embed:indexExercises
//   bunx convex run ai/xolacers/embed:indexAll
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { reflectionRank } from "./lib/aggregates";
import { searchTextOf, trackSearchTextOf } from "./library/searchText";
import { localDayKey, shiftDayKey } from "./streaks/activityLog";
import { FREEZE_CAP } from "./streaks/state";

export const migrations = new Migrations<DataModel>(components.migrations);

// General-purpose runner — invoke via CLI:
//   bunx convex run migrations:run '{"fn": "migrations:foo"}'
export const run = migrations.runner();

// COMPLETED: rawInputEncrypted → rawInput (sessions)
// Ran 2026-04-08. Schema narrowed. Safe to keep as a no-op record.
export const renameRawInput = migrations.define({
	migrateOne: async (_ctx, _doc) => {},
	table: "sessions",
});

// COMPLETED: userInputEncrypted → userInput (session_turns)
// Ran 2026-04-08. Schema narrowed. Safe to keep as a no-op record.
export const renameUserInput = migrations.define({
	migrateOne: async (_ctx, _doc) => {},
	table: "session_turns",
});

// Backfill longestStreak from currentStreak for profiles created before the
// field existed. Idempotent — skips rows that already have a value.
//   bunx convex run migrations:run '{"fn": "migrations:backfillLongestStreak"}'
export const backfillLongestStreak = migrations.define({
	migrateOne: async (_ctx, doc) => {
		if (doc.longestStreak === undefined) {
			return { longestStreak: doc.currentStreak };
		}
	},
	table: "emotional_profiles",
});

// Backfill the reflectionRank aggregate from existing emotional_profiles rows.
// Must run once before the percentile card is enabled, otherwise the aggregate
// only knows about profiles touched since the component was deployed.
// Idempotent — insertIfDoesNotExist skips keys already present, so it is safe
// to re-run after a partial failure.
//   bunx convex run migrations:run '{"fn": "migrations:backfillReflectionRank"}'
export const backfillReflectionRank = migrations.define({
	migrateOne: async (ctx, doc) => {
		await reflectionRank.insertIfDoesNotExist(ctx, doc);
	},
	table: "emotional_profiles",
});
// Activity-log cutover (#432). Seeds one `activity_log` row per profile from
// the streak as it's *currently displayed* (48h window), not a full
// historical backfill — an expired streak seeds nothing and its mirror is
// zeroed to match what users already see; a live streak gets a single
// "reflect" row for its last qualifying local day. Idempotent — skips a
// profile that already has a row for that day/action.
// Run only once #433 has replaced profileStats' inline streak writer: a
// reflect it counts after the seed leaves no log row, so the next
// recordActivity would read the stale seed day and reset a live streak.
//   bunx convex run migrations:run '{"fn": "migrations:cutoverActivityLog"}'
export const cutoverActivityLog = migrations.define({
	migrateOne: async (ctx, doc) => {
		// The pre-log 48h window this cutover seeds from (the old lib/streak.ts).
		const expired =
			!doc.lastSessionAt ||
			Date.now() - doc.lastSessionAt > 48 * 60 * 60 * 1000;

		if (expired || doc.currentStreak === 0) {
			// Zeroing must not erase the record on rows backfillLongestStreak missed.
			if (doc.currentStreak !== 0) {
				return {
					currentStreak: 0,
					longestStreak: doc.longestStreak ?? doc.currentStreak,
				};
			}
			return;
		}

		if (!doc.lastSessionAt) {
			return;
		}

		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", doc._id))
			.unique();
		const timezone = preferences?.notifications.timezone ?? "UTC";
		const dayKey = localDayKey(doc.lastSessionAt, timezone);

		const existing = await ctx.db
			.query("activity_log")
			.withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) =>
				q
					.eq("emotionalProfileId", doc._id)
					.eq("dayKey", dayKey)
					.eq("actionType", "reflect")
			)
			.unique();
		if (existing) {
			return;
		}

		await ctx.db.insert("activity_log", {
			actionType: "reflect",
			count: 1,
			createdAt: doc.lastSessionAt,
			dayKey,
			emotionalProfileId: doc._id,
			updatedAt: doc.lastSessionAt,
		});
	},
	table: "emotional_profiles",
});

// Best-streak restore. The old 48h/UTC streak (reflect-only) dropped runs people
// had kept, so profiles active in the last 30 days restart from their best
// run, not what survived. Run AFTER cutoverActivityLog (it zeroes expired
// streaks; this reads longestStreak, which it keeps).
// Lit via streakRevivedDay = yesterday: covered for the gap check with no
// activity_log row, so the graph stays honest. FREEZE_CAP freezes give a few
// days to come back before it lapses again. Idempotent — a set
// streakRevivedDay means restored (or revived) already.
//   bunx convex run migrations:run '{"fn": "migrations:restoreBestStreak"}'
const RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const restoreBestStreak = migrations.define({
	migrateOne: async (ctx, doc) => {
		const best = Math.max(doc.longestStreak ?? 0, doc.currentStreak);
		const recent =
			doc.lastSessionAt !== undefined &&
			Date.now() - doc.lastSessionAt < RESTORE_WINDOW_MS;
		if (best === 0 || !recent || doc.streakRevivedDay !== undefined) {
			return;
		}

		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", doc._id))
			.unique();
		const today = localDayKey(
			Date.now(),
			preferences?.notifications.timezone ?? "UTC"
		);
		return {
			brokenStreak: undefined,
			currentStreak: best,
			longestStreak: best,
			streakFreezes: Math.max(doc.streakFreezes ?? 0, FREEZE_CAP),
			streakRevivedDay: shiftDayKey(today, -1),
		};
	},
	table: "emotional_profiles",
});

// Browse search (#549): fills `searchText` on entries ingested before it
// existed (ingest skips an unchanged sha, so a re-ingest won't). Recomputes
// from the row and its facets, writing only on a difference — safe to re-run.
//   bunx convex run migrations:run '{"fn": "migrations:backfillLibrarySearchText"}'
export const backfillLibrarySearchText = migrations.define({
	migrateOne: async (ctx, doc) => {
		const facets = await ctx.db
			.query("library_entry_facets")
			.withIndex("by_entryId", (q) => q.eq("entryId", doc._id))
			.take(500);
		const searchText = searchTextOf(doc, facets);
		if (doc.searchText !== searchText) {
			return { searchText };
		}
	},
	table: "library_entries",
});

// Browse search (#550): fills `searchText` on tracks ingested before it
// existed. Recomputes from the row, writing only on a difference — safe to re-run.
//   bunx convex run migrations:run '{"fn": "migrations:backfillTrackSearchText"}'
export const backfillTrackSearchText = migrations.define({
	migrateOne: async (_ctx, doc) => {
		const searchText = trackSearchTextOf(doc);
		if (doc.searchText !== searchText) {
			return { searchText };
		}
	},
	table: "audio_tracks",
});

// ponytail: random spread, not a rate limiter — ~200 rows over 5 min stays well
// under OpenAI's embedding limits; move to @convex-dev/workpool if the corpus
// grows past a few thousand. A failed embed logs its id; re-running is the fix.
const BACKFILL_SPREAD_MS = 5 * 60 * 1000;
const spread = () => Math.random() * BACKFILL_SPREAD_MS;

// Library meaning index (#568): embeds every active entry ingested before the
// index existed. Each row schedules its own index action (an embed is network,
// a migration is a mutation); re-running just re-embeds, keyed on the entry id.
//   bunx convex run migrations:run '{"fn": "migrations:backfillLibraryIndex"}'
export const backfillLibraryIndex = migrations.define({
	migrateOne: async (ctx, doc) => {
		if (doc.active) {
			await ctx.scheduler.runAfter(
				spread(),
				internal.ai.library.embed.indexEntry,
				{ entryId: doc._id }
			);
		}
	},
	table: "library_entries",
});

// Track meaning index (#572): embeds every active track ingested before the
// index existed. One index action per row, keyed on the slug — safe to re-run.
//   bunx convex run migrations:run '{"fn": "migrations:backfillTrackIndex"}'
export const backfillTrackIndex = migrations.define({
	migrateOne: async (ctx, doc) => {
		if (doc.active) {
			await ctx.scheduler.runAfter(
				spread(),
				internal.ai.paths.trackSearch.indexTrack,
				{ trackId: doc._id }
			);
		}
	},
	table: "audio_tracks",
});

export const runAll = migrations.runner([
	internal.migrations.renameRawInput,
	internal.migrations.renameUserInput,
	internal.migrations.backfillLongestStreak,
	internal.migrations.backfillReflectionRank,
	// Both idempotent (write only on a difference); Browse search returns
	// nothing for pre-#549/#550 rows until they run.
	internal.migrations.backfillLibrarySearchText,
	internal.migrations.backfillTrackSearchText,
	// Library re-ingest can't fill these: its sha gate skips unchanged rows.
	internal.migrations.backfillLibraryIndex,
	internal.migrations.backfillTrackIndex,
]);
