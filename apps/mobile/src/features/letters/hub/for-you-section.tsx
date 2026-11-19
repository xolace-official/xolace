import { Pressable, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	LayoutAnimationConfig,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { LETTERS } from "../copy";
import { LETTER_MOTION } from "../letter-motion";
import { LetterShelf } from "../letter-shelf";
import { forYouRows } from "../letters-model";
import { LettersOffer } from "../letters-offer";
import { openLetter } from "../letters-routes";
import { HiddenGroup } from "./hidden-group";
import { useLettersHubScreen } from "./hub-data";
import { ReceivedRow } from "./received-row";

/** The offer and the shelf leave and arrive in 240 ms (the board's). */
const SWAP_MS = 240;
const HIT = 10;

export function SectionLabel({ text }: { text: string }) {
	return (
		<AppText
			accessibilityRole="header"
			className="px-8 pt-[18px] pb-2 uppercase"
			color="subtle"
			variant="overline"
		>
			{text}
		</AppText>
	);
}

/**
 * For you (handoff §1): the offer while it hasn't been answered; "off" with Turn on after Not now
 * (or the Settings switch); otherwise the unopened letter on its shelf, then the letters you've
 * opened, to reread, and Hidden · N at the foot.
 */
export function ForYouSection() {
	const { state, actions } = useLettersHubScreen();
	const reduced = useEffectiveReducedMotion();
	const ms = reduced ? LETTER_MOTION.reducedMs : SWAP_MS;
	const enter = FadeIn.duration(ms).reduceMotion(PLAY_AS_CHOSEN.reduceMotion);
	const exit = FadeOut.duration(ms).reduceMotion(PLAY_AS_CHOSEN.reduceMotion);
	const { optIn, unopenedId } = state.status;
	const { reread, hidden } = forYouRows(state.received);
	return (
		// Nothing fades in as the screen opens: only what changes while it's up.
		<LayoutAnimationConfig skipEntering>
			<SectionLabel text={LETTERS.hub.forYou} />
			{optIn === "unset" ? (
				<Animated.View
					className="mx-4 rounded-[20px] border border-continuous border-separator bg-surface p-3.5"
					exiting={exit}
				>
					<LettersOffer onAnswer={actions.answerOffer} short />
				</Animated.View>
			) : null}
			{optIn === "no" ? (
				<View className="mx-8 flex-row flex-wrap items-baseline">
					<AppText
						className="text-[14px] leading-[20px]"
						color="muted"
						variant="detail"
					>
						{`${LETTERS.hub.off} `}
					</AppText>
					<Pressable
						accessibilityRole="button"
						hitSlop={HIT}
						onPress={actions.turnOn}
					>
						<AppText
							className="text-[14px] leading-[20px]"
							color="accentInk"
							variant="detail"
							weight="semibold"
						>
							{LETTERS.hub.turnOn}
						</AppText>
					</Pressable>
				</View>
			) : null}
			{optIn === "yes" ? (
				<Animated.View entering={enter}>
					{/* The shelf fades in alone when a letter arrives, not again with its section. */}
					<LayoutAnimationConfig skipEntering>
						{unopenedId ? (
							<Animated.View entering={enter} exiting={exit}>
								<LetterShelf
									className="mx-4 border border-continuous border-separator bg-surface"
									onOpen={() => openLetter(unopenedId)}
								/>
							</Animated.View>
						) : null}
					</LayoutAnimationConfig>
					{reread.map((l) => (
						<ReceivedRow key={l.id} letter={l} />
					))}
					{unopenedId || reread.length > 0 ? null : (
						<AppText
							className="mx-8 text-[14px] leading-[20px]"
							color="muted"
							variant="detail"
						>
							{LETTERS.hub.nothingYet}
						</AppText>
					)}
					<HiddenGroup letters={hidden} startOpen={state.opens.hidden} />
				</Animated.View>
			) : null}
		</LayoutAnimationConfig>
	);
}
