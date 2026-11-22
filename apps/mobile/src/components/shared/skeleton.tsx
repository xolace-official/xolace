import { useIsFocused } from "expo-router/react-navigation";
import type { ReactNode } from "react";
import { type DimensionValue, View, type ViewStyle } from "react-native";
import { EaseView, FADE_IN } from "@/design/ease";
import { breathProps } from "@/design/ease-breath";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

export const SKELETON = {
	from: { opacity: 1 },
	meta: 11,
	periodMs: 1600,
	text: 13,
	title: 20,
	to: { opacity: 0.55 },
} as const;

export function SkeletonBreath({
	label,
	children,
	fill,
	className,
	style,
}: {
	label: string;
	children: ReactNode;
	fill?: boolean;
	className?: string;
	style?: ViewStyle;
}) {
	const reduced = useEffectiveReducedMotion();
	const focused = useIsFocused();
	const still = reduced || !focused;
	return (
		<EaseView {...FADE_IN} className={fill ? "flex-1" : undefined}>
			<EaseView
				accessibilityLabel={label}
				accessible
				className={cn(fill && "flex-1", className)}
				key={still ? "still" : "breath"}
				style={style}
				{...breathProps(SKELETON.periodMs, still, SKELETON.from, SKELETON.to)}
			>
				{children}
			</EaseView>
		</EaseView>
	);
}

export function Bone({
	w,
	h = SKELETON.text,
	r = 6,
	className,
	style,
}: {
	w: DimensionValue;
	h?: DimensionValue;
	r?: number;
	className?: string;
	style?: ViewStyle;
}) {
	return (
		<View
			className={cn("border-continuous bg-surface-secondary", className)}
			style={[{ borderRadius: r, height: h, width: w }, style]}
		/>
	);
}

export function Line({
	w,
	lh,
	h = SKELETON.text,
	center,
	className,
}: {
	w: DimensionValue;
	lh: number;
	h?: number;
	center?: boolean;
	className?: string;
}) {
	return (
		<View
			className={cn("justify-center", center && "items-center")}
			style={{ height: lh }}
		>
			<Bone className={className} h={h} r={Math.min(6, h / 2)} w={w} />
		</View>
	);
}

export function Pill({ w, h = 28 }: { w: number; h?: number }) {
	return <Bone h={h} r={h / 2} w={w} />;
}
