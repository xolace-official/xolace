// Room tone sits around -50 dBFS and loud speech near -10 on both platforms
// (iOS averagePower, Android's maxAmplitude in dB), so that is the 0–1 span.
// Mapping all of -160..0 left silence at ~0.7 and speech crammed above it.
const SILENCE_DB = -50;
const LOUD_DB = -10;

/** Recorder metering (dBFS, undefined when off) as a 0–1 level: 0 = silence, 1 = loud. */
export function meteringLevel(db: number | undefined): number {
	if (db === undefined || Number.isNaN(db)) {
		return 0;
	}
	const level = (db - SILENCE_DB) / (LOUD_DB - SILENCE_DB);
	return Math.min(1, Math.max(0, level));
}
