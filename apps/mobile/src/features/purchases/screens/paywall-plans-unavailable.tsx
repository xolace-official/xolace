import { StyleSheet, View } from "react-native";
import { FadeIn, LinearTransition } from "react-native-reanimated";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";

const SPINNER_ENTERING = FadeIn.delay(50);

type Props = {
  isRetrying: boolean;
  onRetry: () => void;
};

/**
 * Shown in place of the period picker + purchase CTA when payments are live
 * but the store returned no packages (offerings fetch failed or products
 * unresolvable). Never present a purchasable-looking button that does
 * nothing — that reads as a bug (App Review Guideline 2.1) and strands real
 * users on transient App Store / network failures.
 */
export function PaywallPlansUnavailable({ isRetrying, onRetry }: Props) {
  const accentForeground = useThemeColor("accent-foreground") as string;

  return (
    <View className="gap-4">
      <View
        className="rounded-2xl border border-border bg-surface px-4 py-4 items-center gap-1"
        style={styles.borderCurve}
      >
        <AppText className="text-[15px] font-semibold text-foreground">
          Plans are temporarily unavailable
        </AppText>
        <AppText className="text-[12px] text-muted text-center leading-4">
          We couldn&apos;t reach the App Store. Check your connection and try again.
        </AppText>
      </View>

      <Button
        onPress={onRetry}
        isDisabled={isRetrying}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        variant="primary"
        size="lg"
        isIconOnly={isRetrying}
        layout={LinearTransition.springify()}
        className={`rounded-2xl${isRetrying ? " self-center" : " w-full"}`}
      >
        {isRetrying ? (
          <Spinner entering={SPINNER_ENTERING} color={accentForeground} />
        ) : (
          <Button.Label className="text-base font-medium">Try again</Button.Label>
        )}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  borderCurve: { borderCurve: "continuous" },
});
