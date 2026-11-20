import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useFixedFaces } from "@/design/fonts";
import { RATE_COPY, REVIEWS } from "../copy";
import { type Ember, NOTE, SCENE_MOTION } from "./ember-scene";

const SET_W = REVIEWS.length * (NOTE.w + NOTE.gap);
const LINES = 5;
const NOTE_RADIUS = 6;
const ROW_PAD = { paddingBottom: 18, paddingLeft: 24, paddingTop: 10 };
const DRIFT = { easing: Easing.linear, reduceMotion: ReduceMotion.Never };

function Note({
	body,
	by,
	i,
	ember,
	faces,
}: {
	body: string;
	by: string;
	i: number;
	ember: Ember;
	faces: boolean;
}) {
	const odd = (i % REVIEWS.length) % 2 === 0;
	const copy = i >= REVIEWS.length;
	const letter = faces ? "font-letter" : "";
	return (
		<View
			accessibilityElementsHidden={copy}
			accessibilityLabel={`${body} ${by}, ${RATE_COPY.store}`}
			accessible={!copy}
			importantForAccessibility={copy ? "no-hide-descendants" : "auto"}
			style={{
				backgroundColor: ember["rate-note-paper"],
				borderRadius: NOTE_RADIUS,
				boxShadow: `0px 10px 24px ${ember["rate-note-shadow"]}`,
				gap: 4,
				height: NOTE.h,
				paddingBottom: 16,
				paddingHorizontal: 18,
				paddingTop: 14,
				transform: [
					{ translateY: odd ? 0 : NOTE.dropEven },
					{ rotate: `${odd ? NOTE.tiltOdd : NOTE.tiltEven}deg` },
				],
				width: NOTE.w,
			}}
		>
			<View aria-hidden className="h-[22px] overflow-visible">
				<AppText
					className={`absolute -top-1 text-[40px] leading-[48px] ${letter}`}
					style={{ color: ember["rate-note-mark"] }}
					variant="body"
				>
					{"“"}
				</AppText>
			</View>
			<AppText
				className={`text-[16px] leading-[21px] ${letter}`}
				numberOfLines={LINES}
				style={{ color: ember["rate-note-ink"] }}
				variant="body"
			>
				{body}
			</AppText>
			<View className="flex-1" />
			<AppText
				style={{ color: ember["rate-note-by"] }}
				variant="caption"
			>{`${by} · ${RATE_COPY.store}`}</AppText>
		</View>
	);
}

export function ReviewNotes({
	running,
	ember,
}: {
	running: boolean;
	ember: Ember;
}) {
	const faces = useFixedFaces("letter");
	const x = useSharedValue(0);
	useEffect(() => {
		if (!running) {
			cancelAnimation(x);
			return;
		}
		const left = SCENE_MOTION.driftMs * (1 - -x.get() / SET_W);
		x.set(
			withSequence(
				withTiming(-SET_W, { duration: left, ...DRIFT }),
				withRepeat(
					withSequence(
						withTiming(0, { duration: 0, ...DRIFT }),
						withTiming(-SET_W, { duration: SCENE_MOTION.driftMs, ...DRIFT })
					),
					-1
				)
			)
		);
		return () => cancelAnimation(x);
	}, [running, x]);
	const drift = useAnimatedStyle(() => ({
		transform: [{ translateX: x.get() }],
	}));

	return (
		<View>
			<AppText
				className="px-6 pb-3"
				style={{ color: ember["rate-label"] }}
				variant="footnote"
				weight="semibold"
			>
				{RATE_COPY.reviewsLabel}
			</AppText>
			<View className="overflow-hidden">
				<Animated.View
					style={[{ flexDirection: "row", gap: NOTE.gap, ...ROW_PAD }, drift]}
				>
					{[...REVIEWS, ...REVIEWS].map((r, i) => (
						<Note
							body={r.body}
							by={r.by}
							ember={ember}
							faces={faces}
							i={i}
							key={`${r.by}-${i < REVIEWS.length ? "a" : "b"}`}
						/>
					))}
				</Animated.View>
			</View>
		</View>
	);
}
