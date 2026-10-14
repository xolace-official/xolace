/**
 * The single place that calls ElevenLabs Scribe v2 speech-to-text. Shared by
 * vent and dictation. Audio bytes in, transcript out — never stored here.
 *
 * Returns null on any failure (non-2xx, network error, 30s timeout) so callers
 * can degrade softly; returns "" when Scribe heard nothing.
 */
export async function transcribeAudio(
  apiKey: string,
  audioBytes: ArrayBuffer,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const blob = new Blob([audioBytes], { type: "audio/m4a" });
    const formData = new FormData();
    formData.append("file", blob, "recording.m4a");
    formData.append("model_id", "scribe_v2");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[scribe] error ${res.status}: ${body}`);
      return null;
    }

    const data = await res.json();
    return typeof data.text === "string" ? data.text.trim() : "";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[scribe] request timed out");
    } else {
      console.error("[scribe] fetch failed:", err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
