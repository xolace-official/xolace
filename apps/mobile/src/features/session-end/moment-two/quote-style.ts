import { FONTS } from "@/design/type";
import { LAYOUT } from "../session-look";

const C = LAYOUT.card;

export const QUOTE = {
	fontFamily: FONTS.mirror,
	fontSize: C.quote,
	lineHeight: C.quoteLine,
} as const;
