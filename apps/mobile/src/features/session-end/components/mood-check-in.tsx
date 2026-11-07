import { useState } from "react";
import { Pressable, View } from "react-native";
import { Presets } from "react-native-pulsar";
import {
	useAnimatedReaction,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useMoodSlider } from "@/features/session-end/hooks/use-mood-slider";
import {
	hasSparkle,
	moodOf,
	SAME,
	type SliderMood,
	stepOf,
	wordsFor,
} from "@/features/session-end/mood-scale";
import { poseForCheckIn } from "@/features/xolace-face/pose";
import { MOVE_SPRING, useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { cn } from "@/lib/utils";
import { MoodTrack } from "./mood-track";

type Props = {
	unsure: boolean;
	/** The finger lifted: the saved word and the exact position (0 heavier … 1 lighter). */
	onAnswer: (mood: SliderMood, position: number) => void;
	onUnsure: () => void;
};

const FACE = 176;
const THUMB = 40;

/** "How do you feel now?" as one heavier ↔ lighter slider, with the Xolace face reacting
 * live as you drag and "not sure" as a quiet link under it. */
export function MoodCheckIn({ unsure, onAnswer, onUnsure }: Props) {
	const face = useFace(poseForCheckIn(SAME));
	// The step under the finger, so the word follows the drag; null until first touched.
	const [step, setStep] = useState<number | null>(null);

	const slider = useMoodSlider(THUMB / 2, {
		onEdge: () => Presets.System.selection(),
		onRelease: (position) => {
			const s = stepOf(position);
			setStep(s);
			onAnswer(moodOf(s), position);
		},
		onStep: (s) => {
			// The centre catches softly; every other step ticks.
			if (s === 0) {
				Presets.feather();
			} else {
				Presets.System.selection();
			}
			setStep(s);
		},
	});

	// The face follows a spring on the slider value, retargeted each drag frame so it keeps
	// its speed and carries through when the finger stops. Reduced motion follows directly.
	// Capture only the shared value and the worklet: the slider object holds a gesture,
	// which a worklet can't copy.
	const reduced = useEffectiveReducedMotion();
	const { pos } = slider;
	const { hold } = face;
	const follow = useSharedValue(SAME);
	useAnimatedReaction(
		() => pos.get(),
		(v, prev) => {
			if (prev !== null && v !== prev) {
				follow.set(reduced ? v : withSpring(v, MOVE_SPRING));
			}
		}
	);
	useAnimatedReaction(
		() => follow.get(),
		(v, prev) => {
			if (prev !== null && v !== prev) {
				hold(poseForCheckIn(v));
			}
		}
	);

	const pickUnsure = () => {
		Presets.murmur();
		setStep(null);
		slider.reset();
		onUnsure();
	};

	let label = "Slide to answer";
	if (step !== null) {
		label = wordsFor(step);
	} else if (unsure) {
		label = "not sure";
	}
	const answered = unsure || step !== null;

	return (
		// Fills the space between the header and the button, so the face sits lower and larger.
		<View className="flex-1 justify-center gap-5 px-8">
			<View className="items-center gap-4">
				<XolaceFace
					eyes={step !== null && hasSparkle(step) ? "sparkle" : "round"}
					face={face}
					size={FACE}
				/>
				<AppText
					accessibilityLiveRegion="polite"
					className={cn(
						"text-center font-serif text-[28px] leading-9",
						answered ? "text-foreground" : "text-foreground/35"
					)}
				>
					{label}
				</AppText>
			</View>

			<View className={cn("gap-2", unsure && "opacity-35")}>
				<MoodTrack label={label} slider={slider} />
				<View className="flex-row justify-between px-1">
					<AppText className="text-foreground/50 text-sm">heavier</AppText>
					<AppText className="text-foreground/50 text-sm">lighter</AppText>
				</View>
			</View>

			<Pressable
				accessibilityRole="button"
				accessibilityState={{ selected: unsure }}
				className="self-center px-4 py-2"
				onPress={pickUnsure}
			>
				<AppText
					className={cn(
						"text-sm underline",
						unsure ? "text-accent" : "text-foreground/40"
					)}
				>
					not sure
				</AppText>
			</Pressable>
		</View>
	);
}
