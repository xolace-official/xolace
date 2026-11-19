import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { LETTERS } from "../copy";
import { LETTER_MOTION } from "../letter-motion";
import { SectionLabel } from "./for-you-section";
import { useLettersHubScreen } from "./hub-data";
import { SentRow } from "./sent-row";

/** A withdrawn row fades and the rows below close up. With Reduce Motion it only fades. */
const OUT_MS = 240;

/**
 * Sent, the private list (handoff §1): each letter's opening line and status, newest first, then
 * the footnote. Empty: "You haven't written one yet." Withdraw asks first; it can't be undone.
 * Leaving the hub (a push tap opens a letter over it) drops the ask, or it would stay drawn on top.
 */
export function SentSection() {
	const { state, actions } = useLettersHubScreen();
	const reduced = useEffectiveReducedMotion();
	const [withdrawing, setWithdrawing] = useState(state.opens.withdraw);
	const w = LETTERS.withdraw;
	// useFocusEffect needs a stable callback (code-style's listed exception to no useCallback).
	useFocusEffect(useCallback(() => () => setWithdrawing(null), []));
	// The ask closes if its letter stops waiting while it's up (received, or withdrawn elsewhere).
	const asking = state.sent.some(
		(l) => l.id === withdrawing && l.status === "waiting"
	)
		? withdrawing
		: null;
	return (
		<View>
			<SectionLabel text={LETTERS.hub.sent} />
			{state.sent.length === 0 ? (
				<AppText
					className="mx-8 text-[14px] leading-[20px]"
					color="muted"
					variant="detail"
				>
					{LETTERS.hub.noneSent}
				</AppText>
			) : (
				state.sent.map((l) => (
					<Animated.View
						exiting={FadeOut.duration(
							reduced ? LETTER_MOTION.reducedMs : OUT_MS
						).reduceMotion(PLAY_AS_CHOSEN.reduceMotion)}
						key={l.id}
						layout={
							reduced
								? undefined
								: LinearTransition.duration(OUT_MS).reduceMotion(
										PLAY_AS_CHOSEN.reduceMotion
									)
						}
					>
						<SentRow
							letter={l}
							onSeen={(id) => actions.markSeen([id])}
							onWithdraw={setWithdrawing}
						/>
					</Animated.View>
				))
			)}
			<AppText className="px-8 pt-2.5" color="subtle" variant="footnote">
				{LETTERS.hub.footnote}
			</AppText>
			<ConfirmationDialog
				confirmLabel={w.action}
				description={w.body}
				isDestructive
				isOpen={asking !== null}
				onConfirm={() => {
					if (asking) {
						actions.withdraw(asking);
					}
					setWithdrawing(null);
				}}
				onOpenChange={(open) => {
					if (!open) {
						setWithdrawing(null);
					}
				}}
				title={w.title}
			/>
		</View>
	);
}
