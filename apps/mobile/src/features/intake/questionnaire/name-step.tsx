/**
 * Q1 — the name, on its own step.
 *
 * Nothing but the question, bottom-weighted, one field and one pinned button.
 * No card, no progress, no mascot — the first thing asked shouldn't arrive
 * inside chrome.
 *
 * One-tap accept is the point: the handle is already in the field, so Continue
 * keeps it. Tapping the field edits it; the dice draws another. An existing
 * user's `preferences.displayName` arrives as `initialName` and is what sits
 * there instead of a fresh suggestion.
 */
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Button, useThemeColor } from 'heroui-native';

import { AppText } from '@/src/components/shared/app-text';
import { IntakeScreen } from '@/src/features/intake/questionnaire/intake-screen';
import { suggestHandle } from '@/src/features/intake/answer-rules';
import { playSoftPress } from '@/src/lib/haptics';

interface NameStepProps {
  initialName: string;
  /** `edited` is false when the suggested handle was kept as-is. */
  onDone: (name: string, edited: boolean) => void;
}

export function NameStep({ initialName, onDone }: NameStepProps) {
  const placeholderColor = useThemeColor('muted') as string;
  const [name, setName] = useState(initialName);

  const advance = () => {
    if (name.trim().length === 0) return;
    playSoftPress();
    onDone(name.trim(), name.trim() !== initialName);
  };

  return (
    <IntakeScreen>
      <View className="flex-1 gap-3 px-6 pt-10">
        <AppText className="text-center text-[32px] leading-[38px] text-foreground font-[Poppins-SemiBold]">
          What should we call you?
        </AppText>
        <AppText className="px-4 text-center text-[17px] leading-6 text-foreground/55 font-[Poppins-Regular]">
          We picked one for you. Keep it, or make it yours — either way it&apos;s the only name anyone
          here will ever see.
        </AppText>

        <View className="mt-6 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4">
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            maxLength={30}
            returnKeyType="go"
            enablesReturnKeyAutomatically
            onSubmitEditing={advance}
            placeholder="Your name here"
            placeholderTextColor={placeholderColor}
            className="flex-1 py-4 text-center text-[18px] text-foreground font-[Poppins-Medium]"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Suggest another name"
            hitSlop={12}
            onPress={() => {
              playSoftPress();
              setName(suggestHandle());
            }}
            className="p-1"
          >
            <AppText className="text-xl">🎲</AppText>
          </Pressable>
        </View>
      </View>

      {/* Copy and field stay put at the top; only the CTA rides the keyboard. */}
      <KeyboardStickyView>
        <View className="px-6 pb-4">
          <Button isDisabled={name.trim().length === 0} onPress={advance}>
            <Button.Label>Continue</Button.Label>
          </Button>
        </View>
      </KeyboardStickyView>
    </IntakeScreen>
  );
}
