// @vitest-environment edge-runtime
/**
 * `audio_tracks.peaks` end to end: every upload path schedules a measure for
 * a support track (never music), the measure writes peaks for the audio it
 * fetched (and only that audio, at its stated length), a track that won't
 * decode is logged and skipped, R2 trouble gets one retry, and the backfill
 * and Measure again measure only what's missing. R2 is faked at the `r2` seam and its files at `fetch`;
 * scheduled measures are run by hand, so the index jobs uploads also
 * schedule never run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { r2 } from "../ai/paths/audioTracks";
import { asAdmin, asUnauthed } from "../test/harness.helpers";
import { makeWav } from "./fixtures.helpers";
import { PEAK_BARS } from "./peaks";

// `migrations.ts` imports the aggregate, so the mock loads before the helpers would.
vi.mock("../lib/aggregates", async () =>
	(await import("../test/mocks.helpers")).aggregatesMock()
);

const SHA = "a".repeat(64);
const OTHER_SHA = "b".repeat(64);
const THUMB = { sha256: SHA, thumbhash: "1QcSHQRnh493V4dIh4eXh1h4kJUI" };
const MEASURE = "audio/measurePeaks:measure";

/**
 * A WAV that's loud for its first half and half as loud for its second, the
 * step on a slice boundary that's also a block boundary (160 frames a slice).
 */
const STEP_WAV = makeWav(
	Array.from({ length: 9600 }, (_, i) => [
		(i < 4800 ? 0.8 : 0.4) * (i % 2 ? 1 : -1),
	]),
	{ bits: 16 }
);
const STEP_PEAKS = [...Array(30).fill(1), ...Array(30).fill(0.5)];
/** STEP_WAV lasts 1.2 s: a track stating 1 s is within the length check's slack. */
const STEP_SEC = 1;
const FLAT_PEAKS = Array(PEAK_BARS).fill(0.5);

/** key → what R2 serves for it; anything else is a 404. */
let files: Map<string, Uint8Array<ArrayBuffer>>;
/** key → an HTTP status R2 answers with instead of the file. */
let failing: Map<string, number>;
const fetchSpy = vi.fn(async (url: string | URL | Request) => {
	const key = String(url).replace("https://r2.test/", "");
	const status = failing.get(key);
	if (status) {
		return new Response("<Error/>", { status });
	}
	const body = files.get(key);
	return body
		? new Response(body)
		: new Response("<Error>NoSuchKey</Error>", { status: 404 });
});

beforeEach(() => {
	vi.useFakeTimers();
	files = new Map();
	failing = new Map();
	vi.stubGlobal("fetch", fetchSpy);
	vi.spyOn(r2, "getUrl").mockImplementation(
		async (key) => `https://r2.test/${key}`
	);
	vi.spyOn(r2, "deleteObject").mockResolvedValue(undefined);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	fetchSpy.mockClear();
});

/** Signed in as an admin or not: both can `run`, `mutation` and `action`. */
type Root = Pick<ReturnType<typeof asAdmin>, "action" | "mutation" | "run">;

function insertTrack(
	t: Root,
	extra: Partial<Doc<"audio_tracks">> = {}
): Promise<Id<"audio_tracks">> {
	return t.run((ctx) =>
		ctx.db.insert("audio_tracks", {
			active: true,
			durationSec: STEP_SEC,
			family: "support",
			key: "support/grounding/old.wav",
			sha256: OTHER_SHA,
			slug: "grounding",
			sourceTags: [],
			tags: [],
			thumbKey: "thumb/x.webp",
			thumbSha256: "x",
			title: "Grounding",
			topic: "audio_topic_grief",
			...extra,
		})
	);
}

const track = (t: Root, id: Id<"audio_tracks">) =>
	t.run((ctx) => ctx.db.get("audio_tracks", id));

type MeasureArgs = { retry?: boolean; trackId: Id<"audio_tracks"> };

/** The measures scheduled so far, in order, with their args. */
async function scheduledMeasureArgs(t: Root) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect()
	);
	// convex-test names it "audio/measurePeaks:measure"; a deployment adds ".js".
	return jobs
		.filter((j) => j.name.replace(".js:", ":") === MEASURE)
		.map((j) => j.args[0] as MeasureArgs);
}

/** The track ids measures are scheduled for, in order. */
const scheduledMeasures = async (t: Root) =>
	(await scheduledMeasureArgs(t)).map((a) => a.trackId);

const measure = (t: Root, trackId: Id<"audio_tracks">, retry?: boolean) =>
	t.action(internal.audio.measurePeaks.measure, { retry, trackId });

