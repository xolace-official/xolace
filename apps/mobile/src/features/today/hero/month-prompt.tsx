import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useFixedFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { FONTS } from "@/design/type";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";

const TIGHTEN = { gap: 8, top: -4 } as const;

export function MonthPrompt({ prompt }: { prompt: string }) {
	const dark = useScheme() === "dark";
	const rose = useTokenColor(dark ? "month-rose-dark" : "month-rose");
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
