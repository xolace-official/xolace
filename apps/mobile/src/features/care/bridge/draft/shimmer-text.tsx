import MaskedView from "@react-native-masked-view/masked-view";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { LinearGradient } from "@/components/shared/styled";
import { EASING, EaseView } from "@/design/ease";
import { loopProps } from "@/design/ease-loops";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const SWEEP_MS = 1900;
const BAND = 0.6;
const START = { x: 0, y: 0.5 } as const;
const END = { x: 1, y: 0.5 } as const;

function Line({ text, hidden = false }: { text: string; hidden?: boolean }) {
	return (
		<AppText
			center
			className={hidden ? "opacity-0" : undefined}
			variant="headline"
			weight="regular"
		>
			{text}
		</AppText>
	);
}

export function ShimmerText({ text }: { text: string }) {
	const reduced = useEffectiveReducedMotion();
	const [muted, foreground] = useTokenColors(["muted", "foreground"]);
	const [width, setWidth] = useState(0);
	const band = width * BAND;

	return (
		<View
			accessibilityLabel={text}
			accessible
			onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
		>
			<MaskedView maskElement={<Line text={text} />}>
				<Line hidden text={text} />
				<View className="absolute inset-0 bg-muted" />
				{width > 0 && !reduced ? (
					<EaseView
						className="absolute inset-y-0 left-0"
						key={width}
						style={{ width: band }}
						{...loopProps({
							easing: EASING.inOutEase,
							from: { translateX: -band },
							mode: "repeat",
							periodMs: SWEEP_MS,
							reduced,
							to: { translateX: width },
						})}
					>
						<LinearGradient
							className="flex-1"
							colors={[muted, foreground, muted]}
							end={END}
							start={START}
						/>
					</EaseView>
				) : null}
			</MaskedView>
		</View>
	);
}
