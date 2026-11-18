/**
 * How far the header is collapsed once its collapse range changes under a scrolled tab.
 *
 * The tabs library moves the header by scroll deltas, each capped at the range of that moment,
 * so a header that grows after you've scrolled past its old range (text that lays out taller at
 * large sizes, a card whose data arrives late) stays stuck at the old collapse while the content
 * inset grows: the page then shows above the tab bar, through the clear header. Re-anchoring to
 * the active tab's offset keeps the content below the tab bar, or docks the header under it.
 */
export function collapseForRange(offset: number, range: number) {
	"worklet";
	return Math.min(Math.max(offset, 0), Math.max(range, 0));
}