const JUNK = new TextEncoder().encode("<html>Service unavailable</html>");

describe("the upload paths", () => {
	it("measures a new support track from the admin once its audio is in", async () => {
		const t = asAdmin();
		await t.mutation(api.admin.audio.create, {
			audio: {
				durationSec: STEP_SEC,
				key: "support/breathe/a.wav",
				sha256: SHA,
			},
			family: "support",
			slug: "breathe",
			thumb: THUMB,
			title: "Breathe",
			topic: "audio_topic_grief",
		});
		const id = (await t.run((ctx) => ctx.db.query("audio_tracks").first()))
			?._id;
		if (!id) {
			throw new Error("no track");
		}
		expect(await scheduledMeasures(t)).toEqual([id]);
		expect((await track(t, id))?.peaks).toBeUndefined();

		files.set("support/breathe/a.wav", STEP_WAV);
		await measure(t, id);
		expect((await track(t, id))?.peaks).toEqual(STEP_PEAKS);
	});

	it("never measures music, which draws the plain line", async () => {
		const t = asAdmin();
		await t.mutation(api.admin.audio.create, {
			audio: { durationSec: STEP_SEC, key: "music/rain/a.wav", sha256: SHA },
			family: "music",
			slug: "rain",
			thumb: THUMB,
			title: "Rain",
			topic: "music_topic_sleep_rest",
		});
		await t.mutation(api.admin.audio.replaceAudio, {
			durationSec: STEP_SEC,
			key: "music/rain/b.wav",
			sha256: OTHER_SHA,
			slug: "rain",
		});
		expect(await scheduledMeasures(t)).toEqual([]);
		await expect(
			t.mutation(api.admin.audio.measureWaveform, { slug: "rain" })
		).rejects.toThrow(/music draws the plain line/);
		// Even when asked directly, the action leaves it alone.
		const id = (await t.run((ctx) => ctx.db.query("audio_tracks").first()))
			?._id;
		files.set("music/rain/b.wav", STEP_WAV);
		if (id) {
			await measure(t, id);
			expect((await track(t, id))?.peaks).toBeUndefined();
		}
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("drops the old audio's peaks on Replace audio, and measures the new audio", async () => {
		const t = asAdmin();
		const id = await insertTrack(t, { active: false, peaks: FLAT_PEAKS });
		await t.mutation(api.admin.audio.replaceAudio, {
			durationSec: STEP_SEC,
			key: "support/grounding/new.wav",
			sha256: SHA,
			slug: "grounding",
		});
		expect((await track(t, id))?.peaks).toBeUndefined();
		expect(await scheduledMeasures(t)).toEqual([id]);

		files.set("support/grounding/new.wav", STEP_WAV);
		await measure(t, id);
		expect((await track(t, id))?.peaks).toEqual(STEP_PEAKS);
	});

	it("keeps peaks through edits that don't touch the audio", async () => {
		const t = asAdmin();
		const id = await insertTrack(t, { active: false, peaks: FLAT_PEAKS });
		await t.mutation(api.admin.audio.save, {
			slug: "grounding",
			track: {
				featured: true,
				tags: ["calm"],
				title: "Grounding, again",
				topic: "audio_topic_grief",
			},
		});
		// The same file uploaded again is not new audio.
		await t.mutation(api.admin.audio.replaceAudio, {
			durationSec: 300,
			key: "support/grounding/again.wav",
			sha256: OTHER_SHA,
			slug: "grounding",
		});
		await t.mutation(api.admin.audio.replaceThumb, {
			slug: "grounding",
			thumb: THUMB,
		});
		expect((await track(t, id))?.peaks).toEqual(FLAT_PEAKS);
		expect(await scheduledMeasures(t)).toEqual([]);
	});

	it("measures what the Kindling script and admin imports upsert, only when the audio is new", async () => {
		const t = asUnauthed();
		const record = {
			durationSec: 300,
			family: "support" as const,
			key: "support/breathe/1.wav",
			sha256: SHA,
			slug: "breathe",
			sourceTags: [],
			tags: [],
			thumbKey: "thumb/x.webp",
			thumbSha256: "x",
			title: "Breathe",
			topic: "audio_topic_anxiety",
		};
		const upsert = (r: typeof record) =>
			t.mutation(internal.ai.paths.audioTracks.upsertTrack, { track: r });

		const { trackId } = await upsert(record);
		expect(await scheduledMeasures(t)).toEqual([trackId]);
		await t.run((ctx) =>
			ctx.db.patch("audio_tracks", trackId, { peaks: FLAT_PEAKS })
		);

		// Same audio, new title: the peaks stay and nothing is measured.
		await upsert({
			...record,
			key: "support/breathe/2.wav",
			title: "Breathe in",
		});
		expect((await track(t, trackId))?.peaks).toEqual(FLAT_PEAKS);
		expect(await scheduledMeasures(t)).toEqual([trackId]);

		// New audio: the old peaks go and it's measured again.
		await upsert({
			...record,
			key: "support/breathe/3.wav",
			sha256: OTHER_SHA,
		});
		expect((await track(t, trackId))?.peaks).toBeUndefined();
		expect(await scheduledMeasures(t)).toEqual([trackId, trackId]);

		// That measure failed: the same audio again tries once more.
		await upsert({
			...record,
			key: "support/breathe/4.wav",
			sha256: OTHER_SHA,
		});
		expect(await scheduledMeasures(t)).toEqual([trackId, trackId, trackId]);
	});

	it("refuses new upsert audio that isn't MP3 or WAV, but keeps a stored key", async () => {
		const t = asUnauthed();
		const record = {
			durationSec: 300,
			family: "support" as const,
			key: "support/old/1.m4a",
			sha256: SHA,
			slug: "old",
			sourceTags: [],
			tags: [],
			thumbKey: "thumb/x.webp",
			thumbSha256: "x",
			title: "Old",
			topic: "audio_topic_anxiety",
		};
		const upsert = (r: typeof record) =>
			t.mutation(internal.ai.paths.audioTracks.upsertTrack, { track: r });
		await expect(upsert(record)).rejects.toThrow(/isn't an MP3 or WAV/);
		expect(r2.deleteObject).toHaveBeenCalledWith(
			expect.anything(),
			"support/old/1.m4a"
		);

		// A track stored with an M4A before the rule: a metadata edit still lands.
		await insertTrack(t, {
			key: "support/old/1.m4a",
			sha256: SHA,
			slug: "old",
		});
		await expect(
			upsert({ ...record, title: "Old, renamed" })
		).resolves.toMatchObject({ action: "unchanged" });
	});

	it("measures again when the same file comes back to a track with no peaks", async () => {
		const t = asAdmin();
		const id = await insertTrack(t, { active: false });
		await t.mutation(api.admin.audio.replaceAudio, {
			durationSec: STEP_SEC,
			key: "support/grounding/again.wav",
			sha256: OTHER_SHA,
			slug: "grounding",
		});
		expect(await scheduledMeasures(t)).toEqual([id]);
	});
});

describe("audio/measurePeaks:measure", () => {
	it("leaves a track that has its peaks alone, without fetching it", async () => {
		const t = asUnauthed();
		const id = await insertTrack(t, { peaks: FLAT_PEAKS });
		files.set("support/grounding/old.wav", STEP_WAV);
		await measure(t, id);
		expect(fetchSpy).not.toHaveBeenCalled();
		expect((await track(t, id))?.peaks).toEqual(FLAT_PEAKS);
	});

	it("logs and skips a track it can't fetch, decode or read the format of", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const t = asUnauthed();
		const missing = await insertTrack(t, {
			key: "support/a/gone.wav",
			slug: "a",
		});
		const junk = await insertTrack(t, { key: "support/b/junk.wav", slug: "b" });
		const m4a = await insertTrack(t, { key: "support/c/x.m4a", slug: "c" });
		files.set("support/b/junk.wav", JUNK);

		for (const id of [missing, junk, m4a]) {
			await expect(measure(t, id)).resolves.toBeNull();
			expect((await track(t, id))?.peaks).toBeUndefined();
		}
		expect(warn.mock.calls.map(([line]) => line)).toEqual([
			"measurePeaks: a (support/a/gone.wav) has no peaks: R2 answered 404",
			"measurePeaks: b (support/b/junk.wav) has no peaks: not a RIFF/WAVE file",
			"measurePeaks: c (support/c/x.m4a) has no peaks: no decoder for its format; the player draws its line",
		]);
		// The M4A is never downloaded.
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it("skips audio that decodes shorter or longer than the track says", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const t = asUnauthed();
		// A 60 s track whose stored object holds only 1.2 s: cut short or damaged.
		const id = await insertTrack(t, { durationSec: 60 });
		files.set("support/grounding/old.wav", STEP_WAV);
		await measure(t, id);
		expect((await track(t, id))?.peaks).toBeUndefined();
		expect(warn).toHaveBeenCalledWith(
			"measurePeaks: grounding (support/grounding/old.wav) has no peaks: decoded 1.2 s of a 60 s track (damaged or cut short)"
		);
	});

	it("retries once, ten minutes later, when R2 is briefly unavailable", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const t = asUnauthed();
		const id = await insertTrack(t);
		failing.set("support/grounding/old.wav", 503);
		await measure(t, id);
		expect(await scheduledMeasureArgs(t)).toEqual([
			{ retry: true, trackId: id },
		]);
		const [job] = await t.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect()
		);
		expect((job?.scheduledTime ?? 0) - Date.now()).toBeGreaterThanOrEqual(
			9 * 60 * 1000
		);

		// Still down on the retry: logged, and no third try.
		await measure(t, id, true);
		expect(await scheduledMeasureArgs(t)).toHaveLength(1);
		expect(warn).toHaveBeenLastCalledWith(
			"measurePeaks: grounding (support/grounding/old.wav) has no peaks: R2 answered 503, again on retry"
		);

		// Back up: the retry measures it.
		failing.clear();
		files.set("support/grounding/old.wav", STEP_WAV);
		await measure(t, id, true);
		expect((await track(t, id))?.peaks).toEqual(STEP_PEAKS);
	});

	it("retries when R2 can't be reached at all", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const t = asUnauthed();
		const id = await insertTrack(t);
		fetchSpy.mockRejectedValueOnce(new TypeError("fetch failed"));
		await measure(t, id);
		expect(await scheduledMeasureArgs(t)).toEqual([
			{ retry: true, trackId: id },
		]);
	});

	it("measures again from the admin's Measure again, only while there's no waveform", async () => {
		const t = asAdmin();
		const id = await insertTrack(t);
		await t.mutation(api.admin.audio.measureWaveform, { slug: "grounding" });
		expect(await scheduledMeasures(t)).toEqual([id]);
		await t.run((ctx) =>
			ctx.db.patch("audio_tracks", id, { peaks: FLAT_PEAKS })
		);
		await t.mutation(api.admin.audio.measureWaveform, { slug: "grounding" });
		expect(await scheduledMeasures(t)).toEqual([id]);
	});

	it("doesn't write peaks for audio the track no longer has", async () => {
		const t = asUnauthed();
		const id = await insertTrack(t);
		expect(
			await t.mutation(internal.audio.trackPeaks.save, {
				peaks: STEP_PEAKS,
				sha256: SHA,
				trackId: id,
			})
		).toBe(false);
		expect((await track(t, id))?.peaks).toBeUndefined();
		await expect(
			t.mutation(internal.audio.trackPeaks.save, {
				peaks: [1, 2],
				sha256: OTHER_SHA,
				trackId: id,
			})
		).rejects.toThrow(/60 numbers from 0 to 1/);
	});
});

