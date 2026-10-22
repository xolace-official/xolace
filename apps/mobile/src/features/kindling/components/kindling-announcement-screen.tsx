import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, PressableFeedback, useThemeColor } from "heroui-native";

import { AppText } from "@/src/components/shared/app-text";
import { ANNOUNCEMENT_KINDS, type AnnouncementKind } from "@/src/features/kindling/announcement-poses";
import { PoseBubble } from "@/src/features/kindling/components/pose-bubble";

const COPY = {
  eyebrow: "Your kindling",
  title: "We're gathering a few things for you",
  plus: "Small support steps for after this, something to breathe with, hear, read, or share. It'll be waiting when you're done.",
  free: "Xolace+ gathers a kindling after sessions like this one, small support steps, picked for what you brought.",
  continue: "Continue",
  paywall: "Get my kindling with Xolace+",
};

// [centreX, centreY, radius] as fractions of the cluster width: one large
// circle in the middle, the rest packed close around it at mixed sizes.
const CLUSTER: Record<AnnouncementKind, readonly [number, number, number]> = {
  audio: [0.44, 0.15, 0.13],
  music: [0.72, 0.29, 0.114],
  breathing: [0.44, 0.467, 0.146],
  read: [0.2, 0.464, 0.066],
  xolacer: [0.72, 0.57, 0.103],
  bridge: [0.5, 0.744, 0.09],
};
const CLUSTER_HEIGHT = 0.84;

type Props = {
  variant: "plus" | "free";
  onSkip: () => void;
  onContinue: () => void;
  onPaywall: () => void;
};


export function KindlingAnnouncementScreen({ variant, onSkip, onContinue, onPaywall }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height } = useWindowDimensions();
  // Cap the cluster at half the usable height so the copy + CTA fit on short screens.
  const width = Math.min(windowWidth, ((height - insets.top - insets.bottom - 64) * 0.5) / CLUSTER_HEIGHT);
  const accent = useThemeColor("accent") as string;
  const plus = variant === "plus";
  const cta = plus ? COPY.continue : COPY.paywall;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 16 }}>
      <PressableFeedback
        onPress={onSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip"
        className="absolute right-4 z-10 rounded-full bg-foreground/10 px-4 py-2"
        style={{ top: insets.top + 8 }}
      >
        <AppText className="text-sm text-foreground">Skip</AppText>
      </PressableFeedback>

      <ScrollView contentContainerClassName="grow" showsVerticalScrollIndicator={false}>
        <View className="self-center" style={{ width, height: width * CLUSTER_HEIGHT }}>
          <Svg width={width} height={width * CLUSTER_HEIGHT} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="kindling-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={accent} stopOpacity={0.28} />
                <Stop offset="1" stopColor={accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={width * 0.47} cy={width * 0.45} r={width * 0.48} fill="url(#kindling-glow)" />
          </Svg>
          {ANNOUNCEMENT_KINDS.map((kind) => {
            const [cx, cy, r] = CLUSTER[kind];
            return (
              <View key={kind} className="absolute" style={{ left: (cx - r) * width, top: (cy - r) * width }}>
                <PoseBubble kind={kind} size={2 * r * width} />
              </View>
            );
          })}
        </View>

        <View className="mt-auto items-center gap-3 px-6">
          <AppText className="text-xs uppercase tracking-widest text-accent">{COPY.eyebrow}</AppText>
          <AppText className="text-center font-serif text-3xl leading-9 text-foreground">{COPY.title}</AppText>
          <AppText className="text-center text-base text-muted">{plus ? COPY.plus : COPY.free}</AppText>
          <Button
            onPress={plus ? onContinue : onPaywall}
            accessibilityRole="button"
            accessibilityLabel={cta}
            size="lg"
            className="mt-3 w-full"
          >
            <Button.Label>{cta}</Button.Label>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
