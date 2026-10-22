// @vitest-environment edge-runtime
/**
 * Plus dictation (#557): recorded audio in, Scribe transcript out.
 *
 * Failure modes: a free (or signed-out) caller reaching Scribe; an oversized
 * take reaching Scribe; the transcript not coming back; a Scribe failure
 * throwing instead of returning null.
 *
 * Daily cap (#558): minutes charged to vent's counter (or not at all); a
 * client under-reporting its duration; an over-cap caller still reaching
 * Scribe; concurrent takes all passing the check; a failed take eating budget; the counter never resetting; the env
 * override ignored.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "../test/fixtures.helpers";
import { asNewUser, asUnauthed } from "../test/harness.helpers";
import { aggregatesMock, posthogMock, ragMock, revenuecatMock } from "../test/mocks.helpers";

const stub = vi.hoisted(() => ({ isPlus: true }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../revenuecat", () => revenuecatMock(() => stub.isPlus));

const AUDIO = new ArrayBuffer(16);
let scribe: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stub.isPlus = true;
  vi.stubEnv("ELEVENLABS_VOICE_API_KEY", "key");
  scribe = vi.fn(async () => Response.json({ text: " je suis fatigué " }));
  vi.stubGlobal("fetch", scribe);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("dictation.transcribe (#557)", () => {
  it("returns a Plus caller's transcript in the language it was spoken", async () => {
    const { t } = await asNewUser();
    expect(await t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO })).toBe(
      "je suis fatigué",
    );
    // No language_code: Scribe auto-detects.
    const body = scribe.mock.calls[0][1].body as FormData;
    expect(body.get("language_code")).toBeNull();
  });

  it("refuses a free caller before any audio leaves", async () => {
    stub.isPlus = false;
    const { t } = await asNewUser();
    await expectCode(() => t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO }), "plus_required");
    expect(scribe).not.toHaveBeenCalled();
  });

  it("refuses a signed-out caller", async () => {
    await expectCode(
      () => asUnauthed().action(api.dictation.plus.transcribe, { audioBytes: AUDIO }),
      "not_authenticated",
    );
    expect(scribe).not.toHaveBeenCalled();
  });

  it("refuses audio over the 3-minute ceiling", async () => {
    const { MAX_DICTATION_BYTES } = await import("./plus");
    const { t } = await asNewUser();
    await expectCode(
      () =>
        t.action(api.dictation.plus.transcribe, {
          audioBytes: new ArrayBuffer(MAX_DICTATION_BYTES + 1),
        }),
      "audio_too_large",
    );
    expect(scribe).not.toHaveBeenCalled();
  });

  it("returns null when Scribe fails", async () => {
    scribe.mockImplementation(async () => new Response("nope", { status: 500 }));
    const { t } = await asNewUser();
    expect(await t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO })).toBeNull();
  });
});

describe("dictation daily cap (#558)", () => {
  const MIN = 60_000;
  const usage = (s: Awaited<ReturnType<typeof asNewUser>>) =>
    s.root.run(async (ctx) => {
      const p = await ctx.db.get("emotional_profiles", s.profileId);
      return { dictation: p?.dictationDailySecondsUsed, vent: p?.ventDailyMinutesUsed };
    });

  it("charges the take's recorded duration to dictation, not vent", async () => {
    const s = await asNewUser();
    await s.t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO, durationMs: 90_000 });
    expect(await usage(s)).toEqual({ dictation: 90, vent: undefined });
  });

  it("charges by payload size when the client under-reports", async () => {
    const s = await asNewUser();
    // 120KB at 32kbps (4KB/s) is 30s of audio.
    await s.t.action(api.dictation.plus.transcribe, {
      audioBytes: new ArrayBuffer(120_000),
      durationMs: 1_000,
    });
    expect((await usage(s)).dictation).toBe(30);
  });

  it("does not charge a take Scribe failed to transcribe", async () => {
    scribe.mockImplementation(async () => new Response("nope", { status: 500 }));
    const s = await asNewUser();
    await s.t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO, durationMs: 60_000 });
    expect((await usage(s)).dictation ?? 0).toBe(0);
  });

  it("lets only one of two concurrent takes through the last of the budget", async () => {
    vi.stubEnv("DICTATION_DAILY_CAP_MINUTES_PLUS", "1");
    const s = await asNewUser();
    const take = () => s.t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO, durationMs: MIN });
    const results = await Promise.allSettled([take(), take()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(scribe).toHaveBeenCalledTimes(1);
  });

  it("refuses an over-cap caller before any audio leaves, and says which day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T15:00:00Z"));
    const s = await asNewUser();
    expect(await s.t.query(api.dictation.plus.status, {})).toEqual({ cappedOn: null });
    await s.t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO, durationMs: 30 * MIN });
    expect(await s.t.query(api.dictation.plus.status, {})).toEqual({
      cappedOn: Date.UTC(2026, 9, 14),
    });

    scribe.mockClear();
    await expectCode(
      () => s.t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO, durationMs: 1_000 }),
      "dictation_cap_reached",
    );
    expect(scribe).not.toHaveBeenCalled();
  });

  it("resets the next UTC day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T23:00:00Z"));
    const s = await asNewUser();
    await s.t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO, durationMs: 30 * MIN });

    // The status query reads no clock (Convex caches it): yesterday's
    // cappedOn is the client's cue that the budget is back.
    vi.setSystemTime(new Date("2026-10-15T00:30:00Z"));
    expect(await s.t.query(api.dictation.plus.status, {})).toEqual({
      cappedOn: Date.UTC(2026, 9, 14),
    });
    await s.t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO, durationMs: 10_000 });
    expect((await usage(s)).dictation).toBe(10);
  });

  it("reads the cap from DICTATION_DAILY_CAP_MINUTES_PLUS", async () => {
    vi.stubEnv("DICTATION_DAILY_CAP_MINUTES_PLUS", "1");
    const s = await asNewUser();
    await s.t.action(api.dictation.plus.transcribe, { audioBytes: AUDIO, durationMs: MIN });
    expect((await s.t.query(api.dictation.plus.status, {})).cappedOn).not.toBeNull();
  });
});
