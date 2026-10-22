import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import type { MirrorTone } from "@/src/features/settings/components/mirror-tone-picker-dialog";

const TONE_BADGE: Partial<Record<string, { text: string; border: string }>> = {
  poetic: { text: "text-tone-poetic", border: "border-tone-poetic/40" },
  gentle: { text: "text-tone-gentle", border: "border-tone-gentle/40" },
  direct: { text: "text-tone-direct", border: "border-tone-direct/40" },
  witnessed: { text: "text-tone-witnessed", border: "border-tone-witnessed/40" },
};
const FALLBACK = { text: "text-foreground/40", border: "border-foreground/20" };

/** Renders nothing for the adaptive tone — there's no named tone to show. */
export const MirrorToneBadge = ({
  toneUsed,
}: {
  toneUsed: MirrorTone | null;
}) => {
  if (toneUsed == null || toneUsed === "adaptive") return null;

  const style = TONE_BADGE[toneUsed] ?? FALLBACK;
  const label = toneUsed.charAt(0).toUpperCase() + toneUsed.slice(1);

  return (
    <View className="mb-3 flex-row">
      <View className={`rounded-full border px-2.5 py-0.5 ${style.border}`}>
        <AppText className={`text-xs ${style.text}`}>{label}</AppText>
      </View>
    </View>
  );
};
