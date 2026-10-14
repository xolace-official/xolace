// @vitest-environment edge-runtime
/**
 * Plus dictation (#557): recorded audio in, Scribe transcript out.
 *
 * Failure modes: a free (or signed-out) caller reaching Scribe; an oversized
 * take reaching Scribe; the transcript not coming back; a Scribe failure
 * throwing instead of returning null.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "./fixtures.helpers";
import { asNewUser, asUnauthed } from "./harness.helpers";
import { aggregatesMock, posthogMock, ragMock, revenuecatMock } from "./mocks.helpers";

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
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("dictation.transcribe (#557)", () => {
  it("returns a Plus caller's transcript in the language it was spoken", async () => {
    const { t } = await asNewUser();
    expect(await t.action(api.dictation.transcribe, { audioBytes: AUDIO })).toBe(
      "je suis fatigué",
    );
    // No language_code: Scribe auto-detects.
    const body = scribe.mock.calls[0][1].body as FormData;
    expect(body.get("language_code")).toBeNull();
  });

  it("refuses a free caller before any audio leaves", async () => {
    stub.isPlus = false;
    const { t } = await asNewUser();
    await expectCode(() => t.action(api.dictation.transcribe, { audioBytes: AUDIO }), "plus_required");
    expect(scribe).not.toHaveBeenCalled();
  });

  it("refuses a signed-out caller", async () => {
    await expectCode(
      () => asUnauthed().action(api.dictation.transcribe, { audioBytes: AUDIO }),
      "not_authenticated",
    );
    expect(scribe).not.toHaveBeenCalled();
  });

  it("refuses audio over the 3-minute ceiling", async () => {
    const { MAX_DICTATION_BYTES } = await import("../dictation");
    const { t } = await asNewUser();
    await expectCode(
      () =>
        t.action(api.dictation.transcribe, {
          audioBytes: new ArrayBuffer(MAX_DICTATION_BYTES + 1),
        }),
      "audio_too_large",
    );
    expect(scribe).not.toHaveBeenCalled();
  });

  it("returns null when Scribe fails", async () => {
    scribe.mockImplementation(async () => new Response("nope", { status: 500 }));
    const { t } = await asNewUser();
    expect(await t.action(api.dictation.transcribe, { audioBytes: AUDIO })).toBeNull();
  });
});
