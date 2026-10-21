import type { TextInputInstance } from 'react-native';
import type { RefObject } from "react";
import { Pressable } from "react-native";
import Animated, {
  FadeInDown,
  FadeOut,
  type SharedValue,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";
import { SelectionEcho } from "@/src/features/reflect/compose/selection-echo";
import { MorphCardBody } from "@/src/features/reflect/compose/morph-card-body";
import { MorphCardHeader } from "@/src/features/reflect/compose/morph-card-header";
import { useMorphCardStyles } from "@/src/features/reflect/compose/morph-card-styles";
import { CARD_PAD } from "@/src/features/reflect/compose/morph-geometry";
import type { CardContent } from "@/src/features/reflect/compose/resolve-card-content";
import { a11yHidden } from "@/src/lib/utils";
import type { PlusDictationView } from "@/src/features/reflect/hooks/use-plus-dictation";

type Props = {
  progress: SharedValue<number>;
  /** The reduced-motion cross-fade's opacity. 1 whenever motion is allowed. */
  fade: SharedValue<number>;
  expanded: boolean;
  card: CardContent;
  /** Whether there is retained writing to discard, at either size. */
  hasDraft: boolean;
  entryText: string;
  selectedTextures: string[];
  showNudge: boolean;
  nudgeMessage: string;
  isRecording: boolean;
  plusDictation: PlusDictationView | null;
  inputRef: RefObject<TextInputInstance | null>;
  onOpen: () => void;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  onDiscardDraft: () => void;
  onVoiceTap: () => void;
};

/**
 * The card, at both of its sizes (#256).
 *
 * One object: at rest it is a tilted page holding the prompt, and tapping it
 * runs a single spring that rotates it upright and grows it from the header
 * down to the top of the keyboard, where it is the composer. Nothing mounts or
 * unmounts across that — `progress` is the only difference between the two
 * readings, which is what keeps it feeling like the page opened rather than
 * like a screen was replaced.
 */
export const MorphCard = ({
  progress,
  fade,
  expanded,
  card,
  hasDraft,
  entryText,
  selectedTextures,
  showNudge,
  nudgeMessage,
  isRecording,
  plusDictation,
  inputRef,
  onOpen,
  onChangeText,
  onSubmit,
  onDismiss,
  onDiscardDraft,
  onVoiceTap,
}: Props) => {
  const {
    cardStyle,
    promptStyle,
    controlsStyle,
    restControlsStyle,
    bodyStyle,
    echoStyle,
  } = useMorphCardStyles(progress, fade, card.scale);

  // Flux aims at the presence dot through CARD_PAD, so the padding is
  // geometry rather than a class the card can quietly restyle.
  const cardPadding = { padding: CARD_PAD };
  // The card is one object at two sizes, so both readings are always mounted.
  // Whichever one `progress` has faded out has to leave the a11y tree with it.
  const restA11y = a11yHidden(expanded);

  return (
    <Animated.View
      style={[
        { position: "absolute", overflow: "hidden" },
        cardPadding,
        cardStyle,
      ]}
      className="border border-foreground/8 bg-surface shadow-lg"
    >
      <MorphCardHeader
        card={card}
        expanded={expanded}
        isRecording={isRecording}
        controlsStyle={controlsStyle}
        promptStyle={promptStyle}
        onDismiss={onDismiss}
        onVoiceTap={onVoiceTap}
      />

      {showNudge && (
        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          exiting={FadeOut.duration(200)}
          className="pt-2"
        >
          <AppText className="text-sm text-foreground/40">{nudgeMessage}</AppText>
        </Animated.View>
      )}

      <MorphCardBody
        expanded={expanded}
        entryText={entryText}
        isRecording={isRecording}
        plusDictation={plusDictation}
        inputRef={inputRef}
        style={bodyStyle}
        onChangeText={onChangeText}
        onSubmit={onSubmit}
      />

      {/* After the readings it covers, not before them: a sibling painted on
          top of this — the prompt line especially — swallows the touch, and
          RN's responder search walks ancestors rather than siblings, so the
          tap died on the text instead of opening the card. Nothing it covers
          is interactive at rest; the discard button below is mounted after it
          and so still sits on top. */}
      {!expanded && (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="Tap to begin writing"
          accessibilityHint="Opens the composer to start typing"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      <Animated.View
        style={[
          {
            position: "absolute",
            left: CARD_PAD,
            right: CARD_PAD,
            bottom: CARD_PAD,
          },
          echoStyle,
        ]}
        pointerEvents="none"
        {...restA11y}
      >
        <SelectionEcho words={selectedTextures} />
      </Animated.View>

      {/* Discard sits in the corner the composer's ✕ will occupy — same place,
          opposite half of the morph, so the card never offers both. Absolute,
          and mounted on the draft rather than on `expanded`: appearing in the
          header row would reflow the prompt the moment a first word is typed,
          and unmounting on tap would pop it out mid-morph. */}
      {hasDraft && (
        <Animated.View
          style={[
            { position: "absolute", top: CARD_PAD, right: CARD_PAD },
            restControlsStyle,
          ]}
          pointerEvents={expanded ? "none" : "auto"}
          {...restA11y}
        >
          <Pressable
            onPress={() => {
              playSoftPress();
              onDiscardDraft();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Discard draft"
            accessibilityHint="Clears what you've written so far"
            className="rounded-full bg-foreground/8 px-2.5 py-1"
          >
            <AppText className="text-xs text-foreground/40">Discard</AppText>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
};
