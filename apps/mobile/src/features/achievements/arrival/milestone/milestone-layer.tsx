import type { Ref } from "react";
import { View, type ViewInstance } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Presets } from "react-native-pulsar";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { Milestone as MilestoneModel } from "@/features/achievements/arrival/arrival-model";
import {
	age,
	type Eng,
	type Geo,
	LIFT,
	MS_DONE,
} from "@/features/achievements/arrival/arrival-motion";
import { Milestone } from "@/features/achievements/arrival/milestone/milestone";

/** Flux's box on the board (204 wide, from 128 to 400), where a tap puffs embers once it's lifted. */
const FLUX_HIT = { bottom: 400, halfW: 102, top: 128 } as const;
const TAP_SLOP = 10;

/**
 * The milestone (arrivals §3), one VoiceOver element. Its taps: before 4.2 s a
 * tap anywhere jumps to the settled state; after it, a tap on Flux puffs embers
 * from the fire.
 */
export function MilestoneLayer({
	eng,
	geo,
	dark,
	rm,
	hidden,
	on,
	label,
	milestone,
	wake,
	ref,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	dark: boolean;
	rm: boolean;
	/** Staged in the host, not yet started. */
	hidden: boolean;
	/** The milestone is the phase on screen (not yet Next). */
	on: boolean;
	label: string;
	milestone: MilestoneModel;
	wake: () => void;
	ref?: Ref<ViewInstance>;
}) {
	const tap = Gesture.Tap()
		.maxDistance(TAP_SLOP)
		.onEnd((ev, ok) => {
			if (!ok) {
				return;
			}
			let puff = false;
			eng.modify((e) => {
				"worklet";
				const m = age(e, e.tm);
				if (m < MS_DONE) {
					e.tm = e.now - MS_DONE;
					e.lm = MS_DONE;
					return e;
				}
				const inFlux =
					Math.abs(ev.x - geo.cx) < FLUX_HIT.halfW &&
					ev.y > FLUX_HIT.top + geo.dy + LIFT &&
					ev.y < FLUX_HIT.bottom + geo.dy + LIFT;
				if (!e.rm && inFlux) {
					e.tp = e.now;
					puff = true;
				}
				return e;
			});
			if (puff) {
				Presets.flick();
			}
			scheduleOnRN(wake);
		});
	return (
		<View
			accessibilityElementsHidden={!on}
			accessibilityLabel={label}
			accessible={on}
			className="absolute inset-0"
			importantForAccessibility={on ? "yes" : "no-hide-descendants"}
			pointerEvents={on ? "auto" : "none"}
			ref={ref}
		>
			<GestureDetector gesture={tap}>
				<View className="absolute inset-0">
					<Milestone
						dark={dark}
						eng={eng}
						geo={geo}
						hidden={hidden}
						milestone={milestone}
						rm={rm}
					/>
				</View>
			</GestureDetector>
		</View>
	);
}
