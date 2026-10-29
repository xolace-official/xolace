import React from "react";
import {
	Platform,
	Text as RNText,
	type TextProps as RNTextProps,
	StyleSheet,
	type TextInstance,
} from "react-native";
import { cn } from "@/lib/utils";

// Replacement for RN's Text with the default font and theme colour. Android gets
// `includeFontPadding: false`: its ascent/descent padding otherwise wraps text earlier than iOS.
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
