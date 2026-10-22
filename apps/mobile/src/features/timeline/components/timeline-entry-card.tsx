import { Link } from "expo-router";
import { Card, cn, PressableFeedback } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/src/components/shared/app-text";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import {
	getEmotionEmoji,
	getEmotionLabel,
	getPathLabel,
} from "@/src/features/timeline/emotions";
import type { TimelineEntry } from "@/src/features/timeline/types";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";

type Props = {
	entry: TimelineEntry;
	className?: string;
};

const styles = StyleSheet.create({
	continuousCurve: { borderCurve: "continuous" },
});

const PRESS_ANIMATION = { scale: { value: 0.98 } };

const TONE_BADGE: Partial<Record<string, { text: string; border: string }>> = {
	direct: { border: "border-tone-direct/40", text: "text-tone-direct" },
	gentle: { border: "border-tone-gentle/40", text: "text-tone-gentle" },
	poetic: { border: "border-tone-poetic/40", text: "text-tone-poetic" },
	witnessed: {
		border: "border-tone-witnessed/40",
		text: "text-tone-witnessed",
	},
};

export const TimelineEntryCard = ({ entry, className }: Props) => {
	const reduced = useEffectiveReducedMotion();

	const emoji = getEmotionEmoji(entry.granularLabel ?? entry.primaryEmotion);
	const emotionLabel = getEmotionLabel(
		entry.granularLabel ?? entry.primaryEmotion
	);
	const pathLabel = getPathLabel(entry.pathChosen);
	const toneLabel = entry.toneUsed
		? entry.toneUsed.charAt(0).toUpperCase() + entry.toneUsed.slice(1)
		: null;
	const toneBadge = entry.toneUsed
		? (TONE_BADGE[entry.toneUsed] ?? {
				border: "border-foreground/20",
				text: "text-foreground/40",
			})
		: null;

	return (
		<Link
			asChild
			href={{
				params: { id: entry.id },
				pathname: "/(protected)/timeline/session/[id]",
			}}
			onPress={() => Presets.ping()}
		>
			<Link.Trigger withAppleZoom={!reduced}>
				<PressableFeedback
					animation={PRESS_ANIMATION}
					className={cn("mx-5 mb-3", className)}
				>
					<Card
						className="rounded-2xl border border-foreground/10"
						style={styles.continuousCurve}
						variant="tertiary"
					>
						<Card.Body className="gap-4 px-3 py-3">
							<AppText
								className="text-base text-foreground italic leading-7"
								numberOfLines={3}
							>
								&ldquo;{removeEmDash(entry.mirrorText)}&rdquo;
							</AppText>

							<View className="flex-row items-center justify-between gap-3">
								<View className="flex-1 flex-row items-center gap-2 overflow-hidden">
									<AppText className="text-base">{emoji}</AppText>
									<AppText
										className="shrink text-foreground/65 text-sm"
										numberOfLines={1}
									>
										{emotionLabel}
									</AppText>
									<AppText className="text-foreground/25 text-sm">
										&middot;
									</AppText>
									<AppText
										className="shrink text-foreground/40 text-sm"
										numberOfLines={1}
									>
										{pathLabel}
									</AppText>
								</View>

								{toneLabel && toneBadge ? (
									<View
										className={`rounded-full border px-2.5 py-0.5 ${toneBadge.border}`}
									>
										<AppText className={`text-xs ${toneBadge.text}`}>
											{toneLabel}
										</AppText>
									</View>
								) : null}
							</View>
						</Card.Body>
					</Card>
				</PressableFeedback>
			</Link.Trigger>
			<Link.Preview />
		</Link>
	);
};
