/**
 * Continuous recognition emits each final result as a new segment, and
 * interim results cover only the segment in progress — so the dictated text is
 * the finalised segments plus the live one. iOS 18 prefixes post-pause
 * segments with a space; trimming keeps the join to exactly one.
 */
export function joinDictation(finalised: string, live: string): string {
  return [finalised.trim(), live.trim()].filter(Boolean).join(' ');
}
