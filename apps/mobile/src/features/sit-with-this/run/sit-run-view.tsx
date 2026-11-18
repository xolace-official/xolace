import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { SkyWash } from "@/components/shared/sky-wash";
import { useBoardY } from "@/design/board";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { ArcsStage } from "../arcs/arcs-stage";
import { useSitColors } from "../arcs/sit-colors";
import { SitStage } from "../beats/sit-stage";
import { Block } from "../chrome/block";
import { SitHeader } from "../chrome/sit-header";
import { Thread } from "../chrome/thread";
import { useSitFace } from "../chrome/use-sit-face";
import { COPY } from "../copy";
import { useSit } from "../sit-data";
import { BOARD_INNER, FADE, LAYOUT, SKY_SCALE } from "../sit-look";
import {
	arcSize,
	canSwap,
	closeLabel,
	type Exercise,
	isBreathing,
} from "../sit-model";
import { lengthLabel } from "../sit-timing";
import type { SitScene } from "./sit-run";
import { useSitRun } from "./use-sit-run";

type Props = { exercise: Exercise; scene?: SitScene };

/**
 * One exercise, played (design/handoff/sit.md): production's arcs stay on
 * screen the whole time, lit like the Today card; there's a way out, a pause
 * and a thread at every beat, and the sheet waits. React renders on beat
 * changes only; the breath runs on the UI thread from one clock. A swap
 * remounts this with the new exercise, at its first beat.
 */
export function SitRunView({ exercise, scene }: Props) {
	const { state, actions } = useSit();
	const { from, swaps, late } = state;
	const insets = useSafeAreaInsets();
	const { width: W, height: winH } = useWindowDimensions();
	const H = Math.round(
		LAYOUT.arcs.height *
			Math.min(1, (winH - insets.top - insets.bottom) / BOARD_INNER)
	);
	const y = useBoardY();
	const chosen = useEffectiveReducedMotion();
	const reduced = scene?.reduced ?? chosen;
	const colors = useSitColors(late);
	const { run, beat, clock, inFront, begin, next, setPaused } = useSitRun({
		at: scene?.at,
		exercise,
		H,
		hold: scene?.hold,
		preRoll: swaps === 0,
		reduced,
		W,
	});
	const { stage, paused } = run;
	const playing = stage === "play";
	const kind = playing && beat ? beat.k : "text";
	const breathing = playing && isBreathing(kind);
	const sheetOpen = !inFront;
	const face = useSitFace({
		kind,
		running: inFront,
		stage,
		waiting: (paused || sheetOpen) && stage !== "close",
	});
	const swapOn = canSwap({
		from,
		kind,
		linkOn: run.linkOn,
		sheetOpen,
		stage,
		swaps,
	});

	return (
		<View className="flex-1 bg-background">
			<SkyWash late={late} scale={SKY_SCALE} />
			<ArcsStage
				clock={clock}
				colors={colors}
				H={H}
				labelShown={breathing}
				paused={paused}
				reduced={reduced}
				size={arcSize(stage, kind)}
				top={y(LAYOUT.arcs.top)}
				W={W}
			/>
			{beat ? (
				<SitStage
					beat={beat}
					clock={clock}
					doneOn={run.doneOn}
					length={lengthLabel(exercise)}
					name={exercise.name}
					onBegin={() => {
						begin();
						actions.begin();
					}}
					onFinish={() => actions.finish(true)}
					onPromptDone={next}
					reduced={reduced}
					serial={run.serial}
					stage={stage}
					y={y}
				/>
			) : null}
			<SitHeader
				canPause={playing && kind !== "prompt"}
				clock={clock}
				closeLabel={closeLabel(from, stage)}
				face={face}
				late={late}
				// X on "You stayed." finishes: every beat has been played.
				onClose={() => actions.finish(stage === "close")}
				onPause={() => setPaused(!paused)}
				paused={paused}
				top={y(LAYOUT.header.top)}
			/>
			<Block
				on={playing}
				style={{
					left: LAYOUT.thread.side,
					right: LAYOUT.thread.side,
					top: y(LAYOUT.thread.top),
				}}
			>
				<Thread
					beats={exercise.beats}
					clock={clock}
					colors={colors.thread}
					current={run.beat}
					serial={run.serial}
				/>
			</Block>
			<Block
				className="inset-x-0 items-center"
				on={paused && playing && !breathing}
				style={{ top: y(LAYOUT.pausedChip.top) }}
			>
				<View
					className="justify-center rounded-full bg-surface-secondary px-3.5"
					style={{ height: LAYOUT.pausedChip.height }}
				>
					<AppText color="muted" variant="footnote" weight="semibold">
						{COPY.pausedChip}
					</AppText>
				</View>
			</Block>
			<Block
				className="inset-x-0 items-center"
				ms={FADE.linkMs}
				on={swapOn}
				style={{ bottom: LAYOUT.link.bottom }}
			>
				<PressScale
					className="justify-center px-4"
					onPress={actions.openSwap}
					style={{ height: LAYOUT.link.height }}
				>
					<AppText color="subtle" variant="callout" weight="medium">
						{COPY.different}
					</AppText>
				</PressScale>
			</Block>
		</View>
	);
}
