import type { StyleProp, TextStyle } from "react-native";
import Animated, { type useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import type { TextColor } from "@/components/shared/app-text-face";
import type { TypeVariant } from "@/design/type";
import { useTokenColor } from "@/lib/use-token-color";

/** The ink's strength under its shadow (GleamTitle's soft copy). */
const SOFT_INK = 0.33;
const SOFT_R = 6;
/** iOS draws a text shadow only with an offset set. */
const NO_OFFSET = { height: 0, width: 0 } as const;

type Props = {
	text: string;
	variant: TypeVariant;
	style: StyleProp<TextStyle>;
	color?: TextColor;
	/** The copy's opacity, from the clock: 1 as the text arrives, 0 once it's sharp. */
	soft: ReturnType<typeof useAnimatedStyle>;
};

/**
 * The blur a label or caption rises out of. Native text can't be blurred on
 * iOS, so this is a soft copy over it (as GleamTitle and Reflect's stage line
 * do), fading as the text sharpens. Hidden from VoiceOver.
 */
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
