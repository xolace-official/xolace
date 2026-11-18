/**
 * A CSS keyframe track: `stops` are offsets (0…1) with values, and the
 * animation's timing function applies within each segment, as CSS does.
 */
export function keyframes(
	p: number,
	stops: readonly (readonly [number, number])[],
	ease: (x: number) => number
) {
	"worklet";
	const first = stops[0];
	if (!first || p <= first[0]) {
		return first ? first[1] : 0;
	}
	for (let i = 0; i < stops.length - 1; i += 1) {
		const a = stops[i];
		const b = stops[i + 1];
		if (a && b && p <= b[0]) {
			return a[1] + (b[1] - a[1]) * ease((p - a[0]) / (b[0] - a[0]));
		}
	}
	const last = stops.at(-1);
	return last ? last[1] : 0;
}
