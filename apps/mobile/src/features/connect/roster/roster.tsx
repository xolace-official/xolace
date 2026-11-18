import { ScrollView, View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
	ReduceMotion,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { COPY } from "../copy";
import { RosterCard } from "./roster-card";
import type { RosterCard as Card, FilterChip } from "./roster-model";

/** Filtering reflows the cards over 240 ms. */
const REFLOW_MS = 240;
const EXIT_MS = 160;
/** The chip row runs to the screen's edges, its first chip on the page's 16 pt gutter. */
const GUTTER = 16;

export type RosterView = {
	filters: FilterChip[];
	filter: string | null;
	/** Undefined while the directory loads. */
	cards: Card[] | undefined;
};

/** Xolacers: each card leads with the person's own words; presence is a word. */
export function Roster({
	roster,
	onFilter,
	onOpen,
}: {
	roster: RosterView;
	onFilter: (slug: string | null) => void;
	onOpen: (card: Card) => void;
}) {
	const reduced = useEffectiveReducedMotion();
	const { cards, filters, filter } = roster;

	if (cards !== undefined && cards.length === 0 && filter === null) {
		return (
			<View className="items-center gap-2 px-6 py-16">
				<AppText center variant="headline">
					{COPY.roster.emptyTitle}
				</AppText>
				<AppText center className="max-w-70" color="muted" variant="callout">
					{COPY.roster.emptyBody}
				</AppText>
			</View>
		);
	}

	return (
		<View className="gap-2.5">
			{filters.length ? (
				<ScrollView
					className="-mx-4"
					contentContainerClassName="gap-2"
					contentContainerStyle={{ paddingHorizontal: GUTTER }}
					horizontal
					showsHorizontalScrollIndicator={false}
				>
					{filters.map((f) => {
						const on = f.slug === filter;
						return (
							<PressScale
								accessibilityLabel={COPY.roster.filterA11y(f.label)}
								accessibilityState={{ selected: on }}
								className={cn(
									"min-h-8 justify-center rounded-[16px] px-3",
									on ? "bg-foreground" : "bg-surface-secondary"
								)}
								haptic={Presets.System.selection}
								key={f.slug ?? "everyone"}
								// Tapping the chosen tag again goes back to everyone.
								onPress={() => onFilter(on ? null : f.slug)}
							>
								<AppText
									className="text-[12.5px]"
									color={on ? "background" : "foreground"}
									variant="footnote"
									weight="semibold"
								>
									{f.label}
								</AppText>
							</PressScale>
						);
					})}
				</ScrollView>
			) : null}

			{(cards ?? []).map((card) => (
				<Animated.View
					entering={
						reduced
							? undefined
							: FadeIn.duration(REFLOW_MS).reduceMotion(ReduceMotion.Never)
					}
					exiting={
						reduced
							? undefined
							: FadeOut.duration(EXIT_MS).reduceMotion(ReduceMotion.Never)
					}
					key={card.id}
					layout={
						reduced
							? undefined
							: LinearTransition.duration(REFLOW_MS).reduceMotion(
									ReduceMotion.Never
								)
					}
				>
					<RosterCard card={card} onPress={() => onOpen(card)} />
				</Animated.View>
			))}

			{cards !== undefined && cards.length === 0 ? (
				<AppText center className="py-8" color="muted" variant="callout">
					{COPY.roster.noMatch}
				</AppText>
			) : null}
		</View>
	);
}
