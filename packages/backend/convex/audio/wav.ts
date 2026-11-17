import type { DecodedChunk } from "./peaks";

/**
 * A streaming WAV reader for `measurePeaks.ts`: uploads take MP3 or WAV
 * (`formats.ts`), and a WAV is plain samples behind a RIFF header, so it
 * needs no decoder. Integer PCM at 8, 16, 24 or 32 bits and 32-bit float
 * (including WAVE_FORMAT_EXTENSIBLE wrappers of those); anything else throws.
 * Bytes arrive in any chunking; a frame split across chunks is carried over.
 */

const PCM = 1;
const FLOAT = 3;
const EXTENSIBLE = 0xff_fe;
/** A header bigger than this isn't a WAV this reader should keep buffering. */
const MAX_HEADER_BYTES = 1024 * 1024;

type Format = { bits: number; channels: number; float: boolean };

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

function parseFormat(view: DataView, at: number): Format {
	let tag = view.getUint16(at, true);
	const channels = view.getUint16(at + 2, true);
	const bits = view.getUint16(at + 14, true);
	if (tag === EXTENSIBLE) {
		// The sub-format GUID starts with the real format tag.
		tag = view.getUint16(at + 24, true);
	}
	const float = tag === FLOAT && bits === 32;
	const pcm = tag === PCM && [8, 16, 24, 32].includes(bits);
	if (!((float || pcm) && channels > 0)) {
		throw new Error(
			`unsupported WAV encoding (format ${tag}, ${bits} bits, ${channels} channels)`
		);
	}
	return { bits, channels, float };
}

export class WavDecoder {
	#pending: Uint8Array = new Uint8Array(0);
	#format: Format | null = null;
	/** Data bytes still to come; Infinity when the header doesn't say. */
	#dataLeft = 0;

	decode(bytes: Uint8Array): DecodedChunk {
		let input = concat(this.#pending, bytes);
		this.#pending = new Uint8Array(0);
		if (!this.#format) {
			const start = this.#readHeader(input);
			if (start === null) {
				if (input.length > MAX_HEADER_BYTES) {
					throw new Error("no WAV data chunk in the first megabyte");
				}
				this.#pending = input;
				return { channelData: [], samplesDecoded: 0 };
			}
			input = input.subarray(start);
		}
		return this.#samples(input);
	}

	/** Parse up to the `data` chunk; its offset, or null until enough bytes have arrived. */
	#readHeader(bytes: Uint8Array): number | null {
		if (bytes.length < 12) {
			return null;
		}
		if (!(ascii(bytes, 0) === "RIFF" && ascii(bytes, 8) === "WAVE")) {
			throw new Error("not a RIFF/WAVE file");
		}
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
		let format: Format | null = null;
		let at = 12;
		while (at + 8 <= bytes.length) {
			const id = ascii(bytes, at);
			const size = view.getUint32(at + 4, true);
			if (id === "data") {
				if (!format) {
					throw new Error("WAV data before its fmt chunk");
				}
				this.#format = format;
				// 0 and 0xFFFFFFFF are what streaming writers leave when they can't seek back.
				this.#dataLeft =
					size === 0 || size === 0xff_ff_ff_ff
						? Number.POSITIVE_INFINITY
						: size;
				return at + 8;
			}
			// Chunks are padded to an even length.
			const next = at + 8 + size + (size % 2);
			if (next > bytes.length) {
				return null;
			}
			if (id === "fmt ") {
				format = parseFormat(view, at + 8);
			}
			at = next;
		}
		return null;
	}

	#samples(bytes: Uint8Array): DecodedChunk {
		const format = this.#format;
		if (!format) {
			return { channelData: [], samplesDecoded: 0 };
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
		return { channelData, samplesDecoded: frames };
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
