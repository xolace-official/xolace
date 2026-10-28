import type { RefObject } from "react";
import type { TextInputInstance } from "react-native";
import { Pressable } from "react-native";
import Animated, {
	FadeInDown,
	FadeOut,
	type SharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { MorphCardBody } from "@/features/reflect/compose/morph-card-body";
import { MorphCardHeader } from "@/features/reflect/compose/morph-card-header";
import { useMorphCardStyles } from "@/features/reflect/compose/morph-card-styles";
import { CARD_PAD } from "@/features/reflect/compose/morph-geometry";
import type { CardContent } from "@/features/reflect/compose/resolve-card-content";
import { SelectionEcho } from "@/features/reflect/compose/selection-echo";
import type { PlusDictationView } from "@/features/reflect/hooks/use-plus-dictation";
import { playSoftPress } from "@/lib/haptics";
import { a11yHidden } from "@/lib/utils";

type Props = {
	progress: SharedValue<number>;
	/** The reduced-motion cross-fade's opacity. 1 whenever motion is allowed. */
	fade: SharedValue<number>;
	expanded: boolean;
	card: CardContent;
	/** Whether there is retained writing to discard, at either size. */
	hasDraft: boolean;
	entryText: string;
	selectedTextures: string[];
	showNudge: boolean;
	nudgeMessage: string;
	isRecording: boolean;
	plusDictation: PlusDictationView | null;
	inputRef: RefObject<TextInputInstance | null>;
	onOpen: () => void;
	onChangeText: (text: string) => void;
	onSubmit: () => void;
	onDismiss: () => void;
	onDiscardDraft: () => void;
	onVoiceTap: () => void;
};

/**
 * The card, at both of its sizes (#256).
 *
 * One object: at rest it is a tilted page holding the prompt, and tapping it
 * runs a single spring that rotates it upright and grows it from the header
 * down to the top of the keyboard, where it is the composer. Nothing mounts or
 * unmounts across that — `progress` is the only difference between the two
 * readings, which is what keeps it feeling like the page opened rather than
 * like a screen was replaced.
 */
export const MorphCard = ({
	progress,
	fade,
	expanded,
	card,
	hasDraft,
	entryText,
	selectedTextures,
	showNudge,
	nudgeMessage,
	isRecording,
	plusDictation,
	inputRef,
	onOpen,
	onChangeText,
	onSubmit,
	onDismiss,
	onDiscardDraft,
	onVoiceTap,
}: Props) => {
	const {
		cardStyle,
		promptStyle,
		controlsStyle,
		restControlsStyle,
		bodyStyle,
		echoStyle,
	} = useMorphCardStyles(progress, fade, card.scale);

	// Flux aims at the presence dot through CARD_PAD, so the padding is
	// geometry rather than a class the card can quietly restyle.
	const cardPadding = { padding: CARD_PAD };
	// The card is one object at two sizes, so both readings are always mounted.
	// Whichever one `progress` has faded out has to leave the a11y tree with it.
	const restA11y = a11yHidden(expanded);

	return (
		<Animated.View
			className="border border-foreground/8 bg-surface shadow-lg"
			style={[
				{ overflow: "hidden", position: "absolute" },
				cardPadding,
				cardStyle,
			]}
		>
			<MorphCardHeader
				card={card}
				controlsStyle={controlsStyle}
				expanded={expanded}
				isRecording={isRecording}
				onDismiss={onDismiss}
				onVoiceTap={onVoiceTap}
				promptStyle={promptStyle}
			/>

			{showNudge && (
				<Animated.View
					className="pt-2"
					entering={FadeInDown.springify().damping(20)}
					exiting={FadeOut.duration(200)}
				>
					<AppText className="text-foreground/40 text-sm">
						{nudgeMessage}
					</AppText>
				</Animated.View>
			)}

			<MorphCardBody
				entryText={entryText}
				expanded={expanded}
				inputRef={inputRef}
				isRecording={isRecording}
				onChangeText={onChangeText}
				onSubmit={onSubmit}
				plusDictation={plusDictation}
				style={bodyStyle}
			/>

			{/* After the readings it covers, not before them: a sibling painted on
          top of this — the prompt line especially — swallows the touch, and
          RN's responder search walks ancestors rather than siblings, so the
          tap died on the text instead of opening the card. Nothing it covers
          is interactive at rest; the discard button below is mounted after it
          and so still sits on top. */}
			{!expanded && (
				<Pressable
					accessibilityHint="Opens the composer to start typing"
					accessibilityLabel="Tap to begin writing"
					accessibilityRole="button"
					onPress={onOpen}
					style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}
				/>
			)}

			<Animated.View
				pointerEvents="none"
				style={[
					{
						bottom: CARD_PAD,
						left: CARD_PAD,
						position: "absolute",
						right: CARD_PAD,
					},
					echoStyle,
				]}
				{...restA11y}
			>
				<SelectionEcho words={selectedTextures} />
			</Animated.View>

			{/* Discard sits in the corner the composer's ✕ will occupy — same place,
          opposite half of the morph, so the card never offers both. Absolute,
          and mounted on the draft rather than on `expanded`: appearing in the
          header row would reflow the prompt the moment a first word is typed,
          and unmounting on tap would pop it out mid-morph. */}
			{hasDraft && (
				<Animated.View
					pointerEvents={expanded ? "none" : "auto"}
					style={[
						{ position: "absolute", right: CARD_PAD, top: CARD_PAD },
						restControlsStyle,
					]}
					{...restA11y}
				>
					<Pressable
						accessibilityHint="Clears what you've written so far"
						accessibilityLabel="Discard draft"
						accessibilityRole="button"
						className="rounded-full bg-foreground/8 px-2.5 py-1"
						hitSlop={12}
						onPress={() => {
							playSoftPress();
							onDiscardDraft();
						}}
					>
						<AppText className="text-foreground/40 text-xs">Discard</AppText>
					</Pressable>
				</Animated.View>
			)}
		</Animated.View>
	);
};
