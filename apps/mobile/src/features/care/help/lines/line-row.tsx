import { View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Card } from "@/components/shared/card";
import { PressScale } from "@/components/shared/press-scale";
import { fadeUp } from "@/design/entering";
import { useHelpScreen } from "@/features/care/help/help-data";
import type { LineView } from "@/features/care/help/help-model";
import { tv } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** Rows fade in 40 ms apart, 260 ms each. */
const ROW_STAGGER = 40;
const ROW_FADE_MS = 260;
const ROW_RADIUS = 22;
/** The 40 pt pill reaches 44 pt to the finger. */
const PILL_HIT_SLOP = { bottom: 2, top: 2 };

/** A crisis line's Call is warm; a service's (police, a website) neutral. */
const pill = tv({
	base: "h-10 justify-center rounded-[20px] px-4",
	variants: {
		tone: { care: "bg-danger-wash", service: "bg-surface-secondary" },
	},
});

/**
 * One line: who answers, its number (so it can be dialled by hand), and the action under your
 * thumb. The row is one VoiceOver stop for what it is; the pill is the button.
 */
export function LineRow({ line, index }: { line: LineView; index: number }) {
	const { actions } = useHelpScreen();
	const reduced = useEffectiveReducedMotion();
	const { action } = line;

	return (
		<Animated.View
			entering={fadeUp(index * ROW_STAGGER, ROW_FADE_MS, 0, reduced)}
		>
			<Card
				className="flex-row items-center gap-3 py-3 pr-3 pl-4"
				flat
				radius={ROW_RADIUS}
			>
				<View
					accessibilityLabel={[line.title, line.sub, line.detail]
						.filter(Boolean)
						.join(", ")}
					accessible
					className="flex-1 gap-0.5"
				>
					<AppText variant="body" weight="medium">
						{line.title}
					</AppText>
					<AppText color="muted" variant="footnote">
						{line.sub}
					</AppText>
					{line.detail ? (
						<AppText color="subtle" variant="caption">
							{line.detail}
						</AppText>
					) : null}
				</View>
				{action ? (
					<PressScale
						// A call says its number too, so it can be dialled by hand if the call fails.
						accessibilityLabel={
							action.kind === "call"
								? `${action.label} ${line.title}, ${line.sub}`
								: `${action.label} ${line.title}`
						}
						accessibilityRole={action.kind === "open" ? "link" : "button"}
						className={pill({ tone: line.tone })}
						haptic={playSoftPress}
						hitSlop={PILL_HIT_SLOP}
						onPress={() => actions.openLine(line)}
					>
						<AppText
							color={line.tone === "care" ? "dangerInk" : "foreground"}
							variant="callout"
							weight="semibold"
						>
							{action.label}
						</AppText>
					</PressScale>
				) : null}
			</Card>
		</Animated.View>
	);
}
