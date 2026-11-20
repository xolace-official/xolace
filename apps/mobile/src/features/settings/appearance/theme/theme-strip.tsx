import { Fragment, useState } from "react";
import { ScrollView, View } from "react-native";
import { Icon } from "@/components/shared/icon";
import { useAllFontPairs } from "@/design/fonts";
import { useAppearanceScreen } from "@/features/settings/appearance/appearance-data";
import { STRIP } from "@/features/settings/appearance/appearance-model";
import { APPEARANCE_ICONS as I } from "@/features/settings/appearance/copy";
import { ThemeCard } from "@/features/settings/appearance/theme/theme-card";
import { playTextureSelect, tap } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { a11yHidden } from "@/lib/utils";

function Divider() {
	const accent = useTokenColor("accent");
	return (
		<View
			{...a11yHidden(true)}
			className="items-center gap-1.5"
			style={{ height: STRIP.cardH, width: STRIP.divider }}
		>
			<View className="w-px flex-1 bg-separator" />
			<Icon color={accent} name={I.plus} size={14} />
			<View className="w-px flex-1 bg-separator" />
		</View>
	);
}

export function ThemeStrip() {
	const { state, actions } = useAppearanceScreen();
	const [start] = useState(() => ({ x: state.themeStart, y: 0 }));
	const fontsReady = useAllFontPairs();
	return (
		<View className="mx-4 overflow-hidden rounded-[22px] border-continuous bg-surface">
			<ScrollView
				accessibilityRole="radiogroup"
				contentContainerClassName="items-start gap-3 p-4"
				contentOffset={start}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{state.themes.map((card) => (
					<Fragment key={card.id}>
						{card.firstPlus ? <Divider /> : null}
						<ThemeCard
							card={card}
							key={fontsReady ? "fonts" : "no-fonts"}
							onPress={() => {
								if (card.locked) {
									tap();
								} else if (!card.active) {
									playTextureSelect();
								}
								actions.pickTheme(card.id);
							}}
							scheme={state.previewScheme}
						/>
					</Fragment>
				))}
			</ScrollView>
		</View>
	);
}
