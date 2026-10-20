import type { TextInstance } from 'react-native';
import { useEffect, useRef } from "react";
import { AccessibilityInfo, ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Chip, PressableFeedback, ScrollShadow, useThemeColor } from "heroui-native";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { AppText } from "@/src/components/shared/app-text";
import type { EntryType } from "@/src/features/reflect/types";
import type { Id } from "@/convex/_generated/dataModel";
import type { ClaimStrength } from "@/convex/ai/routing";
import { playMirrorArrival } from "@/src/lib/haptics";
import { useMirrorAudio } from "@/src/features/reflect/hooks/use-mirror-audio";
import { ToneTipBanner } from "@/src/features/reflect/components/tone-tip-banner";
import type { MirrorTone } from "@/src/features/settings/components/mirror-tone-picker-dialog";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { MirrorActionRow } from "./mirror-action-row";
import { MirrorToneBadge } from "./mirror-tone-badge";

type Props = {
  mirror: string;
  selectedTextures: string[];
  entryType: EntryType;
  sessionId: Id<"sessions"> | null;
  toneUsed: MirrorTone | null;
  /** Derived server-side; "reaching"/"holding" means this mirror named a gap. */
  claimStrength: ClaimStrength | null;
  /** Refinement turns are exhausted — the row collapses to "That's it". */
  atCap: boolean;
  onThatsIt: () => void;
  onNotQuite: () => void;
  onSayMore: () => void;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_FADE = { opacity: 0 };
const EASE_ANIMATE_FADE = { opacity: 1 };
const EASE_TEXTURE_TRANSITION = {
  type: "timing" as const,
  duration: 400,
  easing: EASING,
};
const EASE_LABEL_TRANSITION = {
  type: "timing" as const,
  duration: 600,
  easing: EASING,
};
const AUDIO_ANIMATION = {
  scale: { ignoreScaleCoefficient: true, value: 0.85 },
};
const SPEAKER_PLAYING = {
  ios: "speaker.wave.2.fill",
  android: "volume_up",
  web: "volume_up",
} as const;
const SPEAKER_MUTED = {
  ios: "speaker.fill",
  android: "volume_off",
  web: "volume_off",
} as const;
const A11Y_SELECTED = { selected: true };
const A11Y_UNSELECTED = { selected: false };

export const MirrorState = ({
  mirror,
  selectedTextures,
  entryType,
  sessionId,
  toneUsed,
  claimStrength,
  atCap,
  onThatsIt,
  onNotQuite,
  onSayMore,
}: Props) => {
  const { isReady, isPlaying, toggle } = useMirrorAudio(sessionId);
  const accent = useThemeColor("accent");
  const mirrorRef = useRef<TextInstance>(null);

  // No audio cleanup here: useAudioPlayer releases the native player on unmount,
  // which stops playback. Pausing it ourselves races that release and crashes
  // (see ba00535 "fix timeline crash").
  useEffect(() => {
    playMirrorArrival();
    // Move the screen reader onto the mirror so it reads it aloud. Delayed so the
    // processing → mirror swap settles first, or iOS drops the focus move.
    const t = setTimeout(() => {
      if (mirrorRef.current) AccessibilityInfo.sendAccessibilityEvent(mirrorRef.current, "focus");
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const showTextures =
    selectedTextures.length > 0 &&
    (entryType === "scaffold" || entryType === "hybrid");

  const speakerName = isPlaying ? SPEAKER_PLAYING : SPEAKER_MUTED;

  return (
    <View className="flex-1 justify-center px-6">
      {/* Banner floats above content — absolute so it doesn't shift the mirror */}
      <View style={styles.bannerContainer}>
        <ToneTipBanner />
      </View>

      {/* Texture pills from scaffold */}
      {showTextures && (
        <EaseView
          initialAnimate={EASE_INITIAL_FADE}
          animate={EASE_ANIMATE_FADE}
          transition={EASE_TEXTURE_TRANSITION}
          className="mb-5 flex-row flex-wrap gap-1.5"
        >
          {selectedTextures.map((word) => (
            <Chip
              key={word}
              size="sm"
              variant="primary"
              color="accent"
              animation="disable-all"
            >
              <Chip.Label>{word}</Chip.Label>
            </Chip>
          ))}
        </EaseView>
      )}

      <EaseView
        initialAnimate={EASE_INITIAL_FADE}
        animate={EASE_ANIMATE_FADE}
        transition={EASE_LABEL_TRANSITION}
        className="mb-3 flex-row items-center gap-3"
      >
        <AppText className="text-xs uppercase tracking-widest text-accent">
          The Mirror
        </AppText>
        {isReady && (
          <PressableFeedback
            onPress={() => {
              toggle();
            }}
            animation={AUDIO_ANIMATION}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              isPlaying ? "Pause mirror audio" : "Play mirror audio"
            }
            accessibilityHint="Toggles playback of the mirror response"
            accessibilityState={isPlaying ? A11Y_SELECTED : A11Y_UNSELECTED}
          >
            <SymbolView name={speakerName} size={16} tintColor={accent} />
          </PressableFeedback>
        )}
      </EaseView>

      <MirrorToneBadge toneUsed={toneUsed} />

      {/* The fade says "more below": a long mirror cut at a line break looks
          finished. Height cap lives on the wrapper — a % maxHeight on the
          ScrollView would resolve against the wrapper's undefined height. */}
      <ScrollShadow
        LinearGradientComponent={LinearGradient}
        size={32}
        style={styles.mirrorScroll}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="border-l-2 border-accent/40 pl-4"
        >
          <AppText
            ref={mirrorRef}
            className="text-xl italic leading-8 text-foreground"
            selectable
          >
            {removeEmDash(mirror)}
          </AppText>
        </ScrollView>
      </ScrollShadow>

      <MirrorActionRow
        claimStrength={claimStrength}
        atCap={atCap}
        onThatsIt={onThatsIt}
        onNotQuite={onNotQuite}
        onSayMore={onSayMore}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    top: 8,
    left: 24,
    right: 24,
    zIndex: 1,
  },
  mirrorScroll: { flexGrow: 0, maxHeight: "60%" },
});
