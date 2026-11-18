import { useState } from "react";
import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useFirstRunContext } from "./first-run-data";
import { STORY_COLORS } from "./first-run-palette";
import { PromiseView } from "./promise/promise-view";
import { useFirstRunFaces } from "./skia-words";
import { useStage } from "./stage";
import { StoryView } from "./story/story-view";

type Phase = "promise" | "handoff" | "story";

/**
 * First run: the promise, then the story and the seat. Letting go of the promise mounts the story
 * under it, clear and held at its first frame (`gate`), so its canvases are committed before the
 * swap; at the swap the story draws the same glow the promise ended on, and the promise goes.
 */
export function FirstRunScreen() {
	const { state, actions } = useFirstRunContext();
	const stage = useStage();
	// Loaded here once, so the story's first frame has them too.
	const faces = useFirstRunFaces();
	const fromPromise = state.start === "promise";
	const gate = useSharedValue(fromPromise ? 0 : 1);
	const [phase, setPhase] = useState<Phase>(fromPromise ? "promise" : "story");
	const [toSeat, setToSeat] = useState(state.start === "seat");
	const begin = (seat: boolean) => {
		actions.acceptPromise();
		gate.set(0);
		setToSeat(seat);
		setPhase("handoff");
	};
	return (
		<View className="flex-1" style={{ backgroundColor: STORY_COLORS.ground }}>
			{phase === "story" ? null : (
				<PromiseView
					day={state.day}
					faces={faces}
					gate={gate}
					onBegin={begin}
					onSwap={() => setPhase("story")}
					reduced={state.reduced}
					scene={state.scene?.promise}
					stage={stage}
				/>
			)}
			{phase === "promise" ? null : (
				<StoryView
					faces={faces}
					gate={gate}
					seat={toSeat}
					stage={stage}
					statusBar={phase === "story"}
				/>
			)}
		</View>
	);
}
