import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { Icon } from "@/components/shared/icon";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { LAYOUT } from "../layout";
import { useReflectDraw } from "../reflect-draw";
import type { MicPhase, MicReach } from "./mic-gesture";

const BAR = LAYOUT.bar;
const CAPSULE_W = 40;
const ABOVE_BAR = 10;
const SHOW_MS = 180;
const SHOW_RISE = 8;
const LEAN = { cancel: 10, cancelScale: 0.1 } as const;
const BOB = { lift: -4, low: 0.45, periodMs: 1100 } as const;
const WAVE = { low: 0.2, periodMs: 900, stepMs: 150 } as const;
const XMARK = { android: "close", ios: "xmark" } as const;
const UP = { android: "keyboard_arrow_up", ios: "chevron.up" } as const;
const RIGHT = { android: "chevron_right", ios: "chevron.right" } as const;
const XMARK_SIZE = 14;
const CHEVRON_SIZE = 11;
const TRAIL = [0, 1, 2] as const;

type Props = { phase: MicPhase; reach: SharedValue<MicReach> };

/**
 * Sits above the held mic and points up: the way to cancel a take. It leans
 * up with the finger and fills when letting go would cancel.
 */
export function CancelHint({ phase, reach }: Props) {
	const { reduced } = useReflectDraw();
	const subtle = useTokenColor("subtle");
	const armedInk = useTokenColor("ember-ink");
	const armed = phase === "cancel";
	const up = phase === "holding" || armed;
	const shown = useSharedValue(0);

	useEffect(() => {
		shown.set(withTiming(up ? 1 : 0, { duration: SHOW_MS, ...PLAY_AS_CHOSEN }));
	}, [up, shown]);

	const style = useAnimatedStyle(() => {
		const r = reduced ? 0 : reach.get().cancel;
		const s = shown.get();
		return {
			opacity: s,
			transform: [
				{
					translateY: (reduced ? 0 : SHOW_RISE * (1 - s)) - LEAN.cancel * r,
				},
				{ scale: 1 + LEAN.cancelScale * r },
			],
		};
	});

	const bobbing = up && !armed;
	const run = useLoopRun(bobbing, BOB.periodMs);
	const bob = loopOrSettle({
		from: { opacity: 1, translateY: 0 },
		periodMs: BOB.periodMs,
		reduced,
		running: bobbing,
		to: { opacity: BOB.low, translateY: BOB.lift },
	});

	return (
		<Animated.View
			accessibilityElementsHidden
			className={cn(
				"absolute items-center gap-1.5 rounded-full border border-separator py-2.5",
				armed ? "bg-ember-wash" : "bg-surface"
			)}
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{
					bottom: BAR.height + ABOVE_BAR,
					left: (BAR.mic - CAPSULE_W) / 2,
					width: CAPSULE_W,
				},
				style,
			]}
		>
			<Icon
				color={armed ? armedInk : subtle}
				name={XMARK}
				size={XMARK_SIZE}
				weight="semibold"
			/>
			<EaseView {...bob} key={run}>
				<Icon
					color={armed ? armedInk : subtle}
					name={UP}
					size={CHEVRON_SIZE}
					weight="bold"
				/>
			</EaseView>
		</Animated.View>
	);
}

/**
 * The chevrons in the pill that run toward the lock: the way to lock a take
 * on. They fade as the finger closes in, leaving the lock to pop when armed.
 */
export function LockTrail({ phase, reach }: Props) {
	const { reduced } = useReflectDraw();
	const subtle = useTokenColor("subtle");
	const waving = phase === "holding";
	const run = useLoopRun(waving, WAVE.periodMs);
	const style = useAnimatedStyle(() => ({
		opacity: 1 - reach.get().lock,
	}));

	return (
		<Animated.View className="flex-row" style={style}>
			{TRAIL.map((i) => (
				<EaseView
					key={`${run}-${i}`}
					{...loopOrSettle({
						delay: WAVE.stepMs * i,
						from: { opacity: 1 },
						periodMs: WAVE.periodMs,
						reduced,
						running: waving,
						to: { opacity: WAVE.low },
					})}
				>
					<View className="-mx-[1.5px]">
						<Icon
							color={subtle}
							name={RIGHT}
							size={CHEVRON_SIZE}
							weight="bold"
						/>
					</View>
				</EaseView>
			))}
		</Animated.View>
	);
}
