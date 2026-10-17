import { useEffect, useRef } from 'react';
import { ScrollView, View, type TextInput } from 'react-native';
import { Presets } from 'react-native-pulsar';
import { EaseView } from 'react-native-ease/uniwind';
import { TextArea, LinkButton, ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { AppText } from '@/src/components/shared/app-text';
import { PillButton } from '@/src/components/shared/pill-button';
import type { FeedbackType, MissReason, ReflectionAction } from '@/src/features/reflect/types';
import { closingQuestion, MISS_REASON_PLACEHOLDER } from '@/src/features/reflect/clarify-copy';

type Props = {
  previousMirror: string;
  clarifyText: string;
  dispatch: React.Dispatch<ReflectionAction>;
  onSubmit: () => void;
  autoFocus?: boolean;
  /**
   * Which button opened this screen. "not_quite" is a correction; "say_more"
   * is an answer — and since the reach closes on a question, a mirror that
   * just asked something must not be followed by a screen accusing it of
   * missing. Defaults to the correction copy, which is the older behaviour.
   */
  feedbackType?: FeedbackType | null;
  /** The chip picked in the "What didn't land?" sheet, if any. */
  missReason?: MissReason | null;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_FADE = { opacity: 0 };
const EASE_ANIMATE_FADE = { opacity: 1 };
const EASE_INITIAL_SLIDE = { opacity: 0, translateY: 20 };
const EASE_ANIMATE_SLIDE = { opacity: 1, translateY: 0 };
const EASE_BACK_TRANSITION = { type: 'timing' as const, duration: 300, easing: EASING };
const EASE_MIRROR_TRANSITION = { type: 'timing' as const, duration: 600, easing: EASING };
const EASE_PROMPT_TRANSITION = { type: 'timing' as const, duration: 400, delay: 200, easing: EASING };

export const ClarifyState = ({
  previousMirror,
  clarifyText,
  dispatch,
  onSubmit,
  autoFocus = true,
  feedbackType,
  missReason,
}: Props) => {
  useEffect(() => {
    Presets.wobble();
  }, []);

  const inputRef = useRef<TextInput>(null);
  // React Native honors `autoFocus` only at mount. When the feedback sheet is
  // open the input mounts unfocused on purpose (the keyboard would rise behind
  // the sheet), so once the sheet closes and `autoFocus` flips true we have to
  // raise the keyboard ourselves — otherwise the user lands on a clarify screen
  // whose input never takes focus.
  const autoFocusedAtMount = useRef(autoFocus);
  useEffect(() => {
    if (autoFocus && !autoFocusedAtMount.current) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const canSubmit = clarifyText.trim().length > 0;
  const isSayMore = feedbackType === 'say_more';
  // Answering the mirror's own question is easier than "saying more".
  const question = isSayMore ? closingQuestion(previousMirror) : null;
  const heading = isSayMore ? question ?? 'Say more' : "What didn't land right?";
  const placeholder = isSayMore
    ? question ? 'Answer in your own words...' : "Add what's missing..."
    : missReason ? MISS_REASON_PLACEHOLDER[missReason] : 'Help me understand better...';

  return (
    <View className="flex-1">
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={50}
        className="flex-1 px-6 pt-8"
      >
        <EaseView
          initialAnimate={EASE_INITIAL_FADE}
          animate={EASE_ANIMATE_FADE}
          transition={EASE_BACK_TRANSITION}
          className="mb-2"
        >
          <LinkButton
            onPress={() => { dispatch({ type: 'BACK_TO_MIRROR' }); }}
            size="sm"
            className="self-start"
          >
            <LinkButton.Label className="text-foreground/40">← Back to mirror</LinkButton.Label>
          </LinkButton>
        </EaseView>
        <EaseView
          initialAnimate={EASE_INITIAL_FADE}
          animate={EASE_ANIMATE_FADE}
          transition={EASE_MIRROR_TRANSITION}
        >
          {/* TODO: untested on device — check the fade with a long previous mirror. */}
          <ScrollShadow LinearGradientComponent={LinearGradient} size={28} className="mb-6 max-h-[160]">
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <AppText className="text-center text-base italic leading-7 text-foreground/30">
                {previousMirror}
              </AppText>
            </ScrollView>
          </ScrollShadow>
        </EaseView>

        <EaseView
          initialAnimate={EASE_INITIAL_SLIDE}
          animate={EASE_ANIMATE_SLIDE}
          transition={EASE_PROMPT_TRANSITION}
        >
          <AppText className="mb-4 text-center text-lg text-foreground">
            {heading}
          </AppText>
        </EaseView>

        <View className="flex-1 overflow-hidden">
          <TextArea
            ref={inputRef}
            autoFocus={autoFocus}
            placeholder={placeholder}
            value={clarifyText}
            onChangeText={(text: string) =>
              dispatch({ type: 'CLARIFY_TEXT_CHANGE', text })
            }
            variant="secondary"
            className="min-h-[120] flex-1 border-0 bg-transparent text-base text-foreground ios:focus:outline-transparent android:focus:border-transparent"
          />
        </View>

        <View className="items-center pb-4 pt-2">
          <PillButton
            label="Let it out"
            onPress={() => { Presets.propel(); onSubmit(); }}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
