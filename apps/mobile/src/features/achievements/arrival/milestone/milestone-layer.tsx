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

const FLUX_HIT = { bottom: 400, halfW: 102, top: 128 } as const;
const TAP_SLOP = 10;

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
	hidden: boolean;
	on: boolean;
	label: string;
	milestone: MilestoneModel;
	wake: () => void;
	ref?: Ref<ViewInstance>;
}) {
	const lift = milestone.week !== null || milestone.freeze !== null ? LIFT : 0;
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
					ev.y > FLUX_HIT.top + geo.dy + lift &&
					ev.y < FLUX_HIT.bottom + geo.dy + lift;
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
