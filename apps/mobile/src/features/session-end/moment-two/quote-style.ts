import { FONTS } from "@/design/type";
import { LAYOUT } from "../session-look";

const C = LAYOUT.card;

/** `.q`: the quote, Newsreader italic 19.5/27. */
export const QUOTE = {
	fontFamily: FONTS.mirror,
	fontSize: C.quote,
	lineHeight: C.quoteLine,
} as const;
