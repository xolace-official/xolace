import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { Presets } from "react-native-pulsar";
import {
	type SharedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { playSoftPress, useProcessingBreathHaptic } from "@/lib/haptics";
import { BEATS, STORY } from "../copy";
import { useFirstRunContext } from "../first-run-data";
import { BOARD, type Stage } from "../first-run-motion";
import { SeatSheet } from "../seat/seat-sheet";
import type { FirstRunFaces } from "../skia-words";
import type { AuthProvider } from "../use-sign-in";
import { BeatMirror } from "./beat-mirror";
import { BeatPlus } from "./beat-plus";
import { BeatWeek, BeatXolacers } from "./beats-people";
import { BeatCover, BeatVent } from "./beats-touch";
import { SeatCall, StoryBars } from "./story-chrome";
import { StoryGlow } from "./story-glow";
import { StoryPoints } from "./story-points";
import {
	AUTH,
	authOk,
	authReset,
	beginAuth,
	closeSeat,
	EV,
	freshStory,
	goBeat,
	NB,
	openSeat,
	PROV,
	type SEng,
	stepStory,
} from "./story-scene";
import { StoryWords } from "./story-words";
import { useStoryEngine } from "./use-story-engine";
import { useStoryGesture } from "./use-story-gesture";

/** Dev states: a beat (or the seat) held at an age, signing in held at an age. */
export type StoryScene = {
	beat?: number;
	at?: number;
	auth?: AuthProvider;
	/** Signing in, held at this age on the board's clock (1100 back, 1800 seated). */
	aa?: number;
	zoom?: number;
};

type Props = {
	stage: Stage;
	faces: FirstRunFaces;
	/** Opened on the seat (the account link, or a returning visitor). */
	seat: boolean;
	/** Holds the clock at its first frame while the promise's hand-off is on screen. */
	gate: SharedValue<number>;
	statusBar: boolean;
};

/**
 * The story and the seat: six beats on a drawn glow, each written word by word with one thing to
 * touch, then the seat by Flux's fire. One engine on the UI thread; React hears of a beat change,
 * the seat, the seated moment and a few haptics.
 */
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
							onAccessibilityAction={(a) =>
								step(a.nativeEvent.actionName === "increment" ? 1 : -1)
							}
						/>
						<BeatCover eng={eng} />
						{shown(1) ? <BeatMirror eng={eng} /> : null}
						{shown(2) ? <BeatVent eng={eng} /> : null}
						{shown(3) ? <BeatWeek eng={eng} /> : null}
						{shown(4) ? <BeatXolacers eng={eng} /> : null}
						{shown(5) ? <BeatPlus eng={eng} /> : null}
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
