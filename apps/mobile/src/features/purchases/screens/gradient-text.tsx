import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient, type LinearGradientProps } from "expo-linear-gradient";
import { StyleSheet, Text, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

type GradientTextProps = {
	text: string;
	gradientProps?: Partial<LinearGradientProps>;
	className?: string;
	textProps?: TextProps;
};

export const GradientText = ({
	text,
	gradientProps,
	className,
	textProps,
}: GradientTextProps) => {
	const { className: textClassName, ...restTextProps } = textProps ?? {};
	const textClasses = cn(className, textClassName);

	const mask = (
		<Text {...restTextProps} className={textClasses}>
			{text}
		</Text>
	);

	return (
		<MaskedView maskElement={mask}>
			<LinearGradient
				{...gradientProps}
				colors={gradientProps?.colors ?? ["blue", "yellow", "blue"]}
				end={gradientProps?.end ?? { x: 1, y: 0 }}
				start={gradientProps?.start ?? { x: 0, y: 0 }}
				style={[StyleSheet.absoluteFill, gradientProps?.style]}
			/>
			<Text {...restTextProps} className={cn(textClasses, "opacity-0")}>
				{text}
			</Text>
		</MaskedView>
	);
};
