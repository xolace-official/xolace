/** The board's tracks (`design/boards/PlayerAlive.dc.html` `TRACKS`), shaped as
 * `paths.getBoundAudioTrack` returns them. Peaks are the board's `makePeaks(seed)`, so the
 * renders match: seed 11 for "Setting the day down", 29 for the heavy track. */
import type { BoundTrackFields } from "../player-model";

const BARS = 60;
const LCG_A = 16_807;
const LCG_M = 2_147_483_647;
const SEED_MUL = 7919;
const BREATH_ODDS = 0.13;
const HEAD = [0.3, 0.6];
const TAIL = [0.75, 0.5, 0.28];
const DECIMALS = 100;

/** The board's seeded, speech-like peaks: phrases with short breaths, tapered at both ends. */
function makePeaks(seed: number): number[] {
	let x = seed * SEED_MUL + 1;
	const r = () => {
		x = (x * LCG_A) % LCG_M;
		return x / LCG_M;
	};
	const out: number[] = [];
	for (let i = 0; i < BARS; i++) {
		let v = 0.4 + 0.6 * r();
		if (r() < BREATH_ODDS) {
			v = 0.1 + 0.12 * r();
		}
		const prev = out[i - 1];
		if (prev !== undefined) {
			v = v * 0.72 + prev * 0.28;
		}
		out.push(v);
	}
	HEAD.forEach((k, i) => {
		out[i] = (out[i] ?? 0) * k;
	});
	TAIL.forEach((k, i) => {
		const j = BARS - TAIL.length + i;
		out[j] = (out[j] ?? 0) * k;
	});
	// Two decimals, as B4 stores them.
	return out.map((v) => Math.round(v * DECIMALS) / DECIMALS);
}

/** A cover stand-in: the board's two colours with a soft light top right, as an SVG. */
const cover = (a: string, b: string) =>
	`data:image/svg+xml;utf8,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><radialGradient id="l" cx=".72" cy=".22" r=".52"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100" height="100" fill="url(#g)"/><rect width="100" height="100" fill="url(#l)"/></svg>`
	)}`;

export const SPOKEN: BoundTrackFields = {
	durationSec: 492,
	family: "support",
	narrators: ["Sage"],
	peaks: makePeaks(11),
	showCrisisLine: false,
	thumbUrl: cover("#2E2650", "#6B5BB8"),
	title: "Setting the day down",
};

export const MUSIC: BoundTrackFields = {
	attributionText: "Recorded by Lumen Fields · CC BY 4.0",
	durationSec: 214,
	family: "music",
	showCrisisLine: false,
	thumbUrl: cover("#1F3B4D", "#5C8FA8"),
	title: "Quiet water",
};

export const HEAVY: BoundTrackFields = {
	durationSec: 356,
	family: "support",
	narrators: ["Ash"],
	peaks: makePeaks(29),
	showCrisisLine: true,
	thumbUrl: cover("#3A2430", "#8A5468"),
	title: "When it feels like too much",
};

/** A spoken track B4 hasn't measured yet: the line. */
export const NO_PEAKS: BoundTrackFields = { ...SPOKEN, peaks: undefined };

/** The board's times: 3:06 spoken, 1:22 music, 1:04 heavy. */
export const AT = { heavy: 64, music: 82, spoken: 186 } as const;
