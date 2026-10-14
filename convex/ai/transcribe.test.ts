import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeAudio } from "./transcribe";

const AUDIO = new ArrayBuffer(8);

function mockFetch(impl: () => Promise<Response>) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  vi.spyOn(console, "error").mockImplementation(() => {});
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("transcribeAudio", () => {
  it("posts the audio to Scribe v2 and returns the trimmed transcript", async () => {
    const spy = mockFetch(async () => Response.json({ text: "  hello there \n" }));
    expect(await transcribeAudio("key", AUDIO)).toBe("hello there");

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.elevenlabs.io/v1/speech-to-text");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("key");
    expect((init.body as FormData).get("model_id")).toBe("scribe_v2");
  });

  it("returns an empty string when Scribe heard nothing", async () => {
    mockFetch(async () => Response.json({}));
    expect(await transcribeAudio("key", AUDIO)).toBe("");
  });

  it("returns null on a non-2xx response", async () => {
    mockFetch(async () => new Response("nope", { status: 500 }));
    expect(await transcribeAudio("key", AUDIO)).toBeNull();
  });

  it("returns null when the request fails or times out", async () => {
    mockFetch(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    expect(await transcribeAudio("key", AUDIO)).toBeNull();
  });
});
