import { type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { KMOTION } from "../kindling-motion";

/** Both rows of a swap fill the 50 pt box, in a row with a 10 pt gap. */
const FILL = "absolute inset-0 flex-row items-center gap-2.5";
/**
 * The card's bottom row. A change in place (tended, passed, Undo) never swaps the card's
 * layer: only this row crossfades, fading and rising 4 pt over 280 ms (§6).
 */
export function RowSwap<Id extends string>({
	id,
	reduced,
	render,
}: {
	id: Id;
	reduced: boolean;
	/** Draws a row by its id: the incoming one, and the outgoing one while it fades. */
	render: (id: Id) => ReactNode;
}) {
	const [rows, setRows] = useState<{ id: Id; was: Id | null }>({
		id,
		was: null,
	});
	const l = useSharedValue(1);
	if (rows.id !== id) {
		setRows({ id, was: rows.id });
	}

	useEffect(() => {
		if (rows.was === null) {
			return;
		}
		l.set(0);
		l.set(
			withTiming(1, {
				duration: reduced ? REDUCED_FADE_MS : KMOTION.rowMs,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [l, reduced, rows.was]);

	const rise = reduced ? 0 : KMOTION.rowRise;
	const inStyle = useAnimatedStyle(() => ({
		opacity: l.get(),
		transform: [{ translateY: (1 - l.get()) * rise }],
	}));
	const outStyle = useAnimatedStyle(() => ({ opacity: 1 - l.get() }));
	return (
		<View className="mt-3.5 min-h-12.5">
			{rows.was === null ? null : (
				<Animated.View
					accessibilityElementsHidden
					className={FILL}
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={outStyle}
				>
					{render(rows.was)}
				</Animated.View>
			)}
			<Animated.View
				className="min-h-12.5 flex-row items-center gap-2.5"
				style={inStyle}
			>
				{render(rows.id)}
			</Animated.View>
		</View>
	);
}
