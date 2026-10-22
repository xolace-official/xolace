/**
 * The Lantern home (#409): the Library's front page inside Browse, built from
 * #396's variant A. Top to bottom: Continue reading → Reading as… card (first
 * visit) → For you → Hubs → What kind of light → A–Z.
 *
 * Search was ruled out of v1 (#397).
 */
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { api } from '@/convex/_generated/api';
import { trackLibrary } from '@/src/features/library/analytics';
import { KindRows, LetterStrip } from '@/src/features/library/home/browse-sections';
import { PhotoCard, readerHref, SectionTitle } from '@/src/features/library/home/entry-cards';
import { ForYouCarousel } from '@/src/features/library/home/for-you-carousel';
import { HubCarousel } from '@/src/features/library/home/hub-carousel';
import { reasonLine } from '@/src/features/library/home/library-copy';
import { ReadingAsCard, ReadingAsMenu } from '@/src/features/library/home/reading-as';
import { HomeSkeleton } from '@/src/features/library/skeletons';
import { useAppStore } from '@/src/store/store';

export function LibraryHomeScreen() {
  const posthog = usePostHog();
  const home = useQuery(api.library.home.getHome, {});
  const setReadingAs = useMutation(api.library.home.setReadingAs);
  const { width } = useWindowDimensions();
  const libraryIntroSeen = useAppStore((s) => s.libraryIntroSeen);

  useEffect(() => {
    trackLibrary(posthog, 'library_home_opened');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time Lantern welcome (#444), keyed on mount rather than a route
  // param since Library home has no family query string.
  useEffect(() => {
    if (!libraryIntroSeen) router.push({ pathname: '/browse-intro', params: { family: 'library' } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = home?.audiences.map((a) => a.slug) ?? [];
  const answer = (audiences: string[]) => void setReadingAs({ audiences });

  return (
    <>
      {/* first child, so the iOS large title collapses with this scroll view */}
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {home === undefined && <HomeSkeleton />}
        {home && (
          <>
            {home.continue && <ContinueCard entry={home.continue} width={width - GUTTER * 2} />}

            {home.readingAs === null && options.length > 0 && <ReadingAsCard options={options} onAnswer={answer} />}

            {home.forYou.length > 0 && (
              <>
                <SectionTitle title="For you" />
                <ForYouCarousel items={home.forYou.map((f) => ({ entry: f.entry, kicker: reasonLine(f.reason) }))} />
              </>
            )}

            {home.hubs.length > 0 && (
              <>
                <SectionTitle title="Hubs" />
                <HubCarousel hubs={home.hubs} />
              </>
            )}

            <KindRows />
            <LetterStrip />
          </>
        )}
      </ScrollView>
      {home && home.readingAs !== null && options.length > 0 && (
        <ReadingAsMenu options={options} value={home.readingAs} onChange={answer} />
      )}
    </>
  );
}

const GUTTER = 16;
const CONTINUE_HEIGHT = 340;

type ContinueEntry = NonNullable<FunctionReturnType<typeof api.library.home.getHome>['continue']>;

/** The one in-progress read (#420); the reader resumes it from `position`. */
function ContinueCard({ entry, width }: { entry: ContinueEntry; width: number }) {
  // Unfinished never reads as 0% or 100%.
  const pct = Math.min(99, Math.max(1, Math.round(entry.position * 100)));
  return (
    <>
      <SectionTitle title="Continue reading" />
      <View style={{ paddingHorizontal: GUTTER }}>
        <PhotoCard
          entry={entry}
          kicker={`Continue · ${pct}% read`}
          label={`${entry.title}. ${pct} percent read`}
          width={width}
          height={CONTINUE_HEIGHT}
          href={readerHref(entry.slug, 'continue')}
        />
      </View>
    </>
  );
}
