import { useState } from "react";
import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useFirstRunContext } from "./first-run-data";
import { PromiseView } from "./promise/promise-view";
import { useFirstRunFaces } from "./skia-words";
import { useStage } from "./stage";
import { StageFrame } from "./stage-frame";
import { StoryView } from "./story/story-view";

type Phase = "promise" | "handoff" | "story";

export function FirstRunScreen() {
	const { state, actions } = useFirstRunContext();
	const stage = useStage();
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
		<View className="flex-1 bg-first-run-ground">
			<StageFrame stage={stage}>
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
			</StageFrame>
		</View>
	);
}
