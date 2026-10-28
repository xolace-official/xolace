import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { QuoteStack } from "@/features/quotes/components/archive/quote-stack";

const SCREEN_OPTIONS = {
	animation: "slide_from_bottom",
	headerBackButtonDisplayMode: "minimal",
	headerBackVisible: true,
	headerShadowVisible: false,
	headerShown: true,
	headerTitle: "OLD QUOTES",
	headerTransparent: true,
} as const;

/** The archive: a themed screen holding fixed-tint cards. */
export function ArchiveScreen() {
	const { top } = useSafeAreaInsets();
	const [openId, setOpenId] = useState<Id<"daily_quotes"> | null>(null);

	// Rides on `getToday`, which the star patches optimistically, so an unsave moves it at once.
	const savedCount = useQuery(api.dailyQuotes.getToday)?.savedCount ?? 0;

	return (
		<View className="flex-1 bg-background">
			<Stack.Screen options={SCREEN_OPTIONS} />

			<View className="gap-1 px-5 pb-2" style={{ paddingTop: top + 48 }}>
				<AppText className="pt-3 font-poster-body text-[12.5px] text-foreground/65">
					{savedCount} kept
				</AppText>
			</View>

			<QuoteStack onToggle={setOpenId} openId={openId} />
		</View>
	);
}
