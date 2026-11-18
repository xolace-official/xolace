import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { useReflect } from "../reflect-data";
import { takeCountdown } from "../reflect-model";
import { LevelBars } from "./level-bars";
import { MicButton } from "./mic-button";

const BAR = LAYOUT.bar;
/** Board `.listen`: the pill fades in over .2 s where Let it out was. */
const LISTEN_MS = 200;
const PILL_INSET = 12;
/** Let it out and the pill can't grow taller than the bar. */
const MAX_SCALE = 1.3;

/** The pill's words: a take being written down, the slide-away warning, or listening. */
function pillLine(writing: boolean, armed: boolean): string {
	if (writing) {
		return COPY.write.writingDown;
	}
	return armed ? COPY.write.letGoCancel : COPY.write.listening;
}

/**
 * The bottom bar: the hold mic + Let it out; while listening, the pill takes Let it out's place
 * (with a Plus take's last 30 s counting down), and stays while a Plus take is written down.
 */
export function BottomBar({
	onSend,
	onTap,
}: {
	onSend: () => void;
	onTap: () => void;
}) {
	const { state } = useReflect();
	const { listening, take } = state;
	// A take still being heard or written down (Plus) would be lost to a send.
	const writing = take.writing;
	const ready =
		(state.text.trim().length > 0 || state.picks.length > 0) &&
		!(listening || writing);
	const countdown = takeCountdown(take.remainingMs);
	const pillUp = listening || writing;
	const [armed, setArmed] = useState(false);
	const pill = useSharedValue(0);

	useEffect(() => {
		pill.set(
			withTiming(pillUp ? 1 : 0, { duration: LISTEN_MS, ...PLAY_AS_CHOSEN })
		);
	}, [pillUp, pill]);
	const pillStyle = useAnimatedStyle(() => ({ opacity: pill.get() }));

	return (
		<View
			className="flex-row items-center"
			style={{ gap: BAR.gap, height: BAR.height }}
		>
			<MicButton onArmed={setArmed} onTap={onTap} />
			<PressScale
				accessibilityLabel={COPY.write.send}
				accessibilityRole="button"
				accessibilityState={{ disabled: !ready }}
				// Board `.cta.off`: Let it out at 28% until there's text or a pick.
				className={cn(
					"flex-1 items-center justify-center rounded-full bg-foreground",
					!ready && "opacity-28"
				)}
				disabled={!ready}
				onPress={onSend}
				style={{ height: BAR.height }}
			>
				<AppText
					className="text-[17px]"
					color="background"
					maxFontSizeMultiplier={MAX_SCALE}
					variant="body"
					weight="semibold"
				>
					{COPY.write.send}
				</AppText>
			</PressScale>
			<Animated.View
				accessibilityLiveRegion="polite"
				className="absolute right-0 flex-row items-center gap-3 rounded-full border border-separator bg-surface px-4.5"
				pointerEvents="none"
				style={[{ height: BAR.height, left: BAR.mic + PILL_INSET }, pillStyle]}
			>
				{writing ? null : <LevelBars active={listening} />}
				<AppText
					color={armed && !writing ? "subtle" : "foreground"}
					maxFontSizeMultiplier={MAX_SCALE}
					variant="callout"
					weight="semibold"
				>
					{pillLine(writing, armed)}
				</AppText>
				{armed || writing ? null : (
					<AppText
						className="ml-auto tabular-nums"
						color="subtle"
						maxFontSizeMultiplier={MAX_SCALE}
						numberOfLines={1}
						variant="caption"
					>
						{countdown ?? COPY.write.slideCancel}
					</AppText>
				)}
			</Animated.View>
		</View>
	);
}
