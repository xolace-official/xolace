import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import type { FaceHandle } from "@/components/xolace-face/use-face";
import type { TalkGeometry } from "../motion/talk-geometry";
import {
	ENTER_EASE,
	GO,
	INTRO,
	LAYOUT,
	OUT_EASE,
	PILL_EASE,
	seg,
} from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";
import { LookCarouselView } from "./look-carousel";
import type { StageFrame } from "./stage-frame";
import type { LookCarousel } from "./use-look-carousel";

export const UNMEASURED = -100_000;

const PILL_FADE_FROM = 0.78;

type Props = {
	geo: TalkGeometry;
	motion: TalkMotion;
	frame: StageFrame;
	carousel: LookCarousel;
	carTop: SharedValue<number>;
	face: number;
	index: number;
	hero: FaceHandle;
	before: boolean;
};

export function TalkHero({
	geo,
	motion,
	frame,
	carousel,
	carTop,
	face,
	index,
	hero,
	before,
}: Props) {
	const height = face + LAYOUT.carouselPad;

	const style = useAnimatedStyle(() => {
		const t = motion.go.get();
		const top = carTop.get();
		if (top === UNMEASURED) {
			return { opacity: 0, top: 0 };
		}
		const from = top + height / 2;
		const stage = frame.get();
		const stageScale = (LAYOUT.stageFace / face) * stage.scale;
		const i = motion.intro.get();
		const inP = motion.reduced.get()
			? seg(i, 0, GO.reduced)
			: seg(i, INTRO.gap, INTRO.length, ENTER_EASE);
		const rise = { translateY: INTRO.rise * (1 - inP) };
		if (motion.reduced.get()) {
			const half = GO.reduced / 2;
			const there = t > half;
			return {
				opacity: inP * (there ? (t - half) / half : 1 - t / half),
				top,
				transform: [
					rise,
					{ translateY: there ? stage.y - from : 0 },
					{ scale: there ? stageScale : 1 },
				],
			};
		}
		if (motion.toPill.get() === 1) {
			const p = seg(t, 0, GO.toPill, PILL_EASE);
			const tf = seg(t, 0, GO.toPill);
			return {
				opacity:
					tf < PILL_FADE_FROM
						? 1
						: 1 - (tf - PILL_FADE_FROM) / (1 - PILL_FADE_FROM),
				top,
				transform: [
					rise,
					{ translateX: (geo.pillFace.x - geo.width / 2) * p },
					{ translateY: (geo.pillFace.y - from) * p },
					{ scale: 1 + (LAYOUT.pillFace / face - 1) * p },
				],
			};
		}
		const p = seg(t, 0, GO.hero, OUT_EASE);
		return {
			opacity: inP,
			top,
			transform: [
				rise,
				{ translateY: (stage.y - from) * p },
				{ scale: 1 + (stageScale - 1) * p },
			],
		};
	});

	return (
		<Animated.View
			className="absolute left-0"
			pointerEvents={before ? "auto" : "none"}
			style={[{ height, width: geo.width }, style]}
		>
			<LookCarouselView
				accessible={before}
				carousel={carousel}
				face={face}
				glowOpacity={motion.glowOpacity}
				glowScale={motion.glowScale}
				go={motion.go}
				hero={hero}
				index={index}
				width={geo.width}
			/>
		</Animated.View>
	);
}
