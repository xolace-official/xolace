import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { BEATS, STORY } from "../copy";
import { BOARD, type Stage } from "../first-run-motion";
import { SeatSheet } from "../seat/seat-sheet";
import type { FirstRunFaces } from "../skia-words";
import type { AuthProvider } from "../use-sign-in";
import { BeatMirror } from "./beat-mirror";
import { BeatLayer } from "./beat-parts";
import { BeatPlus } from "./beat-plus";
import { BeatWeek, BeatXolacers } from "./beats-people";
import { BeatCover, BeatVent } from "./beats-touch";
import { SeatCall, StoryBars } from "./story-chrome";
import { StoryGlow } from "./story-glow";
import { StoryPoints } from "./story-points";
import { closeSeat, NB, openSeat } from "./story-scene";
import { StoryWords } from "./story-words";
import { useStoryEngine } from "./use-story-engine";
import { useStoryGesture } from "./use-story-gesture";

export type StoryScene = {
	beat?: number;
	at?: number;
	auth?: AuthProvider;
	aa?: number;
	zoom?: number;
};

const BEAT_PARTS = [
	{ Beat: BeatMirror, i: 1 },
	{ Beat: BeatVent, i: 2 },
	{ Beat: BeatWeek, i: 3 },
	{ Beat: BeatXolacers, i: 4 },
	{ Beat: BeatPlus, i: 5 },
] as const;

type Props = {
	stage: Stage;
	faces: FirstRunFaces;
	seat: boolean;
	gate: SharedValue<number>;
	statusBar: boolean;
};

export function StoryView({ stage, faces, seat, gate, statusBar }: Props) {
	const {
		act,
		beat,
		eng,
		open,
		reduced,
		seated,
		shown,
		signIn,
		signing,
		step,
	} = useStoryEngine(seat, gate);
	const away = (i: number) => i !== beat || open;
	const gesture = useStoryGesture(eng, stage.dx, stage.dy);
	const frame = {
		height: BOARD.h,
		left: stage.dx,
		top: stage.dy,
		width: BOARD.w,
	};

	return (
		<View className="absolute inset-0">
			{statusBar ? <StatusBar hidden={false} style="light" /> : null}
			<StoryGlow eng={eng} gate={gate} stage={stage} />
			<GestureDetector gesture={gesture}>
				<View accessible={false} className="absolute inset-0">
					<View className="absolute" pointerEvents="box-none" style={frame}>
						<View
							accessibilityActions={[
								{ name: "increment" },
								{ name: "decrement" },
							]}
							accessibilityElementsHidden={open}
							accessibilityLabel={STORY.position(
								beat + 1,
								NB,
								BEATS[beat].label
							)}
							accessibilityLiveRegion="polite"
							accessibilityRole="adjustable"
							accessible
							className="absolute top-22 left-8 h-[22px] w-50"
							importantForAccessibility={open ? "no-hide-descendants" : "auto"}
							onAccessibilityAction={(a) =>
								step(a.nativeEvent.actionName === "increment" ? 1 : -1)
							}
						/>
						<BeatLayer hidden={away(0)}>
							<BeatCover eng={eng} />
						</BeatLayer>
						{BEAT_PARTS.map(({ i, Beat }) =>
							shown(i) ? (
								<BeatLayer hidden={away(i)} key={i}>
									<Beat eng={eng} />
								</BeatLayer>
							) : null
						)}
						<StoryWords bold={faces.bold} eng={eng} heavy={faces.heavy} />
					</View>
				</View>
			</GestureDetector>
			<StoryBars eng={eng} stage={stage} />
			<SeatSheet
				eng={eng}
				onBack={() =>
					act((e) => {
						"worklet";
						closeSeat(e);
					})
				}
				onSignIn={signIn}
				open={open}
				reduced={reduced}
				seated={seated}
				signing={signing}
				stage={stage}
			/>
			<View className="absolute" pointerEvents="none" style={frame}>
				<StoryPoints eng={eng} />
			</View>
			<SeatCall
				eng={eng}
				hidden={open}
				onPress={() =>
					act((e) => {
						"worklet";
						openSeat(e);
					})
				}
				stage={stage}
			/>
		</View>
	);
}
