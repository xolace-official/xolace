const SILENCE_DB = -50;
const LOUD_DB = -10;

export function meteringLevel(db: number | undefined): number {
	if (db === undefined || Number.isNaN(db)) {
		return 0;
	}
	const level = (db - SILENCE_DB) / (LOUD_DB - SILENCE_DB);
	return Math.min(1, Math.max(0, level));
}
