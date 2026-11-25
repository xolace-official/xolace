import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN, spring } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { useReflectDraw } from "../reflect-draw";
import { LevelBars } from "./level-bars";
import type { MicPhase, MicReach } from "./mic-gesture";
import { LockTrail } from "./mic-hints";

const BAR = LAYOUT.bar;
const LISTEN_MS = 200;
const PILL_INSET = 12;
const MAX_SCALE = 1.3;
const LOCK_ICON = 16;
const LOCK_POP = 1.18;
const CLOSE_ICON = 14;
const HIT = 44;
const LOCK_OPEN = { android: "lock_open", ios: "lock" } as const;
const LOCK_SHUT = { android: "lock", ios: "lock.fill" } as const;
const XMARK = { android: "close", ios: "xmark" } as const;

type Props = {
	phase: MicPhase;
	listening: boolean;
	writing: boolean;
	countdown: string | null;
	onCancel: () => void;
	reach: SharedValue<MicReach>;
};

function pillLine(writing: boolean, phase: MicPhase): string {
	if (writing) {
		return COPY.write.writingDown;
	}
	switch (phase) {
		case "cancel":
			return COPY.write.letGoCancel;
		case "lock":
			return COPY.write.letGoLock;
		case "locked":
			return COPY.write.locked;
		default:
			return COPY.write.listening;
	}
}

export function ListenPill({
	phase,
	listening,
	writing,
	countdown,
	onCancel,
	reach,
}: Props) {
	const up = listening || writing;
	const locked = phase === "locked" && !writing;
	const pill = useSharedValue(0);

	useEffect(() => {
		pill.set(
			withTiming(up ? 1 : 0, { duration: LISTEN_MS, ...PLAY_AS_CHOSEN })
		);
	}, [up, pill]);
	const pillStyle = useAnimatedStyle(() => ({ opacity: pill.get() }));

	return (
		<Animated.View
			accessibilityLiveRegion="polite"
			className="absolute right-0 flex-row items-center gap-3 rounded-full border border-separator bg-surface pl-4.5"
			pointerEvents={locked && up ? "box-none" : "none"}
			style={[
				{
					height: BAR.height,
					left: BAR.mic + PILL_INSET,
					paddingRight: locked ? (BAR.height - HIT) / 2 : 18,
				},
				pillStyle,
			]}
		>
			{writing ? null : <LevelBars active={listening} />}
			<AppText
				color={phase === "cancel" && !writing ? "subtle" : "foreground"}
				maxFontSizeMultiplier={MAX_SCALE}
				variant="callout"
				weight="semibold"
			>
				{pillLine(writing, phase)}
			</AppText>
			{writing ? null : (
				<PillEnd
					countdown={countdown}
					onCancel={onCancel}
					phase={phase}
					reach={reach}
				/>
			)}
		</Animated.View>
	);
}

function PillEnd({
	phase,
	countdown,
	onCancel,
	reach,
}: Pick<Props, "phase" | "countdown" | "onCancel" | "reach">) {
	const subtle = useTokenColor("subtle");
	if (phase === "cancel") {
		return null;
	}
	// The way to cancel is the capsule over the mic, so the caption is only the countdown.
	const caption = countdown;
	return (
		<View className="ml-auto shrink flex-row items-center gap-3">
			{caption === null || phase === "lock" ? null : (
				<AppText
					className="shrink tabular-nums"
					color="subtle"
					maxFontSizeMultiplier={MAX_SCALE}
					numberOfLines={1}
					variant="caption"
				>
					{caption}
				</AppText>
			)}
			{phase === "holding" || phase === "lock" ? (
				<View className="flex-row items-center gap-1.5">
					<LockTrail phase={phase} reach={reach} />
					<LockMark armed={phase === "lock"} />
				</View>
			) : null}
			{phase === "locked" ? (
				<PressScale
					accessibilityLabel={COPY.write.cancelTake}
					className="items-center justify-center rounded-full"
					onPress={onCancel}
					style={{ height: HIT, width: HIT }}
				>
					<Icon
						color={subtle}
						name={XMARK}
						size={CLOSE_ICON}
						weight="semibold"
					/>
				</PressScale>
			) : null}
		</View>
	);
}

function LockMark({ armed }: { armed: boolean }) {
	const { reduced } = useReflectDraw();
	const subtle = useTokenColor("subtle");
	const ink = useTokenColor("foreground");
	const pop = useSharedValue(1);

	useEffect(() => {
		pop.set(reduced ? 1 : spring("pop", armed ? LOCK_POP : 1, false));
	}, [armed, reduced, pop]);
	const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

	return (
		<Animated.View style={style}>
			<Icon
				color={armed ? ink : subtle}
				name={armed ? LOCK_SHUT : LOCK_OPEN}
				size={LOCK_ICON}
			/>
		</Animated.View>
	);
}
