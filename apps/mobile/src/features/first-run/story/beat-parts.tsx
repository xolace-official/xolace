import { Image, type ImageSource } from "expo-image";
import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { BEATS } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { BOARD, ease, fs, seg } from "../first-run-motion";
import { BEAT_COLORS, css, ink } from "../first-run-palette";
import { LabelIcon } from "./label-icon";
import { beatPose, bIf, type SEng, seatOpen, v2in, WE } from "./story-scene";

export function useIn(
	eng: SharedValue<SEng>,
	i: number,
	at: number,
	dur: number,
	dy = 8
) {
	return useAnimatedStyle(() => {
		const e = eng.get();
		return v2in(e, bIf(e, i), at, dur, dy);
	});
}

export function BeatLayer({
	hidden,
	children,
}: {
	hidden: boolean;
	children: ReactNode;
}) {
	return (
		<View
			accessibilityElementsHidden={hidden}
			className="absolute inset-0"
			importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
			pointerEvents="box-none"
		>
			{children}
		</View>
	);
}

export function BeatSection({
	eng,
	i,
	children,
}: {
	eng: SharedValue<SEng>;
	i: number;
	children?: ReactNode;
}) {
	const beat = BEATS[i];
	const we = WE[i];
	const cover = i === 0;
	const lit = css(BEAT_COLORS[beat.id].lit);
	const section = useAnimatedStyle(() => {
		const e = eng.get();
		const p = beatPose(e, i, seatOpen(e));
		return { opacity: p.op, transform: [{ translateY: p.dy }] };
	});
	const label = useIn(eng, i, 120, 350);
	const aside = useIn(eng, i, we + 200, 450);
	const rule = useIn(eng, i, we + 120, 400, 0);
	const tag = useIn(eng, i, we + 380, 400);
	const sentence = beat.words.map((w) => w.t).join(" ");
	return (
		<Animated.View
			className="absolute top-0 left-0"
			pointerEvents="box-none"
			style={[{ height: BOARD.h, width: BOARD.w }, section]}
		>
			<Animated.View
				className="absolute top-23 left-8 flex-row items-center gap-[9px]"
				style={label}
			>
				<LabelIcon color={lit} id={beat.id} />
				<AppText
					className={cn(
						"uppercase leading-[14px]",
						cover
							? "text-[11.5px] tracking-[3.45px]"
							: "text-[11px] tracking-[2.2px]"
					)}
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: lit }}
					weight="semibold"
				>
					{beat.label}
				</AppText>
			</Animated.View>
			<View
				accessibilityLabel={sentence}
				accessibilityRole="header"
				accessible
				className="absolute top-30 right-6 left-8 h-[123px]"
			/>
			{cover ? (
				<Animated.View
					className="absolute top-[262px] left-8 h-px w-9"
					style={[{ backgroundColor: lit, opacity: 0.6 }, rule]}
				/>
			) : null}
			<View
				className={cn(
					"absolute right-10 left-8",
					cover ? "top-[286px]" : "top-[262px]"
				)}
				pointerEvents="none"
			>
				{beat.aside ? (
					<Animated.View style={aside}>
						<AppText
							className={cn(
								cover
									? "text-[14.5px]"
									: i === 5
										? "text-[14px]"
										: "text-[15px]",
								i === 5 ? "leading-[21px]" : "leading-[23px]"
							)}
							maxFontSizeMultiplier={BOARD_TEXT_MAX}
							style={{ color: ink(0.6) }}
						>
							{beat.aside}
						</AppText>
					</Animated.View>
				) : null}
				{beat.tag ? (
					<Animated.View className="mt-[15px]" style={tag}>
						<AppText
							className="text-[10.5px] uppercase leading-[13px] tracking-[1.68px]"
							maxFontSizeMultiplier={BOARD_TEXT_MAX}
							style={{ color: lit }}
							weight="semibold"
						>
							{beat.tag}
						</AppText>
					</Animated.View>
				) : null}
			</View>
			{children}
		</Animated.View>
	);
}

export function Figure({
	eng,
	i,
	source,
	box,
	extra,
}: {
	eng: SharedValue<SEng>;
	i: number;
	source: ImageSource | number;
	box: ViewStyle & { width: number; height: number };
	extra?: (e: SEng) => number;
}) {
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		const bb = bIf(e, i);
		const s = extra ? extra(e) : 1;
		if (e.rm) {
			return {
				opacity: Math.min(1, bb / 200),
				transform: [{ translateY: 0 }, { scale: 1 }],
			};
		}
		if (i === 0) {
			return {
				opacity: ease(seg(bb, 350, 1000)),
				transform: [
					{ translateY: 16 * (1 - fs((bb - 350) / 1000, 9, 0.75)) },
					{ scale: s },
				],
			};
		}
		const t = ease(seg(bb, 350, 1000));
		return {
			opacity: t,
			transform: [{ translateY: 16 * (1 - t) }, { scale: s }],
		};
	});
	return (
		<Animated.View
			className="absolute"
			pointerEvents="none"
			style={[box, style]}
		>
			<Image
				accessible={false}
				contentFit="contain"
				source={source}
				style={{ height: box.height, width: box.width }}
			/>
		</Animated.View>
	);
}
