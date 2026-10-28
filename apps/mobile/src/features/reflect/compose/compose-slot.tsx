import type { ViewStyle } from "react-native";
import { StyleSheet } from "react-native";
import Animated, {
	type AnimatedStyle,
	FadeIn,
	FadeOut,
} from "react-native-reanimated";
import { PillButton } from "@/components/shared/pill-button";
import { Tour } from "@/components/ui/tour";
import { MicButton } from "@/features/reflect/components/mic-button";
import { TOUR_STEPS } from "@/features/reflect-tour/tour-copy";
import { a11yHidden } from "@/lib/utils";

const SLOT_IN = FadeIn.duration(220);
const SLOT_OUT = FadeOut.duration(140);

/** The mic/send slot's fixed height; `h-10` below. */
export const SLOT_H = 40;
/** The least room the slot will accept between itself and the first word. */
export const SLOT_BAND_GAP = 12;

type Props = {
	expanded: boolean;
	hasSelection: boolean;
	isRecording: boolean;
	/** Position and recede, from the surround that owns the band. */
	style: (AnimatedStyle<ViewStyle> | ViewStyle)[];
	onScaffoldSubmit: () => void;
	onVoiceTap: () => void;
};

/**
 * One slot under the card: the mic, or the send button once words are chosen. Fixed band frame.
 */
export const ComposeSlot = ({
	expanded,
	hasSelection,
	isRecording,
	style,
	onScaffoldSubmit,
	onVoiceTap,
}: Props) => (
	<Animated.View
		className="h-10 items-center justify-center"
		pointerEvents={expanded ? "none" : "box-none"}
		style={style}
		{...a11yHidden(expanded)}
	>
		{hasSelection ? (
			<Animated.View
				className="items-center justify-center"
				entering={SLOT_IN}
				exiting={SLOT_OUT}
				style={StyleSheet.absoluteFill}
			>
				{/* Sized to the mic it replaces, so the slot's height is constant. */}
				<PillButton
					className="px-6 py-2"
					label="Let it out"
					onPress={onScaffoldSubmit}
				/>
			</Animated.View>
		) : (
			<Animated.View
				className="items-center justify-center"
				entering={SLOT_IN}
				exiting={SLOT_OUT}
				style={StyleSheet.absoluteFill}
			>
				<Tour.Step
					className="self-center"
					description={TOUR_STEPS[1].description}
					order={1}
					shape="circle"
					title={TOUR_STEPS[1].title}
				>
					<MicButton isRecording={isRecording} onPress={onVoiceTap} size="md" />
				</Tour.Step>
			</Animated.View>
		)}
	</Animated.View>
);
