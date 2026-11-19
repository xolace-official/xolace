import { View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";
import { LETTERS } from "../copy";
import { LetterShelf } from "../letter-shelf";
import { cardStatus } from "../letters-model";
import { LettersOffer } from "../letters-offer";
import { ArrivalLetter } from "./arrival-letter";
import { ConnectCardData, useConnectCard } from "./connect-card-data";
import { LettersMark } from "./letters-mark";

/** The card grows to fit what it shows (the offer, the shelf) over 240 ms. */
const GROW_MS = 240;
const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;

/** Connect's route composes this into the screen's slot, on the letters data module. */
export function ConnectLettersCard() {
	return (
		<ConnectCardData>
			<LettersCard />
		</ConnectCardData>
	);
}

/**
 * The Letters card on Connect, above the Chats / Xolacers segment (handoff §1, placement A;
 * render 01). A header row (Letters, one status line, a chevron to the Letters screen), the
 * one-time offer to receive, the shelf when a letter is waiting (it arrives there, render 18), and
 * Write a letter: the quiet button, ember wash and ember ink, so it doesn't outshout Connect.
 */
export function LettersCard() {
	const { state, actions } = useConnectCard();
	const { optIn, unopenedId, writeLimit } = state.status;
	const reduced = useEffectiveReducedMotion();
	const subtle = useTokenColor("subtle");
	const status = cardStatus(state.status);
	return (
		<Animated.View
			className="rounded-[22px] border border-continuous border-separator bg-surface px-3.5 pt-3 pb-3.5"
			layout={
				reduced
					? undefined
					: LinearTransition.duration(GROW_MS).reduceMotion(
							PLAY_AS_CHOSEN.reduceMotion
						)
			}
		>
			<PressScale
				accessibilityLabel={`${LETTERS.title}. ${status}`}
				accessibilityRole="button"
				className="flex-row items-center gap-3"
				onPress={actions.openLetters}
			>
				<LettersMark />
				<View accessible={false} className="flex-1 gap-px">
					<AppText variant="subhead" weight="semibold">
						{LETTERS.title}
					</AppText>
					<AppText color="muted" numberOfLines={2} variant="detail">
						{status}
					</AppText>
				</View>
				<Icon color={subtle} name={CHEVRON} size={13} weight="semibold" />
			</PressScale>
			{optIn === "unset" ? (
				<LettersOffer
					className="mt-3 border-separator border-t pt-3"
					onAnswer={actions.answerOffer}
				/>
			) : null}
			{unopenedId ? (
				<LetterShelf
					art={<ArrivalLetter id={unopenedId} reduced={reduced} />}
					className="mt-3 bg-surface-secondary"
					onOpen={() => actions.openLetter(unopenedId)}
				/>
			) : null}
			<PressScale
				accessibilityHint={writeLimit ? LETTERS.limit[writeLimit] : undefined}
				accessibilityLabel={LETTERS.hub.write}
				accessibilityRole="button"
				className={cn(
					"mt-3 min-h-[42px] items-center justify-center rounded-full py-2",
					writeLimit ? "bg-surface-secondary" : "bg-ember-wash"
				)}
				onPress={actions.openWrite}
			>
				<View accessible={false}>
					<AppText
						className={writeLimit ? undefined : "text-ember-ink"}
						color={writeLimit ? "subtle" : undefined}
						variant="callout"
						weight="semibold"
					>
						{LETTERS.hub.write}
					</AppText>
				</View>
			</PressScale>
		</Animated.View>
	);
}
