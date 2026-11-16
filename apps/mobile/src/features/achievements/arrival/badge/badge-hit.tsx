import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Presets } from "react-native-pulsar";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import type { ArrivingBadge } from "@/features/achievements/arrival/arrival-model";
import {
	COIN,
	type Eng,
	type Geo,
	HELD,
	MODE,
	SETTLE_SPEED,
} from "@/features/achievements/arrival/arrival-motion";
import { COPY } from "@/features/achievements/copy";
import { tap } from "@/lib/haptics";

const TAP_SLOP = 6;
/** A vertical move this far fails the turn, so the screen's own gestures keep it. */
const FAIL_Y = 24;
/** A let-go below the settle speed still carries on a little, then snaps. */
const NUDGE = 0.1;

/**
 * Where the badge takes touches (§4): drag sideways turns it (a badge-width is a
 * half turn; it keeps its speed with friction and snaps to a face), a tap hops
 * it and throws the burst again. Reduce Motion: a tap turns it over at once.
 * VoiceOver: a "Turn over" action.
 */
export function BadgeHit({
	eng,
	geo,
	b,
	wake,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	b: ArrivingBadge;
	wake: () => void;
}) {
	const pan = Gesture.Pan()
		.activeOffsetX([-TAP_SLOP, TAP_SLOP])
		.failOffsetY([-FAIL_Y, FAIL_Y])
		.onStart(() => {
			eng.modify((e) => {
				"worklet";
				e.drag = true;
				e.mode = MODE.none;
				e.v = 0;
				e.dragFrom = e.spin;
				return e;
			});
			scheduleOnRN(wake);
		})
		.onUpdate((ev) => {
			eng.modify((e) => {
				"worklet";
				e.spin = e.dragFrom + (ev.translationX / COIN) * Math.PI;
				return e;
			});
		})
		.onEnd((ev) => {
			eng.modify((e) => {
				"worklet";
				e.drag = false;
				let v = (ev.velocityX / COIN) * Math.PI;
				if (Math.abs(v) < SETTLE_SPEED) {
					v = (v < 0 ? -1 : 1) * (SETTLE_SPEED + NUDGE);
				}
				e.v = v;
				e.mode = MODE.free;
				return e;
			});
			scheduleOnRN(wake);
		})
		.onFinalize(() => {
			eng.modify((e) => {
				"worklet";
				e.drag = false;
				return e;
			});
		});
	const hop = Gesture.Tap()
		.maxDistance(TAP_SLOP)
		.onEnd((_ev, ok) => {
			if (!ok) {
				return;
			}
			let rm = false;
			eng.modify((e) => {
				"worklet";
				rm = e.rm;
				if (e.rm) {
					e.spin += Math.PI;
					e.turned = true;
				} else {
					e.tu = e.now;
				}
				return e;
			});
			// The flick plays from here, the UI thread, as the burst starts.
			if (rm) {
				scheduleOnRN(tap);
			} else {
				Presets.flick();
			}
			scheduleOnRN(wake);
		});

	const turn = () => {
		scheduleOnUI(() => {
			"worklet";
			eng.modify((e) => {
				"worklet";
				e.spin = Math.round(e.spin / Math.PI) * Math.PI + Math.PI;
				e.turned = true;
				return e;
			});
		});
		wake();
	};

	return (
		<GestureDetector gesture={Gesture.Race(pan, hop)}>
			<View
				accessibilityActions={[{ label: COPY.badge.turnOver, name: "turn" }]}
				accessibilityLabel={COPY.badge.image(b.title, true)}
				accessibilityRole="image"
				accessible
				className="absolute rounded-full"
				onAccessibilityAction={turn}
				style={{
					height: COIN,
					left: geo.cx - HELD.r,
					top: geo.hy - HELD.r,
					width: COIN,
				}}
			/>
		</GestureDetector>
	);
}
