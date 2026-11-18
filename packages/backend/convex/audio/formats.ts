import { type Infer, v } from "convex/values";

/**
 * The audio formats a track can be uploaded in: the ones `measurePeaks.ts`
 * can decode for the player's waveform. MP3 (every track in the catalogue)
 * and WAV. Not M4A: no decoder for it runs in Convex without a native ffmpeg,
 * so the admin's New track, Replace audio and imports refuse it rather than
 * store a track that could never have a waveform. Keys from before this
 * (none in prod) keep playing; they just have no peaks.
 */
export const audioFormatValidator = v.union(v.literal("mp3"), v.literal("wav"));

export type AudioFormat = Infer<typeof audioFormatValidator>;

const AUDIO_FORMATS = ["mp3", "wav"] as const satisfies readonly AudioFormat[];

/** The format of an audio key or file name, by its extension, or null when it's not one of these. */
export function formatOf(name: string): AudioFormat | null {
	const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
	return AUDIO_FORMATS.find((format) => format === ext) ?? null;
}
