import type { Doc } from "@xolace/backend/convex/_generated/dataModel";
import { useThemeColor } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import Shimmer from "@/components/shared/shimmer";
import { SparkleStars } from "@/components/shared/sparkle-stars";
import { ThinkingOrb } from "@/components/ui/thinking-orb";
import { useProcessingBreathHaptic } from "@/lib/haptics";

// Chosen by what the pipeline is doing, never cycled (rule 12): a line only
// claims memory when one connected (convex/ai/process.ts).
const LINES = {
	connecting: "Holding this next to what you've shared before...",
	reading: "Taking this in...",
	writing: "Finding the words...",
} as const;

const FADE_IN = FadeIn.duration(400);

const SHIMMER_CONTAINER_STYLE = {
	borderRadius: 8,
	overflow: "hidden",
	paddingHorizontal: 16,
	paddingVertical: 6,
} as const;

const SHIMMER_OVERLAY_INNER_STYLE = {
	flex: 1,
	opacity: 0.15,
} as const;

type Props = {
	stage: Doc<"sessions">["processingStage"];
};

export const ProcessingState = ({ stage }: Props) => {
	const accentColor = useThemeColor("accent");
	const playBreath = useProcessingBreathHaptic();
	// Stages only move forward within a mount: the server leaves "processing" before
	// this screen finishes fading out, and `stage` goes undefined.
	const [shown, setShown] = useState(stage);
	if (stage && stage !== shown) {
		setShown(stage);
	}
	const line = LINES[shown ?? "reading"];

	useEffect(() => {
		playBreath();
		// Mount-once: the breath marks arrival at the processing state, not each render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const shimmerOverlayStyle = {
		...SHIMMER_OVERLAY_INNER_STYLE,
		backgroundColor: accentColor,
	};

	return (
		<View className="flex-1 items-center justify-center gap-8">
			<ThinkingOrb color={accentColor} size={210} state="composing" />
			<View className="items-center">
				<Shimmer style={SHIMMER_CONTAINER_STYLE}>
					<Shimmer.Overlay
						duration={2000}
						repeatDelay={800}
						trackAngle={0}
						width="40%"
					>
						<View style={shimmerOverlayStyle} />
					</Shimmer.Overlay>
					{/* Keyed by line: each stage change fades the new line in. */}
					<Animated.View
						accessibilityLiveRegion="polite"
						entering={FADE_IN}
						key={line}
					>
						<AppText className="text-foreground/40 text-sm">{line}</AppText>
					</Animated.View>
				</Shimmer>
				<SparkleStars color={accentColor} />
			</View>
		</View>
	);
};
