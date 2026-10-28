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
 * The resting card has `overflow: hidden`, so a long prompt ran under the echo. Uncapped once open.
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

/** The card's top row: the prompt, with the composer's controls arriving as it opens. */
export const MorphCardHeader = ({
	card,
	expanded,
	isRecording,
	controlsStyle,
	promptStyle,
	onDismiss,
	onVoiceTap,
}: Props) => {
	// Both readings are always mounted; the faded-out one must leave the a11y
	// tree, or a screen reader finds a close button for a composer that isn't open.
	const composerA11y = a11yHidden(!expanded);
	const pointer = expanded ? "auto" : "none";
	// A retained draft is the user's own words: italic and dimmer so the card
	// never reads as if it asked the question.
	const isDraft = card.source === "draft";

	return (
		<View className="flex-row items-center gap-2">
			<Animated.View style={controlsStyle}>
				<PresenceDot />
			</Animated.View>
			{/* The prompt stays visible while writing, so the tour's first step is the line. */}
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
