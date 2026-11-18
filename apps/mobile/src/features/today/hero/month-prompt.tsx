import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useFixedFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { FONTS } from "@/design/type";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";

/** The card's own gap is 18 and its top 26; the board tightens both (8, 22) while it holds the prompt. */
const TIGHTEN = { gap: 8, top: -4 } as const;

/**
 * This month's prompt in place of the card's question while it's carried this week
 * (board `.ph.wrote .tref`): "THIS MONTH" 11.5 / 700 / .08em in rose, then the prompt in
 * the mirror's serif, 23 / 1.18.
 */
export function MonthPrompt({ prompt }: { prompt: string }) {
	// On the card's theme surface, so it follows light and dark.
	const dark = useScheme() === "dark";
	const rose = useTokenColor(dark ? "month-rose-dark" : "month-rose");
	// The mirror's serif is a fixed face, loaded where it's drawn; until then the line keeps its place.
	const ready = useFixedFaces("mirror");
	return (
		<View
			className="pr-7.5"
			style={{ gap: TIGHTEN.gap, marginTop: TIGHTEN.top }}
		>
			<AppText
				className="text-[11.5px] leading-[15px] tracking-[0.92px]"
				style={{ color: rose }}
				variant="caption"
				weight="bold"
			>
				{COPY.card.monthLabel}
			</AppText>
			<AppText
				className="text-[23px] leading-[27.1px]"
				style={ready ? { fontFamily: FONTS.mirror } : undefined}
			>
				{prompt}
			</AppText>
		</View>
	);
}