describe("migrations:backfillTrackPeaks", () => {
	const runBackfill = (t: Root) =>
		t.mutation(internal.migrations.backfillTrackPeaks, {
			batchSize: 100,
			cursor: null,
			dryRun: false,
			oneBatchOnly: true,
		});

	it("measures every support track still missing peaks, and skips the rest", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const t = asUnauthed();
		const live = await insertTrack(t, { key: "support/a/1.wav", slug: "a" });
		const draft = await insertTrack(t, {
			active: false,
			key: "support/b/1.wav",
			slug: "b",
		});
		const broken = await insertTrack(t, { key: "support/c/1.wav", slug: "c" });
		const done = await insertTrack(t, { peaks: FLAT_PEAKS, slug: "d" });
		const music = await insertTrack(t, {
			family: "music",
			key: "music/e/1.wav",
			slug: "e",
			topic: "music_topic_sleep_rest",
		});
		files.set("support/a/1.wav", STEP_WAV);
		files.set("support/b/1.wav", STEP_WAV);
		files.set("support/c/1.wav", JUNK);

		await runBackfill(t);
		const scheduled = await scheduledMeasures(t);
		expect(scheduled.sort()).toEqual([live, draft, broken].sort());

		// The scheduler would run these; one that won't decode doesn't stop the others.
		for (const id of scheduled) {
			await measure(t, id);
		}
		expect((await track(t, live))?.peaks).toEqual(STEP_PEAKS);
		expect((await track(t, draft))?.peaks).toEqual(STEP_PEAKS);
		expect((await track(t, broken))?.peaks).toBeUndefined();
		expect((await track(t, done))?.peaks).toEqual(FLAT_PEAKS);
		expect((await track(t, music))?.peaks).toBeUndefined();

		// Re-running schedules only the one still missing them.
		await runBackfill(t);
		expect((await scheduledMeasures(t)).slice(scheduled.length)).toEqual([
			broken,
		]);
	});
});
