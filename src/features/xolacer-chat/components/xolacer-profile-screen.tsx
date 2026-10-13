import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Button, PressableFeedback, Skeleton, useThemeColor } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditIcon from '@expo/material-symbols/edit.xml';
import { useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { isSpecialty, specialtyListensTo } from '@/convex/lib/specialties';
import { AppText } from '@/src/components/shared/app-text';
import { TopBlur } from '@/src/components/shared/top-blur';
import { playSoftPress } from '@/src/lib/haptics';
import {
  declineCooldownActive,
  declineCooldownNote,
  hasSpoken,
  rateCtaState,
} from '@/src/features/xolacer-chat/utils';
import { formatMonthYear } from '@/src/features/xolacer-chat/format-time';
import { useAskFlow } from '@/src/features/xolacer-chat/use-ask-flow';
import { Fact } from '@/src/features/xolacer-chat/components/fact-row';
import { XolacerMenu } from '@/src/features/xolacer-chat/components/xolacer-menu';
import { XolacerAvatar } from '@/src/features/xolacer-chat/components/xolacer-avatar';
import { ExpandableAvatar } from '@/src/features/xolacer-chat/components/expandable-avatar';
import { PresenceDot } from '@/src/features/xolacer-chat/components/presence-dot';
import { NewXolacerChip, RatingStars } from '@/src/features/xolacer-chat/components/rating-stars';
import { SpecialtyChips } from '@/src/features/xolacer-chat/components/specialty-chips';
import { XolacerPrimerSheet } from '@/src/features/xolacer-chat/components/xolacer-primer-sheet';

type Profile = NonNullable<FunctionReturnType<typeof api.xolacerChat.xolacerProfile>>;

const styles = StyleSheet.create({
  borderCurve: { borderCurve: 'continuous' },
  rateMascot: { width: 56, height: 56 },
});

const FLUX_PAIR = require('@/assets/images/flux/flux-pair-listening.png');

/** Native back chevron — liquid glass on iOS 26, Material back arrow on Android. */
const HEADER_OPTIONS = {
  headerShown: true,
  headerTransparent: true,
  headerTitle: '',
  headerShadowVisible: false,
  headerBackVisible: true,
  headerBackButtonDisplayMode: 'minimal',
} as const;

const PERSON_ICON = { ios: 'person', android: 'person', web: 'person' } as const;
const LOCK_ICON = { ios: 'lock', android: 'lock', web: 'lock' } as const;
const CHAT_ICON = {
  ios: 'bubble.left.and.bubble.right',
  android: 'forum',
  web: 'forum',
} as const;
const MOON_ICON = { ios: 'moon', android: 'bedtime', web: 'bedtime' } as const;
const CHEVRON_ICON = {
  ios: 'chevron.right',
  android: 'chevron_right',
  web: 'chevron_right',
} as const;

export function XolacerProfileScreen({
  profileId,
  specialty,
  stepId,
}: {
  profileId: string;
  specialty?: string;
  /** Kindling twig that led here — tended once a request is sent. */
  stepId?: string;
}) {
  const profile = useQuery(api.xolacerChat.xolacerProfile, {
    xolacerProfileId: profileId as Id<'emotional_profiles'>,
  });

  if (profile === undefined) return <ProfileSkeleton />;
  if (profile === null) return <ProfileUnavailable />;
  return <ProfileBody profile={profile} specialty={specialty} stepId={stepId} />;
}

function ProfileBody({
  profile,
  specialty,
  stepId,
}: {
  profile: Profile;
  specialty?: string;
  stepId?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    primerMode,
    sending,
    openThread,
    handleAsk,
    handlePrimerConfirm,
    handlePrimerClose,
    openPrimerReference,
  } = useAskFlow({
    xolacerProfileId: profile.xolacerProfileId,
    displayName: profile.displayName,
    stepId: stepId as Id<'path_steps'> | undefined,
  });

  const { conversation } = profile;
  const hasThread = conversation !== null && conversation.status !== 'closed';
  const coolingDown = declineCooldownActive(conversation?.retryAvailableAt);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={HEADER_OPTIONS} />


      {/* Same header slot, mutually exclusive branches: a xolacer is never
          offered moderation actions against themselves, and a single action
          doesn't earn an overflow menu. */}
      {profile.isSelf && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={process.env.EXPO_OS === 'ios' ? 'pencil' : EditIcon}
            accessibilityLabel="Edit your profile"
            onPress={() => {
              playSoftPress();
              router.push('/xolacer-edit');
            }}
          />
        </Stack.Toolbar>
      )}

      {!profile.isSelf && (
        <XolacerMenu
          origin="profile"
          profileId={profile.xolacerProfileId}
          name={profile.displayName}
          conversationId={conversation?.id}
          hasHistory={conversation ? hasSpoken(conversation) : false}
          rateState={rateCtaState(profile)}
        />
      )}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-8 gap-7"
        contentContainerStyle={{ paddingTop: insets.top + 52 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-3">
          <View>
            <ExpandableAvatar photoUrl={profile.photoUrl} name={profile.displayName}>
              <XolacerAvatar
                name={profile.displayName}
                photoUrl={profile.photoUrl}
                size="lg"
                muted={!profile.available}
              />
            </ExpandableAvatar>
            {profile.present && <PresenceDot large />}
          </View>
          <View className="items-center gap-1.5">
            <AppText
              className="text-[26px] font-semibold leading-8 text-foreground"
              // The dot carries presence visually and announces nothing, so the
              // name is where a screen reader has to hear it.
              accessibilityLabel={
                profile.present
                  ? `${profile.displayName}, here now`
                  : profile.displayName
              }
            >
              {profile.displayName}
            </AppText>
            <ProfileRating profile={profile} />
            {/* Presence replaces the response norm rather than sitting beside
                it: "here now · replies within a day" answers the question the
                seeker is asking and then immediately hedges it. */}
            <AppText className="text-xs text-muted">
              Xolacer since {formatMonthYear(profile.xolacerSince)} ·{' '}
              {profile.present ? 'here now' : 'replies within a day'}
            </AppText>
          </View>
        </View>

        <View className="gap-4">
          <AppText className="px-2 text-center text-[17px] leading-7 text-foreground">
            &ldquo;{profile.bio}&rdquo;
          </AppText>
          <SpecialtyChips specialties={profile.specialties} className="justify-center" />
        </View>

        <View className="gap-3.5">
          {hasThread && (
            <Block accent title="You've talked before">
              <Fact icon={CHAT_ICON}>
                Your conversation is still here.{' '}
                {conversation.status === 'resting'
                  ? "Picking it back up doesn't need a new request."
                  : 'Open it any time.'}
              </Fact>
            </Block>
          )}

          {/* Suppressed under a cooldown: the CTA already names the real
              reason and its end date, and "isn't taking new conversations"
              alongside it reads as a second, different no. */}
          {!profile.available && !hasThread && !coolingDown && (
            <Block accent title="Not right now">
              <Fact icon={MOON_ICON}>
                {profile.displayName} isn&apos;t taking new conversations at the moment.
                Nothing to do with you — try someone else on the roster.
              </Fact>
            </Block>
          )}

          <Block title="What to expect" onPress={openPrimerReference}>
            <Fact icon={PERSON_ICON}>
              {profile.displayName} is a trained peer Xolacer, not a therapist — no
              diagnoses, no clinical advice.
            </Fact>
            <Fact icon={LOCK_ICON}>
              Your chat is private between you two. It&apos;s never linked to your
              reflections.
            </Fact>
          </Block>
        </View>
      </ScrollView>
      <TopBlur height={insets.top + 70} />

      <View
        className="gap-3 border-t border-border/40 px-6 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <RateCard
          profile={profile}
          onPress={() => {
            playSoftPress();
            if (conversation)
              router.push({
                pathname: '/rate/[conversationId]',
                params: { conversationId: conversation.id },
              });
          }}
        />
        <ProfileCta
          profile={profile}
          onAsk={handleAsk}
          onOpen={() => {
            playSoftPress();
            if (conversation) openThread(conversation.id);
          }}
        />
        {isSpecialty(specialty) && (
          <OtherListeners
            specialty={specialty}
            onPress={() => {
              playSoftPress();
              router.push({ pathname: '/connect', params: { specialty } });
            }}
          />
        )}
      </View>

      <XolacerPrimerSheet
        isOpen={primerMode !== null}
        onClose={handlePrimerClose}
        onConfirm={primerMode === 'gate' ? handlePrimerConfirm : undefined}
        isConfirming={sending}
      />
    </View>
  );
}

/**
 * The denominator is always visible next to the score — "23 conversations
 * rated" is what stops 4.9 reading as an absolute verdict on a person. Under
 * the display threshold the reason is spelled out rather than showing an empty
 * row of stars, which would read as a bad score.
 */
function ProfileRating({ profile }: { profile: Profile }) {
  if (profile.rating === undefined) {
    return (
      <View className="items-center gap-1">
        <NewXolacerChip />
        <AppText className="text-[11px] text-muted">
          Not enough conversations rated yet
        </AppText>
      </View>
    );
  }

  return (
    <View className="items-center gap-1">
      <RatingStars rating={profile.rating} ratingCount={profile.ratingCount} />
      <AppText className="text-[11px] text-muted">
        {profile.ratingCount} conversation{profile.ratingCount === 1 ? '' : 's'} rated
      </AppText>
    </View>
  );
}

/**
 * The primary place a xolacer gets rated.
 *
 * Deliberately prominent, and deliberately not waiting for the conversation to
 * wind down: the old underlined link in the post-quiet status bar was reachable
 * only after a fortnight of silence, which is why almost nothing was ever
 * rated. Once the seeker has scored this xolacer the card collapses to a quiet
 * line — the app has its answer and stops asking for it.
 */
function RateCard({ profile, onPress }: { profile: Profile; onPress: () => void }) {
  const accent = useThemeColor('accent') as string;
  const state = rateCtaState(profile);
  if (state === 'hidden') return null;

  if (state === 'rated') {
    return (
      <PressableFeedback
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`You rated ${profile.myRating} out of 5. Change your rating.`}
        hitSlop={8}
      >
        <AppText className="text-center text-xs text-muted">
          You rated ★{profile.myRating} — <AppText className="text-accent">change</AppText>
        </AppText>
      </PressableFeedback>
    );
  }

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rate your conversation with ${profile.displayName}`}
    >
      <View
        className="flex-row items-center gap-3 rounded-3xl border border-border/40 bg-surface p-3"
        style={styles.borderCurve}
      >
        {/* Contained rather than overflowing: the card sits directly under two
            bordered blocks, and a mascot breaking its edge would read as a
            different kind of surface. */}
        <View
          className="h-14 w-14 overflow-hidden rounded-2xl bg-accent/10"
          style={styles.borderCurve}
        >
          <Image source={FLUX_PAIR} style={styles.rateMascot} contentFit="cover" />
        </View>
        <View className="flex-1 gap-1">
          <AppText className="text-[15px] font-semibold leading-5 text-foreground">
            How was talking with {profile.displayName}?
          </AppText>
          <View className="flex-row items-end justify-between gap-3">
            <AppText className="flex-1 text-[11px] leading-4 text-muted">
              Only you and Xolace see your score.
            </AppText>
            <View className="flex-row items-center gap-1">
              <AppText className="text-[13px] font-semibold text-accent">Rate</AppText>
              <SymbolView name={CHEVRON_ICON} size={11} tintColor={accent} />
            </View>
          </View>
        </View>
      </View>
    </PressableFeedback>
  );
}

/**
 * The CTA names the request/accept reality instead of implying a chat opens on
 * tap, and is driven straight off the conversation row's existence + status so
 * there is no extra state to compute.
 */
function ProfileCta({
  profile,
  onAsk,
  onOpen,
}: {
  profile: Profile;
  onAsk: () => void;
  onOpen: () => void;
}) {
  const { conversation, available, displayName, isSelf } = profile;
  const retryAt = conversation?.retryAvailableAt;


  if (isSelf) {
    return <Note>This is how your profile looks to everyone else.</Note>;
  }

  if (conversation && conversation.status !== 'closed') {
    return (
      <>
        <Button onPress={onOpen}>
          {conversation.status === 'requested' ? 'See your request' : 'Open chat'}
        </Button>
        {conversation.status === 'requested' && (
          <Note>{displayName} has your request and can accept when they&apos;re ready.</Note>
        )}
      </>
    );
  }

  // Ahead of the availability branch: this xolacer having space is not the
  // reason, and "not taking conversations" would be the app telling a seeker
  // something untrue about the person who turned them down.
  // Compared, never merely present: a cached timestamp already in the past
  // would disable the button on a request the server would accept, and a
  // disabled button writes nothing, so the cache would never refresh.
  if (declineCooldownActive(retryAt)) {
    return (
      <>
        <Button variant="secondary" isDisabled>
          Not right now
        </Button>
        <Note>{declineCooldownNote(displayName, retryAt)}</Note>
      </>
    );
  }

  if (!available) {
    return (
      <>
        <Button variant="secondary" isDisabled>
          Not taking conversations
        </Button>
        <Note>They&apos;ll show up as available again when they have space.</Note>
      </>
    );
  }

  return (
    <>
      <Button onPress={onAsk}>Ask to talk</Button>
      <Note>They&apos;ll get a request and can accept when they&apos;re ready.</Note>
    </>
  );
}

/**
 * The way out that keeps the thread: not this person, but the roster narrowed
 * to the same thing they listen to. Only shown when the route carried a
 * specialty — which anyone can do by filtering the roster themselves.
 */
function OtherListeners({
  specialty,
  onPress,
}: {
  specialty: string;
  onPress: () => void;
}) {
  const accent = useThemeColor('accent') as string;

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`See other Xolacers who listen to ${specialtyListensTo(specialty)}`}
      hitSlop={8}
    >
      <View className="flex-row items-center justify-center gap-1.5 py-2">
        <AppText className="text-[13px] font-medium text-accent">
          Others listen to {specialtyListensTo(specialty)} too
        </AppText>
        <SymbolView
          name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
          size={12}
          tintColor={accent}
        />
      </View>
    </PressableFeedback>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <AppText className="text-center text-xs leading-5 text-muted">{children}</AppText>
  );
}

function Block({
  title,
  accent = false,
  onPress,
  children,
}: {
  title: string;
  accent?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const muted = useThemeColor('muted') as string;

  return (
    <View
      className={
        accent
          ? 'rounded-3xl border border-accent/25 bg-accent/8 p-5'
          : 'rounded-3xl border border-border/40 bg-surface p-5'
      }
      style={styles.borderCurve}
    >
      {onPress ? (
        <PressableFeedback
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${title} — read the full note`}
          hitSlop={8}
        >
          <View className="mb-3.5 flex-row items-center gap-1.5">
            <AppText className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {title}
            </AppText>
            <SymbolView name={CHEVRON_ICON} size={9} tintColor={muted} />
          </View>
        </PressableFeedback>
      ) : (
        <AppText className="mb-3.5 text-[10px] font-bold uppercase tracking-widest text-muted">
          {title}
        </AppText>
      )}
      <View className="gap-3.5">{children}</View>
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View className="flex-1 items-center gap-4 bg-background px-6 pt-28">
      <Stack.Screen options={HEADER_OPTIONS} />
      <Skeleton className="h-19 w-19 rounded-full" />
      <Skeleton className="h-7 w-36 rounded-lg" />
      <Skeleton className="h-4 w-52 rounded-lg" />
      <Skeleton className="mt-3 h-28 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
    </View>
  );
}

function ProfileUnavailable() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-10">
      <Stack.Screen options={HEADER_OPTIONS} />
      <AppText className="text-[15px] font-semibold text-foreground">
        This Xolacer isn&apos;t here
      </AppText>
      <AppText className="text-center text-[13px] leading-5 text-muted">
        Their profile may have been unpublished. There are others on the roster.
      </AppText>
    </View>
  );
}
