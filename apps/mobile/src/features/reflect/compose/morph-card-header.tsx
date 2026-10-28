import type { TextStyle, ViewStyle } from "react-native";
import { Pressable, View } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Tour } from "@/components/ui/tour";
import { MicButton } from "@/features/reflect/components/mic-button";
import { PresenceDot } from "@/features/reflect/components/presence-dot";
import type { CardContent } from "@/features/reflect/compose/resolve-card-content";
import { TOUR_STEPS } from "@/features/reflect-tour/tour-copy";
import { playSoftPress } from "@/lib/haptics";
import { a11yHidden } from "@/lib/utils";

/**
 * The resting card is a fixed 3:4 page with `overflow: hidden`, so a long
 * prompt — or a retained draft's opening line, which is arbitrary user text —
 * ran under the selection echo and was cut mid-glyph. Capped only at rest:
 * open, the card is full-width and the line has room to say everything.
 */
const REST_PROMPT_LINES = 4;

type Props = {
	card: CardContent;
	expanded: boolean;
	isRecording: boolean;
	controlsStyle: AnimatedStyle<ViewStyle>;
	promptStyle: AnimatedStyle<TextStyle>;
	onDismiss: () => void;
	onVoiceTap: () => void;
};

/**
 * The card's top row: the prompt, with the composer's controls arriving
 * around it as the card opens.
 */
export const MorphCardHeader = ({
	card,
	expanded,
	isRecording,
	controlsStyle,
	promptStyle,
	onDismiss,
	onVoiceTap,
}: Props) => {
	// The card is one object at two sizes, so both readings are always mounted.
	// Whichever one `progress` has faded out has to leave the a11y tree with it,
	// or a screen reader finds a close button for a composer that isn't open.
	const composerA11y = a11yHidden(!expanded);
	const pointer = expanded ? "auto" : "none";
	// A retained draft is the user's own words, not the space's — italic and
	// dimmer so the card never reads as if it asked the question.
	const isDraft = card.source === "draft";

	return (
		<View className="flex-row items-center gap-2">
			<Animated.View style={controlsStyle}>
				<PresenceDot />
			</Animated.View>
			{/* The prompt is the card's own voice and stays visible while writing,
          so the tour's first step is about the line rather than the page. */}
			<Tour.Step
				className="flex-1"
				description={TOUR_STEPS[0].description}
				order={0}
				title={TOUR_STEPS[0].title}
			>
				<Animated.Text
					className={
						isDraft
							? "font-normal text-foreground/60 italic"
							: "font-normal text-foreground"
					}
					numberOfLines={expanded ? undefined : REST_PROMPT_LINES}
					style={promptStyle}
				>
					{card.text}
				</Animated.Text>
			</Tour.Step>
			<Animated.View
				pointerEvents={pointer}
				style={controlsStyle}
				{...composerA11y}
			>
				<MicButton isRecording={isRecording} onPress={onVoiceTap} size="sm" />
			</Animated.View>
			<Animated.View
				pointerEvents={pointer}
				style={controlsStyle}
				{...composerA11y}
			>
				<Pressable
					accessibilityLabel="Close the composer"
					accessibilityRole="button"
					className="items-center justify-center rounded-full bg-foreground/8 p-1.5"
					hitSlop={12}
					onPress={() => {
						playSoftPress();
						onDismiss();
					}}
				>
					<AppText className="text-foreground/40 text-xs leading-none">
						✕
					</AppText>
				</Pressable>
			</Animated.View>
		</View>
	);
};
