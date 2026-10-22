import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableFeedback } from 'heroui-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { playSoftPress } from '@/src/lib/haptics';
import { cn } from '@/src/lib/utils';
import { XolacerAvatar } from '@/src/features/xolacer-chat/components/xolacer-avatar';
import { PresenceDot } from '@/src/features/xolacer-chat/components/presence-dot';
import {
  NewXolacerChip,
  RatingStars,
} from '@/src/features/xolacer-chat/components/rating-stars';
import {
  SpecialtyChips,
  SpecialtyFilter,
} from '@/src/features/xolacer-chat/components/specialty-chips';
import { sortByPresence } from '@/src/features/xolacer-chat/presence-ordering';
import { usePresenceSnapshot } from '@/src/features/xolacer-chat/components/use-presence-snapshot';
import type { ConversationList } from '@/src/features/xolacer-chat/components/chats-list';

const styles = StyleSheet.create({ borderCurve: { borderCurve: 'continuous' } });

/**
 * The roster: every published, active xolacer. A capped xolacer stays
 * visible but dimmed ("Full right now") — vanishing from a six-person list
 * would read as a bug. "Talking" marks xolacers you already have an open
 * thread with.
 */
export function XolacerRoster({
  conversations,
  filter,
  onFilterChange,
  stepId,
}: {
  conversations: ConversationList;
  /** Owned by the Connect screen so a routed specialty can preset it. */
  filter: string | null;
  onFilterChange: (slug: string | null) => void;
  /** Kindling twig that sent us — forwarded to the profile. */
  stepId?: string;
}) {
  const router = useRouter();
  const directory = useQuery(api.xolacerChat.directory);
  const presentSnapshot = usePresenceSnapshot(directory);

  if (directory !== undefined && directory.length === 0) {
    return (
      <View className="min-h-95 items-center justify-center gap-2.5 px-8">
        <View className="h-12 w-12 rounded-2xl bg-surface-secondary items-center justify-center">
          <AppText className="text-lg">🕯️</AppText>
        </View>
        <AppText className="text-[15px] font-semibold text-foreground">
          No one&apos;s here just yet
        </AppText>
        <AppText className="text-[13px] text-muted text-center leading-5 max-w-60">
          Xolacers are still settling in. They&apos;ll show up here as they arrive — check
          back soon.
        </AppText>
      </View>
    );
  }

  const openWith = new Set(
    conversations
      .filter((c) => c.kind === 'pair' && c.role === 'user' && c.status === 'open')
      .map((c) => (c as { xolacerProfileId: string }).xolacerProfileId),
  );

  const xolacers = directory ?? [];
  const offered = [...new Set(xolacers.flatMap((xolacer) => xolacer.specialties))];
  const visible = filter
    ? xolacers.filter((xolacer) =>
        (xolacer.specialties as readonly string[]).includes(filter),
      )
    : xolacers;

  // Specialty first, presence only as the tie-break *within* it: the filter is
  // applied above, so this can never lift someone who doesn't relate to what
  // the seeker is carrying. Ranked on the snapshot, not on the live flag, so
  // rows hold their position — the badge below still reads live.
  const ranked = presentSnapshot
    ? sortByPresence(
        visible.map((xolacer) => ({
          xolacer,
          present: presentSnapshot.has(xolacer.xolacerProfileId),
        })),
      ).map((entry) => entry.xolacer)
    : visible;

  return (
    <View className="gap-2.5">
      {/* An active filter is always offered, even if nobody declares it right
          now — otherwise a routed specialty no xolacer has leaves an empty
          list with no way back to everyone. */}
      <SpecialtyFilter
        available={filter ? [...offered, filter] : offered}
        selected={filter}
        onSelect={onFilterChange}
      />

      {ranked.map((xolacer) => {
        const talking = openWith.has(xolacer.xolacerProfileId);
        return (
          <PressableFeedback
            key={xolacer.xolacerProfileId}
            onPress={() => {
              playSoftPress();
              router.push({
                pathname: '/xolacer/[profileId]',
                params: { profileId: xolacer.xolacerProfileId, ...(stepId ? { stepId } : {}) },
              });
            }}
            accessibilityRole="button"
            // The dot is the only carrier of presence, so it has to be said.
            accessibilityLabel={`View ${xolacer.displayName}'s profile${
              xolacer.present ? ', here now' : ''
            }`}
          >
            <View
              className="flex-row items-start gap-3 rounded-3xl bg-surface border border-border/40 p-3.5"
              style={styles.borderCurve}
            >
              <View>
                <XolacerAvatar
                  name={xolacer.displayName}
                  photoUrl={xolacer.photoUrl}
                  muted={xolacer.atCapacity}
                />
                {/* Live, unlike the ordering: someone arriving lights up where
                    they already are rather than jumping the list. */}
                {xolacer.present && <PresenceDot />}
              </View>
              <View className="flex-1 min-w-0 gap-1">
                <View className="flex-row items-center gap-1.5">
                  <AppText
                    numberOfLines={1}
                    className={cn(
                      'shrink text-sm font-semibold',
                      xolacer.atCapacity ? 'text-muted' : 'text-foreground',
                    )}
                  >
                    {xolacer.displayName}
                  </AppText>
                  {talking && (
                    <View className="shrink-0 rounded-full bg-success/15 px-2 py-0.5">
                      <AppText className="text-[10px] font-semibold uppercase tracking-wide text-success">
                        Talking
                      </AppText>
                    </View>
                  )}
                  {/* Scores share one right-hand column so the eye reads down
                      it instead of hunting; capacity outranks the score. */}
                  <View className="ml-auto shrink-0 pl-2">
                    {xolacer.atCapacity ? (
                      <View className="rounded-full bg-surface-tertiary px-2 py-0.5">
                        <AppText className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          Full right now
                        </AppText>
                      </View>
                    ) : xolacer.rating === undefined ? (
                      <NewXolacerChip />
                    ) : (
                      <RatingStars
                        rating={xolacer.rating}
                        ratingCount={xolacer.ratingCount}
                      />
                    )}
                  </View>
                </View>
                <AppText className="text-xs text-muted leading-4" numberOfLines={2}>
                  {xolacer.bio}
                </AppText>
                <SpecialtyChips
                  specialties={xolacer.specialties}
                  muted={xolacer.atCapacity}
                  className="mt-0.5"
                />
              </View>
            </View>
          </PressableFeedback>
        );
      })}

      {filter !== null && visible.length === 0 && (
        <AppText className="py-8 text-center text-[13px] leading-5 text-muted">
          Nobody&apos;s listed that right now. Try another tag, or browse everyone.
        </AppText>
      )}
    </View>
  );
}
