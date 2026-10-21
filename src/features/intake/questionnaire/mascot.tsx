/**
 * The mascot and what it is saying.
 *
 * One shape used everywhere in intake: a small mascot on the left, a speech
 * bubble beside it. On a question screen it sits above the questionnaire card
 * and says why the section is being asked; on an info screen the same bubble
 * stacks into a conversation.
 */
import { View } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AppText } from '@/src/components/shared/app-text';

export const MASCOT_TALK = require('@/assets/images/flux/flux-whisper.png');

// One pose per slot in the flow. Same render, same character — only the pose
// changes, so the flow reads as one Flux reacting rather than a set of icons.
export const MASCOT_WAVE = require('@/assets/images/flux/name-accepted-wave.png');
export const MASCOT_WRITING = require('@/assets/images/flux/writer-flux.png');
export const MASCOT_CURIOUS = require('@/assets/images/flux/flux-curiosity.png');
export const MASCOT_BUNDLE = require('@/assets/images/flux/flux-bundle.png');
export const MASCOT_MAP = require('@/assets/images/flux/flux-map.png');
export const MASCOT_SHAKE = require('@/assets/images/flux/flux-shake.png');
export const MASCOT_COMPOUND = require('@/assets/images/flux/flux-compound.png');

interface MascotSaysProps {
  children: string;
  source?: ImageProps['source'];
  /** Hide the mascot itself — for a follow-up line in a conversation. */
  continued?: boolean;
}

export function MascotSays({ children, source = MASCOT_TALK, continued }: MascotSaysProps) {
  return (
    <Animated.View entering={FadeInUp.duration(220)} className="flex-row items-end gap-2">
      {/* 76, not 56: the section poses carry props — a telescope, a bundle, a
          map — and a prop is what disappears first as the render shrinks. */}
      <View className="h-[76px] w-[76px] items-center justify-center">
        {continued ? null : (
          <Image source={source} style={{ width: 76, height: 76 }} contentFit="contain" />
        )}
      </View>

      <View className="flex-1 pb-1">
        {/* Tail — a rotated square tucked under the bubble's leading edge. */}
        <View className="absolute bottom-2 left-[-4px] h-3 w-3 rotate-45 rounded-[2px] border-l border-b border-border bg-surface" />
        <View className="rounded-2xl border border-border bg-surface px-3.5 py-3">
          <AppText className="text-[15px] leading-[21px] text-foreground/80 font-[Poppins-Regular]">
            {children}
          </AppText>
        </View>
      </View>
    </Animated.View>
  );
}
