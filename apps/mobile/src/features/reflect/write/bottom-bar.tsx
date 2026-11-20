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
const LISTEN_MS = 200;
const PILL_INSET = 12;
const MAX_SCALE = 1.3;

function pillLine(writing: boolean, armed: boolean): string {
	if (writing) {
		return COPY.write.writingDown;
	}
	return armed ? COPY.write.letGoCancel : COPY.write.listening;
}

export function BottomBar({
	onSend,
	onTap,
}: {
	onSend: () => void;
	onTap: () => void;
}) {
	const { state } = useReflect();
	const { listening, take } = state;
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
