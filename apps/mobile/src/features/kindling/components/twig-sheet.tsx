import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { cn } from "@/src/lib/utils";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { TWIG_PRESENTATION, twigBrowseHref, type Twig } from "../twig-presentation";

/**
 * The open twig, floating over the bottom of the trail: why, "Browse more
 * like this" for a bound track, then "Not for me" and the primary action.
 * Tended collapses the actions to a "Tended" line; skipped to "Not for you".
 */
export function TwigSheet({
  twig,
  bottom,
  matching = false,
  onBegin,
  onSkip,
  onBrowseMore,
  onHeight,
}: {
  twig: Twig;
  bottom: number;
  /** A xolacer twig's match is in flight (#570): the button says so and holds. */
  matching?: boolean;
  onBegin: () => void;
  onSkip: () => void;
  onBrowseMore: () => void;
  onHeight: (height: number) => void;
}) {
  const look = TWIG_PRESENTATION[twig.kind];
  const done = twig.state === "done";
  const skipped = twig.state === "skipped";
  const browsable = twigBrowseHref(twig) !== null;
  const reduced = useEffectiveReducedMotion();
  const accentForeground = useThemeColor("accent-foreground") as string;

  return (
    <EaseView
      key={twig._id}
      // Remounts per twig, and switching stops is a frequent tap: short and
      // ease-out so the new card is readable at once, not a 300ms ease-in-out.
      initialAnimate={{ opacity: 0, translateY: reduced ? 0 : 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 180, easing: [0.23, 1, 0.32, 1] }}
      className="absolute left-3 right-3 rounded-3xl border border-border bg-surface p-5 shadow-lg"
      style={{ bottom }}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <AppText className="text-[11px] uppercase tracking-wider text-muted">{look.eyebrow}</AppText>
          <AppText
            className={`mt-1 text-xl font-semibold ${skipped ? "text-muted line-through" : "text-foreground"}`}
          >
            {twig.title ?? look.title}
          </AppText>
        </View>
        <Image
          source={look.image}
          contentFit="contain"
          style={{ width: 56, height: 56, opacity: skipped ? 0.4 : 0.8 }}
        />
      </View>
      {twig.detail ? (
        <AppText className={cn("mt-2 text-[15px] leading-relaxed", skipped ? "text-muted" : "text-foreground")}>
          {twig.detail}
        </AppText>
      ) : null}
      <AppText className="mt-2 text-[15px] leading-relaxed text-muted">{removeEmDash(twig.why)}</AppText>
      {browsable && !done && !skipped && (
        <Pressable
          onPress={onBrowseMore}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Browse more like this"
          className="mt-3 self-start"
        >
          <AppText className="text-sm text-muted underline">Browse more like this</AppText>
        </Pressable>
      )}

      {done ? (
        <AppText className="mt-4 text-sm font-medium text-ember">Tended</AppText>
      ) : skipped ? (
        <AppText className="mt-4 text-sm text-muted">Not for you</AppText>
      ) : (
        <View className="mt-4 flex-row items-center justify-between">
          <Pressable
            onPress={onSkip}
            disabled={matching}
            hitSlop={8}
            accessibilityRole="button"
            className={matching ? "opacity-40" : undefined}
          >
            <AppText className="text-sm text-muted">Not for me</AppText>
          </Pressable>
          <Button size="sm" onPress={onBegin} isDisabled={matching} accessibilityState={{ busy: matching }}>
            {matching ? <Spinner size="sm" color={accentForeground} /> : null}
            <Button.Label>{matching ? "Finding someone" : look.actionLabel}</Button.Label>
          </Button>
        </View>
      )}
    </EaseView>
  );
}
