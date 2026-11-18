import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { SteadinessRing } from "@/components/shared/steadiness-ring";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { PLUS, RINGS } from "../copy";

const RING = 56;
const STROKE = 6;
/** Flipping Free / With Plus crossfades the card's content. */
const FLIP_MS = 350;

const RINGS_LABEL = `${PLUS.compare.example}: ${RINGS.map((r) => r.label).join(", ")}.`;

/** "Same week, two ways": the Sunday-night moment, as it goes free and as it goes with Plus. */
export function CompoundingCard({ plus }: { plus: boolean }) {
	const reduced = useEffectiveReducedMotion();
	const entering = reduced ? undefined : FadeIn.duration(FLIP_MS);
	const exiting = reduced ? undefined : FadeOut.duration(FLIP_MS / 2);
	return (
		<View className="min-h-42 gap-3 rounded-card border border-foreground/10 bg-foreground/6 p-4">
			<AppText className="text-[12.5px]" color="muted">
				{PLUS.compare.when}
			</AppText>
			{plus ? (
				<Animated.View
					className="gap-3"
					entering={entering}
					exiting={exiting}
					key="plus"
				>
					<AppText variant="body" weight="semibold">
						{PLUS.compare.plusLine}
					</AppText>
					<View
						accessibilityLabel={RINGS_LABEL}
						accessible
						className="flex-row items-start justify-between"
					>
						{RINGS.map((r) => (
							<View className="items-center gap-1" key={r.label}>
								<SteadinessRing
									icon={r.icon}
									size={RING}
									stroke={STROKE}
									tone={r.tone}
									value={r.value}
								/>
								<AppText className="text-[11.5px]" color="muted">
									{r.label}
								</AppText>
							</View>
						))}
						<View className="h-5.5 justify-center rounded-full bg-foreground/10 px-2">
							<AppText className="text-[11px]" weight="semibold">
								{PLUS.compare.example}
							</AppText>
						</View>
					</View>
				</Animated.View>
			) : (
				<Animated.View entering={entering} exiting={exiting} key="free">
					<AppText className="leading-[24px]" color="muted" variant="body">
						{PLUS.compare.freeLine}
					</AppText>
				</Animated.View>
			)}
		</View>
	);
}
