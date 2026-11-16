import { Text } from "@expo/ui/swift-ui";
import {
	Animation,
	animation,
	contentTransition,
	dynamicTypeSize,
	font,
	foregroundStyle,
	monospacedDigit,
} from "@expo/ui/swift-ui/modifiers";
import {
	type Roll,
	type RollingNumberProps,
	rollFor,
	rollingFaceRole,
} from "@/components/shared/rolling-number-face";
import { ThemedHost } from "@/components/shared/themed-host";
import { useThemeFaces } from "@/design/fonts";
import { postScriptName } from "@/design/postscript-name";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const swiftAnimation = (roll: Exclude<Roll, { kind: "none" }>) =>
	roll.kind === "ease-out"
		? Animation.easeOut({ duration: roll.durationS })
		: Animation.spring({ bounce: roll.bounce, duration: roll.durationS });

/**
 * Digits that roll when the number changes: a SwiftUI Text with the numericText
 * content transition, so 12 → 13 is native. With reduced motion they swap.
 */
export function RollingNumber({
	value,
	size,
	color,
	weight = "bold",
	display = false,
	quick = false,
}: RollingNumberProps) {
	const faces = useThemeFaces();
	const reduced = useEffectiveReducedMotion();
	const family = postScriptName(faces[rollingFaceRole(weight, display)]);
	const roll = rollFor(quick, reduced);
	return (
		<ThemedHost matchContents>
			<Text
				modifiers={[
					// A custom face scales with Dynamic Type in SwiftUI; pin it so the chips keep their layout.
					dynamicTypeSize("large"),
					font({ family, size }),
					monospacedDigit(),
					foregroundStyle(color),
					contentTransition("numericText", { countsDown: false }),
					...(roll.kind === "none"
						? []
						: [animation(swiftAnimation(roll), value)]),
				]}
			>
				{String(value)}
			</Text>
		</ThemedHost>
	);
}
