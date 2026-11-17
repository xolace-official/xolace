import { useEffect, useRef } from "react";
import type { LayoutChangeEvent } from "react-native";
import Animated, {
	type DerivedValue,
	scrollTo,
	useAnimatedRef,
	useFrameCallback,
	useScrollOffset,
	useSharedValue,
} from "react-native-reanimated";

/** Let go within this far of the end and the thread follows again (the sample's reattach distance). */
const REATTACH_PT = 40;
/** The glide's time constant and top speed (the sample's `followGlideMs` / `followMaxSpeed`). */
const GLIDE_MS = 200;
const MAX_SPEED = 2000;
/** The glide keeps running this long after a line ends, so its last words are fully in view. */
const TAIL_MS = 600;

type Options = {
	/** A line is streaming and the thread is in front: only then does the frame loop run. */
	live: boolean;
	reduced: boolean;
	/** The keyboard's share of the bottom inset (the chat view's content inset). */
	inset: DerivedValue<number>;
};

/**
 * Follow the newest words (after the streaming-text sample's `useFollowBottom`): while a line is
 * live the thread glides to its end on the UI thread; a drag lets go, and settling within 40 pt
 * of the end follows again. The frame loop runs only while `live` (plus a short tail). Between
 * lines, a new turn scrolls into view once, if the thread is following.
 */
export function useFollowBottom({ live, reduced, inset }: Options) {
	const scrollRef = useAnimatedRef<Animated.ScrollView>();
	const offset = useScrollOffset(scrollRef);
	const content = useSharedValue(0);
	const viewport = useSharedValue(0);
	const following = useSharedValue(true);
	const dragging = useSharedValue(false);
	const jump = useSharedValue(reduced);
	const y = useSharedValue(0);
	const tail = useRef<ReturnType<typeof setTimeout>>(undefined);

	const bottom = () => {
		"worklet";
		return Math.max(0, content.get() - viewport.get() + inset.get());
	};

	const loop = useFrameCallback(({ timeSincePreviousFrame }) => {
		if (!following.get() || dragging.get()) {
			return;
		}
		if (offset.get() > y.get()) {
			y.set(offset.get());
		}
		const max = bottom();
		const diff = max - y.get();
		if (Math.abs(diff) < 0.5) {
			return;
		}
		if (jump.get() || diff < 0) {
			y.set(max);
		} else {
			const dt = timeSincePreviousFrame ?? 16;
			const k = 1 - Math.exp(-dt / GLIDE_MS);
			y.set(
				y.get() +
					Math.min(
						Math.max(diff * k, Math.min(diff, 0.5)),
						(MAX_SPEED * dt) / 1000
					)
			);
		}
		scrollTo(scrollRef, 0, y.get(), false);
	}, false);

	useEffect(() => {
		jump.set(reduced);
	}, [jump, reduced]);

	useEffect(() => {
		if (!live) {
			return;
		}
		clearTimeout(tail.current);
		y.set(offset.get());
		loop.setActive(true);
		return () => {
			tail.current = setTimeout(() => loop.setActive(false), TAIL_MS);
		};
	}, [live, loop, offset, y]);

	useEffect(() => () => clearTimeout(tail.current), []);

	const settle = () => {
		dragging.set(false);
		following.set(bottom() - offset.get() < REATTACH_PT);
		y.set(offset.get());
	};

	return {
		onContentSizeChange: (_w: number, h: number) => {
			content.set(h);
			// Between lines (a typed line, a seeded thread): one scroll to the end, if following.
			if (!live && following.get() && !dragging.get()) {
				scrollRef.current?.scrollToEnd({ animated: !reduced });
			}
		},
		onDragStart: () => dragging.set(true),
		onLayout: (e: LayoutChangeEvent) =>
			viewport.set(e.nativeEvent.layout.height),
		onSettle: settle,
		scrollRef,
	};
}
