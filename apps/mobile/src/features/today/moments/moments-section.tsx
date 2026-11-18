import { useWindowDimensions, View } from "react-native";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { MODULE_GAP } from "../today-motion";
import { TodaySection } from "../today-section";
import { MomentCard } from "./moment-card";
import { StackedCarousel } from "./stacked-carousel";

/** Production's card height and its screen padding, so the centred card's edges line up. */
const CARD_HEIGHT = 166;
const SCREEN_PADDING_X = 32;

/**
 * Your moments: production's stacked carousel, unchanged (the first page of
 * `sessions.listForTimeline`, so the free tier's window applies). A tap opens the moment.
 * Hidden with none; while loading, the section holds its place.
 */
export function MomentsSection() {
	const { width } = useWindowDimensions();
	const { state, actions } = useToday();
	const { moments } = state;
	if (moments?.length === 0) {
		return null;
	}
	return (
		<View style={{ marginTop: MODULE_GAP }}>
			<View className="mx-4">
				<TodaySection
					action={COPY.moments.seeAll}
					actionLabel={COPY.moments.seeAllLabel}
					onAction={actions.openMoments}
					title={COPY.moments.title}
				/>
			</View>
			<View className="mt-3.5">
				{moments ? (
					<StackedCarousel
						cardHeight={CARD_HEIGHT}
						cardWidth={width - SCREEN_PADDING_X}
						data={moments}
						onCardPress={(m) => actions.openMoment(m.id)}
						renderCard={(m) => (
							<MomentCard entry={m} onOpen={() => actions.openMoment(m.id)} />
						)}
					/>
				) : (
					<View style={{ height: CARD_HEIGHT }} />
				)}
			</View>
		</View>
	);
}
