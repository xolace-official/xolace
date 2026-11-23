import { useEffect } from "react";
import { Presets } from "react-native-pulsar";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { PressScale } from "@/components/shared/press-scale";
import { fadeUp } from "@/design/entering";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import {
	playAffirmativePress,
	playCompassionateHold,
	playSoftPress,
} from "@/lib/haptics";
import { COPY } from "../copy";
import { ACTIONS } from "../motion";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";

const HIDE = { drop: 16, ms: 300 } as const;
const STEP = { button: 2, hint: 1, row: 3 } as const;

function hintFor(pickMode: boolean, atCap: boolean): string {
	if (pickMode) {
		return COPY.mirror.pickHint;
	}
	return atCap ? COPY.mirror.capHint : COPY.mirror.hint;
}

export function MirrorActions({ startMs }: { startMs: number }) {
	const { state, actions } = useReflect();
	const { reduced } = useReflectDraw();
	const { nq, sayMore, pickMode, atCap, canSayMore, sayMoreHelps, landN } =
		state;
	useEffect(() => {
		if (atCap) {
			playCompassionateHold();
		}
	}, [atCap]);
	const hidden = nq || sayMore;
	const away = useSharedValue(hidden ? 1 : 0);
	useEffect(() => {
		away.set(
			withTiming(hidden ? 1 : 0, { duration: HIDE.ms, ...PLAY_AS_CHOSEN })
		);
	}, [hidden, away]);
	const style = useAnimatedStyle(() => ({
		opacity: 1 - away.get(),
		transform: [{ translateY: reduced ? 0 : HIDE.drop * away.get() }],
	}));
	const enter = (i: number) =>
		fadeUp(
			startMs + ACTIONS.stepMs * i,
			ACTIONS.ms,
			ACTIONS.rise,
			reduced,
			ACTIONS.ease
		);

	return (
		<Animated.View
			className="gap-2.5"
			key={landN}
			pointerEvents={hidden ? "none" : "box-none"}
			style={style}
		>
			<Animated.View entering={enter(STEP.hint)}>
				<AppText
					accessibilityLiveRegion="polite"
					center
					className="mb-0.5 text-[12.5px]"
					color="subtle"
					variant="caption"
				>
					{hintFor(pickMode, atCap)}
				</AppText>
			</Animated.View>
			<Animated.View entering={enter(STEP.button)}>
				<GlassButton
					accessibilityRole="button"
					className="h-14 items-center justify-center rounded-full"
					onPress={() => {
						playAffirmativePress();
						actions.thatsIt();
					}}
				>
					<AppText
						className="text-[17px]"
						color="background"
						variant="body"
						weight="semibold"
					>
						{COPY.mirror.thatsIt}
					</AppText>
				</GlassButton>
			</Animated.View>
			<Animated.View
				className="flex-row items-center gap-2.5"
				entering={enter(STEP.row)}
			>
				{atCap ? (
					<PressScale
						accessibilityRole="button"
						className="h-12.5 flex-1 items-center justify-center"
						onPress={actions.leaveIt}
					>
						<AppText
							className="text-[15px]"
							color="muted"
							variant="callout"
							weight="medium"
						>
							{COPY.mirror.leaveIt}
						</AppText>
					</PressScale>
				) : (
					<>
						{canSayMore ? (
							<PressScale
								accessibilityHint={
									sayMoreHelps ? COPY.mirror.sayMoreHelps : undefined
								}
								accessibilityRole="button"
								className="h-12.5 flex-1 items-center justify-center rounded-full bg-surface-secondary"
								onPress={() => {
									playSoftPress();
									actions.sayMore();
								}}
							>
								<AppText
									className="text-[15.5px]"
									variant="callout"
									weight="semibold"
								>
									{COPY.mirror.sayMore}
								</AppText>
							</PressScale>
						) : null}
						<PressScale
							accessibilityRole="button"
							className="h-12.5 flex-1 items-center justify-center"
							haptic={Presets.System.selection}
							onPress={() => actions.notQuite()}
						>
							<AppText
								className="text-[15px]"
								color="accentInk"
								variant="callout"
								weight="semibold"
							>
								{COPY.mirror.notQuite}
							</AppText>
						</PressScale>
					</>
				)}
			</Animated.View>
		</Animated.View>
	);
}
