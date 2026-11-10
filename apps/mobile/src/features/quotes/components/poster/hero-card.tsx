import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { GlassSurface } from "@/components/shared/glass-surface";
import { PosterSurface } from "@/features/quotes/components/poster/poster-surface";

const BACK_ICON = { android: "chevron_left", ios: "chevron.left" } as const;

/** The poster with the screen's chrome printed on it; the back button sits inside so a cold
 * start keeps it reachable (#309). */
export function HeroCard({
	onBack,
	star,
	actions,
	children,
	footer,
}: {
	onBack: () => void;
	star?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
}) {
	const { bottom, top } = useSafeAreaInsets();
	const ink = useCSSVariable("--color-poster-ink") as string;

	return (
		<PosterSurface style={styles.hero}>
			<View
				className="flex-1 px-5"
				style={{ paddingBottom: bottom + 16, paddingTop: top + 8 }}
			>
				<View className="flex-row items-start justify-between">
					<PressableFeedback
						accessibilityLabel="Back"
						accessibilityRole="button"
						hitSlop={12}
						onPress={onBack}
					>
						<GlassSurface
							className="h-11 w-11 items-center justify-center"
							interactive
							radius={22}
						>
							<SymbolView name={BACK_ICON} size={17} tintColor={ink} />
						</GlassSurface>
					</PressableFeedback>

					{star}
				</View>

				<View className="flex-1 justify-center py-8">
					{children}
				</View>

				{actions}
				{footer}
			</View>
		</PosterSurface>
	);
}

const styles = { hero: { flex: 1, margin: 10 } } as const;
