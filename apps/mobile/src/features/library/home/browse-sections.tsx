/**
 * The home's last two sections (#396, carried over from variant C): "What
 * kind of light" kind rows and the A–Z letter strip. Letters with no
 * subject are dimmed.
 */
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { cn } from '@/src/lib/utils';
import { SectionTitle } from '@/src/features/library/home/entry-cards';
import { KINDS, type Kind } from '@/src/features/library/home/library-copy';

const KIND_FLUX: Record<Kind, number> = {
  explainer: require('@/assets/images/flux/writer-flux.png'),
  advice: require('@/assets/images/flux/flux-campfire.png'),
  story: require('@/assets/images/flux/flux-pair-listening.png'),
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const openSubjects = (letter?: string) =>
  router.push({ pathname: '/browse/library/subjects', params: letter ? { letter } : {} });

export function KindRows() {
  return (
    <>
      <SectionTitle title="What kind of light" />
      <View className="gap-2.5 px-4">
        {KINDS.map((k) => (
          <Pressable
            key={k.kind}
            accessibilityRole="link"
            accessibilityLabel={`${k.label}. ${k.line}`}
            onPress={() => router.push({ pathname: '/browse/library/kind/[kind]', params: { kind: k.kind } })}
            className="flex-row items-center gap-4 rounded-[22px] bg-surface py-2 pl-5 pr-2 active:opacity-80"
          >
            <View className="flex-1">
              <AppText className="text-[17px] font-semibold">{k.label}</AppText>
              <AppText className="text-[14px] text-muted">{k.line}</AppText>
            </View>
            <Image source={KIND_FLUX[k.kind]} style={{ width: 64, height: 64 }} contentFit="contain" />
          </Pressable>
        ))}
      </View>
    </>
  );
}

export function LetterStrip() {
  const subjects = useQuery(api.library.home.getSubjects, {});
  if (!subjects?.length) return null;
  const has = new Set(subjects.map((s) => s.slug[0]?.toUpperCase()));
  return (
    <>
      <SectionTitle title="A–Z" action="All subjects" onAction={() => openSubjects()} />
      <View className="flex-row flex-wrap justify-between gap-y-1.5 px-4">
        {LETTERS.map((l) => (
          <Pressable
            key={l}
            disabled={!has.has(l)}
            accessibilityRole="link"
            accessibilityState={{ disabled: !has.has(l) }}
            accessibilityLabel={`Subjects starting with ${l}`}
            onPress={() => openSubjects(l)}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-secondary"
          >
            <AppText className={cn('text-[16px]', has.has(l) ? 'font-semibold' : 'text-muted/40')}>{l}</AppText>
          </Pressable>
        ))}
      </View>
    </>
  );
}
