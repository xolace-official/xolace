import type { ReactNode } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	Easing,
	FadeIn,
	FadeOut,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";
import { useReturnPill } from "../return-pill-data";

/**
 * Board `.tpill`: 36 tall, dots 24 (−7 overlap, 2 pt ring), label 13.5 / 600, chevron 14; 14
 * under the greeting. Large Dynamic Type grows the label to 1.3× and wraps it onto a second
 * line: the pill grows taller, its radius stays 18.
 */
const PILL = {
	dot: 24,
	glyph: 12,
	h: 36,
	left: 2,
	lines: 2,
	maxScale: 1.3,
	overlap: 7,
	padY: 5,
	ring: 2,
	top: 14,
} as const;
const SLOT = PILL.top + PILL.h;
const LABEL = { fontSize: 13.5 } as const;
const CHEVRON = 14;
/** `pillIn .42s (.2,.85,.25,1)` from −8 pt and .96, 460 ms after the greeting closes. */
const IN = {
	delay: 460,
	dy: -8,
	ease: Easing.bezier(0.2, 0.85, 0.25, 1),
	ms: 420,
	scale: 0.96,
} as const;
const OUT_MS = 300;
/** A soft downward shadow (iOS props: no `shadow-*` token matches the board's). */
const SHADOW = {
	shadowOffset: { height: 6, width: 0 },
	shadowOpacity: 0.3,
	shadowRadius: 8,
} as const;

const pillIn = (reduced: boolean) => {
	if (reduced) {
		return FadeIn.delay(IN.delay).duration(REDUCED_FADE_MS);
	}
	return () => {
		"worklet";
		const cfg = { duration: IN.ms, easing: IN.ease, ...PLAY_AS_CHOSEN };
		return {
			animations: {
				opacity: withDelay(IN.delay, withTiming(1, cfg)),
				transform: [
					{ translateY: withDelay(IN.delay, withTiming(0, cfg)) },
					{ scale: withDelay(IN.delay, withTiming(1, cfg)) },
				],
			},
			initialValues: {
				opacity: 0,
				transform: [{ translateY: IN.dy }, { scale: IN.scale }],
			},
		};
	};
};

/**
 * What the greeting left, waiting quietly under your name (handoff §8). No badge, no count,
 * never opens anything by itself. Tapping it reopens the same card as "Still here.". With
 * nothing waiting, the slot holds `fallback` (the rekindle pill).
 */
export function ReturnPill({ fallback }: { fallback: ReactNode }) {
	const { state, actions } = useReturnPill();
	const dark = useScheme() === "dark";
	const [subtle, shadow] = useTokenColors(["subtle", "pill-shadow"]);
	const { label, ck, pm, closeKey, reduced } = state;
	if (label === null) {
		return fallback;
	}
	return (
		<View
			className="items-start"
			style={{ minHeight: SLOT, paddingTop: PILL.top }}
		>
			<Animated.View
				className="max-w-full"
				entering={pillIn(reduced)}
				exiting={FadeOut.duration(OUT_MS)}
				key={closeKey}
				style={{ marginLeft: PILL.left }}
			>
				<PressScale
					accessibilityLabel={label}
					className={cn(
						"flex-row items-center gap-2 border border-separator pr-2.5 pl-1.5",
						dark ? "bg-pill-dark" : "bg-white/82"
					)}
					haptic={Presets.System.selection}
					onPress={actions.open}
					style={{
						borderRadius: PILL.h / 2,
						minHeight: PILL.h,
						paddingVertical: PILL.padY,
						shadowColor: shadow,
						...SHADOW,
					}}
				>
					<View className="flex-row">
						{ck ? (
							<Dot
								bg="accent-wash"
								fg="accent-ink"
								icon={{ android: "history", ios: "arrow.counterclockwise" }}
							/>
						) : null}
						{pm ? (
							<Dot
								bg={dark ? "month-rose-wash-dark" : "month-rose-wash"}
								fg={dark ? "month-rose-dark" : "month-rose"}
								icon={{ android: "favorite", ios: "heart" }}
								overlap={ck}
							/>
						) : null}
					</View>
					<AppText
						className="shrink"
						maxFontSizeMultiplier={PILL.maxScale}
						numberOfLines={PILL.lines}
						style={LABEL}
						variant="detail"
						weight="semibold"
					>
						{label}
					</AppText>
					<Icon
						color={subtle ?? ""}
						name={{ android: "chevron_right", ios: "chevron.right" }}
						size={CHEVRON}
						weight="semibold"
					/>
				</PressScale>
			</Animated.View>
		</View>
	);
}

/** A dot with a surface ring outside it (the board's box-shadow), so the box is 28. */
function Dot({
	bg,
	fg,
	icon,
	overlap,
}: {
	bg: string;
	fg: string;
	icon: IconName;
	overlap?: boolean;
}) {
	const [bgc, fgc, ring] = useTokenColors([bg, fg, "surface"]);
	const box = PILL.dot + PILL.ring * 2;
	return (
		<View
			className="items-center justify-center"
			style={{
				backgroundColor: bgc,
				borderColor: ring,
				borderRadius: box / 2,
				borderWidth: PILL.ring,
				height: box,
				marginLeft: overlap ? -(PILL.overlap + PILL.ring * 2) : -PILL.ring,
				marginVertical: -PILL.ring,
				width: box,
			}}
		>
			<Icon color={fgc ?? ""} name={icon} size={PILL.glyph} weight="bold" />
		</View>
	);
}
