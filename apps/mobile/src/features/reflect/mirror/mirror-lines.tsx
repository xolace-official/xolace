import type { ComponentRef, Ref } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import type { SharedValue } from "react-native-reanimated";
import { LAYOUT } from "../layout";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import type { Timeline } from "../reflect-model";
import { MirrorLine } from "./mirror-line";
import type { MirrorInk } from "./mirror-word";

/**
 * The tick as the line arms. A plain function on purpose: the pan schedules it back on the RN
 * runtime, and `scheduleOnRN` rejects a Pulsar preset itself (presets are worklets).
 */
const armTick = () => Presets.System.selection();

type Props = {
	e: SharedValue<number>;
	tl: Timeline;
	ink: MirrorInk;
	wash: string;
	chosen: number;
	glance: () => void;
	firstRef: Ref<ComponentRef<typeof View>>;
};

export function MirrorLines({
	e,
	tl,
	ink,
	wash,
	chosen,
	glance,
	firstRef,
}: Props) {
	const { state, actions } = useReflect();
	const { reduced } = useReflectDraw();
	const { heavy, landN, mv, nq, sayMore, pickMode, atCap, rewriting, flash } =
		state;
	const open = nq || sayMore;
	const canDrag = !(heavy || atCap || open || rewriting);

	const onTap = (i: number) => {
		if (open || heavy || rewriting) {
			return;
		}
		if (pickMode) {
			actions.notQuite(i);
			return;
		}
		const borrowed = tl.lights && (tl.lines[i]?.pairs.length ?? 0) > 0;
		actions.tapLine(i, borrowed);
		if (borrowed) {
			glance();
		}
	};

	return (
		<View className="-mt-2" style={{ gap: LAYOUT.mirror.lineGap }}>
			{tl.lines.map((line, i) => (
				<MirrorLine
					canDrag={canDrag}
					e={e}
					flashN={flash.line === i ? flash.n : 0}
					heavy={heavy}
					index={i}
					ink={ink}
					key={`${landN}-${mv}-${i}`}
					line={line}
					onArm={armTick}
					onChoose={(k) => actions.notQuite(k)}
					onTap={onTap}
					pickMode={pickMode}
					reduced={reduced}
					ref={i === 0 ? firstRef : undefined}
					rewriting={rewriting}
					selected={open && chosen === i}
					soft={open && chosen >= 0 && chosen !== i}
					tl={tl}
					wash={wash}
				/>
			))}
		</View>
	);
}
