import type { StyleProp, TextStyle } from "react-native";
import Animated, { type useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import type { TextColor } from "@/components/shared/app-text-face";
import type { TypeVariant } from "@/design/type";
import { useTokenColor } from "@/lib/use-token-color";

const SOFT_INK = 0.33;
const SOFT_R = 6;
/** iOS draws a text shadow only with an offset set. */
const NO_OFFSET = { height: 0, width: 0 } as const;

type Props = {
	text: string;
	variant: TypeVariant;
	style: StyleProp<TextStyle>;
	color?: TextColor;
	soft: ReturnType<typeof useAnimatedStyle>;
};

export function SoftCopy({
	text,
	variant,
	style,
	color = "foreground",
	soft,
}: Props) {
	const ink = useTokenColor(color === "muted" ? "muted" : "foreground");
	return (
		<Animated.View
			accessibilityElementsHidden
			className="absolute inset-0"
			importantForAccessibility="no-hide-descendants"
			style={soft}
		>
			<AppText
				center
				color={color}
				style={[
					style,
					{
						opacity: SOFT_INK,
						textShadowColor: ink,
						textShadowOffset: NO_OFFSET,
						textShadowRadius: SOFT_R,
					},
				]}
				variant={variant}
			>
				{text}
			</AppText>
		</Animated.View>
	);
}
