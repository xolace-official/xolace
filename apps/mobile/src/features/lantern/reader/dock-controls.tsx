import { useEffect, useRef } from "react";
import {
	AccessibilityInfo,
	findNodeHandle,
	Pressable,
	View,
	type ViewInstance,
} from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { fadeUp } from "@/design/entering";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/lantern/copy";
import { LT } from "@/features/lantern/lantern-style";
import {
	useReaderClock,
	useReaderScreen,
} from "@/features/lantern/reader/reader-data";
import { mmss } from "@/features/lantern/reader/reader-model";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const BAR_MAX_SCALE = 1.5;
const FOCUS_MS = 300;
const TICK = { duration: 900, easing: Easing.linear, ...PLAY_AS_CHOSEN };
export const ICON = {
	back15: { android: "replay", ios: "gobackward.15" },
	close: { android: "close", ios: "xmark" },
	pause: { android: "pause", ios: "pause.fill" },
	play: { android: "play_arrow", ios: "play.fill" },
	plus: { android: "auto_awesome", ios: "sparkles" },
	transcript: { android: "notes", ios: "text.quote" },
} as const;

export function Progress({
	share,
	reduced,
}: {
	share: number;
	reduced: boolean;
}) {
	const v = useSharedValue(share);
	useEffect(() => {
		v.set(reduced ? share : withTiming(share, TICK));
	}, [share, reduced, v]);
	const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: v.get() }] }));
	return (
		<View className="h-[3px] bg-separator">
			<Animated.View
				className="h-full bg-accent"
				style={[{ transformOrigin: "left" }, fill]}
			/>
		</View>
	);
}

export function IconButton({
	icon,
	label,
	size,
	onPress,
}: {
	icon: IconName;
	label: string;
	size: number;
	onPress: () => void;
}) {
	const [ink] = useTokenColors(["foreground"]);
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className="size-9 items-center justify-center active:opacity-60"
			hitSlop={8}
			onPress={onPress}
		>
			<Icon color={ink} name={icon} size={size} weight="semibold" />
		</Pressable>
	);
}

export function Transport() {
	const { state, actions } = useReaderScreen();
	const [page] = useTokenColors(["background"]);
	const a = state.audio;
	const { currentTime, duration } = useReaderClock();
	const title = state.entry.title;
	const left = Math.max(duration - currentTime, 0);
	return (
		<>
			<IconButton
				icon={ICON.back15}
				label={COPY.reader.dock.back15}
				onPress={() => actions.audio.skip(-1)}
				size={20}
			/>
			<Pressable
				accessibilityActions={[
					{ name: "activate" },
					{ name: "increment" },
					{ name: "decrement" },
				]}
				accessibilityLabel={
					a.playing
						? COPY.reader.dock.pause(title)
						: COPY.reader.dock.play(title)
				}
				accessibilityRole="adjustable"
				accessibilityValue={{
					text: COPY.reader.dock.value(mmss(currentTime), mmss(left)),
				}}
				className="size-10 items-center justify-center rounded-full bg-foreground active:scale-92"
				hitSlop={8}
				onAccessibilityAction={(e) => {
					const n = e.nativeEvent.actionName;
					if (n === "activate") {
						actions.audio.toggle();
					} else {
						actions.audio.skip(n === "increment" ? 1 : -1);
					}
				}}
				onPress={actions.audio.toggle}
			>
				<Icon
					color={page}
					name={a.playing ? ICON.pause : ICON.play}
					size={16}
				/>
			</Pressable>
		</>
	);
}

export function KeepListening({ onPress }: { onPress: () => void }) {
	const reduced = useEffectiveReducedMotion();
	const [onAccent] = useTokenColors(["accent-foreground"]);
	const ref = useRef<ViewInstance>(null);
	useEffect(() => {
		const t = setTimeout(() => {
			const node = findNodeHandle(ref.current);
			if (node) {
				AccessibilityInfo.setAccessibilityFocus(node);
			}
			AccessibilityInfo.announceForAccessibilityWithOptions(
				COPY.reader.dock.previewEndedAnnouncement,
				{ queue: true }
			);
		}, FOCUS_MS);
		return () => clearTimeout(t);
	}, []);
	return (
		<Animated.View entering={fadeUp(0, LT.riseMs, LT.rise, reduced, LT.press)}>
			<Pressable
				accessibilityLabel={COPY.reader.dock.keepListeningLabel}
				accessibilityRole="button"
				className="h-[38px] flex-row items-center gap-[7px] rounded-full bg-accent px-[15px] active:opacity-80"
				onPress={onPress}
				ref={ref}
			>
				<Icon color={onAccent} name={ICON.plus} size={14} weight="semibold" />
				<AppText
					className="text-[14px] leading-[18px]"
					color="accentForeground"
					maxFontSizeMultiplier={BAR_MAX_SCALE}
					variant="callout"
					weight="semibold"
				>
					{COPY.reader.dock.keepListening}
				</AppText>
			</Pressable>
		</Animated.View>
	);
}
