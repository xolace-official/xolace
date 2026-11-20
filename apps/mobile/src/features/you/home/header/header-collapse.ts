/**
 * Where the header's collapse goes when its collapse range changes under a scrolled tab; null
 * leaves it where it is.
 *
 * The tabs library moves the header by scroll deltas, each capped at the range of that moment,
 * so a header that grows after you've scrolled past its old range (a larger text size, a card
 * whose data arrives late) stays stuck at the old collapse while the content inset grows: the
 * page then shows above the tab bar, through the clear header. Re-anchoring to the active tab's
 * offset, clamped to the new range, keeps the content below the tab bar or docks the header.
 */
export function nextCollapse({
	range,
	before,
	offset,
}: {
	range: number;
	before: number | null;
	offset: number | undefined;
}) {
	"worklet";
	if (before === null || range === before) {
		return null;
	}
	return Math.min(Math.max(offset ?? 0, 0), Math.max(range, 0));
}
