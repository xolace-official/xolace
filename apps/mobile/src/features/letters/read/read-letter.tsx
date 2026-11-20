import { type ComponentRef, type Ref, useState } from "react";
import {
	type AccessibilityActionEvent,
	type AccessibilityActionInfo,
	type LayoutChangeEvent,
	useWindowDimensions,
	View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { LETTERS } from "../copy";
import { EmberSeal } from "../ember-seal";
import { Fade } from "../fade";
import { LETTER_MOTION } from "../letter-motion";
import { PAPER_RADIUS, SHEET, useLetterInk } from "../letter-paper";
import { LetterLine } from "../letter-sheet";
import { useLetterOpen } from "./letter-open";
import { ReadBand } from "./read-bands";
import { STAMP_INSET, Stamp } from "./stamp";

const O = LETTER_MOTION.open;
const SEAL = 34;
const STAMP_ROOM = LETTER_MOTION.stamp.size + STAMP_INSET.bottom + 8;
const HINT_GAP = 40;
const PARAGRAPH_GAP = 10;
const WORDS_AT = O.flapMs + O.bottomMs;
const FILL = { inset: 0, position: "absolute" } as const;

type Props = {
	text: string;
	sealed: boolean;
	onCommit: () => void;
	stamped: boolean;
	hiding: boolean;
	reduced: boolean;
	wordsRef: Ref<ComponentRef<typeof View>>;
	actions: AccessibilityActionInfo[];
	onAction: (e: AccessibilityActionEvent) => void;
	onLayout: (e: LayoutChangeEvent) => void;
};

export function ReadLetter(props: Props) {
	const { text, sealed, stamped, hiding, reduced } = props;
	const ink = useLetterInk();
	const { width } = useWindowDimensions();
	const [height, setHeight] = useState<number>(SHEET.read.height);
	const [wasSealed] = useState(sealed);
	const o = useLetterOpen({
		hiding,
		onCommit: props.onCommit,
		reduced,
		sealed,
		width: width - SHEET.margin * 2,
	});
	const band = height / 3;
	const middle = {
		height: band,
		left: 0,
		position: "absolute",
		right: 0,
		top: band,
	} as const;

	return (
		<Animated.View
			onLayout={props.onLayout}
			pointerEvents={hiding ? "none" : "auto"}
			style={[{ marginHorizontal: SHEET.margin }, o.driftStyle]}
		>
			<GestureDetector gesture={o.pan}>
				<View
					onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
					style={{ minHeight: SHEET.read.height }}
				>
					<Fade
						delay={O.flapMs}
						ms={O.bottomMs}
						on={!sealed}
						reduced={reduced}
						style={[
							FILL,
							{ borderRadius: PAPER_RADIUS, boxShadow: ink.shadow },
						]}
					/>
					<Fade on={!(reduced && sealed)} reduced={reduced} style={FILL}>
						<ReadBand
							band={band}
							crease={o.crease}
							fold={null}
							i={1}
							ink={ink}
						/>
						<Animated.View
							style={[
								middle,
								{ backgroundColor: ink.back, borderRadius: PAPER_RADIUS },
								o.coverStyle,
							]}
						/>
						<ReadBand
							band={band}
							crease={o.crease}
							fold={o.bottom}
							i={2}
							ink={ink}
						/>
						<ReadBand
							band={band}
							crease={o.crease}
							fold={o.top}
							i={0}
							ink={ink}
						/>
					</Fade>
					{reduced ? (
						<Fade
							on={sealed}
							reduced
							style={[
								middle,
								{
									backgroundColor: ink.back,
									borderRadius: PAPER_RADIUS,
									boxShadow: ink.shadow,
								},
							]}
						/>
					) : null}
					<View
						accessibilityActions={props.actions}
						accessibilityElementsHidden={sealed}
						accessibilityLabel={text.replace(/\n/g, " ")}
						accessible={!sealed}
						importantForAccessibility={sealed ? "no-hide-descendants" : "yes"}
						onAccessibilityAction={props.onAction}
						ref={props.wordsRef}
						style={{
							gap: PARAGRAPH_GAP,
							paddingBottom: STAMP_ROOM,
							paddingHorizontal: SHEET.read.padH,
							paddingTop: SHEET.read.padV,
						}}
					>
						{text.split("\n").map((para, i) => (
							<Fade
								delay={WORDS_AT + i * O.words.staggerMs}
								key={i}
								ms={O.words.ms}
								on={!sealed}
								reduced={reduced}
								rise={O.words.rise}
							>
								<LetterLine size="read" text={para} />
							</Fade>
						))}
					</View>
					<Stamp on={stamped} reduced={reduced} />
					{wasSealed || sealed ? (
						<View
							className="absolute right-0 left-0 items-center"
							pointerEvents="none"
							style={{ top: band * 2 - SEAL / 2 }}
						>
							<EmberSeal size={SEAL} split={!sealed || o.dragSplit} />
						</View>
					) : null}
					{sealed && !reduced ? (
						<AppText
							accessibilityElementsHidden
							className="absolute right-0 left-0 text-center"
							color="subtle"
							importantForAccessibility="no-hide-descendants"
							style={{ top: band * 2 + HINT_GAP }}
							variant="detail"
						>
							{LETTERS.read.hint}
						</AppText>
					) : null}
				</View>
			</GestureDetector>
		</Animated.View>
	);
}
