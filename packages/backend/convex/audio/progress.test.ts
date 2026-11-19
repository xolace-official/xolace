// @vitest-environment edge-runtime
/**
 * `listen_progress` (B6), the player's resume position behind Explore's
 * Continue. What can go wrong: a skip-past or music leaves a row; a position
 * off the end (or NaN) is stored as given; finishing doesn't take the track
 * off Continue, or the player's rewind after the end puts it back; someone
 * else's call writes your row; a wipe or account deletion leaves the rows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, ragMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../rag", () => ragMock());
// Account deletion's push-device step calls a component convex-test doesn't register.
vi.mock("../lib/pushNotifications", async (orig) => ({
	...(await orig<typeof import("../lib/pushNotifications")>()),
	profilePushDevices: async () => [],
	pushNotifications: { removeToken: async () => null },
}));

const BASE = Date.UTC(2026, 10, 19, 12);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(BASE);
});
afterEach(() => vi.useRealTimers());

const addTrack = (
	user: SeededUser,
	family: "support" | "music" = "support",
	slug = "letting-go"
) =>
	user.root.run((ctx) =>
		ctx.db.insert("audio_tracks", {
			active: true,
			durationSec: 600,
			family,
			key: `${family}/${slug}.mp3`,
			sha256: slug,
			slug,
			sourceTags: [],
			tags: [],
			thumbKey: `thumb/${slug}.webp`,
			thumbSha256: slug,
			title: slug,
			topic: family === "music" ? "music_topic_calm" : "audio_topic_calm",
		})
	);

const record = (
	user: SeededUser,
	trackId: Id<"audio_tracks">,
	positionSec: number,
	finished?: true
) =>
	user.t.mutation(api.audio.progress.record, {
		finished,
		positionSec,
		trackId,
	});

const rows = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("listen_progress")
			.withIndex("by_emotionalProfileId_and_trackId", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);

describe("audio.progress.record", () => {
	it("keeps the latest position, clamped to the track", async () => {
		const user = await asNewUser();
		const id = await addTrack(user);

		await record(user, id, 120);
		vi.setSystemTime(BASE + 1000);
		await record(user, id, 240);
		expect(await rows(user)).toMatchObject([
			{ positionSec: 240, trackId: id, updatedAt: BASE + 1000 },
		]);
		expect((await rows(user))[0].finishedAt).toBeUndefined();

		await record(user, id, -5);
		expect((await rows(user))[0].positionSec).toBe(0);
		await record(user, id, Number.NaN);
		expect((await rows(user))[0].positionSec).toBe(0);
	});

	it("keeps nothing for a skip-past, music, or a track that's gone", async () => {
		const user = await asNewUser();
		const support = await addTrack(user);
		const music = await addTrack(user, "music", "rain");
		const gone = await addTrack(user, "support", "gone");
		await user.root.run((ctx) => ctx.db.delete("audio_tracks", gone));

		await record(user, support, 3);
		await record(user, music, 200);
		await record(user, gone, 200);
		expect(await rows(user)).toEqual([]);
	});

	it("marks the end, by flag or by reaching 95%, and keeps no row for a first play that's already over", async () => {
		const user = await asNewUser();
		const a = await addTrack(user, "support", "a");
		const b = await addTrack(user, "support", "b");
		const c = await addTrack(user, "support", "c");

		await record(user, a, 100);
		await record(user, a, 200, true);
		await record(user, b, 100);
		await record(user, b, 571);
		await record(user, c, 590);

		const byTrack = new Map((await rows(user)).map((r) => [r.trackId, r]));
		expect(byTrack.get(a)).toMatchObject({
			finishedAt: BASE,
			positionSec: 600,
		});
		expect(byTrack.get(b)).toMatchObject({
			finishedAt: BASE,
			positionSec: 600,
		});
		expect(byTrack.has(c)).toBe(false);
	});

	it("a finished track stays finished through the player's rewind, and reopens when played again", async () => {
		const user = await asNewUser();
		const id = await addTrack(user);
		await record(user, id, 100);
		await record(user, id, 600, true);

		await record(user, id, 0);
		expect((await rows(user))[0]).toMatchObject({
			finishedAt: BASE,
			positionSec: 600,
		});

		await record(user, id, 30);
		const [row] = await rows(user);
		expect(row.finishedAt).toBeUndefined();
		expect(row.positionSec).toBe(30);
	});

	it("writes only the caller's own row and needs a signed-in user", async () => {
		const user = await asNewUser();
		const other = await asNewUser(2, user.root);
		const id = await addTrack(user);
		await record(other, id, 100);

		expect(await rows(user)).toEqual([]);
		expect(await rows(other)).toHaveLength(1);
		await expect(
			user.root.mutation(api.audio.progress.record, {
				positionSec: 100,
				trackId: id,
			})
		).rejects.toThrow();
	});
});

describe("erasure", () => {
	it("a data wipe deletes the positions", async () => {
		const user = await asNewUser();
		await record(user, await addTrack(user), 100);
		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});
		expect(await rows(user)).toEqual([]);
	});

	it("account deletion deletes the positions", async () => {
		const user = await asNewUser();
		const other = await asNewUser(2, user.root);
		const id = await addTrack(user);
		await record(user, id, 100);
		await record(other, id, 100);
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "purging" })
		);
		await user.root.mutation(internal.jobs.accountDeletion.purgeUser, {
			userId: user.userId,
		});
		expect(await rows(user)).toEqual([]);
		expect(await rows(other)).toHaveLength(1);
	});
});
