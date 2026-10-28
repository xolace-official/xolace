import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { PressableFeedback, Surface } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";
import { PlayfulLip } from "@/lib/playful/playful-lip";
import { useIsPlayful, usePlayfulPress } from "@/lib/playful/use-playful";
import { cn } from "@/lib/utils";
import { KindlingCardSkeleton } from "./skeletons";

const ART_URL = __DEV__
	? "https://groovy-mandrill-892.eu-west-1.convex.cloud/api/storage/ecc29516-333a-42b0-9ee6-e1dbffd80bd9"
	: "https://energetic-guineapig-283.convex.cloud/api/storage/ffeee9b5-769c-48b2-8f25-c6c5f036352c";

const styles = StyleSheet.create({
	artWindow: { borderCurve: "continuous", width: 96 },
	card: { borderCurve: "continuous" },
});

// rounded-3xl under Playful's --radius (16px).
const PLAYFUL_CARD_RADIUS = 16;

/** Entry point to the active-kindling screen (docs/paths-v1.md §9.2, #336). Renders nothing
 * until `getActive` resolves. */
export function KindlingTodayCard() {
	const router = useRouter();
	const isPlayful = useIsPlayful();
	const press = usePlayfulPress();
	const kindling = useQuery(api.paths.getActive, {
		withRead: true,
		withTry: true,
	});

	if (kindling === undefined) {
		return <KindlingCardSkeleton />;
	}
	if (!kindling) {
		return null;
	}

	const tended = kindling.twigs.filter((t) => t.state === "done").length;

	const goToKindling = () => {
		playSoftPress();
		router.push("/(protected)/kindling");
	};

	const cardFace = (
		<Surface
			className={cn(
				"flex-row items-center p-0",
				// The press-down brings its own lip.
				isPlayful && "shadow-none"
			)}
			style={styles.card}
		>
			<View className="flex-1 py-6 pr-4 pl-5">
				<AppText className="font-semibold text-foreground text-lg">
					Your kindling
				</AppText>
				<AppText className="mt-1.5 text-muted text-sm leading-5">
					{tended} of {kindling.twigs.length} tended; a few things from your
					last session.
				</AppText>
			</View>
			{/* Stretches to the card's height. Android only honours `overflow: 'hidden'`
			 * on a view with a border radius, so the radius also sets up the clip. */}
			<View
				className="self-stretch overflow-hidden rounded-r-3xl"
				style={styles.artWindow}
			>
				<Image
					accessibilityElementsHidden
					contentFit="cover"
					importantForAccessibility="no-hide-descendants"
					source={ART_URL}
					style={{ flex: 1 }}
				/>
			</View>
		</Surface>
	);

	return (
		<PressableFeedback
			accessibilityLabel="Open your kindling"
			accessibilityRole="button"
			animation={isPlayful ? false : undefined}
			onPress={goToKindling}
			onPressIn={isPlayful ? press.onPressIn : undefined}
			onPressOut={isPlayful ? press.onPressOut : undefined}
		>
			{isPlayful ? (
				<PlayfulLip
					lipClassName="bg-border"
					pressed={press.pressed}
					radius={PLAYFUL_CARD_RADIUS}
				>
					{cardFace}
				</PlayfulLip>
			) : (
				cardFace
			)}
		</PressableFeedback>
	);
}
