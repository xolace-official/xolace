import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	TEXTURE_SET_IDS,
	TEXTURE_SET_LABELS,
	type TextureSetId,
} from "@/features/reflect/texture-sets";

type Props = {
	activeSet: TextureSetId;
	onSelect: (id: TextureSetId) => void;
	disabled?: boolean;
};

const SELECTED_A11Y_STATE = { selected: true } as const;
const UNSELECTED_A11Y_STATE = { selected: false } as const;

/** Matches the pills below; see MAX_PILL_FONT_SCALE in texture-band. */
const MAX_TAB_FONT_SCALE = 1.3;

const CONTINUOUS = { borderCurve: "continuous" } as const;

/**
 * A solid segmented track, unlike the translucent pills, so a tab never reads as a ninth word.
 */
export const TextureSetTabs = ({ activeSet, onSelect, disabled }: Props) => (
	<View
		className="mb-3 flex-row gap-1 self-start rounded-xl bg-foreground/5 p-1"
		style={CONTINUOUS}
	>
		{TEXTURE_SET_IDS.map((id) => {
			const isActive = id === activeSet;
			return (
				<PressableFeedback
					accessibilityLabel={TEXTURE_SET_LABELS[id]}
					accessibilityRole="button"
					accessibilityState={
						isActive ? SELECTED_A11Y_STATE : UNSELECTED_A11Y_STATE
					}
					className={`rounded-lg px-3 py-1.5 ${
						isActive ? "bg-accent" : "bg-transparent"
					}`}
					isDisabled={disabled}
					key={id}
					onPress={() => onSelect(id)}
					style={CONTINUOUS}
				>
					<AppText
						className={`font-medium text-xs ${
							isActive ? "text-accent-foreground" : "text-foreground/45"
						}`}
						maxFontSizeMultiplier={MAX_TAB_FONT_SCALE}
					>
						{TEXTURE_SET_LABELS[id]}
					</AppText>
				</PressableFeedback>
			);
		})}
	</View>
);
