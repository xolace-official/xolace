import { useState } from "react";
import Animated, {
	FadeOut,
	type SharedValue,
	useAnimatedReaction,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { fadeUp } from "@/design/entering";
import { COPY } from "@/features/lantern/copy";
import { LT } from "@/features/lantern/lantern-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const PILL = { h: 42, inMs: 200, outMs: 150, padH: 18, rise: 12 } as const;
/** The pick-up pill goes once the reader has scrolled this far either way. */
const PICK_DRIFT = 60;
const UP = { android: "arrow_upward", ios: "arrow.up" } as const;
const DOWN = { android: "arrow_downward", ios: "arrow.down" } as const;

/** A pill 42 tall, card fill, a hairline and a soft shadow, centred above the bottom. Fades in
 * over 200 ms and rises 12 pt. */
function Pill({
	icon,
	accent,
	label,
	a11y,
	bottom,
	onPress,
}: {
	icon: IconName;
	accent?: boolean;
	label: string;
	a11y: string;
	bottom: number;
	onPress: () => void;
}) {
	const reduced = useEffectiveReducedMotion();
	const [ink, violet, line] = useTokenColors([
		"foreground",
		"accent",
		"separator",
	]);
	return (
		<Animated.View
			className="absolute inset-x-0 items-center"
			entering={fadeUp(0, PILL.inMs, PILL.rise, reduced, LT.press)}
			exiting={FadeOut.duration(PILL.outMs)}
			pointerEvents="box-none"
			style={{ bottom }}
		>
			<PressScale
				accessibilityLabel={a11y}
				className="flex-row items-center gap-2 bg-surface"
				onPress={onPress}
				style={{
					borderRadius: PILL.h / 2,
					boxShadow: `0px 0px 0px 1px ${line}, 0px 12px 26px -12px rgba(0,0,0,0.45)`,
					height: PILL.h,
					paddingHorizontal: PILL.padH,
				}}
			>
				<Icon
					color={accent ? violet : ink}
					name={icon}
					size={15}
					weight="semibold"
				/>
				<AppText
					className="text-[14px] leading-[18px]"
					variant="callout"
					weight="semibold"
				>
					{label}
				</AppText>
			</PressScale>
		</Animated.View>
	);
}

/**
 * New in v2 (handoff §5.3): "Pick up at 40%" for a read that opens at the top with a place
 * stored. It never scrolls by itself; it goes on a tap or once the reader scrolls 60 pt.
 */
export function PickUpPill({
	at,
	y,
	bottom,
	hidden,
	onPick,
}: {
	/** The stored share, or null for no pill. */
	at: number | null;
	y: SharedValue<number>;
	bottom: number;
	hidden: boolean;
	onPick: (share: number) => void;
}) {
	const [gone, setGone] = useState(false);
	useAnimatedReaction(
		() => Math.abs(y.get()) > PICK_DRIFT,
		(now, prev) => {
			if (now && !prev) {
				scheduleOnRN(setGone, true);
			}
		}
	);
	if (gone || hidden || at === null) {
		return null;
	}
	const pct = Math.round(at * 100);
	return (
		<Pill
			a11y={COPY.reader.pickUpLabel(pct)}
			accent
			bottom={bottom}
			icon={DOWN}
			label={COPY.reader.pickUp(pct)}
			onPress={() => {
				setGone(true);
				onPick(at);
			}}
		/>
	);
}

/** Whether the reader is at the end. Owns its state, so crossing it re-renders only its user. */
function useAtEnd(y: SharedValue<number>, endAt: number) {
	const [at, setAt] = useState(false);
	useAnimatedReaction(
		() => y.get() >= endAt,
		(now, prev) => {
			if (now !== prev) {
				scheduleOnRN(setAt, now);
			}
		}
	);
	return at;
}

/** Production's `BackToTop`: fades in once the end is reached. */
export function BackToTop({
	y,
	endAt,
	bottom,
	hidden,
	onPress,
}: {
	y: SharedValue<number>;
	endAt: number;
	bottom: number;
	hidden: boolean;
	onPress: () => void;
}) {
	if (!useAtEnd(y, endAt) || hidden) {
		return null;
	}
	return (
		<Pill
			a11y={COPY.reader.backToTop}
			bottom={bottom}
			icon={UP}
			label={COPY.reader.backToTop}
			onPress={onPress}
		/>
	);
}
