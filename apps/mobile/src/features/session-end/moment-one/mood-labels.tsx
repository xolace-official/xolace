import { View } from "react-native";
import Animated, { type useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { COPY } from "../copy";
import { LAYOUT } from "../session-look";

const L = LAYOUT;
const LABEL_MAX = 1.25;
export const LINE = 18;

type Styled = { style: ReturnType<typeof useAnimatedStyle> };

export function NotSureLine({ style }: Styled) {
	return (
		<Animated.View
			pointerEvents="none"
			style={[
				{
					height: LINE,
					marginHorizontal: L.unsure.side,
					marginTop: L.unsure.top - L.word.top - L.word.height,
				},
				style,
			]}
		>
			<AppText
				center
				color="muted"
				maxFontSizeMultiplier={LABEL_MAX}
				style={{ fontSize: L.unsure.size, lineHeight: LINE }}
				variant="callout"
			>
				{COPY.notSureLine}
			</AppText>
		</Animated.View>
	);
}

export function MoodLabels({ style }: Styled) {
	return (
		<Animated.View
			accessibilityElementsHidden
			className="flex-row justify-between"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{
					marginHorizontal: L.ends.side,
					marginTop: L.ends.top - L.track.top - L.track.height,
				},
				style,
			]}
		>
			{[COPY.heavier, COPY.lighter].map((end) => (
				<AppText
					color="muted"
					key={end}
					maxFontSizeMultiplier={LABEL_MAX}
					style={{ fontSize: L.ends.size, lineHeight: LINE }}
					variant="callout"
				>
					{end}
				</AppText>
			))}
		</Animated.View>
	);
}

export function NotSureButton({
	selected,
	onPress,
	style,
}: Styled & { selected: boolean; onPress: () => void }) {
	return (
		<Animated.View
			className="items-center"
			style={[{ marginTop: L.notSure.top - L.ends.top - LINE }, style]}
		>
			<PressScale
				accessibilityLabel={COPY.notSure}
				accessibilityState={{ selected }}
				className={cn(
					"items-center justify-center rounded-full px-3",
					selected ? "bg-accent-wash" : "bg-transparent"
				)}
				onPress={onPress}
				style={{ minHeight: L.notSure.h, minWidth: L.notSure.w }}
			>
				<AppText
					className="leading-[20px]"
					color={selected ? "accentInk" : "muted"}
					maxFontSizeMultiplier={LABEL_MAX}
					style={{ fontSize: L.notSure.size }}
					variant="callout"
					weight="semibold"
				>
					{COPY.notSure}
				</AppText>
			</PressScale>
		</Animated.View>
	);
}
