import { AppText } from "@/components/shared/app-text";
import {
	type RollingNumberProps,
	rollingFaceRole,
} from "@/components/shared/rolling-number-face";
import { useThemeFaces } from "@/design/fonts";

const LINE_HEIGHT = 1.2;

/**
 * Android (and web): the number in the same face and size, without the roll.
 * iOS rolls it with SwiftUI (`rolling-number.ios.tsx`); Compose has no
 * numeric-text transition in Expo UI yet.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function RollingNumber({
	value,
	size,
	color,
	weight = "bold",
	display = false,
}: RollingNumberProps) {
	const faces = useThemeFaces();
	return (
		<AppText
			maxFontSizeMultiplier={1}
			style={{
				color,
				fontFamily: faces[rollingFaceRole(weight, display)],
				fontSize: size,
				fontVariant: ["tabular-nums"],
				lineHeight: Math.round(size * LINE_HEIGHT),
			}}
			variant="body"
		>
			{String(value)}
		</AppText>
	);
}
