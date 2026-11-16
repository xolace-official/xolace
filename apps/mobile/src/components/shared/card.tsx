import type { ComponentProps, ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn, tv } from "@/lib/cn";

/** The radius that has a token (`rounded-card`). Any other number stays in `style`. */
const TOKEN_RADIUS = 24;

/**
 * Card's surface. `rounded-card` brings continuous corners with it; a custom
 * radius goes in `style`, so it needs `border-continuous` here instead.
 */
const card = tv({
	base: "border border-separator bg-surface",
	defaultVariants: { flat: false, radius: "token" },
	variants: {
		flat: { false: "shadow-card", true: "" },
		radius: { custom: "border-continuous", token: "rounded-card" },
	},
});

type Props = {
	children: ReactNode;
	radius?: number;
	style?: StyleProp<ViewStyle>;
	className?: string;
	/** Pass to make the card a button (presses to .98). */
	onPress?: () => void;
	label?: string;
	flat?: boolean;
} & Pick<ComponentProps<typeof PressScale>, "haptic">;

/** Content surface: card colour, a hairline and one soft shadow. */
export function Card({
	children,
	radius = TOKEN_RADIUS,
	style,
	className,
	onPress,
	label,
	flat = false,
	haptic,
}: Props) {
	const custom = radius !== TOKEN_RADIUS;
	const classes = cn(
		card({ flat, radius: custom ? "custom" : "token" }),
		className
	);
	const shape = custom ? [{ borderRadius: radius }, style] : style;
	if (onPress) {
		return (
			<PressScale
				accessibilityLabel={label}
				card
				className={classes}
				haptic={haptic}
				onPress={onPress}
				style={shape}
			>
				{children}
			</PressScale>
		);
	}
	return (
		<View className={classes} style={shape}>
			{children}
		</View>
	);
}

const ACTION_HIT_SLOP = 10;

/**
 * "Your moments · See all" style section header.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function SectionHeader({
	title,
	action,
	onAction,
	className,
}: {
	title: string;
	action?: string;
	onAction?: () => void;
	className?: string;
}) {
	return (
		<View
			className={cn(
				"flex-row items-baseline justify-between px-1 pt-1.5",
				className
			)}
		>
			<AppText accessibilityRole="header" variant="headline">
				{title}
			</AppText>
			{action ? (
				<PressScale
					accessibilityRole="link"
					hitSlop={ACTION_HIT_SLOP}
					onPress={onAction}
				>
					<AppText color="accentInk" variant="callout" weight="medium">
						{action}
					</AppText>
				</PressScale>
			) : null}
		</View>
	);
}
