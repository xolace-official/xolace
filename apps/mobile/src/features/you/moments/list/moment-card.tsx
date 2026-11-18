import { Link } from "expo-router";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { riseIn } from "@/design/entering";
import { MOMENTS_COPY } from "@/features/you/moments/copy";
import type { MomentCard as Card } from "@/features/you/moments/moments-model";
import { ToneChip } from "@/features/you/moments/tone-chip";

/** Cards rise in 70 ms apart; past the first screenful they're already there. */
const STAGGER_MS = 70;
const RISE_DY = 10;
const RISEN = 8;
/** Real mirrors run long; the card shows the start and the moment the rest. */
const QUOTE_LINES = 4;

/**
 * A moment in the list: the mirror's line leads, then feeling and path, then the tone. Opens the
 * moment with Apple's zoom, except under reduced motion or a screen reader: the zoom's trigger
 * (like `Link.Preview`, so there's no long-press peek) takes the card out of the accessibility
 * tree.
 */
export function MomentCard({
	moment,
	rise,
	reduced,
	zoom,
}: {
	moment: Card;
	/** Its place in the first screenful as the list arrives; null once it has. */
	rise: number | null;
	reduced: boolean;
	zoom: boolean;
}) {
	const tone = moment.tone ? MOMENTS_COPY.tones[moment.tone] : null;
	return (
		<Animated.View
			entering={
				rise !== null && rise < RISEN
					? riseIn(rise * STAGGER_MS, reduced, RISE_DY)
					: undefined
			}
		>
			<Link
				asChild
				href={{
					params: { id: moment.id },
					pathname: "/moments/session/[id]",
				}}
			>
				<Link.Trigger withAppleZoom={zoom}>
					<PressScale
						accessibilityLabel={MOMENTS_COPY.list.row(
							moment.quote,
							moment.line,
							tone
						)}
						accessibilityRole="link"
						card
						className="gap-3 rounded-[24px] border border-continuous border-separator bg-surface p-4"
					>
						<AppText
							className="text-[17px] leading-6"
							numberOfLines={QUOTE_LINES}
							variant="quote"
						>
							“{moment.quote}”
						</AppText>
						<View className="flex-row items-center justify-between gap-3">
							<AppText
								className="shrink"
								color="muted"
								numberOfLines={1}
								variant="footnote"
							>
								{moment.line}
							</AppText>
							{moment.tone ? <ToneChip tone={moment.tone} /> : null}
						</View>
					</PressScale>
				</Link.Trigger>
			</Link>
		</Animated.View>
	);
}
