import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { FONTS } from "@/design/type";
import { playAffirmativePress } from "@/lib/haptics";
import { Block } from "../chrome/block";
import type { SitClock } from "../clock/use-sit-clock";
import { COPY } from "../copy";
import { LAYOUT } from "../sit-look";
import type { Beat, Stage } from "../sit-model";
import { BreathCaption } from "./breath-caption";
import { PreRoll, Rise } from "./pre-roll";
import { SitLine } from "./sit-line";
import { WriteBeat } from "./write-beat";
import { StayedDone, StayedText } from "./you-stayed";

/** Board `.hc`: Newsreader italic 25/1.34. */
const HAND = {
	fontFamily: FONTS.mirror,
	fontSize: 25,
	lineHeight: 33.5,
} as const;
const C = LAYOUT.cta;

type Props = {
	stage: Stage;
	beat: Beat;
	serial: number;
	name: string;
	length: string;
	doneOn: boolean;
	clock: SitClock;
	reduced: boolean;
	y: (v: number) => number;
	onBegin: () => void;
	onPromptDone: () => void;
	onFinish: () => void;
};

/**
 * Everything below the header, by beat (board "stages"): the first screen, a
 * line, a breath's caption, the hand pulse's line, writing, and "You stayed.".
 * Each block fades .4 s; a line's words and a caption's phase come from the
 * clock.
 */
export function SitStage({
	stage,
	beat,
	serial,
	name,
	length,
	doneOn,
	clock,
	reduced,
	y,
	onBegin,
	onPromptDone,
	onFinish,
}: Props) {
	const k = stage === "play" ? beat.k : null;
	const line = beat.k === "text" || beat.k === "mirror" ? beat : null;
	const breath = beat.k === "breath" || beat.k === "sync" ? beat : null;
	const hasCaption =
		breath !== null && (typeof breath.t !== "string" || breath.t.length > 0);
	return (
		<>
			<Block
				keep
				on={stage === "pre"}
				style={{
					left: LAYOUT.pre.side,
					right: LAYOUT.pre.side,
					top: y(LAYOUT.pre.top),
				}}
			>
				<PreRoll length={length} name={name} reduced={reduced} />
			</Block>
			<Block
				keep
				on={stage === "pre"}
				style={{ bottom: C.beginBottom, left: C.side, right: C.side }}
			>
				<Rise order={3} reduced={reduced}>
					<CtaButton
						label={COPY.begin}
						onPress={() => {
							playAffirmativePress();
							onBegin();
						}}
					/>
				</Rise>
			</Block>

			<Block
				on={line !== null && k !== null}
				style={{
					left: LAYOUT.line.side,
					right: LAYOUT.line.side,
					top: y(LAYOUT.line.top),
				}}
			>
				{line && k ? (
					<SitLine
						clock={clock}
						key={serial}
						mirror={line.k === "mirror"}
						reduced={reduced}
						serial={serial}
						text={line.t}
					/>
				) : null}
			</Block>

			<Block
				on={hasCaption && k !== null}
				style={{
					left: LAYOUT.caption.side,
					right: LAYOUT.caption.side,
					top: y(k === "sync" ? LAYOUT.caption.syncTop : LAYOUT.caption.top),
				}}
			>
				{breath && hasCaption && k ? (
					<BreathCaption
						clock={clock}
						key={serial}
						reduced={reduced}
						serial={serial}
						sync={k === "sync"}
						text={breath.t}
					/>
				) : null}
			</Block>

			<Block
				on={k === "haptic"}
				style={{
					left: LAYOUT.hand.side,
					right: LAYOUT.hand.side,
					top: y(LAYOUT.hand.top),
				}}
			>
				<AppText center style={HAND} variant="body">
					{beat.k === "haptic" ? beat.t : ""}
				</AppText>
			</Block>

			<Block className="inset-0" on={k === "prompt"}>
				{beat.k === "prompt" && k ? (
					<WriteBeat
						key={serial}
						onDone={onPromptDone}
						question={beat.t}
						y={y}
					/>
				) : null}
			</Block>

			<Block
				keep
				on={stage === "close"}
				style={{
					left: LAYOUT.stayed.side,
					right: LAYOUT.stayed.side,
					top: y(LAYOUT.stayed.top),
				}}
			>
				<StayedText />
			</Block>
			<Block
				on={stage === "close"}
				style={{ bottom: C.doneBottom, left: C.side, right: C.side }}
			>
				<View>
					<StayedDone clock={clock} onPress={onFinish} ready={doneOn} />
				</View>
			</Block>
		</>
	);
}
