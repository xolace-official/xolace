import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { EaseView } from "@/design/ease";
import { loopOrSettle, useLoopRun } from "@/design/ease-loops";
import { Fade } from "../fade";
import { LETTER_MOTION } from "../letter-motion";
import { PAPER_RADIUS, SHEET, useLetterInk } from "../letter-paper";
import type { LetterPhase } from "../letters-model";
import { useLetterFold } from "./letter-fold";
import { BAND, Band, EMBER, Spark } from "./write-bands";

const M = LETTER_MOTION;
const H = SHEET.write.height;
/** The glow behind the folded letter: 30 pt wider than the phone, 300 pt tall, on the middle band. */
const GLOW = { height: 300, spill: SHEET.margin + 15 };
const SPARK_XS = [-14, 10, -4];
/** It breathes once folded and lit: the fold (2 steps) and the ignite play first. */
const BREATHE_AFTER = M.fold.stepMs * 2 + M.mark.igniteMs;
const FILL = { inset: 0, position: "absolute" } as const;

type Props = {
	phase: LetterPhase;
	reduced: boolean;
	/** The words on the folding paper (what was sent, not the live field). */
	text: string;
	/** The field, shown only in `edit`. */
	children: ReactNode;
};

/**
 * The write sheet (handoff §5, board `.wst`): the field while writing, and from Send the same
 * paper cut in three bands that fold, bottom then top. Folded, it shows the paper's back. The glow
 * behind it is drawn once: Reanimated lights and drains it, and while the check runs an Ease loop
 * breathes it (1 ↔ .85), which stops the moment the check answers. Reduced: the sheet and the
 * folded letter crossfade, 200 ms, and the glow fades without breathing.
 */
export function WriteLetter({ phase, reduced, text, children }: Props) {
	const ink = useLetterInk();
	const f = useLetterFold(phase, reduced);
	const breathing = phase === "wait" && !reduced;
	const run = useLoopRun(breathing);
	const breath = loopOrSettle({
		delay: BREATHE_AFTER,
		from: { opacity: 1 },
		periodMs: M.breathe.halfMs * 2,
		reduced,
		running: breathing,
		to: { opacity: M.breathe.low },
	});
	const glowStyle = useAnimatedStyle(() => ({ opacity: f.glow.get() }));
	const riser = useAnimatedStyle(() => ({
		opacity: f.fade.get(),
		transform: [
			{ translateY: M.send.rise.y * f.climb.get() },
			{ translateX: M.send.rise.sway * f.sway.get() },
		],
	}));
	const letter = useAnimatedStyle(() => ({
		opacity: 1 - f.shrink.get(),
		transform: [{ scale: 1 - (1 - M.send.shrink.scale) * f.shrink.get() }],
	}));
	const ember = useAnimatedStyle(() => ({
		opacity: f.shrink.get(),
		transform: [{ scale: EMBER.from + (1 - EMBER.from) * f.shrink.get() }],
	}));
	const flatOn = !reduced || phase === "edit" || phase === "back";
	const foldedOn = reduced && (phase === "wait" || phase === "rest");

	return (
		<View style={{ height: H, marginHorizontal: SHEET.margin }}>
			<Animated.View
				pointerEvents="none"
				style={[
					{
						height: GLOW.height,
						left: -GLOW.spill,
						position: "absolute",
						right: -GLOW.spill,
						top: H / 2 - GLOW.height / 2,
					},
					glowStyle,
				]}
			>
				<EaseView
					{...breath}
					key={run}
					style={[FILL, { backgroundImage: ink.glow }]}
				/>
			</Animated.View>
			{phase === "edit" ? children : null}
			{phase === "edit" || phase === "gone" ? null : (
				<Animated.View
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={[FILL, riser]}
				>
					<Animated.View style={[FILL, letter]}>
						<Fade on={flatOn} reduced={reduced} style={FILL}>
							<View
								style={{
									borderRadius: PAPER_RADIUS,
									boxShadow: ink.shadow,
									height: BAND,
									left: 0,
									position: "absolute",
									right: 0,
									top: BAND,
								}}
							/>
							<Band fold={null} i={1} ink={ink} text={text} />
							<Band fold={f.bottom} i={2} ink={ink} text={text} />
							<Band fold={f.top} i={0} ink={ink} text={text} />
						</Fade>
						<Fade
							on={foldedOn}
							reduced={reduced}
							style={{
								backgroundColor: ink.back,
								borderRadius: PAPER_RADIUS - 1,
								boxShadow: ink.shadow,
								height: BAND,
								left: 0,
								position: "absolute",
								right: 0,
								top: BAND,
							}}
						/>
					</Animated.View>
					{reduced ? null : (
						<>
							<Animated.View
								style={[
									{
										backgroundImage: ink.heart,
										borderRadius: EMBER.size / 2,
										height: EMBER.size,
										left: "50%",
										marginLeft: -EMBER.size / 2,
										position: "absolute",
										top: H / 2 - EMBER.size / 2,
										width: EMBER.size,
									},
									ember,
								]}
							/>
							{f.sparks.map((sp, i) => (
								<Spark
									fill={ink.spark}
									// The three sparks are fixed; their order never changes.
									key={SPARK_XS[i]}
									t={sp}
									x={SPARK_XS[i] ?? 0}
								/>
							))}
						</>
					)}
				</Animated.View>
			)}
		</View>
	);
}
