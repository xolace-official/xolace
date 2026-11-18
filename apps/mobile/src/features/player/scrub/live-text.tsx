import { TextInput, type TextInputProps, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedProps,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

/**
 * Text the UI thread writes (the scrub time, elapsed and time left), so a scrub never renders
 * React. A read-only TextInput, hidden from VoiceOver: the scrubber reads its own value.
 */
export function LiveText({
	text,
	className,
}: {
	text: SharedValue<string>;
	/** Size, face, colour, width and alignment. */
	className?: string;
}) {
	const props = useAnimatedProps(
		() =>
			({
				defaultValue: text.get(),
				text: text.get(),
			}) as Partial<TextInputProps>
	);
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
		>
			<AnimatedInput
				accessible={false}
				allowFontScaling={false}
				animatedProps={props}
				className={cn("m-0 p-0", className)}
				editable={false}
				scrollEnabled={false}
			/>
		</View>
	);
}
