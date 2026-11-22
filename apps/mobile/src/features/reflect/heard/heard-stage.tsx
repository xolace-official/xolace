import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedReaction,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { lerpPose } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { fadeUp } from "@/design/entering";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { playSessionComplete } from "@/lib/haptics";
import { COPY } from "../copy";
import { FACE } from "../face-poses";
import { LAYOUT, useBoardY } from "../layout";
import { HEARD_MOTION } from "../motion";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import { Enso } from "../wait/enso";
import { HeardStreak } from "./heard-streak";
import { HeardTitle } from "./heard-title";

const H = LAYOUT.heard;
const H_COPY = COPY.heard;
const FADE = { ms: 500, rise: 8 } as const;
const BLEED = { delayMs: HEARD_MOTION.bleedDelayMs, ms: HEARD_MOTION.bleedMs };

export function HeardStage() {
	const { state, actions } = useReflect();
	const { late, streak } = state;
	const { reduced, live, low } = useReflectDraw();
	const y = useBoardY();
	const face = useFace(FACE.heardArrive, live);
	const { to, hop, hold } = face;
	const rest = useSharedValue(0);

	useEffect(() => {
		playSessionComplete();
	}, []);

	useEffect(() => {
		const id = setTimeout(() => {
			if (!late) {
				to(FACE.heard);
				hop();
			} else if (reduced) {
				to(FACE.rest);
			} else {
				rest.set(
					withTiming(1, { duration: HEARD_MOTION.restMs, ...PLAY_AS_CHOSEN })
				);
			}
		}, HEARD_MOTION.faceAfterMs);
		return () => clearTimeout(id);
	}, [late, reduced, to, hop, rest]);

	useAnimatedReaction(
		() => rest.get(),
		(u) => {
			if (u > 0) {
				hold(lerpPose(FACE.heardArrive, FACE.rest, u));
			}
		}
	);

	const title = late ? H_COPY.title.late : H_COPY.title.evening;

	return (
		<View className="flex-1">
			<View
				className="absolute inset-x-6 items-center gap-3.5"
				style={{ top: y(H.top) }}
			>
				<View style={{ height: H.enso, width: H.enso }}>
					<Enso
						bleedOnce={BLEED}
						face={face}
						faceSize={H.face}
						follow={false}
						landed
						late={late}
						low={low}
						mode="closed"
						reduced={reduced}
						running={live}
						size={H.enso}
					/>
				</View>
				<HeardTitle reduced={reduced} title={title} />
				<Animated.View
					className="max-w-[290px]"
					entering={fadeUp(
						HEARD_MOTION.subDelayMs,
						FADE.ms,
						FADE.rise,
						reduced
					)}
				>
					<AppText
						center
						className="text-[16px] leading-[23.2px]"
						color="muted"
						variant="body"
					>
						{H_COPY.body}
					</AppText>
				</Animated.View>
				{streak === null ? null : (
					<Animated.View
						className="mt-2.5"
						entering={fadeUp(
							HEARD_MOTION.chipDelayMs,
							FADE.ms,
							FADE.rise,
							reduced
						)}
					>
						<HeardStreak live={live} reduced={reduced} streak={streak} />
					</Animated.View>
				)}
			</View>
			<View className="absolute inset-x-4 bottom-[34px]">
				<PressScale
					accessibilityLabel={H_COPY.next}
					accessibilityRole="button"
					className="h-14 items-center justify-center rounded-full bg-foreground"
					onPress={actions.finish}
				>
					<AppText
						className="text-[17px]"
						color="background"
						variant="body"
						weight="semibold"
					>
						{H_COPY.next}
					</AppText>
				</PressScale>
			</View>
		</View>
	);
}
