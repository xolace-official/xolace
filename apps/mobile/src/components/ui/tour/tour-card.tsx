import { View, type LayoutChangeEvent } from "react-native";

import { SymbolView } from "expo-symbols";
import { Button, CloseButton, useThemeColor } from "heroui-native";

import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import type { TourLabels, TourStepEntry } from "@/src/components/ui/tour/types";

const CHEVRON_LEFT_NAME = {
  ios: "chevron.left",
  android: "chevron_left",
  web: "chevron_left",
} as const;

type Props = {
  active: TourStepEntry | undefined;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  /** Held at zero opacity until the card has been measured once. */
  measured: boolean;
  dismissible: boolean;
  showProgress: boolean;
  showSkip: boolean;
  words: Required<TourLabels>;
  className?: string;
  onLayout: (event: LayoutChangeEvent) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
};

/** The panel beside the spotlight: what this step is, and how to leave it. */
export const TourCard = ({
  active,
  index,
  total,
  isFirst,
  isLast,
  measured,
  dismissible,
  showProgress,
  showSkip,
  words,
  className,
  onLayout,
  onNext,
  onBack,
  onSkip,
}: Props) => {
  const defaultForeground = useThemeColor("default-foreground");

  return (
    <View
      onLayout={onLayout}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      // Held off the first frame's opacity rather than off the screen: the
      // card has to be laid out to be measured, and its height is what decides
      // whether it goes above the target or below it.
      className={cn(
        "gap-3 rounded-2xl border border-border bg-overlay p-4",
        measured ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {dismissible && (
        <CloseButton
          accessibilityLabel={words.close}
          onPress={onSkip}
          className="absolute end-1 top-1"
        />
      )}

      <View className="gap-1 pe-8">
        {showProgress && total > 1 && index >= 0 && (
          <AppText
            className="text-xs text-overlay-foreground/60"
            accessibilityLabel={`Step ${index + 1} of ${total}`}
          >
            {`${index + 1} of ${total}`}
          </AppText>
        )}
        {active?.title && (
          <AppText
            accessibilityRole="header"
            className="font-semibold text-overlay-foreground"
          >
            {active.title}
          </AppText>
        )}
        {active?.description && (
          <AppText className="text-sm text-overlay-foreground/70">
            {active.description}
          </AppText>
        )}
      </View>

      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1">
          {showSkip && !isLast && (
            <Button variant="ghost" size="sm" onPress={onSkip}>
              <Button.Label>{words.skip}</Button.Label>
            </Button>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          {!isFirst && (
            <Button
              variant="tertiary"
              size="sm"
              onPress={onBack}
              className="gap-1"
            >
              <SymbolView
                name={CHEVRON_LEFT_NAME}
                size={13}
                tintColor={defaultForeground}
              />
              <Button.Label>{words.back}</Button.Label>
            </Button>
          )}
          <Button variant="primary" size="sm" onPress={onNext}>
            <Button.Label>{isLast ? words.done : words.next}</Button.Label>
          </Button>
        </View>
      </View>
    </View>
  );
};
