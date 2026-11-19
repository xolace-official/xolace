import { useEffect, useRef } from "react";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useWelcomeBack } from "../welcome-back-data";
import { FACE_GEO, FACE_TIMING, GREET_FACE } from "./return-face";

/** Board `faceUp`'s `cubic-bezier(.25,1,.4,1)` and the page's `(.2,.85,.25,1)`. */
const RISE_EASE = Easing.bezier(0.25, 1, 0.4, 1);
const PAGE_EASE = Easing.bezier(0.2, 0.85, 0.25, 1);

/**
 * Xolace's face peeking over the card's top edge (handoff §3), drawn before the card so its
 * rounded bottom tucks behind it. It rises as the sheet settles, arrives `heard` and turns to
 * `watch`; a tick nods it with `glad`; the prompt page sinks it behind the card. Acute: `soft`,
 * no crescents, no overshoot. Reduce Motion: it fades in and never rises or nods.
 */
export function GreetingFace({ running }: { running: boolean }) {
	const { state } = useWelcomeBack();
	const { mode, enter, page, tickKey, reduced } = state;
	const left = mode === "left";
	const acute = state.items.card?.tier === "acute";
	let rest = GREET_FACE.watch;
	if (left) {
		rest = GREET_FACE.calm;
	} else if (acute) {
		rest = GREET_FACE.soft;
	}
	const arriving = enter && !left && !acute;
	const face = useFace(arriving ? GREET_FACE.heard : rest, running);
	const geo = left ? FACE_GEO.left : FACE_GEO.greet;
	const { rise, sink, fade } = FACE_GEO;

	const y = useSharedValue(enter && !reduced ? rise.from : 0);
	const opacity = useSharedValue(enter && reduced ? 0 : 1);
	const sunk = useSharedValue(page === "prompt" ? sink.by : 0);

	useEffect(() => {
		if (!enter) {
			return;
		}
		if (reduced) {
			opacity.set(
				withDelay(
					fade.delay,
					withTiming(1, { duration: fade.ms, ...PLAY_AS_CHOSEN })
				)
			);
			return;
		}
		const up = rise.ms * rise.at;
		const ease = { easing: RISE_EASE, ...PLAY_AS_CHOSEN };
		y.set(
			withDelay(
				rise.delay,
				acute
					? withTiming(0, { duration: rise.ms, ...ease })
					: withSequence(
							withTiming(-rise.over, { duration: up, ...ease }),
							withTiming(0, { duration: rise.ms - up, ...ease })
						)
			)
		);
	}, [enter, reduced, acute, y, opacity, rise, fade]);

	// Arriving `heard`, at rest 1.9 s after the card opens.
	const { to, nod } = face;
	useEffect(() => {
		if (!arriving) {
			return;
		}
		const id = setTimeout(() => to(rest), FACE_TIMING.restAfterMs);
		return () => clearTimeout(id);
	}, [arriving, rest, to]);

	// A tick: a nod with happy eyes (acute stays soft), back to resting after 1.5 s.
	const seen = useRef(tickKey);
	useEffect(() => {
		if (tickKey === seen.current) {
			return;
		}
		seen.current = tickKey;
		to(acute ? GREET_FACE.soft : GREET_FACE.glad);
		nod();
		const id = setTimeout(() => to(rest), FACE_TIMING.gladMs);
		return () => clearTimeout(id);
	}, [tickKey, acute, rest, to, nod]);

	useEffect(() => {
		const by = page === "prompt" ? sink.by : 0;
		sunk.set(
			reduced
				? by
				: withTiming(by, {
						duration: sink.ms,
						easing: PAGE_EASE,
						...PLAY_AS_CHOSEN,
					})
		);
	}, [page, reduced, sunk, sink]);

	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ translateY: y.get() + sunk.get() }],
	}));

	return (
		<Animated.View
			accessibilityElementsHidden
			className="absolute z-0 self-center"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[{ height: geo.size, top: -geo.top, width: geo.size }, style]}
		>
			<XolaceFace face={face} size={geo.size} />
		</Animated.View>
	);
}
