import type { TalkLook } from "@xolace/backend/convex/lib/voices";
import { Pressable, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { NEUTRAL } from "@/components/xolace-face/pose";
import { type FaceHandle, useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { faceProps, LOOK_ORDER, LOOKS, lookAt } from "../companion-look";
import { TALK_COPY } from "../copy";
import { GO, LAYOUT, seg } from "../motion/talk-motion";
import { GLOW_BLEED, LookGlow } from "./look-glow";
import type { LookCarousel } from "./use-look-carousel";

const NEIGHBOUR_SCALE = 0.5;
const FAR_SCALE = 0.4;
const FAR_STEP = 0.1;
const NEAR_FADE = 0.5;

type Shared = {
	carousel: LookCarousel;
	/** The start → talk timeline (ms): the neighbours fade and shrink in its first 160 ms. */
	go: SharedValue<number>;
	glowOpacity: SharedValue<number>;
	glowScale: SharedValue<number>;
	face: number;
};

type SlotProps = Shared & {
	i: number;
	look: TalkLook;
	hero: FaceHandle | null;
	width: number;
};

/**
 * One look. Only the centred one gets the live face (production's rule from its look
 * tiles); the rest hold a still face of their own. Scale and opacity come from the row's `x`.
 */
function Slot({
	i,
	look,
	hero,
	width,
	carousel,
	go,
	glowOpacity,
	glowScale,
	face,
}: SlotProps) {
	const still = useFace(NEUTRAL, false);
	const left = width / 2 - face / 2 + i * LAYOUT.slot;
	const glowSize = face + LAYOUT.glowInset * 2;
	// Only the shared value crosses into the worklets (not the gesture beside it).
	const { x, goTo } = carousel;

	const slot = useAnimatedStyle(() => {
		const d = Math.abs((i * LAYOUT.slot + x.get()) / LAYOUT.slot);
		const near = d <= 1;
		let scale = near
			? 1 - (1 - NEIGHBOUR_SCALE) * d
			: Math.max(FAR_SCALE, NEIGHBOUR_SCALE - FAR_STEP * (d - 1));
		let opacity = near
			? 1 - NEAR_FADE * d
			: Math.max(0, NEAR_FADE - NEAR_FADE * (d - 1));
		if (d >= NEAR_FADE) {
			// Start pressed: the neighbours fade out and shrink to 0.4.
			const out = seg(go.get(), 0, GO.neighbours);
			opacity *= 1 - out;
			scale += (FAR_SCALE - scale) * out;
		}
		return { opacity, transform: [{ translateX: x.get() }, { scale }] };
	});

	const glow = useAnimatedStyle(() => {
		const d = Math.abs((i * LAYOUT.slot + x.get()) / LAYOUT.slot);
		return {
			opacity:
				glowOpacity.get() * interpolate(d, [0, NEAR_FADE], [1, 0], "clamp"),
			transform: [{ scale: glowScale.get() }],
		};
	});

	return (
		<Animated.View
			className="absolute"
			style={[
				{ height: face, left, top: LAYOUT.carouselPad / 2, width: face },
				slot,
			]}
		>
			<Animated.View
				className="absolute"
				pointerEvents="none"
				style={[
					{
						left: -LAYOUT.glowInset - GLOW_BLEED,
						top: -LAYOUT.glowInset - GLOW_BLEED,
					},
					glow,
				]}
			>
				<LookGlow look={look} size={glowSize} />
			</Animated.View>
			<Pressable
				accessible={false}
				disabled={hero !== null}
				onPress={() => goTo(i)}
			>
				<XolaceFace {...faceProps(look)} face={hero ?? still} size={face} />
			</Pressable>
		</Animated.View>
	);
}

type Props = Shared & {
	index: number;
	hero: FaceHandle;
	width: number;
	/** One adjustable control for VoiceOver ("Look, Moss, 3 of 7"), before the talk only. */
	accessible: boolean;
};

/** The seven looks in a snapping row; the centred face is the companion (handoff §2.2). */
export function LookCarouselView({
	index,
	hero,
	width,
	accessible,
	...shared
}: Props) {
	const { carousel, face } = shared;
	const look = lookAt(index);
	return (
		<GestureDetector gesture={carousel.pan}>
			<View
				accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
				accessibilityElementsHidden={!accessible}
				accessibilityLabel={TALK_COPY.start.look}
				accessibilityRole="adjustable"
				accessibilityValue={{
					text: TALK_COPY.start.lookValue(
						LOOKS[look].label,
						index + 1,
						LOOK_ORDER.length
					),
				}}
				accessible={accessible}
				importantForAccessibility={accessible ? "yes" : "no-hide-descendants"}
				onAccessibilityAction={(e) =>
					carousel.goTo(
						index + (e.nativeEvent.actionName === "increment" ? 1 : -1)
					)
				}
				style={{ height: face + LAYOUT.carouselPad, width }}
			>
				{LOOK_ORDER.map((name, i) => (
					<Slot
						hero={i === index ? hero : null}
						i={i}
						key={name}
						look={name}
						width={width}
						{...shared}
					/>
				))}
			</View>
		</GestureDetector>
	);
}
