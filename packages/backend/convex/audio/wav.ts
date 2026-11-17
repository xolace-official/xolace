import type { DecodedChunk } from "./peaks";

/**
 * A streaming WAV reader for `measurePeaks.ts`: uploads take MP3 or WAV
 * (`formats.ts`), and a WAV is plain samples behind a RIFF header, so it
 * needs no decoder. Integer PCM at 8, 16, 24 or 32 bits and 32-bit float
 * (including WAVE_FORMAT_EXTENSIBLE wrappers of those); anything else throws.
 * Bytes arrive in any chunking. Chunks other than `fmt ` and `data` (LIST,
 * bext, iXML, embedded artwork…) are skipped by counting their bytes, never
 * buffered, so metadata of any size is fine; a frame split across chunks is
 * carried over.
 */

const PCM = 1;
const FLOAT = 3;
const EXTENSIBLE = 0xff_fe;
const RIFF_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
/** `fmt ` is 16, 18 or 40 bytes; anything this big isn't a format chunk. */
const MAX_FMT_BYTES = 1024;
const EMPTY: DecodedChunk = { channelData: [], samplesDecoded: 0 };

type Format = {
	bits: number;
	channels: number;
	float: boolean;
	sampleRate: number;
};

/** Where the reader is: what the next bytes are. */
type State =
	| { kind: "riff" }
	| { kind: "chunk" }
	| { kind: "fmt"; size: number }
	| { kind: "skip"; left: number }
	| { kind: "data" };

const ascii = (bytes: Uint8Array, at: number) =>
	String.fromCharCode(...bytes.subarray(at, at + 4));

function concat(a: Uint8Array, b: Uint8Array) {
	if (a.length === 0) {
		return b;
	}
	const out = new Uint8Array(a.length + b.length);
	out.set(a);
	out.set(b, a.length);
	return out;
}

function parseFormat(view: DataView): Format {
	const extensible = view.getUint16(0, true) === EXTENSIBLE;
	if (view.byteLength < (extensible ? 26 : 16)) {
		throw new Error("WAV fmt chunk is too short");
	}
	// The extensible sub-format GUID starts with the real format tag.
	const tag = view.getUint16(extensible ? 24 : 0, true);
	const channels = view.getUint16(2, true);
	const sampleRate = view.getUint32(4, true);
	const bits = view.getUint16(14, true);
	const float = tag === FLOAT && bits === 32;
	const pcm = tag === PCM && [8, 16, 24, 32].includes(bits);
	if (!((float || pcm) && channels > 0 && sampleRate > 0)) {
		throw new Error(
			`unsupported WAV encoding (format ${tag}, ${bits} bits, ${channels} channels)`
		);
	}
	return { bits, channels, float, sampleRate };
}

/** Chunks are padded to an even length. */
const padded = (size: number) => size + (size % 2);

export class WavDecoder {
	#pending: Uint8Array = new Uint8Array(0);
	#state: State = { kind: "riff" };
	#format: Format | null = null;
	/** Data bytes still to come; Infinity when the header doesn't say. */
	#dataLeft = 0;

	decode(bytes: Uint8Array): DecodedChunk {
		const input = concat(this.#pending, bytes);
		this.#pending = new Uint8Array(0);
		let at = 0;
		while (this.#state.kind !== "data") {
			const state = this.#state;
			if (state.kind === "skip") {
				const n = Math.min(state.left, input.length - at);
				at += n;
				if (n < state.left) {
					this.#state = { kind: "skip", left: state.left - n };
					return EMPTY;
				}
				this.#state = { kind: "chunk" };
				continue;
			}
			const need =
				state.kind === "riff"
					? RIFF_HEADER_BYTES
					: state.kind === "chunk"
						? CHUNK_HEADER_BYTES
						: padded(state.size);
			if (input.length - at < need) {
				// Only headers and the small fmt chunk ever wait here.
				this.#pending = input.slice(at);
				return EMPTY;
			}
			const view = new DataView(input.buffer, input.byteOffset + at, need);
			this.#read(state, input.subarray(at, at + need), view);
			at += need;
		}
		return this.#samples(input.subarray(at));
	}

	/** Act on one complete header or fmt chunk, and move to what follows it. */
	#read(
		state: Exclude<State, { kind: "skip" | "data" }>,
		bytes: Uint8Array,
		view: DataView
	) {
		if (state.kind === "riff") {
			if (!(ascii(bytes, 0) === "RIFF" && ascii(bytes, 8) === "WAVE")) {
				throw new Error("not a RIFF/WAVE file");
			}
			this.#state = { kind: "chunk" };
			return;
		}
		if (state.kind === "fmt") {
			this.#format = parseFormat(
				new DataView(view.buffer, view.byteOffset, state.size)
			);
			this.#state = { kind: "chunk" };
			return;
		}
		const id = ascii(bytes, 0);
		const size = view.getUint32(4, true);
		if (id === "data") {
			if (!this.#format) {
				throw new Error("WAV data before its fmt chunk");
			}
			// 0 and 0xFFFFFFFF are what streaming writers leave when they can't seek back.
			this.#dataLeft =
				size === 0 || size === 0xff_ff_ff_ff ? Number.POSITIVE_INFINITY : size;
			this.#state = { kind: "data" };
		} else if (id === "fmt ") {
			if (size > MAX_FMT_BYTES) {
				throw new Error(`WAV fmt chunk of ${size} bytes`);
			}
			this.#state = { kind: "fmt", size };
		} else {
			this.#state = { kind: "skip", left: padded(size) };
		}
	}

	#samples(bytes: Uint8Array): DecodedChunk {
		const format = this.#format;
		if (!format) {
			return EMPTY;
		}
		const usable = bytes.subarray(0, Math.min(bytes.length, this.#dataLeft));
		const width = format.bits / 8;
		const frameBytes = width * format.channels;
		const frames = Math.floor(usable.length / frameBytes);
		const whole = frames * frameBytes;
		this.#dataLeft -= whole;
		// A partial frame waits for the next chunk; anything past the data chunk is dropped.
		if (this.#dataLeft > 0) {
			this.#pending = usable.slice(whole);
		}
		const view = new DataView(usable.buffer, usable.byteOffset, whole);
		const channelData = Array.from(
			{ length: format.channels },
			() => new Float32Array(frames)
		);
		for (let f = 0; f < frames; f++) {
			for (let c = 0; c < format.channels; c++) {
				const at = f * frameBytes + c * width;
				const channel = channelData[c];
				if (channel) {
					channel[f] = readSample(view, at, format);
				}
			}
		}
		return {
			channelData,
			sampleRate: format.sampleRate,
			samplesDecoded: frames,
		};
	}
}

function readSample(view: DataView, at: number, { bits, float }: Format) {
	if (float) {
		return view.getFloat32(at, true);
	}
	switch (bits) {
		case 8:
			return (view.getUint8(at) - 128) / 128;
		case 16:
			return view.getInt16(at, true) / 0x80_00;
		case 24: {
			const low = view.getUint16(at, true);
			const high = view.getInt8(at + 2);
			return (high * 0x1_00_00 + low) / 0x80_00_00;
		}
		default:
			return view.getInt32(at, true) / 0x80_00_00_00;
	}
}
