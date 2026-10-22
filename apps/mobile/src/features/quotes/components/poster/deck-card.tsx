import type { ReactNode } from "react";
import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Presets } from "react-native-pulsar";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/src/components/shared/app-text";

const ARCHIVE_ICON = {
  ios: "arrow.up.forward.square",
  android: "open_in_new",
} as const;

/**
 * The deck: the poster's second sheet, on the fixed palette rather than themed
 * chrome. Rendered as themed chrome the lower block goes near-black on `dark`
 * and leaves the hero an isolated lit rectangle; as a card the two read as one
 * printed set, with theme chrome shrunk to the ~10pt gutter and the 12pt gap
 * between them (#305).
 *
 * It carries the composer and the way back to the archive.
 */
export function DeckCard({
  composer,
  onOpenArchive,
}: {
  composer?: ReactNode;
  onOpenArchive: () => void;
}) {
  const [ink] = useCSSVariable(["--color-poster-ink"]) as string[];

  return (
    // mt-0.5, not mt-3: RN margins do not collapse, and the hero already ends
    // in 10pt of its own — 2 more is what makes the gap 12.
    <View className="mx-2.5 mt-0.5 mb-6 gap-4 rounded-[28px] bg-poster-deck p-4">
      {composer}
      <PressableFeedback
        onPress={() => {
          Presets.flick();
          onOpenArchive();
        }}
        accessibilityRole="button"
        accessibilityLabel="See old quotes"
      >
        <View className="flex-row items-center justify-between px-1">
          <AppText className="font-poster-display text-[22px] text-poster-ink">
            SEE OLD QUOTES
          </AppText>
          <SymbolView name={ARCHIVE_ICON} size={20} tintColor={ink} />
        </View>
      </PressableFeedback>
    </View>
  );
}
