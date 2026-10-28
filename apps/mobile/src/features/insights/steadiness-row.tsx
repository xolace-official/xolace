// The profile's door into the insights screen (#517).

import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";
import { GAUGE, icon } from "@/features/insights/domains";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const CHEVRON = icon("chevron.right", "chevron_right");
const GLASS = isLiquidGlassAvailable();
// HeroUI's pressable root clips (`overflow: hidden`), which shears the glass as it swells on press.
const UNCLIPPED = { overflow: "visible" } as const;

export function SteadinessRow() {
	const router = useRouter();
	const [accent, muted] = [useTokenColor("accent"), useTokenColor("muted")];
	return (
		<PressableFeedback
			accessibilityLabel="Steadiness. How the parts of your life have been lately."
			accessibilityRole="button"
			// Interactive glass owns the press response; the solid fallback keeps HeroUI's scale.
			animation={GLASS ? false : undefined}
			className="mx-5 mb-4"
			onPress={() => {
				playSoftPress();
				router.push("/profile/insights");
			}}
			style={GLASS ? UNCLIPPED : undefined}
		>
			<GlassSurface
				className="flex-row items-center gap-3 px-5 py-4"
				interactive
				radius={24}
				tint="accent"
			>
				<View className="size-9 items-center justify-center rounded-xl bg-accent/12">
					<SymbolView name={GAUGE} size={17} tintColor={accent} />
				</View>
				<View className="flex-1">
					<AppText className="font-medium text-[15px] text-foreground">
						Steadiness
					</AppText>
					<AppText className="text-[13px] text-muted leading-5">
						How the parts of your life have been lately.
					</AppText>
				</View>
				<SymbolView name={CHEVRON} size={13} tintColor={muted} />
			</GlassSurface>
		</PressableFeedback>
	);
}
