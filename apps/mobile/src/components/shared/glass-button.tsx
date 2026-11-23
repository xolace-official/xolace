import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ComponentProps, ReactNode, Ref } from "react";
import { StyleSheet, type ViewInstance, type ViewStyle } from "react-native";
import { useResolveClassNames } from "uniwind";
import { splitSurfaceStyle } from "@/components/shared/glass-button-style";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const GLASS = isLiquidGlassAvailable();
const CAPSULE = 999;

export type GlassFill = "foreground" | "accent" | "secondary";

const SOLID: Record<GlassFill, string> = {
	accent: "bg-accent",
	foreground: "bg-foreground",
	secondary: "bg-surface-secondary",
};

type Props = Omit<ComponentProps<typeof PressScale>, "children" | "ref"> & {
	children?: ReactNode;
	ref?: Ref<ViewInstance>;
	/**
	 * `foreground` and `accent` are tinted Liquid Glass on iOS 26+ and a solid
	 * fill elsewhere. `secondary` is always the solid quiet surface: the off or
	 * "not this one" look a glass button switches to.
	 */
	fill?: GlassFill;
};

/**
 * A filled button. Pass the same `className` a filled `PressScale` would take,
 * without its `bg-*`: size and placement (height, flex, margins, opacity) stay
 * on the pressable, while padding, alignment, gap and corners move onto the
 * glass, which holds the children. Corners default to a capsule.
 *
 * The glass answers a press itself (it swells), so it doesn't also shrink.
 */
export function GlassButton({
	fill = "foreground",
	className,
	style,
	children,
	disabled,
	scaleTo,
	...rest
}: Props) {
	const scheme = useScheme();
	const tint = useTokenColor(fill);
	const glass = GLASS && fill !== "secondary";
	const resolved = useResolveClassNames(glass ? (className ?? "") : "");
	if (!glass) {
		return (
			<PressScale
				className={cn("rounded-full", SOLID[fill], className)}
				disabled={disabled}
				scaleTo={scaleTo}
				style={style}
				{...rest}
			>
				{children}
			</PressScale>
		);
	}
	const { outer, surface } = splitSurfaceStyle(
		StyleSheet.flatten([resolved as ViewStyle, style])
	);
	return (
		<PressScale
			disabled={disabled}
			scaleTo={scaleTo ?? 1}
			style={outer}
			{...rest}
		>
			<GlassView
				colorScheme={scheme}
				glassEffectStyle="regular"
				isInteractive={!disabled}
				style={[
					{ borderCurve: "continuous", borderRadius: CAPSULE, flexGrow: 1 },
					surface,
				]}
				tintColor={tint}
			>
				{children}
			</GlassView>
		</PressScale>
	);
}
