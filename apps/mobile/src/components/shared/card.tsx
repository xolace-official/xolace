import type { ComponentProps, ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn, tv } from "@/lib/cn";

const TOKEN_RADIUS = 24;

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
	onPress?: () => void;
	label?: string;
	flat?: boolean;
} & Pick<ComponentProps<typeof PressScale>, "haptic">;

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
