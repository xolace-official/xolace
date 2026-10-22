import { View } from "react-native";
import { PressableFeedback } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import {
  TEXTURE_SET_IDS,
  TEXTURE_SET_LABELS,
  type TextureSetId,
} from "@/src/features/reflect/texture-sets";

type Props = {
  activeSet: TextureSetId;
  onSelect: (id: TextureSetId) => void;
  disabled?: boolean;
};

const SELECTED_A11Y_STATE = { selected: true } as const;
const UNSELECTED_A11Y_STATE = { selected: false } as const;

/** Matches the pills below — see MAX_PILL_FONT_SCALE in texture-band. */
const MAX_TAB_FONT_SCALE = 1.3;

const CONTINUOUS = { borderCurve: "continuous" } as const;

/**
 * A solid segmented track, deliberately unlike the words it filters.
 *
 * The pills below are translucent, tone-tinted and scattered, and half of them
 * already carry the accent's violet — so a translucent accent-tinted tab read
 * as a ninth word rather than the switch above them. Opaque fill on a recessed
 * track, square-ish against their capsules: two different kinds of thing.
 */
export const TextureSetTabs = ({ activeSet, onSelect, disabled }: Props) => {
  return (
    <View
      style={CONTINUOUS}
      className="mb-3 flex-row gap-1 self-start rounded-xl bg-foreground/5 p-1"
    >
      {TEXTURE_SET_IDS.map((id) => {
        const isActive = id === activeSet;
        return (
          <PressableFeedback
            key={id}
            onPress={() => onSelect(id)}
            isDisabled={disabled}
            accessibilityRole="button"
            accessibilityState={
              isActive ? SELECTED_A11Y_STATE : UNSELECTED_A11Y_STATE
            }
            accessibilityLabel={TEXTURE_SET_LABELS[id]}
            style={CONTINUOUS}
            className={`rounded-lg px-3 py-1.5 ${
              isActive ? "bg-accent" : "bg-transparent"
            }`}
          >
            <AppText
              maxFontSizeMultiplier={MAX_TAB_FONT_SCALE}
              className={`text-xs font-medium ${
                isActive ? "text-accent-foreground" : "text-foreground/45"
              }`}
            >
              {TEXTURE_SET_LABELS[id]}
            </AppText>
          </PressableFeedback>
        );
      })}
    </View>
  );
};
