import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { PosterSurface } from "@/src/features/quotes/components/poster/poster-surface";

const BACK_ICON = { android: "chevron_left", ios: "chevron.left" } as const;

/**
 * The hero: the poster with the screen's chrome printed on it.
 *
 * The back button lives *inside* the card, on the fixed palette — a `GlassView`
 * would read the themed background behind the poster instead. That placement is
 * also what keeps it reachable during a cold start that hits the network, since
 * `children` is a slot the skeleton and error render into (#309).
 */
export function HeroCard({
	onBack,
	star,
	actions,
	children,
}: {
	onBack: () => void;
	star?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
}) {
	const { top } = useSafeAreaInsets();
	const ink = useCSSVariable("--color-poster-ink") as string;

	return (
		<PosterSurface style={styles.hero}>
			<View className="px-5 pb-5" style={{ paddingTop: top }}>
				<View className="flex-row items-start justify-between">
					<PressableFeedback
						accessibilityLabel="Back"
						accessibilityRole="button"
						hitSlop={12}
						onPress={onBack}
					>
						<View className="h-11 w-11 items-center justify-center rounded-full bg-poster-plate">
							<SymbolView name={BACK_ICON} size={17} tintColor={ink} />
						</View>
					</PressableFeedback>

					{star}
				</View>

				<AppText className="mt-3.5 max-w-57.5 font-poster-display text-[37px] text-poster-ink leading-[36.8px] tracking-[1.6px]">
					{"TODAY'S\n"}
					<AppText className="font-poster-display text-[37px] text-poster-ink-soft leading-9.2 tracking-[1.6px]">
						QUOTE
					</AppText>
				</AppText>

				<View className="mt-5 rounded-[20px] bg-poster-paper p-4.5">
					{children}
				</View>

				{actions}
			</View>
		</PosterSurface>
	);
}

const styles = { hero: { margin: 10 } } as const;
