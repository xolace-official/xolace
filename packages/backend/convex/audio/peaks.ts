import { ConvexError } from "convex/values";

/**
 * A track's waveform (`audio_tracks.peaks`) for the player's scrubber
 * (redesign handoff `player.md` §2, §10): 60 bars, each drawn 4 + peak × 28 pt
 * tall at rest. Pure maths, fed decoded audio by `measurePeaks.ts`.
 *
 * **What a bar measures.** The RMS of its slice: the square root of the mean
 * square sample, every channel counted alike. The audio is cut into 60 equal
 * slices of time, so the bars line up with the scrubber's positions whatever
 * the length (where a boundary falls inside a block of frames, that block's
 * energy is split between the two bars in proportion). RMS rather than the slice's peak sample, because a slice of
 * speech spans a second or more and nearly always holds one loud consonant:
 * peak bars sit flat near the top, while RMS bars dip where a breath or a
 * pause falls, which is the shape the board draws.
 *
 * **How it's normalised.** Each bar is its RMS over the third-loudest slice's
 * (about the 95th percentile of 60), capped at 1, on a linear scale. Relative,
 * so a quietly mastered track and a loud one read the same; against the third
 * loudest rather than the loudest, so one laugh or bell doesn't shrink every
 * other bar. Linear, not decibels: speech that sits within 6–10 dB the whole
 * way through flattens to 0.8–1 on a dB scale and loses its phrases. A track
 * whose reference slice is below `SILENCE_RMS` is silence (or nearly), and
 * every bar is 0 rather than noise blown up to full height.
 *
 * On the catalogue's spoken tracks (97 s and 118 s) this gives mostly 0.45–1
 * with dips to 0.04–0.45, close to the board's `makePeaks` shape; its
 * 21-minute ambient track reads a near-flat 0.85–1 with a fade at each end.
 */

export const PEAK_BARS = 60;

/** The slice everything is measured against: third loudest, about the 95th percentile of 60. */
const REFERENCE_RANK = 3;

/** −70 dBFS. Below it the whole track is treated as silence. */
export const SILENCE_RMS = 10 ** (-70 / 20);

/** Two decimals: 0.01 of a 36 pt bar is a third of a point. */
const ROUND = 100;

/**
 * Decoded frames summed into one block; the meter keeps one number per block.
 * Under a millisecond at 44.1 kHz: a bar of a two-minute track is about
 * 88,000 frames, so splitting one block where a boundary cuts it moves less
 * energy than a bar can show. A 21-minute track keeps about 1.7 million
 * numbers (14 MB).
 */
const BLOCK_FRAMES = 32;

/** Blocks per storage page: the meter grows a page at a time. */
const PAGE_BLOCKS = 65_536;

/** One chunk of decoded audio: a Float32Array per channel, `samplesDecoded` long. */
export type DecodedChunk = {
	channelData: readonly Float32Array[];
	samplesDecoded: number;
};

/**
 * Streams decoded audio into 60 peaks without keeping the samples: one energy
 * sum per `BLOCK_FRAMES` frames. The slices are only known once the length
 * is, at the end, so the blocks are kept until then.
 */
export class PeakMeter {
	readonly #pages: Float64Array[] = [];
	#blocks = 0;
	#energy = 0;
	#inBlock = 0;
	#frames = 0;

	/** How many frames (samples per channel) it has seen. */
	get frames() {
		return this.#frames;
	}

	push({ channelData, samplesDecoded }: DecodedChunk) {
		const channels = channelData.length;
		if (channels === 0) {
			return;
		}
		for (let i = 0; i < samplesDecoded; i++) {
			let square = 0;
			for (const channel of channelData) {
				const sample = channel[i] ?? 0;
				square += sample * sample;
			}
			this.#energy += square / channels;
			this.#inBlock++;
			if (this.#inBlock === BLOCK_FRAMES) {
				this.#closeBlock();
			}
		}
		this.#frames += samplesDecoded;
	}

	#closeBlock() {
		const at = this.#blocks % PAGE_BLOCKS;
		if (at === 0) {
			this.#pages.push(new Float64Array(PAGE_BLOCKS));
		}
		const page = this.#pages.at(-1);
		if (page) {
			page[at] = this.#energy;
		}
		this.#blocks++;
		this.#energy = 0;
		this.#inBlock = 0;
	}

	/** The 60 peaks, or null when no audio came through. */
	finish(): number[] | null {
		if (this.#frames === 0) {
			return null;
		}
		if (this.#inBlock > 0) {
			this.#closeBlock();
		}
		const pages = this.#pages;
		const block = (j: number) =>
			pages[Math.floor(j / PAGE_BLOCKS)]?.[j % PAGE_BLOCKS] ?? 0;
		return normalisePeaks(sliceRms(block, this.#blocks, this.#frames));
	}
}

/**
 * The RMS of each of `PEAK_BARS` equal slices of `frames` frames, from energy
 * summed per `BLOCK_FRAMES` frames (the last block may be shorter). A block a
 * slice boundary cuts is split in proportion to the frames on each side.
 */
function sliceRms(
	block: (j: number) => number,
	blocks: number,
	frames: number
): number[] {
	// Energy of frames [0, x), walking the blocks once from left to right.
	let j = 0;
	let before = 0;
	const energyBefore = (x: number) => {
		while (j < blocks - 1 && (j + 1) * BLOCK_FRAMES <= x) {
			before += block(j);
			j++;
		}
		const start = j * BLOCK_FRAMES;
		const length = Math.min(BLOCK_FRAMES, frames - start);
		return before + (block(j) * Math.min(x - start, length)) / length;
	};
	const width = frames / PEAK_BARS;
	let previous = 0;
	return Array.from({ length: PEAK_BARS }, (_, i) => {
		const upTo = energyBefore((i + 1) * width);
		const energy = upTo - previous;
		previous = upTo;
		return Math.sqrt(Math.max(0, energy) / width);
	});
}

/** Scale slice RMS values to 0–1 against the third-loudest slice; see the module comment. */
export function normalisePeaks(rms: readonly number[]): number[] {
	const reference = [...rms].sort((a, b) => b - a)[REFERENCE_RANK - 1] ?? 0;
	if (!(reference >= SILENCE_RMS)) {
		return rms.map(() => 0);
	}
	return rms.map(
		(value) => Math.round(Math.min(1, value / reference) * ROUND) / ROUND
	);
}

/** What `audio_tracks.peaks` must be: exactly `PEAK_BARS` numbers, each 0–1. */
export function assertPeaks(peaks: readonly number[]) {
	if (
		peaks.length !== PEAK_BARS ||
		!peaks.every((p) => Number.isFinite(p) && p >= 0 && p <= 1)
	) {
		throw new ConvexError(
			`peaks must be ${PEAK_BARS} numbers from 0 to 1 (got ${peaks.length})`
		);
	}
}
