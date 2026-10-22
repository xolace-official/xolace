/**
 * Paged hub carousel (#396): photo cards with HeroUI ScrollShadow on the
 * edges, and dots whose active one stretches and fades with the scroll
 * instead of snapping.
 */
import type { FunctionReturnType } from 'convex/server';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { ScrollShadow, useThemeColor } from 'heroui-native';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { api } from '@/convex/_generated/api';
import { AppText } from '@/src/components/shared/app-text';
import { CoverImage } from '@/src/features/library/cover-image';

type Hub = FunctionReturnType<typeof api.library.home.getHome>['hubs'][number];

const DOT = 6;
const DOT_ACTIVE = 18;
const GAP = 12;

function Dot({ index, scrollX, page, color }: { index: number; scrollX: SharedValue<number>; page: number; color: string }) {
  const style = useAnimatedStyle(() => {
    // 0 → 1 → 2 as the page approaches, centres on, then leaves this dot
    const p = Math.max(0, Math.min(2, (scrollX.get() - (index - 1) * page) / page));
    const t = p <= 1 ? p : 2 - p;
    return { width: DOT + (DOT_ACTIVE - DOT) * t, opacity: 0.25 + 0.75 * t };
  });
  return <Animated.View style={[{ height: DOT, borderRadius: DOT / 2, backgroundColor: color }, style]} />;
}

const countLine = (h: Hub) =>
  [`${h.entries} ${h.entries === 1 ? 'entry' : 'entries'}`, h.listens > 0 && `${h.listens} to listen`]
    .filter(Boolean)
    .join(' · ');

export function HubCarousel({ hubs }: { hubs: Hub[] }) {
  const { width } = useWindowDimensions();
  const cardW = width - 48;
  const page = cardW + GAP;
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => scrollX.set(e.contentOffset.x));
  const accent = useThemeColor('accent');

  return (
    <View>
      <ScrollShadow LinearGradientComponent={LinearGradient} size={28}>
        <Animated.ScrollView
          horizontal
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={page}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: GAP }}
        >
          {hubs.map((hub) => (
            <Link key={hub._id} href={{ pathname: '/browse/library/hub/[slug]', params: { slug: hub.slug } }} asChild>
              <Link.Trigger>
                <Pressable
                  accessibilityRole="link"
                  className="rounded-[28px] bg-surface p-2 active:opacity-90"
                  style={{ width: cardW, borderCurve: 'continuous' }}
                >
                  <View className="overflow-hidden rounded-[22px] bg-surface-secondary" style={{ height: cardW * 0.62 }}>
                    <CoverImage uri={hub.coverUrl} thumbhash={hub.coverThumbhash} style={{ width: '100%', height: '100%' }} transition={200} />
                  </View>
                  <View className="gap-1.5 px-3 pb-3 pt-3">
                    <AppText className="text-[22px] font-bold leading-[27px]">{hub.title}</AppText>
                    <AppText className="text-[14px] leading-5 text-muted" numberOfLines={2}>
                      {hub.intro}
                    </AppText>
                    <AppText className="text-[13px] font-semibold text-accent">{countLine(hub)}</AppText>
                  </View>
                </Pressable>
              </Link.Trigger>
              <Link.Preview />
            </Link>
          ))}
        </Animated.ScrollView>
      </ScrollShadow>
      {hubs.length > 1 && (
        <View className="flex-row items-center justify-center gap-2 pt-4" importantForAccessibility="no-hide-descendants">
          {hubs.map((h, i) => (
            <Dot key={h._id} index={i} scrollX={scrollX} page={page} color={accent} />
          ))}
        </View>
      )}
    </View>
  );
}
