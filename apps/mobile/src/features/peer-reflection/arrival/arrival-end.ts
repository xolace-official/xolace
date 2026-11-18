import { writeEnd } from "@/components/shared/write-strips";
import { LAYOUT, MOTION, T, TIMING } from "../peers-look";
import { cardStart, readAt } from "./arrival-time";

/** Long enough for a quote's seven lines to write and its chip row to fade in. */
export const WRITE_MAX = writeEnd(LAYOUT.quote.clamp);

/** The arrival's last moment: the title written, the last card's words and star in, the reading pose. */
export function arrivalEnd(words: number, n: number): number {
	const title = T.title + Math.max(0, words - 1) * T.tStep + MOTION.wordMs;
	const sub = T.title + MOTION.subDelay + MOTION.subMs;
	const last = cardStart(Math.max(0, n - 1));
	const stars =
		n > 0 ? last + TIMING.bloomAt + TIMING.bloom : T.first + MOTION.doneMs;
	const read = n > 0 ? readAt(n) : T.first;
	const quotes = n > 0 ? last + WRITE_MAX : T.first;
	return Math.max(title, sub, stars, read, quotes) + 1;
}
