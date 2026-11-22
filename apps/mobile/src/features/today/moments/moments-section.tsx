import { useWindowDimensions, View } from "react-native";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { MODULE_GAP } from "../today-motion";
import { TodaySection } from "../today-section";
import { MomentCard } from "./moment-card";
import { carouselHeightFor, StackedCarousel } from "./stacked-carousel";

const CARD_HEIGHT = 166;
const SCREEN_PADDING_X = 32;

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
					<View style={{ height: carouselHeightFor(CARD_HEIGHT) }} />
				)}
			</View>
		</View>
	);
}
