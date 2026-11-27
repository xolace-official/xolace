import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { fadeUp } from "@/design/entering";
import { cn } from "@/lib/cn";
import { playErrorNotice, useProcessingBreathHaptic } from "@/lib/haptics";
import { COPY } from "../copy";
import { FACE } from "../face-poses";
import { LAYOUT, useBoardY } from "../layout";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import { unreachableLine, type WaitError } from "../reflect-model";
import { YourWords } from "../your-words";
import { Enso } from "./enso";
import { type CardAction, SlowCard } from "./slow-card";
import { StageLine } from "./stage-line";

const E = LAYOUT.enso;
const W = COPY.wait;
const GAZE_AT_YOU = { x: 0, y: -0.2 } as const;
const CARD_IN = { ms: 400, rise: 10 } as const;

export function WaitStage() {
	const { state, actions } = useReflect();
	const { stage, waitStage, slow, reach, error } = state;
	const unreachable = reach === "reachable" ? null : reach;
	const { late, reduced, live, low } = useReflectDraw();
	const y = useBoardY();
	const { width } = useWindowDimensions();
	const landed = stage === "land";
	const face = useFace(FACE.watch, live);
	const { to, nod, look } = face;
	const breath = useProcessingBreathHaptic();

	const [kept, setKept] = useState(false);
	if (kept && !slow) {
		setKept(false);
	}
	const stuck = (slow && !kept) || unreachable !== null || error !== null;

	const failed = error !== null;
	useEffect(() => {
		if (failed) {
			playErrorNotice();
		}
	}, [failed]);

	useEffect(() => {
		breath();
	}, [breath]);

	useEffect(() => {
		if (landed) {
			to(PRESETS.nod);
			nod();
		} else if (stuck) {
			to(PRESETS.waiting);
			look(GAZE_AT_YOU.x, GAZE_AT_YOU.y);
		} else {
			to(FACE.watch);
		}
	}, [landed, stuck, to, nod, look]);

	const stepAway: CardAction = { go: actions.stepAway, label: W.stepAway };
	let card: { body: string; primary: CardAction; secondary?: CardAction };
	const startOver = { go: actions.startOver, label: W.startOver };
	if (error !== null) {
		const primary: Record<WaitError["kind"], CardAction> = {
			failed: { go: actions.retry, label: W.tryAgain },
			limit: { go: actions.seePlus, label: W.seePlus },
			rejected: { go: actions.openHelp, label: W.talkToSomeone },
		};
		card = {
			body: error.body,
			primary: primary[error.kind],
			secondary: startOver,
		};
	} else if (unreachable === null) {
		card = {
			body: W.slow,
			primary: stepAway,
			secondary: { go: () => setKept(true), label: W.keepWaiting },
		};
	} else {
		card = { body: W.unreachableCard, primary: stepAway };
	}
	const line =
		unreachable === null
			? (W.stages[waitStage] ?? W.stages[0])
			: unreachableLine(unreachable);
	const wordsAt = { x: LAYOUT.words.side, y: y(LAYOUT.words.top) };

	return (
		<View className="flex-1">
			<View
				className="absolute"
				style={{
					left: LAYOUT.words.side,
					right: LAYOUT.words.side,
					top: wordsAt.y,
				}}
			>
				<YourWords at={wordsAt} lift />
			</View>

			<View
				className="absolute"
				style={{
					height: E.size,
					left: (width - E.size) / 2,
					top: y(E.top),
					width: E.size,
				}}
			>
				<Enso
					face={face}
					faceSize={E.face}
					follow={!(stuck || reduced)}
					landed={landed}
					late={late}
					low={low}
					mode={unreachable === null ? "paint" : "offline"}
					reduced={reduced}
					running={live}
					size={E.size}
				/>
			</View>

			<View
				className={cn("absolute", landed && "opacity-0")}
				style={{
					left: LAYOUT.stageLine.side,
					right: LAYOUT.stageLine.side,
					top: y(LAYOUT.stageLine.top),
				}}
			>
				<StageLine reduced={reduced} running={live && !landed} text={line} />
			</View>

			{stuck && !landed ? (
				<Animated.View
					className="absolute"
					entering={fadeUp(0, CARD_IN.ms, CARD_IN.rise, reduced)}
					style={{
						left: LAYOUT.slow.side,
						right: LAYOUT.slow.side,
						top: y(LAYOUT.slow.top),
					}}
				>
					<SlowCard {...card} />
				</Animated.View>
			) : null}

			{stuck || landed ? null : (
				<View
					className="absolute inset-x-0 items-center"
					style={{ bottom: LAYOUT.awayLink.bottom }}
				>
					<PressScale
						accessibilityLabel={W.stepAwayLink}
						accessibilityRole="button"
						className="px-3 py-2"
						onPress={actions.stepAway}
					>
						<AppText
							className="text-[15px]"
							color="muted"
							variant="callout"
							weight="medium"
						>
							{W.stepAwayLink}
						</AppText>
					</PressScale>
				</View>
			)}
		</View>
	);
}
