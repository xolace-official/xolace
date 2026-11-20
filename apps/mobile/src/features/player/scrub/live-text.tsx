import { TextInput, type TextInputProps, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedProps,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

export function LiveText({
	text,
	className,
}: {
	text: SharedValue<string>;
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
