import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { EASING, EaseView } from "@/design/ease";
import { loopProps } from "@/design/ease-loops";
import { QuoteGlass } from "../chrome/quote-glass";
import { type InkPalette, textShadow } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import { POSTER_MEDIUM } from "./quote-type";

const BARS = [0.62, 0.88, 0.76, 0.4];
const SHIMMER_MS = 1400;
const PERCENT = 100;

export function QuoteState({
	status,
	ink,
	shadowColor,
	reduced,
	onRetry,
}: {
	status: "loading" | "error";
	ink: InkPalette;
	shadowColor: string;
	reduced: boolean;
	onRetry: () => void;
}) {
	if (status === "loading") {
		return <Skeleton ink={ink} reduced={reduced} />;
	}
	return (
		<View className="items-center gap-4">
			<AppText
				center
				className="text-[22px] leading-[27.5px]"
				style={[
					{ color: ink.text, fontFamily: POSTER_MEDIUM },
					ink.shadow ? textShadow(shadowColor) : null,
				]}
				variant="poster"
			>
				{QUOTE_COPY.error}
			</AppText>
			<PressScale
				accessibilityLabel={QUOTE_COPY.retry}
				accessibilityRole="button"
				onPress={onRetry}
			>
				<QuoteGlass
					className="h-12 justify-center rounded-full px-5.5"
					ink={ink}
				>
					<AppText
						className="text-[15.5px]"
						style={{ color: ink.glassIcon }}
						variant="callout"
						weight="semibold"
					>
						{QUOTE_COPY.retry}
					</AppText>
				</QuoteGlass>
			</PressScale>
		</View>
	);
}

function Skeleton({ ink, reduced }: { ink: InkPalette; reduced: boolean }) {
	const pulse = loopProps({
		easing: EASING.inOutEase,
		from: { opacity: 0.1 },
		periodMs: SHIMMER_MS,
		reduced,
		to: { opacity: 0.22 },
	});
	return (
		<View
			accessibilityLabel={QUOTE_COPY.loading}
			accessible
			className="w-full items-center gap-3.5"
		>
			{BARS.map((w) => (
				<EaseView
					className="h-6.5 rounded-[13px]"
					key={`${w}-${reduced}`}
					style={{ backgroundColor: ink.text, width: `${w * PERCENT}%` }}
					{...pulse}
				/>
			))}
		</View>
	);
}
