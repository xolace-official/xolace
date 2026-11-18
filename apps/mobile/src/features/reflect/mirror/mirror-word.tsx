import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { FONTS } from "@/design/type";
import { FLASH, WRITE_IN } from "../motion";
import type { Timeline } from "../reflect-model";
import { easeOut, progress, smooth } from "./curves";

/** Board `.mtext`: Newsreader italic 22.5/1.42. */
const SIZE = 22.5;
const MIRROR_TEXT = {
	fontFamily: FONTS.mirror,
	fontSize: SIZE,
	lineHeight: 31.95,
} as const;
/** A word's gap is .26em. */
const GAP = SIZE * 0.26;
/** Board `mwA` 55%: the halo's radius; `litA` 40%: the flash's glow. */
const HALO_R = 14;
const GLOW_R = 12;

/** The mirror's warm colours, read once by the stage (token values for text shadows). */
export type MirrorInk = {
	halo: string;
	lit: string;
	flash: string;
	glow: string;
	/** The arrow chip's ink (`ember-ink`). */
	ember: string;
};

type Props = {
	text: string;
	order: number;
	/** The phrase pair this word lights with (−1 none). */
	pair: number;
	e: SharedValue<number>;
	tl: Timeline;
	heavy: boolean;
	ink: MirrorInk;
	/** Bumped when its line is tapped: a borrowed word flashes again (S8). */
	flashN: number;
};

/**
 * One mirror word on the landing clock (S7 `wordPose`): it shows rising 8 pt with a warm halo
 * peaking half way, and, if it was borrowed from your words, lights to ember in its turn with a
 * flash that fades .5 s. A tap on its line replays the flash. Native text throughout; the halo,
 * lit and flash states are copies faded in.
 */
export function MirrorWord(p: Props) {
	const { text, order, pair, e, tl, heavy, ink, flashN } = p;
	const lights = tl.lights && pair >= 0;
	const at = WRITE_IN.base + order * tl.stagger;
	// Plain numbers for the worklets (the timeline's functions live on the JS side).
	const due = lights ? tl.litAt(pair) : 0;
	const { wordIn } = tl;
	const tap = useSharedValue(0);

	useEffect(() => {
		if (!(flashN && lights)) {
			return;
		}
		tap.set(
			withSequence(
				withTiming(1, { duration: FLASH.outMs, ...PLAY_AS_CHOSEN }),
				withTiming(0, { duration: FLASH.fadeMs, ...PLAY_AS_CHOSEN })
			)
		);
	}, [flashN, lights, tap]);

	const base = useAnimatedStyle(() => {
		const u = (e.get() - at) / wordIn;
		const shown = heavy ? Math.min(1, Math.max(0, u)) : easeOut(u);
		return {
			opacity: shown,
			transform: [{ translateY: heavy ? 0 : WRITE_IN.rise * (1 - shown) }],
		};
	});
	const halo = useAnimatedStyle(() => ({
		opacity: heavy ? 0 : Math.sin(Math.PI * progress(e.get(), at, wordIn)),
	}));
	const lit = useAnimatedStyle(() => ({
		opacity: lights ? smooth(e.get(), due, due + WRITE_IN.lightIn) : 0,
	}));
	const flash = useAnimatedStyle(() => {
		if (!lights) {
			return { opacity: 0 };
		}
		const now = e.get();
		const l = smooth(now, due, due + WRITE_IN.lightIn);
		const out = due + WRITE_IN.lightIn + WRITE_IN.flashOut;
		const landing = l * (1 - smooth(now, due + WRITE_IN.lightIn, out));
		return { opacity: Math.max(landing, tap.get()) };
	});

	return (
		<Animated.View style={[{ marginRight: GAP }, base]}>
			<AppText style={MIRROR_TEXT} variant="mirror">
				{text}
			</AppText>
			<Layer style={halo}>
				<AppText
					style={[
						MIRROR_TEXT,
						{ textShadowColor: ink.halo, textShadowRadius: HALO_R },
					]}
					variant="mirror"
				>
					{text}
				</AppText>
			</Layer>
			{lights ? (
				<>
					<Layer style={lit}>
						<AppText style={[MIRROR_TEXT, { color: ink.lit }]} variant="mirror">
							{text}
						</AppText>
					</Layer>
					<Layer style={flash}>
						<AppText
							style={[
								MIRROR_TEXT,
								{
									color: ink.flash,
									textShadowColor: ink.glow,
									textShadowRadius: GLOW_R,
								},
							]}
							variant="mirror"
						>
							{text}
						</AppText>
					</Layer>
				</>
			) : null}
		</Animated.View>
	);
}

function Layer({
	style,
	children,
}: {
	style: ReturnType<typeof useAnimatedStyle>;
	children: ReactNode;
}) {
	return (
		<Animated.View
			className="absolute inset-0"
			pointerEvents="none"
			style={style}
		>
			{children}
		</Animated.View>
	);
}

/** A held layout: the words wrap as one line of the mirror would. */
export function WordRow({ children }: { children: ReactNode }) {
	return <View className="flex-row flex-wrap">{children}</View>;
}
