import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { Tour } from "@/components/ui/tour";
import { StreakCalendar } from "@/features/reflect/components/streak-calendar";
import { TOUR_STEPS } from "@/features/reflect-tour/tour-copy";
import { useFullContext } from "@/lib/convex/use-full-context";
import { playSoftPress } from "@/lib/haptics";

const QUOTE_ICON_NAME = { android: "auto_awesome", ios: "sparkles" } as const;
const EVENT_ICON_NAME = {
	android: "favorite",
	ios: "heart.fill",
	web: "favorite",
} as const;

type Props = {
	eventPrompt: string | null;
	eventLabel: string | null;
	spaceName?: string;
};

/**
 * The Perch strip above the card (#257). The event pill tracks the event period, not the prompt.
 */
export const ComposeChrome = ({
	eventPrompt,
	eventLabel,
	spaceName,
}: Props) => {
	const router = useRouter();
	const accentColor = useThemeColor("accent") as string;
	const [eventColor] = useCSSVariable(["--color-event"]);
	const todayQuotes = useQuery(api.dailyQuotes.getToday);
	const hasQuote = !!(todayQuotes?.session ?? todayQuotes?.curated);
	const context = useFullContext();

	return (
		<View className="flex-row items-center gap-2 pb-3">
			<Tour.Step
				description={TOUR_STEPS[3].description}
				order={3}
				title={TOUR_STEPS[3].title}
			>
				<StreakCalendar
					currentStreak={context?.streak}
					reviveStreak={context?.reviveStreak}
				/>
			</Tour.Step>

			<View className="flex-1 gap-1.5">
				<View className="flex-row items-center gap-2">
					{!!spaceName && (
						<View className="shrink rounded-full bg-accent/15 px-3 py-1">
							<AppText
								className="font-semibold text-accent text-xs"
								numberOfLines={1}
							>
								{spaceName}
							</AppText>
						</View>
					)}

					<View className="flex-1" />

					{hasQuote && (
						<PressableFeedback
							accessibilityLabel="Open today's reflection"
							hitSlop={8}
							onPress={() => {
								playSoftPress();
								router.push("/(protected)/quotes");
							}}
						>
							<View className="flex-row items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5">
								<SymbolView
									name={QUOTE_ICON_NAME}
									size={11}
									tintColor={accentColor}
								/>
								<AppText className="font-medium text-accent/80 text-xs">
									A word for today
								</AppText>
							</View>
						</PressableFeedback>
					)}
				</View>

				{!!eventPrompt && (
					<View className="max-w-full flex-row items-center gap-1.5 self-start rounded-full bg-event/15 px-3 py-1">
						<SymbolView
							name={EVENT_ICON_NAME}
							size={11}
							tintColor={String(eventColor)}
						/>
						<AppText
							className="shrink font-semibold text-event text-xs"
							numberOfLines={1}
						>
							{eventLabel ?? "This month"}
						</AppText>
					</View>
				)}
			</View>
		</View>
	);
};
