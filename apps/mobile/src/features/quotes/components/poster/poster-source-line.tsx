import { PressableFeedback } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import type { SourceLine } from "@/src/features/quotes/hooks/use-today-quote";

const CLASSES =
  "mb-2 text-center font-poster-body text-[12.5px] text-poster-ink-faint";

/**
 * One line of provenance — and, when the session quote is gated, the whole
 * paywall entry point. There is no blur, no lock icon, no second card: the
 * curated quote above it is real and fully rendered (#309).
 */
export function PosterSourceLine({
  line,
  onUnlock,
}: {
  line: SourceLine;
  onUnlock: () => void;
}) {
  if (!line.isGate) return <AppText className={CLASSES}>{line.text}</AppText>;

  return (
    <PressableFeedback
      onPress={onUnlock}
      accessibilityRole="button"
      accessibilityLabel="Unlock your personalised quote with Xolace+"
    >
      <AppText className={CLASSES}>{line.text}</AppText>
    </PressableFeedback>
  );
}
