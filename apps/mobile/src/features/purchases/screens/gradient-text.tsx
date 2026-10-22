import { Text, TextProps, StyleSheet } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient, LinearGradientProps } from "expo-linear-gradient";
import { cn } from "@/src/lib/utils";

type GradientTextProps = {
  text: string;
  gradientProps?: Partial<LinearGradientProps>;
  className?: string;
  textProps?: TextProps;
};

export const GradientText = ({ text, gradientProps, className, textProps }: GradientTextProps) => {
  // The mask and the hidden Text must resolve to identical text metrics — the
  // mask clips the gradient, the hidden Text establishes layout size.
  const { className: textClassName, ...restTextProps } = textProps ?? {};
  const textClasses = cn(className, textClassName);

  // MaskedView takes the mask as an element; React Compiler memoizes it.
  const mask = (
    // eslint-disable-next-line react-perf/jsx-no-jsx-as-prop
    <Text {...restTextProps} className={textClasses}>
      {text}
    </Text>
  );

  return (
    <MaskedView maskElement={mask}>
      <LinearGradient
        {...gradientProps}
        colors={gradientProps?.colors ?? ["blue", "yellow", "blue"]}
        start={gradientProps?.start ?? { x: 0, y: 0 }}
        end={gradientProps?.end ?? { x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill, gradientProps?.style]}
      />
      <Text {...restTextProps} className={cn(textClasses, "opacity-0")}>
        {text}
      </Text>
    </MaskedView>
  );
};
