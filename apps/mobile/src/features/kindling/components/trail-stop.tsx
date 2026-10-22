import { View } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { EaseView } from "react-native-ease/uniwind";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { cn } from "@/src/lib/utils";
import { CLEAN_POSES, POSE } from "../announcement-poses";
import { TWIG_PRESENTATION, type Twig } from "../twig-presentation";

export const STOP_NODE = 84;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/**
 * One stop on the trail: Flux's pose for the twig, and a signpost label.
 * Tended → ember halo, ring, check badge and a "Tended" eyebrow. Skipped →
 * dimmed, struck through; the image dims over an opaque backing so the
 * marching dashes don't show through it.
 */
export function TrailStop({
  twig,
  index,
  right,
  top,
  width,
  inset,
  selected,
  onPress,
}: {
  twig: Twig;
  index: number;
  right: boolean;
  top: number;
  width: number;
  inset: number;
  selected: boolean;
  onPress: () => void;
}) {
  const background = useThemeColor("background") as string;
  const ember = useCSSVariable("--color-ember") as string;
  const look = TWIG_PRESENTATION[twig.kind];
  const title = twig.title ?? look.title;
  const done = twig.state === "done";
  const skipped = twig.state === "skipped";
  const row = right ? "flex-row-reverse" : "flex-row";
  const reduced = useEffectiveReducedMotion();

  // Entrance and selection are separate layers: the stagger delay belongs to
  // the entrance only, or a tap on a later stop would wait it out again.
  return (
    <EaseView
      initialAnimate={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "timing",
        duration: reduced ? 200 : 360,
        easing: EASE_OUT,
        delay: reduced ? 0 : 120 + index * 80,
      }}
      className="absolute"
      style={{ top, [right ? "right" : "left"]: inset, width }}
    >
      <EaseView
        animate={{ scale: selected && !reduced ? 1.06 : 1 }}
        transition={{ type: "timing", duration: 180, easing: EASE_OUT }}
        className={cn("items-center gap-3", row)}
      >
        <PressableFeedback
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ selected }}
          accessibilityHint={done ? "Tended" : skipped ? "Not for you" : look.eyebrow}
          className={cn("items-center gap-2", row)}
        >
          <View
            className={cn(
              "rounded-full p-2.5",
              done ? "bg-ember/40" : selected ? "bg-ember/15" : "bg-transparent",
            )}
          >
            <View
              className={cn(
                "overflow-hidden rounded-full border-4 bg-background",
                done ? "border-ember" : selected ? "border-foreground/30" : "border-background",
              )}
              style={{ width: STOP_NODE, height: STOP_NODE }}
            >
              <View className={cn("flex-1 bg-surface", skipped && "opacity-40")}>
                <Image
                  source={POSE[twig.kind]}
                  contentFit={CLEAN_POSES.has(twig.kind) ? "contain" : "cover"}
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
            </View>
            {done && (
              <View
                className="absolute h-8 w-8 items-center justify-center rounded-full border-[3px] border-background bg-ember"
                style={{ bottom: 4, [right ? "left" : "right"]: 4 }}
              >
                <SymbolView
                  name={{ ios: "checkmark", android: "check", web: "check" }}
                  size={14}
                  weight="bold"
                  tintColor={background}
                />
              </View>
            )}
          </View>

          <View
            className={cn(
              "max-w-[190px] rounded-2xl bg-surface px-3.5 py-2.5 shadow-sm",
              done && "border border-ember",
              skipped && "opacity-40",
            )}
          >
            <View className="flex-row items-center gap-1">
              {done && (
                <SymbolView
                  name={{ ios: "flame.fill", android: "local_fire_department", web: "local_fire_department" }}
                  size={11}
                  tintColor={ember}
                />
              )}
              <AppText
                className={cn(
                  "text-[10px] uppercase tracking-wider",
                  done ? "font-semibold text-ember" : "text-muted",
                )}
              >
                {done ? "Tended" : skipped ? "Passed by" : look.eyebrow}
              </AppText>
            </View>
            <AppText
              numberOfLines={2}
              className={cn("text-[15px] font-medium text-foreground", skipped && "line-through")}
            >
              {title}
            </AppText>
          </View>
        </PressableFeedback>
      </EaseView>
    </EaseView>
  );
}
