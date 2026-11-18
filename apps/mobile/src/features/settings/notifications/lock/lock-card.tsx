import { View } from "react-native";
import Animated, {
	Easing,
	LayoutAnimationConfig,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { BlurView, LinearGradient } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import {
	NOTIFY_COPY,
	NOTIFY_ICONS,
} from "@/features/settings/notifications/copy";
import { Dusk } from "@/features/settings/notifications/lock/dusk";
import type { LockSample } from "@/features/settings/notifications/notifications-model";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

/**
 * The lock-screen sample (board `.lock`): a reminder in the chosen voice at 9:30 pm, faded back
 * and held when quiet hours cover it. A printed object, the same in light and dark. The line
 * rises in (6 pt, 300 ms) when the voice changes; nothing animates in on open.
 */
const C = NOTIFY_COPY.sample;
const HEIGHT = 250;
const GHOST = 0.28;
const RISE_MS = 300;
const RISE_PT = 6;
const RISE_EASE = Easing.bezier(0.2, 0.7, 0.2, 1);
const RISE = { duration: RISE_MS, easing: RISE_EASE, ...PLAY_AS_CHOSEN };
/** CSS 135deg-ish, as the board draws the app mark. */
const MARK_FROM = { x: 0.18, y: 0.12 };
const MARK_TO = { x: 0.82, y: 0.88 };

const rise = () => {
	"worklet";
	return {
		animations: {
			opacity: withTiming(1, RISE),
			transform: [{ translateY: withTiming(0, RISE) }],
		},
		initialValues: { opacity: 0, transform: [{ translateY: RISE_PT }] },
	};
};

function Pill({ text, moon }: { text: string; moon: boolean }) {
	const [white] = useTokenColors(["on-art"]);
	return (
		<View className="absolute top-29 h-7.5 self-center overflow-hidden rounded-full">
			<BlurView
				className="flex-1 flex-row items-center gap-1.5 bg-notify-pill px-3.25"
				intensity={20}
				tint="dark"
			>
				{moon ? (
					<Icon color={white} name={NOTIFY_ICONS.moon} size={12} />
				) : null}
				<AppText
					className="text-[13px] text-on-art leading-[17px]"
					variant="body"
					weight="semibold"
				>
					{text}
				</AppText>
			</BlurView>
		</View>
	);
}

function Bubble({ line, held }: { line: string; held: boolean }) {
	const reduced = useEffectiveReducedMotion();
	const [white, from, to] = useTokenColors([
		"on-art",
		"notify-mark-from",
		"notify-mark-to",
	]);
	return (
		<View
			className="absolute right-3 bottom-3.5 left-3 overflow-hidden rounded-[20px] border-continuous"
			style={{ opacity: held ? GHOST : 1 }}
		>
			<BlurView
				className="flex-row items-start gap-2.5 rounded-[20px] border-[0.5px] border-on-art/25 bg-notify-bubble px-3.25 py-2.75"
				intensity={30}
				tint="light"
			>
				<LinearGradient
					className="size-8.5 items-center justify-center rounded-[9px]"
					colors={[from, to]}
					end={MARK_TO}
					start={MARK_FROM}
				>
					<Icon
						color={white}
						name={NOTIFY_ICONS.xmark}
						size={13}
						weight="bold"
					/>
				</LinearGradient>
				<View className="flex-1 gap-0.5">
					<View className="flex-row justify-between">
						<AppText
							className="text-[13.5px] text-on-art leading-[18px]"
							variant="body"
							weight="bold"
						>
							{C.app}
						</AppText>
						<AppText
							className="text-[12.5px] text-on-art leading-[18px] opacity-60"
							variant="body"
						>
							{C.now}
						</AppText>
					</View>
					<LayoutAnimationConfig skipEntering>
						<Animated.View entering={reduced ? undefined : rise} key={line}>
							<AppText
								className="text-[14.5px] text-on-art leading-[19.1px]"
								variant="body"
							>
								{line}
							</AppText>
						</Animated.View>
					</LayoutAnimationConfig>
				</View>
			</BlurView>
		</View>
	);
}

export function LockCard({ sample }: { sample: LockSample }) {
	const [shadow] = useTokenColors(["notify-shadow"]);
	return (
		<View
			accessibilityLabel={sample.a11y}
			accessible
			className="mx-4 rounded-[28px] border-continuous"
			style={{
				boxShadow: `0px 18px 40px -26px ${shadow}`,
				height: HEIGHT,
			}}
		>
			<View className="flex-1 items-center overflow-hidden rounded-[28px] border-continuous pt-5">
				<Dusk height={HEIGHT} />
				<AppText
					className="text-[13px] text-on-art leading-[17px] opacity-82"
					variant="body"
					weight="semibold"
				>
					{C.date}
				</AppText>
				<AppText
					className="mt-0.5 text-[62px] text-on-art leading-[62px] tracking-[-1.24px] opacity-95"
					variant="body"
					weight="semibold"
				>
					{C.time}
				</AppText>
				<AppText
					className="absolute top-4 right-4 text-[10px] text-on-art leading-[13px] tracking-[1.2px] opacity-50"
					variant="body"
					weight="bold"
				>
					{C.kicker}
				</AppText>
				{sample.show ? <Bubble held={sample.held} line={sample.line} /> : null}
				{sample.pill ? (
					<Pill moon={sample.pill.moon} text={sample.pill.text} />
				) : null}
			</View>
		</View>
	);
}
