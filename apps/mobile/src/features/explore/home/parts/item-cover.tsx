import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AnimatedAppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN, press } from "@/design/springs";
import { HOME } from "@/features/explore/copy";
import { EX_TIMING } from "@/features/explore/explore-style";
import { useHome } from "@/features/explore/home/home-data";
import {
	type CardMark,
	type HomeItem,
	isLocked,
} from "@/features/explore/home/home-model";
import { TrackCover } from "@/features/explore/rows/track-cover";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const HOLD_SCALE = 0.97;
const REDUCED_DIM = 0.72;

/** This item's playing mark: it's the track in the mini player. */
function useMark(it: HomeItem): CardMark {
	const { state } = useHome();
	if (it.kind !== "track" || state.nowPlaying !== it.track.slug) {
		return null;
	}
	return state.playing ? "playing" : "paused";
}

/** A cover from either kind: a track's art, an entry's cover. */
export function ItemCover({
	it,
	size,
	radius,
	hearing,
	pressed,
}: {
	it: HomeItem;
	size: number;
	radius: number;
	hearing: boolean;
	pressed?: SharedValue<number>;
}) {
	const { state } = useHome();
	const reduced = useEffectiveReducedMotion();
	const mark = useMark(it);
	const held = useSharedValue(hearing ? 1 : 0);
	useEffect(() => {
		held.set(press(hearing ? 1 : 0, reduced));
	}, [hearing, held, reduced]);
	const style = useAnimatedStyle(() => {
		const down = Math.max(pressed ? pressed.get() : 0, held.get());
		return reduced
			? { opacity: down > 0 ? REDUCED_DIM : 1 }
			: { transform: [{ scale: 1 - (1 - HOLD_SCALE) * down }] };
	});
	const art =
		it.kind === "track"
			? { hash: it.track.thumbhash, uri: it.track.thumbUrl }
			: {
					hash: it.entry.coverThumbhash,
					uri: it.entry.coverThumbUrl ?? it.entry.coverUrl,
				};
	return (
		<Animated.View style={style}>
			<TrackCover
				hearing={hearing}
				locked={isLocked(it, state.locked)}
				playing={mark}
				radius={radius}
				recyclingKey={it.key}
				size={size}
				thumbhash={art.hash}
				uri={art.uri}
			/>
		</Animated.View>
	);
}

/** 0 → 1 as a preview starts (400 ms), back over 600 ms when it ends. */
function useHearingLabel(hearing: boolean) {
	const v = useSharedValue(hearing ? 1 : 0);
	useEffect(() => {
		v.set(
			withTiming(hearing ? 1 : 0, {
				duration: hearing ? EX_TIMING.veilInMs : EX_TIMING.veilOutMs,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [hearing, v]);
	return v;
}

/** The meta line, with "Hearing a preview" in violet cross-fading over it. */
export function MetaLine({
	meta,
	hearing,
	size,
}: {
	meta: string;
	hearing: boolean;
	size: number;
}) {
	const label = useHearingLabel(hearing);
	const metaStyle = useAnimatedStyle(() => ({ opacity: 1 - label.get() }));
	const hearStyle = useAnimatedStyle(() => ({ opacity: label.get() }));
	const type = { fontSize: size, lineHeight: Math.round(size * 1.3) };
	return (
		<View>
			<AnimatedAppText
				color="muted"
				numberOfLines={1}
				style={[type, metaStyle]}
				variant="footnote"
			>
				{meta}
			</AnimatedAppText>
			<AnimatedAppText
				accessibilityElementsHidden
				className="absolute inset-x-0 top-0"
				color="accent"
				importantForAccessibility="no"
				numberOfLines={1}
				style={[type, hearStyle]}
				variant="footnote"
				weight="medium"
			>
				{HOME.hearing}
			</AnimatedAppText>
		</View>
	);
}
