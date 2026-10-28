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
 * The card at both sizes (#256): nothing mounts or unmounts, only `progress` changes.
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

	// Flux aims at the presence dot through CARD_PAD, so the padding is geometry,
	// not a class.
	const cardPadding = { padding: CARD_PAD };
	// Both readings are always mounted; the faded-out one must leave the a11y tree.
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

			{/* Mounted after the readings it covers: RN's responder search walks
			    ancestors, not siblings, so a sibling painted on top (the prompt line)
			    would swallow the tap. The discard button is mounted after, so stays on top. */}
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

			{/* Discard takes the corner the composer's ✕ will occupy. Absolute and mounted
			    on the draft, not `expanded`: in the header row it would reflow the prompt,
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
