import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { Image } from "@/components/shared/styled";
import { COIN_D } from "@/features/achievements/coin/pose";
import { COPY } from "@/features/achievements/copy";
import { useTokenColor } from "@/lib/use-token-color";

/** The bronze disc, gold rim and faint brushed lines, drawn once (the prototype's make-badge-glows.py). */
const DISC = require("@/assets/images/badges/back-disc.png");
const FLAME =
	"M50 97C25 97 9 82 9 61C9 43 19 31 31 22C39 16 47 10 51 2C55 10 55 18 60 23C64 20 70 16 77 12C78 19 79 25 82 31C88 40 91 50 91 61C91 82 75 97 50 97Z";
const FLAME_SIZE = 26;
const FLAME_STROKE = 6;
const FLAME_OPACITY = 0.85;
/** One text shadow is all React Native draws: the engraving's dark top edge. */
const EDGE = { height: -1, width: 0 };

/**
 * The back (board `.fc.bk`, `.eng`): a bronze disc engraved with the title, the
 * short date, the sparks and XOLACE. It repeats the page, so VoiceOver skips it.
 */
export function BadgeBack({
	title,
	date,
	sparks,
}: {
	title: string;
	date: string;
	sparks: number;
}) {
	const ink = useTokenColor("badge-engrave");
	const edge = useTokenColor("badge-engrave-edge");
	const engraved = {
		color: ink,
		textShadowColor: edge,
		textShadowOffset: EDGE,
		textShadowRadius: 0,
	};
	return (
		<View
			accessibilityElementsHidden
			className="items-center justify-center"
			importantForAccessibility="no-hide-descendants"
			style={{ height: COIN_D, width: COIN_D }}
		>
			<Image
				className="absolute"
				source={DISC}
				style={{ height: COIN_D, width: COIN_D }}
			/>
			<View className="items-center gap-1.5">
				<Svg
					height={FLAME_SIZE}
					style={{ opacity: FLAME_OPACITY }}
					viewBox="0 0 100 100"
					width={FLAME_SIZE}
				>
					<Path d={FLAME} fill="none" stroke={ink} strokeWidth={FLAME_STROKE} />
				</Svg>
				<Caps style={engraved} text={title} />
				<AppText
					className="text-[24px] leading-7 tracking-[-0.24px]"
					maxFontSizeMultiplier={1}
					style={engraved}
					variant="headline"
				>
					{date}
				</AppText>
				<Caps style={engraved} text={COPY.sparks(sparks, true)} />
				<AppText
					className="mt-1.5 text-[9px] leading-[11px] tracking-[3.78px] opacity-70"
					maxFontSizeMultiplier={1}
					style={engraved}
					variant="caption"
					weight="bold"
				>
					{COPY.badge.engrave}
				</AppText>
			</View>
		</View>
	);
}

function Caps({ text, style }: { text: string; style: object }) {
	return (
		<AppText
			center
			className="max-w-37.5 text-[10.5px] uppercase leading-3.5 tracking-[1.68px]"
			maxFontSizeMultiplier={1}
			style={style}
			variant="caption"
			weight="bold"
		>
			{text}
		</AppText>
	);
}
