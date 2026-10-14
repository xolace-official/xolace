import { useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { PressableFeedback } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import { Tour } from "@/src/components/ui/tour";
import { FluxPerch } from "@/src/features/reflect/compose/flux-perch";
import { MorphCard } from "@/src/features/reflect/compose/morph-card";
import { ComposeSurround } from "@/src/features/reflect/compose/compose-surround";
import { useComposeCard } from "@/src/features/reflect/compose/use-compose-card";
import { useComposeLifecycle } from "@/src/features/reflect/compose/use-compose-lifecycle";
import { useMorph } from "@/src/features/reflect/compose/use-morph";
import { useReflectTour } from "@/src/features/reflect/hooks/use-reflect-tour";
import { useTypingPause } from "@/src/features/reflect/hooks/use-typing-pause";
import {
  DAY_NUDGE_DELAY_MS,
  NIGHT_NUDGE_DELAY_MS,
} from "@/src/features/reflect/night-copy";
import type { QuietReturnTier } from "@/src/features/reflect/quiet-return-copy";
import type {
  ReflectionAction,
  ReflectionStateName,
  UserVariant,
} from "@/src/features/reflect/types";
import { useSessionMode } from "@/src/context/session-mode-context";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { playTypingBegin } from "@/src/lib/haptics";
import { useAppStore } from "@/src/store/store";
import type { PlusDictationView } from "@/src/features/reflect/hooks/use-plus-dictation";

type Props = {
  screen: ReflectionStateName;
  variant: UserVariant;
  quietReturn: QuietReturnTier | null;
  selectedTextures: string[];
  entryText: string;
  dispatch: React.Dispatch<ReflectionAction>;
  onTap: () => void;
  onSubmit: () => void;
  onDismiss: () => void;
  onScaffoldSubmit: () => void;
  onVoiceTapIdle: () => void;
  onVoiceTapTyping: () => void;
  isRecording: boolean;
  plusDictation: PlusDictationView | null;
  spaceName?: string;
  /** False for the outgoing copy during a cross-fade to another state. */
  focusOnExpand?: boolean;
};

/**
 * Idle and composing, as one screen (#256).
 *
 * The reducer still distinguishes `idle`, `typing` and `typing-nudge`; what
 * changed is that none of them mounts a different tree. A single progress value
 * — 0 at rest, 1 composing — is the only thing separating the two readings, so
 * tapping the card opens the page already in front of the user instead of
 * replacing the screen with another one.
 */
export const ComposeScreen = ({
  screen,
  variant,
  quietReturn,
  selectedTextures,
  entryText,
  dispatch,
  onTap,
  onSubmit,
  onDismiss,
  onScaffoldSubmit,
  onVoiceTapIdle,
  onVoiceTapTyping,
  isRecording,
  plusDictation,
  spaceName,
  focusOnExpand = true,
}: Props) => {
  const { isNight } = useSessionMode();
  const reduceMotion = useEffectiveReducedMotion();

  const expanded = screen !== "idle";
  const showNudge = screen === "typing-nudge";
  const inputRef = useRef<TextInput>(null);

  const { card, nudgeMessage, eventPrompt, eventLabel } = useComposeCard({
    isNight,
    quietReturn,
    expanded,
    entryText,
  });

  const { resetTimer, clearTimer } = useTypingPause(
    () => dispatch({ type: "PAUSE_TIMEOUT" }),
    isNight ? NIGHT_NUDGE_DELAY_MS : DAY_NUDGE_DELAY_MS,
  );

  const { progress, fade } = useMorph({
    expanded,
    reduceMotion,
    focusOnExpand,
    inputRef,
    // The nudge is a thing that happens while writing; closing the card ends
    // the sentence, so the pending countdown goes with it.
    onCollapse: clearTimer,
  });

  const { isActive: tourActive, finish, skip, trackStep } = useReflectTour();
  const setReflectTourVersion = useAppStore((s) => s.setReflectTourVersion);

  useComposeLifecycle(focusOnExpand, tourActive, skip);

  const handleTap = () => {
    playTypingBegin();
    onTap();
  };

  const handleChangeText = (text: string) => {
    dispatch({ type: "TEXT_CHANGE", text });
    if (showNudge) dispatch({ type: "RESUME_TYPING" });
    if (text.length > 0) resetTimer();
    else clearTimer();
  };

  return (
    <Tour open={tourActive} onFinish={finish} onSkip={skip} onStepChange={trackStep}>
      <View className="flex-1">
        {/* The card and its mascot live over the page, so their geometry is
            independent of everything around them. The surround renders after,
            so an opened menu is not painted over by the card beneath it. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <FluxPerch
            progress={progress}
            fade={fade}
            expanded={expanded}
            reduceMotion={reduceMotion}
          />

          <MorphCard
            progress={progress}
            fade={fade}
            expanded={expanded}
            card={card}
            hasDraft={entryText.trim().length > 0}
            entryText={entryText}
            selectedTextures={selectedTextures}
            showNudge={showNudge}
            nudgeMessage={nudgeMessage}
            isRecording={isRecording}
            plusDictation={plusDictation}
            inputRef={inputRef}
            onOpen={handleTap}
            onChangeText={handleChangeText}
            onSubmit={onSubmit}
            onDismiss={onDismiss}
            onDiscardDraft={() => dispatch({ type: "DISCARD_DRAFT" })}
            onVoiceTap={onVoiceTapTyping}
          />
        </View>

        <ComposeSurround
          progress={progress}
          fade={fade}
          expanded={expanded}
          reduceMotion={reduceMotion}
          variant={variant}
          isNight={isNight}
          eventPrompt={eventPrompt}
          eventLabel={eventLabel}
          spaceName={spaceName}
          selectedTextures={selectedTextures}
          dispatch={dispatch}
          onScaffoldSubmit={onScaffoldSubmit}
          onVoiceTap={onVoiceTapIdle}
          isRecording={isRecording}
        />

        {/* DEV ONLY — tap to restart tour for testing */}
        {__DEV__ && !tourActive && !expanded && (
          <PressableFeedback
            onPress={() => setReflectTourVersion(0)}
            className="absolute bottom-5 right-4 p-3"
            hitSlop={8}
          >
            <AppText className="text-xs text-foreground/25">↺ tour</AppText>
          </PressableFeedback>
        )}
      </View>
    </Tour>
  );
};
