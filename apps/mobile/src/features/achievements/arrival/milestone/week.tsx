import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import {
	age,
	type Eng,
	type Geo,
	T,
} from "@/features/achievements/arrival/arrival-motion";
import { COPY } from "@/features/achievements/copy";
import { easeOut, fs, seg } from "@/features/achievements/motion-math";
import { useTokenColor } from "@/lib/use-token-color";

const WEEK_TOP = 548;
const SLIDE = { in: 500, rise: 30 } as const;
const CHECK: IconName = { android: "check", ios: "checkmark" };
const CHECK_SIZE = 13;
const LIGHT_MS = 240;
const RING_MS = 300;
const GROW_FROM = 0.7;
const UNLIT_SCALE = 0.6;
const TODAY = { from: 0.55, w: 14, z: 0.45 } as const;

export function useSlideUp(eng: SharedValue<Eng>, at: number) {
	return useAnimatedStyle(() => {
		const e = eng.get();
		const p = e.rm ? 1 : easeOut(seg(age(e, e.tm), at, at + SLIDE.in));
		return { opacity: p, transform: [{ translateY: SLIDE.rise * (1 - p) }] };
	});
}

export function Week({
	eng,
	geo,
	days,
	to,
	dark,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	days: readonly string[];
	to: number;
	dark: boolean;
}) {
	const separator = useTokenColor("separator");
	const style = useSlideUp(eng, T.week);
	return (
		<Animated.View
			className="absolute inset-x-5 rounded-[22px] bg-surface px-4 pt-[13px] pb-[11px]"
			pointerEvents="none"
			style={[
				{ boxShadow: `0px 0px 0px 0.5px ${separator}`, top: WEEK_TOP + geo.dy },
				style,
			]}
		>
			<View className="flex-row items-baseline justify-between">
				<AppText
					className="text-[13px] leading-[17px]"
					variant="body"
					weight="semibold"
				>
					{COPY.milestone.lastSeven}
				</AppText>
				<AppText
					className="text-[12.5px] tabular-nums leading-4"
					color="subtle"
					variant="body"
				>
					{COPY.milestone.inARow(to)}
				</AppText>
			</View>
			<View className="mt-2.5 flex-row justify-between">
				{days.map((letter, i) => (
					<Day
						dark={dark}
						eng={eng}
						i={i}
						key={i}
						letter={letter}
						today={i === days.length - 1}
					/>
				))}
			</View>
		</Animated.View>
	);
}

function Day({
	eng,
	i,
	letter,
	today,
	dark,
}: {
	eng: SharedValue<Eng>;
	i: number;
	letter: string;
	today: boolean;
	dark: boolean;
}) {
	const check = useTokenColor(dark ? "arrival-check-dusk" : "on-art");
	const at = T.day0 + i * T.dayStep + (today ? T.today : 0);
	const lit = useAnimatedStyle(() => {
		const e = eng.get();
		const m = age(e, e.tm);
		const q = e.rm ? 1 : seg(m, at, at + LIGHT_MS);
		let pop = 1;
		if (!e.rm) {
			pop = today
				? TODAY.from + (1 - TODAY.from) * fs((m - at) / 1000, TODAY.w, TODAY.z)
				: GROW_FROM + (1 - GROW_FROM) * easeOut(q);
		}
		return {
			opacity: q > 0 ? 1 : 0,
			transform: [{ scale: q > 0 ? pop : UNLIT_SCALE }],
		};
	});
	const ring = useAnimatedStyle(() => {
		const e = eng.get();
		return { opacity: e.rm ? 1 : seg(age(e, e.tm), at, at + RING_MS) };
	});
	return (
		<View className="w-9 items-center gap-[5px]">
			<View className="size-7.5 rounded-full bg-surface-secondary">
				<Animated.View
					className="absolute top-0 left-0 size-7.5 items-center justify-center rounded-full bg-ember"
					style={[{ opacity: 0 }, lit]}
				>
					{today ? (
						<Animated.View
							className="absolute -top-1 -left-1 size-9.5 rounded-full border-4 border-arrival-today-ring"
							style={ring}
						/>
					) : null}
					<Icon color={check} name={CHECK} size={CHECK_SIZE} weight="heavy" />
				</Animated.View>
			</View>
			<AppText
				className="text-[11px] leading-[13px]"
				color="subtle"
				variant="caption"
			>
				{letter}
			</AppText>
		</View>
	);
}
