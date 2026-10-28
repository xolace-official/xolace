import { useRef } from "react";
import { type GestureResponderEvent, StyleSheet, View } from "react-native";

import type { Rect } from "@/components/ui/tour/types";

/** How far a touch may travel and still count as a tap, not a swipe. */
const TAP_SLOP = 10;

type Props = {
	interactive: boolean;
	dismissible: boolean;
	spot: Rect | null;
	screenWidth: number;
	screenHeight: number;
	onDismiss: () => void;
};

/**
 * The layer that takes the touches the dim does not.
 *
 * One full-screen responder, or four around the cutout when the target has to
 * stay usable. Four rather than one with a hole, because a view cannot have a
 * hole — the gap between them is the hole, and it is the only construction
 * that leaves a rectangle of the screen reachable.
 */
export const TourBackdrop = ({
	interactive,
	dismissible,
	spot,
	screenWidth,
	screenHeight,
	onDismiss,
}: Props) => {
	const start = useRef({ x: 0, y: 0 });

	const press = dismissible
		? {
				onResponderGrant: (e: GestureResponderEvent) => {
					start.current = {
						x: e.nativeEvent.pageX,
						y: e.nativeEvent.pageY,
					};
				},
				onResponderRelease: (e: GestureResponderEvent) => {
					const { pageX, pageY } = e.nativeEvent;
					if (
						Math.abs(pageX - start.current.x) <= TAP_SLOP &&
						Math.abs(pageY - start.current.y) <= TAP_SLOP
					) {
						onDismiss();
					}
				},
				onStartShouldSetResponder: () => true,
			}
		: { onStartShouldSetResponder: () => true };

	if (!(interactive && spot)) {
		return <View style={StyleSheet.absoluteFill} {...press} />;
	}

	const bottom = spot.y + spot.height;
	const right = spot.x + spot.width;

	return (
		<>
			<View style={[styles.top, { height: Math.max(0, spot.y) }]} {...press} />
			<View
				style={[
					styles.bottom,
					{ height: Math.max(0, screenHeight - bottom), top: bottom },
				]}
				{...press}
			/>
			<View
				style={[
					styles.left,
					{ height: spot.height, top: spot.y, width: Math.max(0, spot.x) },
				]}
				{...press}
			/>
			<View
				style={[
					styles.right,
					{
						height: spot.height,
						left: right,
						top: spot.y,
						width: Math.max(0, screenWidth - right),
					},
				]}
				{...press}
			/>
		</>
	);
};

const styles = StyleSheet.create({
	bottom: { left: 0, position: "absolute", right: 0 },
	left: { left: 0, position: "absolute" },
	right: { position: "absolute" },
	top: { left: 0, position: "absolute", right: 0, top: 0 },
});
