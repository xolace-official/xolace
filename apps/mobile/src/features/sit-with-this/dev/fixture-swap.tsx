import { router } from "expo-router";
import { View } from "react-native";
import { ScopedTheme } from "uniwind";
import { type ThemeMode, themeVariant } from "@/design/themes";
import { toExercise } from "../catalogue";
import { swapChoices } from "../sit-model";
import { type SwapSheet, SwapSheetProvider } from "../swap/swap-data";
import { SwapSheetView } from "../swap/swap-sheet";
import { MAKE_ROOM, REFLECT_SLOTS, RESET } from "./fixtures";

const SHEET_RADIUS = 40;
const back = () => router.back();

export function FixtureSwapSheet({
	current = "let_it_land",
	swaps = 0,
	theme = "light",
	loading = false,
}: {
	current?: string;
	swaps?: number;
	theme?: ThemeMode;
	loading?: boolean;
}) {
	const value: SwapSheet = {
		actions: { keepGoing: back, pick: back },
		state: {
			busy: false,
			choices: swapChoices(
				{
					nextBest: toExercise(MAKE_ROOM, REFLECT_SLOTS),
					reset: toExercise(RESET, REFLECT_SLOTS),
				},
				current
			),
			loading,
			swaps,
		},
	};
	return (
		<ScopedTheme theme={themeVariant("default", theme)}>
			<SwapSheetProvider value={value}>
				<View className="flex-1 justify-end bg-black/40">
					<View
						className="bg-surface"
						style={{
							borderCurve: "continuous",
							borderTopLeftRadius: SHEET_RADIUS,
							borderTopRightRadius: SHEET_RADIUS,
						}}
					>
						<SwapSheetView />
					</View>
				</View>
			</SwapSheetProvider>
		</ScopedTheme>
	);
}
