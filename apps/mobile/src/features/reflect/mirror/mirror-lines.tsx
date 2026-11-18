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

type Props = {
	e: SharedValue<number>;
	tl: Timeline;
	ink: MirrorInk;
	wash: string;
	/** The line Not quite or Say more is about (−1: none). */
	chosen: number;
	/** The face glances up at your words when a borrowed line is tapped. */
	glance: () => void;
	/** The first line, for VoiceOver to move to once the mirror has written in. */
	firstRef: Ref<ComponentRef<typeof View>>;
};

/**
 * The mirror's lines, one block each for VoiceOver, in order. A tap flashes where you said a
 * borrowed line (or, picking, chooses it); a drag right says that part missed.
 */
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
					onArm={Presets.System.selection}
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
