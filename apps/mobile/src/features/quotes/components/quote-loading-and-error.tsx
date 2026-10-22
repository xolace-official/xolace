import { View } from "react-native";
import { PressableFeedback, SkeletonGroup } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import {
  PLATE_GAP,
  PLATE_HEIGHT,
  usePosterBoxHeight,
} from "@/src/features/quotes/components/poster/poster-body";

/**
 * Cold start and error render as the poster box, not as a takeover: the body
 * box height is a constant fraction of the screen (#294), so the skeleton is
 * the real shape and nothing reflows when the quote arrives.
 */
export function QuoteLoadingAndError({
  coldStartError,
  onRetry,
}: {
  coldStartError: boolean;
  onRetry: () => void;
}) {
  const boxStyle = { height: usePosterBoxHeight() };

  if (coldStartError) {
    return (
      <View className="items-center justify-center gap-4" style={boxStyle}>
        <AppText className="font-poster-body text-poster-ink-faint">
          Something went wrong.
        </AppText>
        {/* Not a themed `Button`: it sits on the poster's fixed paper, where a
            themed foreground goes white-on-white in a dark chrome. */}
        <PressableFeedback
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          hitSlop={12}
        >
          <AppText className="rounded-full bg-poster-plate px-4 py-2 font-poster-body text-poster-ink">
            Retry
          </AppText>
        </PressableFeedback>
      </View>
    );
  }

  return (
    <SkeletonGroup isLoading isSkeletonOnly>
      {/* the source line's own row, or the card jumps when the quote lands */}
      <SkeletonGroup.Item className="mb-2 h-3 w-2/3 self-center rounded-full" />
      {/* the title plate's row. Reserved unconditionally: every curated quote
          carries a title (#310), so holding the space is right far more often
          than not — a titleless quote closes the gap instead of opening one. */}
      <SkeletonGroup.Item
        className="rounded-xl"
        style={{ height: PLATE_HEIGHT, marginBottom: PLATE_GAP }}
      />
      <View className="justify-center" style={boxStyle}>
        <View className="gap-4">
          <SkeletonGroup.Item className="h-9 rounded-xl" />
          <SkeletonGroup.Item className="h-9 w-4/5 rounded-xl" />
          <SkeletonGroup.Item className="h-9 w-2/3 rounded-xl" />
        </View>
      </View>
    </SkeletonGroup>
  );
}
