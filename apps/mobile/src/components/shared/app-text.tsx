import type { ComponentPropsWithRef } from "react";
import {
	Platform,
	Text as RNText,
	StyleSheet,
	type TextStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import {
	BODY_MAX_SCALE,
	DISPLAY_MAX_SCALE,
	scalesAsBody,
	type TypeVariant,
	type Weight,
} from "@/design/type";
import { TYPE_CLASS } from "@/design/type-classes.generated";
import { cn } from "@/lib/utils";
import {
	bodyRole,
	ROLE_CLASS,
	resolveFace,
	TEXT_COLORS,
	type TextColor,
} from "./app-text-face";

// Android gets `includeFontPadding: false`: its ascent/descent padding otherwise
// wraps text earlier than iOS.
const styles = StyleSheet.create({
	android: { includeFontPadding: false },
});

type Props = ComponentPropsWithRef<typeof RNText> & {
	/**
	 * A step of the type scale (`type-<variant>`, src/design/type.ts): the
	 * theme's face, size, line height and tracking. New code always passes
	 * one. Without it, AppText is the old one: the theme's body face and
	 * whatever size the classes give.
	 */
	variant?: TypeVariant;
	weight?: Weight;
	/** Body text in the theme's italic. */
	italic?: boolean;
	color?: TextColor;
	center?: boolean;
};

const androidStyle = (style: Props["style"]) =>
	Platform.OS === "android" ? [styles.android, style] : style;

/** The only way text is drawn in the app. */
export function AppText({
	variant,
	weight,
	italic = false,
	color = "foreground",
	center,
	className,
	style,
	...rest
}: Props) {
	if (variant === undefined) {
		return (
			<RNText
				className={cn(
					ROLE_CLASS[bodyRole(weight, italic)],
					TEXT_COLORS[color],
					center && "text-center",
					className
				)}
				style={androidStyle(style)}
				{...rest}
			/>
		);
	}

	const flat = StyleSheet.flatten(style) as TextStyle | undefined;
	const face = resolveFace(variant, weight, italic, flat);
	return (
		<RNText
			className={cn(
				TYPE_CLASS[variant],
				face.roleClass,
				TEXT_COLORS[color],
				center && "text-center",
				className
			)}
			maxFontSizeMultiplier={
				scalesAsBody(variant) && !face.capped
					? BODY_MAX_SCALE
					: DISPLAY_MAX_SCALE
			}
			style={androidStyle(face.style ?? style)}
			{...rest}
		/>
	);
}

/** @public AppText for Reanimated styles (entering, layout, animated colour). */
export const AnimatedAppText = Animated.createAnimatedComponent(AppText);
