import { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BottomSheet, PressableFeedback, Skeleton, useThemeColor } from 'heroui-native';
import { BottomSheetFooter, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';

import { cn } from '@/src/lib/utils';
import { AppText } from '@/src/components/shared/app-text';
import { useAppStore } from '@/src/store/store';
import { posthog } from '@/src/config/posthog';
import type { Doc } from '@/convex/_generated/dataModel';

const CTA_ROUTE_ALLOWLIST = ['/(protected)/crisis-resources'] as const;

type Props = {
  event: Doc<'monthlyEvents'> | null;
};

export const MonthlyEventSheet = ({ event }: Props) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const addToSeenEventIds = useAppStore((s) => s.addToSeenEventIds);
  const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);

  const [imageLoading, setImageLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  const accentColor = useThemeColor('accent') as string;

  const isOpen = event !== null;
  const showImage = !!(event?.imageUrl) && !imageFailed;
  const hasCta = !!(event?.ctaLabel && event?.ctaRoute);
  const hasLink = !!event?.linkUrl?.startsWith('https://');

  // Footer overlays the scroll content (gorhom footers are not part of the
  // measured content height), so we pad the scroll content by its height.
  const [footerHeight, setFooterHeight] = useState(hasCta ? 132 : 76);

  // Reset image state when a new event arrives. Adjusting during render (with a
  // prev-slug comparison) instead of in an effect avoids an extra render that
  // would briefly show the previous event's image state.
  const [prevSlug, setPrevSlug] = useState<string | null>(null);
  if (event?.imageUrl && event.slug !== prevSlug) {
    setPrevSlug(event.slug);
    setImageLoading(true);
    setImageFailed(false);
  }

  const capturedSlug = useRef<string | null>(null);
  useEffect(() => {
    if (event && capturedSlug.current !== event.slug) {
      capturedSlug.current = event.slug;
      posthog.capture('awareness_event_shown', { slug: event.slug });
    }
  }, [event]);

  const markSeen = (e: Doc<'monthlyEvents'>) => {
    if (e.sessionPrompt) {
      setPendingEventPrompt({
        text: e.sessionPrompt,
        label: e.title,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
    }
    addToSeenEventIds(e.slug);
  };

  const handleDismiss = () => {
    if (!event) return;
    markSeen(event);
    posthog.capture('awareness_event_dismissed', { slug: event.slug });
  };

  const handleLink = () => {
    if (!event?.linkUrl) return;
    posthog.capture('awareness_event_link_tapped', { slug: event.slug });
    markSeen(event);
    WebBrowser.openBrowserAsync(event.linkUrl);
  };

  const handleCta = () => {
    if (!event) return;
    markSeen(event);
    posthog.capture('awareness_event_cta_tapped', { slug: event.slug });
    const route = event.ctaRoute;
    if (route && (CTA_ROUTE_ALLOWLIST as readonly string[]).includes(route)) {
      router.push(route as typeof CTA_ROUTE_ALLOWLIST[number]);
    }
  };

  const renderFooter = (props: BottomSheetFooterProps) => (
    <BottomSheetFooter {...props}>
      <View
        className="px-5 pt-3 pb-5 gap-1 bg-overlay rounded-b-4xl"
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        {hasCta && (
          <PressableFeedback
            onPress={handleCta}
            className="h-13 bg-accent rounded-2xl items-center justify-center"
            accessibilityLabel={event!.ctaLabel}
            accessibilityRole="button"
          >
            <AppText className="text-white text-base font-[Poppins-Medium]">
              {event!.ctaLabel}
            </AppText>
          </PressableFeedback>
        )}

        <PressableFeedback
          onPress={handleDismiss}
          className="py-3 items-center justify-center"
          accessibilityLabel="Dismiss awareness event"
          accessibilityRole="button"
        >
          <AppText
            className={cn(
              'text-center text-[13px] font-[Poppins-Medium]',
              hasCta ? 'text-foreground/55' : 'text-foreground/70',
            )}
          >
            {hasCta ? 'Not right now' : 'I see this'}
          </AppText>
        </PressableFeedback>
      </View>
    </BottomSheetFooter>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleDismiss(); }}
    >
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          detached={true}
          bottomInset={insets.bottom + 12}
          enablePanDownToClose={false}
          enableOverDrag={false}
          footerComponent={renderFooter}
          className="mx-4"
          backgroundClassName="rounded-[32px] bg-overlay overflow-hidden"
          contentContainerClassName="p-0"
          handleIndicatorClassName="opacity-0"
          accessible={false}
        >
          {/* Pinned header: title stays visible while long content scrolls.
              The external-link button opens the full article when linkUrl is set. */}
          <View className="flex-row items-center justify-between gap-3 px-5 pb-3">
            <BottomSheet.Title
              className="flex-1 text-foreground text-left font-semibold text-xl leading-7"
              maxFontSizeMultiplier={1.2}
            >
              {event?.title}
            </BottomSheet.Title>
            {hasLink && (
              <PressableFeedback
                onPress={handleLink}
                hitSlop={8}
                className="size-9 rounded-full bg-accent/15 items-center justify-center"
                accessibilityLabel="Read the full article"
                accessibilityRole="link"
              >
                <SymbolView
                  name={{ ios: "arrow.up.right", android: "open_in_new", web: "open_in_new" }}
                  size={15}
                  tintColor={accentColor}
                />
              </PressableFeedback>
            )}
          </View>
          <View className="h-px bg-foreground/10" />

          {/* Cap the scrollable itself so short content keeps a snug dynamic
              height while long content scrolls under the pinned footer. */}
          <BottomSheetScrollView
            style={{ maxHeight: screenHeight * 0.65 }}
            contentContainerStyle={{ paddingBottom: footerHeight + 50 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Image slot */}
            {showImage && (
              <View className="h-45 overflow-hidden">
                {imageLoading && (
                  <Skeleton className="absolute inset-x-0 top-0 h-45" />
                )}
                <Image
                  source={{ uri: event!.imageUrl }}
                  contentFit="cover"
                  style={styles.image}
                  accessibilityLabel={`${event!.title}, awareness event image`}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => setImageFailed(true)}
                />
              </View>
            )}

            {/* Content */}
            <AppText className="px-5 pt-4 text-foreground/80 text-left text-sm leading-5.5 font-[Poppins-Regular]">
              {event?.body}
            </AppText>
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
};


const styles = StyleSheet.create({
  image : {width: '100%', height: 180}
})