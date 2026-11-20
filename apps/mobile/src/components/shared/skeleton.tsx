import { useIsFocused } from "expo-router/react-navigation";
import type { ReactNode } from "react";
import { type DimensionValue, View, type ViewStyle } from "react-native";
import { EaseView, FADE_IN } from "@/design/ease";
import { breathProps } from "@/design/ease-breath";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/**
 * The app's one loading look (C2): plain shapes the size of what they stand in for, in the well
 * colour (`surface-secondary`) at the real corners, so the swap to content doesn't move the page.
 * Containers that are cards in the real screen stay real cards (`surface`); only their insides wait.
 *
 * Calm, not a shimmer: the whole group breathes between full and 55% every 1.6 s, one native loop
 * per group (`breathProps`), only while its screen is in front. Reduce Motion holds it still.
 * Words the screen already knows (titles, section labels) stay real; only fetched content waits.
 */
export const SKELETON = {
	from: { opacity: 1 },
	/** Text bones: 11 for meta, 13 for titles, 20 for a display title; centred in the line's height. */
	meta: 11,
	/** One breath, there and back (Explore's sections use the same). */
	periodMs: 1600,
	text: 13,
	title: 20,
	to: { opacity: 0.55 },
} as const;

/** A group that breathes. VoiceOver reads it once, as `label`, never each shape. */
export function SkeletonBreath({
	label,
	children,
	fill,
	className,
	style,
}: {
	label: string;
	children: ReactNode;
	/** Takes the screen's height (the profile, the reader), so a spacer inside can push. */
	fill?: boolean;
	/** On the group itself: its gap, its padding, its layout. */
	className?: string;
	style?: ViewStyle;
}) {
	const reduced = useEffectiveReducedMotion();
	const focused = useIsFocused();
	const still = reduced || !focused;
	return (
		// Fades in (200 ms) so a fast load never flashes; the key restarts the loop when it's back
		// in front (Ease restarts a loop only on remount).
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

/** One block. Pass the real element's corner as `r`; a circle is `r = h / 2`. */
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

/** A text line: a bone centred in the line's own height, so the skeleton is as tall as the words. */
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
	/** Over a well-coloured block (the reader's cover), pass `bg-surface`. */
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

/** A pill (a tag, a chip): its real height and a full round. */
export function Pill({ w, h = 28 }: { w: number; h?: number }) {
	return <Bone h={h} r={h / 2} w={w} />;
}
