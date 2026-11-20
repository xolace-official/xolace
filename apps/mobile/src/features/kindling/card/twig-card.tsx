import { type ReactNode, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { EASE_OUT, PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { KMOTION } from "../kindling-motion";

const LAYERS = 3;
const NONE = -1;

type Props = {
	open: number;
	reduced: boolean;
	bottom: number;
	render: (id: number) => ReactNode;
	onHeight: (h: number) => void;
};

export function TwigCard({ open, reduced, bottom, render, onHeight }: Props) {
	const [layers, setLayers] = useState({ front: 0, ids: [open, NONE, NONE] });
	if (layers.ids[layers.front] !== open) {
		const front = (layers.front + 1) % LAYERS;
		setLayers({
			front,
			ids: layers.ids.map((id, k) => (k === front ? open : id)),
		});
	}
	const opacity = [useSharedValue(1), useSharedValue(0), useSharedValue(0)];
	const rise = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
	const height = useSharedValue(0);
	const measured = useRef([0, 0, 0]);
	const first = useRef(true);

	const grow = (h: number) => {
		onHeight(h);
		if (height.get() === 0 || reduced) {
			height.set(h);
		} else {
			height.set(
				withTiming(h, {
					duration: KMOTION.heightMs,
					easing: EASE_OUT,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	};

	useEffect(() => {
		if (first.current) {
			first.current = false;
			return;
		}
		const fade = { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN };
		const into = {
			duration: KMOTION.inMs,
			easing: EASE_OUT,
			...PLAY_AS_CHOSEN,
		};
		const out = {
			duration: KMOTION.outMs,
			easing: KMOTION.easeIn,
			...PLAY_AS_CHOSEN,
		};
		for (const [k, o] of opacity.entries()) {
			const y = rise[k];
			if (k === layers.front) {
				o.set(0);
				o.set(
					reduced
						? withTiming(1, fade)
						: withDelay(
								KMOTION.inDelay,
								withTiming(1, into),
								PLAY_AS_CHOSEN.reduceMotion
							)
				);
				y?.set(reduced ? 0 : KMOTION.inRise);
				if (!reduced) {
					y?.set(
						withDelay(
							KMOTION.inDelay,
							withTiming(0, into),
							PLAY_AS_CHOSEN.reduceMotion
						)
					);
				}
			} else {
				o.set(withTiming(0, reduced ? fade : out));
				y?.set(reduced ? 0 : withTiming(KMOTION.outRise, out));
			}
		}
		const h = measured.current[layers.front] ?? 0;
		if (h > 0) {
			grow(h);
		}
	}, [layers.front]);

	const box = useAnimatedStyle(() =>
		height.get() > 0 ? { height: height.get() } : {}
	);
	return (
		<Animated.View
			className="absolute right-3 left-3 overflow-hidden rounded-[30px] bg-surface shadow-card"
			style={[{ borderCurve: "continuous", bottom }, box]}
		>
			{layers.ids.map((id, k) =>
				id === NONE ? null : (
					<Layer
						front={k === layers.front}
						key={k}
						onMeasure={(h) => {
							measured.current[k] = h;
							if (k === layers.front) {
								grow(h);
							}
						}}
						opacity={opacity[k] ?? opacity[0]}
						rise={rise[k] ?? rise[0]}
					>
						{render(id)}
					</Layer>
				)
			)}
		</Animated.View>
	);
}

type LayerProps = {
	front: boolean;
	opacity: SharedValue<number>;
	rise: SharedValue<number>;
	onMeasure: (h: number) => void;
	children: ReactNode;
};

function Layer({ front, opacity, rise, onMeasure, children }: LayerProps) {
	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ translateY: rise.get() }],
	}));
	return (
		<Animated.View
			accessibilityElementsHidden={!front}
			className="absolute inset-x-0 top-0"
			importantForAccessibility={front ? "auto" : "no-hide-descendants"}
			onLayout={(e) => onMeasure(e.nativeEvent.layout.height)}
			pointerEvents={front ? "auto" : "none"}
			style={style}
		>
			<View>{children}</View>
		</Animated.View>
	);
}
