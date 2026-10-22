import React from "react";
import {
	Platform,
	Text as RNText,
	type TextProps as RNTextProps,
	StyleSheet,
	type TextInstance,
} from "react-native";
import { cn } from "@/src/lib/utils";

/**
 * Drop-in replacement for React Native's Text with default font and theme color applied.
 * Use this instead of importing Text from 'react-native' directly.
 *
 * Default styles: `font-normal text-foreground` — override via className prop.
 *
 * `includeFontPadding: false` on Android: Android otherwise pads every Text
 * block with the font's ascent/descent slack, so the same copy measures taller
 * there than on iOS and wraps a line earlier. In a stack of a dozen texts (the
 * intake offer cards) that difference is enough to overflow a fixed-height box.
 */
const styles = StyleSheet.create({
	android: { includeFontPadding: false },
});

export const AppText = React.forwardRef<TextInstance, RNTextProps>(
	(props, ref) => {
		const { className, style, ...restProps } = props;

		return (
			<RNText
				className={cn("font-normal text-foreground", className)}
				ref={ref}
				style={Platform.OS === "android" ? [styles.android, style] : style}
				{...restProps}
			/>
		);
	}
);

AppText.displayName = "AppText";
