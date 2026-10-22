import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { TagGroup } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { TextureSetTabs } from "@/src/features/reflect/components/texture-set-tabs";
import { Tour } from "@/src/components/ui/tour";
import { TOUR_STEPS } from "@/src/features/reflect/tour-copy";
import { NIGHT_TEXTURE_WORDS } from "@/src/features/reflect/night-copy";
import {
  MAX_TEXTURES,
  TEXTURE_PILL,
  TEXTURE_SETS,
  resolveTextureSetId,
  textureHue,
  type TextureSetId,
} from "@/src/features/reflect/texture-sets";
import { cn } from "@/src/lib/utils";
import type { ReflectionAction } from "@/src/features/reflect/types";
import { playSoftPress, playTextureSelect } from "@/src/lib/haptics";
import { posthog } from "@/src/config/posthog";
import { useAppStore } from "@/src/store/store";

/**
 * Words tipped onto a table, not filed into a form.
 *
 * Each pill gets its own tilt, drop and nudge, cycling by position — enough
 * that no two sit on a shared line or a shared left edge, small enough that
 * nothing looks broken or moves out of thumb's reach. Classes rather than a
 * style prop: `TagGroup.Item` forwards className and drops style.
 *
 * The drops are half what they were: a wrapped row is as tall as its deepest
 * `mt`, so on a three-row set they were buying scatter with height the band
 * doesn't have — and the height came out of the send button, which the
 * surround then had to park on the card. The tilt carries the effect; the
 * vertical nudge only has to break the shared baseline.
 */
const SCATTER = [
  "-rotate-2",
  "rotate-1 mt-1 ml-1",
  "rotate-3 mt-0.5",
  "-rotate-1 mt-1.5 ml-2",
  "rotate-2 mt-0.5",
  "-rotate-3 mt-1 ml-1",
  "rotate-1",
  "-rotate-2 mt-1 ml-2",
];

const PILL = "border";

/**
 * How far the words are allowed to grow.
 *
 * Everything else on this screen — the prompt, the mirror — scales without a
 * ceiling. These don't: a pill is a fixed-ish shape holding one or two words,
 * and past ~1.3x they wrap, the band grows tall enough to reach the mic, and
 * the card underneath overflows. Capping the label keeps the whole band's
 * height bounded, which is what the scaled gap below assumes.
 */
const MAX_PILL_FONT_SCALE = 1.3;

const WORDS_FADE_OUT = { type: "timing" as const, duration: 150 };
const WORDS_FADE_IN = { type: "timing" as const, duration: 200 };

type Props = {
  isNight: boolean;
  selectedTextures: string[];
  dispatch: React.Dispatch<ReflectionAction>;
};

/**
 * The easier way in: tap the words that fit instead of writing.
 *
 * Lifted out of the old idle screen unchanged (#256) — the compose screen
 * translates and fades it as the card expands, and its redesign is a separate
 * pass.
 */
export const TextureBand = ({
  isNight,
  selectedTextures,
  dispatch,
}: Props) => {
  const storedSetId = useAppStore((s) => s.textureSetId);
  const setTextureSetId = useAppStore((s) => s.setTextureSetId);
  const safeSetId = resolveTextureSetId(storedSetId);

  const [wordsVisible, setWordsVisible] = useState(true);
  const [pendingSetId, setPendingSetId] = useState<TextureSetId>(safeSetId);
  const [resolvedSetId, setResolvedSetId] = useState<TextureSetId>(safeSetId);

  const TEXTURE_WORDS: readonly string[] = isNight
    ? NIGHT_TEXTURE_WORDS
    : (TEXTURE_SETS[resolvedSetId] ?? TEXTURE_SETS.flat);

  const selectedTextureKeys = new Set(selectedTextures);
  const wordsFadeAnimate = { opacity: wordsVisible ? 1 : 0 };

  const atCap = selectedTextures.length >= MAX_TEXTURES;

  const handleToggle = (word: string) => {
    playTextureSelect();
    dispatch({ type: "TOGGLE_TEXTURE", word });
  };

  const handleSelectionChange = (keys: Set<string | number>) => {
    const next = new Set(keys);
    for (const word of TEXTURE_WORDS) {
      const isSelected = selectedTextures.includes(word);
      const shouldBeSelected = next.has(word);
      if (isSelected === shouldBeSelected) continue;
      // At the cap the reducer refuses the add, so don't answer the tap with a
      // haptic that promises one.
      if (!isSelected && atCap) continue;
      handleToggle(word);
    }
  };

  const handleSetChange = (id: TextureSetId) => {
    if (id === resolvedSetId) return;
    dispatch({ type: "CLEAR_TEXTURES" });
    setTextureSetId(id);
    setPendingSetId(id);
    setWordsVisible(false);
    playSoftPress();
    posthog.capture("texture_set_changed", { from: resolvedSetId, to: id });
  };

  return (
    // The old `pt-6`/`pb-8` were dead space standing in for a gap the band
    // could not actually guarantee — the surround now measures this frame and
    // holds the mic off it, so the padding can go back to being padding.
    <View className="px-6 pt-4 pb-6">
      <AppText
        maxFontSizeMultiplier={MAX_PILL_FONT_SCALE}
        className="mb-3 text-xs text-foreground/30"
      >
        Or just tap what feels close:
      </AppText>

      {!isNight && (
        <TextureSetTabs
          activeSet={resolvedSetId}
          onSelect={handleSetChange}
          disabled={!wordsVisible}
        />
      )}

      <Tour.Step
        order={2}
        title={TOUR_STEPS[2].title}
        description={TOUR_STEPS[2].description}
      >
        <EaseView
          animate={wordsFadeAnimate}
          transition={wordsVisible ? WORDS_FADE_IN : WORDS_FADE_OUT}
          onTransitionEnd={({ finished }) => {
            if (finished && !wordsVisible) {
              setResolvedSetId(pendingSetId);
              setWordsVisible(true);
            }
          }}
        >
          <TagGroup
            key={resolvedSetId}
            selectionMode="multiple"
            size="sm"
            variant="surface"
            selectedKeys={selectedTextureKeys}
            onSelectionChange={handleSelectionChange}
            animation="disable-all"
          >
            <TagGroup.List className="flex-row flex-wrap items-start gap-x-2 gap-y-1.5 pr-14">
              {TEXTURE_WORDS.map((word, i) => {
                const skin = TEXTURE_PILL[textureHue(word)];
                const isSelected = selectedTextureKeys.has(word);
                return (
                  <TagGroup.Item
                    key={word}
                    id={word}
                    className={cn(
                      PILL,
                      SCATTER[i % SCATTER.length],
                      isSelected ? skin.selected : skin.rest,
                      // Full up: the words still on offer step back rather than
                      // silently swallowing taps.
                      atCap && !isSelected && "opacity-35",
                    )}
                  >
                    <TagGroup.ItemLabel
                      maxFontSizeMultiplier={MAX_PILL_FONT_SCALE}
                      className={cn(
                        "text-xs",
                        skin.label,
                        !isSelected && "opacity-75",
                      )}
                    >
                      {word}
                    </TagGroup.ItemLabel>
                  </TagGroup.Item>
                );
              })}
            </TagGroup.List>
          </TagGroup>
        </EaseView>
      </Tour.Step>
    </View>
  );
};
