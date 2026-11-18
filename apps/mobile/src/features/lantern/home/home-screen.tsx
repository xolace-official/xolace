import { router, Stack } from "expo-router";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { COPY } from "@/features/lantern/copy";
import { ForYouCarousel } from "@/features/lantern/home/for-you-carousel";
import { useHomeScreen } from "@/features/lantern/home/home-data";
import { HomeSkeleton } from "@/features/lantern/home/home-skeleton";
import { HomeToolbar } from "@/features/lantern/home/home-toolbar";
import { HubCarousel } from "@/features/lantern/home/hub-carousel";
import {
	KindRows,
	LetterStrip,
} from "@/features/lantern/home/kinds-and-letters";
import { PhotoCard } from "@/features/lantern/home/photo-card";
import { ReadingAsCard } from "@/features/lantern/home/reading-as";
import { Section, SectionTitle } from "@/features/lantern/home/section";
import { subjectsHref } from "@/features/lantern/lantern-links";
import { continuePct } from "@/features/lantern/lantern-model";
import { LS } from "@/features/lantern/lantern-style";
import { useHeaderOptions } from "@/lib/header-options";

/**
 * Lantern's home (handoff §2), in production's order: Continue reading, Reading as… on a first
 * visit, For you, Hubs, What kind of light, A–Z. One scroll view under the large title, with Saved
 * and Reading as in the bar. A first visit opens the welcome first; after it the sections rise in.
 */
export function HomeScreen() {
	const { state, actions } = useHomeScreen();
	const header = useHeaderOptions();
	const { width } = useWindowDimensions();
	const { home, arrival } = state;
	const enter = arrival > 0;
	const pct = home?.continue ? continuePct(home.continue.position) : 0;
	return (
		<>
			<Stack.Screen options={{ ...header, title: COPY.title }} />
			{/* The first child, so the large title collapses with it. */}
			<ScrollView
				className="bg-background"
				contentContainerStyle={{ paddingBottom: LS.bottom }}
				contentInsetAdjustmentBehavior="automatic"
			>
				{home === undefined ? <HomeSkeleton /> : null}
				{/* Keyed by the arrival, so the sections mount again and rise in. */}
				<View key={arrival}>
					{home?.continue ? (
						<Section enter={enter} order={1}>
							<SectionTitle title={COPY.home.continue} />
							<View style={{ paddingHorizontal: LS.gutter }}>
								<PhotoCard
									entry={home.continue}
									from="continue"
									height={LS.card.h}
									kicker={COPY.home.continueKicker(pct)}
									label={COPY.home.continueLabel(home.continue.title, pct)}
									onShare={actions.share}
									progress={home.continue.position}
									width={width - LS.gutter * 2}
								/>
							</View>
						</Section>
					) : null}
					{home?.readingAs === null && home.audiences.length > 0 ? (
						<Section enter={enter} order={1}>
							<ReadingAsCard />
						</Section>
					) : null}
					{home && home.forYou.length > 0 ? (
						<Section enter={enter} order={2}>
							<SectionTitle title={COPY.home.forYou} />
							<ForYouCarousel />
						</Section>
					) : null}
					{home && home.hubs.length > 0 ? (
						<Section enter={enter} order={3}>
							<SectionTitle title={COPY.home.hubs} />
							<HubCarousel />
						</Section>
					) : null}
					{home ? (
						<>
							<Section enter={enter} order={4}>
								<SectionTitle title={COPY.home.kinds} />
								<KindRows />
							</Section>
							{state.subjects && state.subjects.length > 0 ? (
								<Section enter={enter} order={5}>
									<SectionTitle
										action={COPY.home.allSubjects}
										onAction={() => router.push(subjectsHref())}
										title={COPY.home.az}
									/>
									<LetterStrip />
								</Section>
							) : null}
						</>
					) : null}
				</View>
			</ScrollView>
			<HomeToolbar />
		</>
	);
}
