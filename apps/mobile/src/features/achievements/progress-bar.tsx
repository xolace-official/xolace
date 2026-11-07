import { View } from "react-native";
import { cn } from "@/lib/cn";
import type { AchievementProgress } from "./types";

type Props = { progress: AchievementProgress; className?: string };

/** "N of M {unit}": the one way progress is read out, on screen and to VoiceOver. */
export const progressLabel = ({ current, target, unit }: AchievementProgress) =>
	`${current} of ${target} ${unit}`;

/** The thin ember bar under a ladder's next rung. Static, so reduced motion has nothing to skip. */
export function ProgressBar({ progress, className }: Props) {
	const { current, target } = progress;
	return (
		<View
			accessibilityLabel={progressLabel(progress)}
			accessibilityRole="progressbar"
			accessibilityValue={{ max: target, min: 0, now: current }}
			className={cn("overflow-hidden rounded-full bg-separator", className)}
		>
			<View
				className="h-full rounded-full bg-ember"
				style={{ width: `${(current / target) * 100}%` }}
			/>
		</View>
	);
}
