import { ScrollView, View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	FadeIn,
	FadeOut,
	LinearTransition,
	ReduceMotion,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { EmptyState } from "@/components/shared/empty-state";
import { PressScale } from "@/components/shared/press-scale";
import { DiscoverySkeleton } from "@/components/shared/skeleton-shapes";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { COPY } from "../copy";
import { RosterCard } from "./roster-card";
import type { RosterCard as Card, FilterChip } from "./roster-model";

const REFLOW_MS = 240;
const EXIT_MS = 160;
const GUTTER = 16;

export type RosterView = {
	filters: FilterChip[];
	filter: string | null;
	cards: Card[] | undefined;
};

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
			<EmptyState
				body={COPY.roster.emptyBody}
				className="py-16"
				face
				title={COPY.roster.emptyTitle}
			/>
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

			{cards === undefined ? (
				<DiscoverySkeleton label={COPY.loading.xolacers} />
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
				<EmptyState
					action={{
						label: COPY.roster.noMatchBrowse,
						onPress: () => onFilter(null),
					}}
					body={COPY.roster.noMatchBody}
					className="pt-7.5"
					title={COPY.roster.noMatchTitle}
				/>
			) : null}
		</View>
	);
}
