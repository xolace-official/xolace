/**
 * The single place that calls ElevenLabs Scribe v2 speech-to-text. Shared by
 * vent and dictation. Audio bytes in, transcript out — never stored here.
 *
 * `taggedText` is Scribe's text as sent, sound tags inline ("[sighs] I'm…");
 * `text` is the same with the tags stripped. Returns null on any failure
 * (non-2xx, network error, 30s timeout) so callers can degrade softly; both
 * are "" when Scribe heard nothing.
 */
export async function transcribeAudio(
	apiKey: string,
	audioBytes: ArrayBuffer
): Promise<{ text: string; taggedText: string } | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30_000);
	try {
		const blob = new Blob([audioBytes], { type: "audio/m4a" });
		const formData = new FormData();
		formData.append("file", blob, "recording.m4a");
		formData.append("model_id", "scribe_v2");

		const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
			body: formData,
			headers: { "xi-api-key": apiKey },
			method: "POST",
			signal: controller.signal,
		});

		if (!res.ok) {
			const body = await res.text();
			console.error(`[scribe] error ${res.status}: ${body}`);
			return null;
		}

		const data = await res.json();
		// Room noise with no speech comes back as a lone sound tag ("[pause]",
		// "[silence]"). No spoken word means Scribe heard nothing.
		const words: { type?: string }[] = Array.isArray(data.words)
			? data.words
			: [];
		if (words.length > 0 && !words.some((w) => w.type === "word")) {
			return { taggedText: "", text: "" };
		}
		const taggedText = typeof data.text === "string" ? data.text.trim() : "";
		return { taggedText, text: stripSoundTags(taggedText) };
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

/** Speech can't produce literal brackets, so every `[...]` is a sound tag. */
function stripSoundTags(text: string): string {
	return text
		.replace(/\[[^\]]*\]/g, " ")
		.replace(/\s+/g, " ")
		.replace(/ ([,.!?;:])/g, "$1")
		.trim();
}
