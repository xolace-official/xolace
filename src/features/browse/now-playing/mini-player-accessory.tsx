import { Image } from 'expo-image';
import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useThemeColor } from 'heroui-native';
import { usePostHog } from 'posthog-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/src/components/shared/app-text';
import { FAMILY_LABEL } from '@/src/features/browse/components/track-row';
import { useAccessibilityInfo } from '@/src/helpers/hooks/use-accessability-info';
import { playSoftPress } from '@/src/lib/haptics';
import { imageSource } from '@/src/lib/image-source';
import { cn } from '@/src/lib/utils';
import { clearNowPlaying, togglePlayback, useNowPlaying, useNowPlayingPlayback } from '@/src/features/browse/now-playing/now-playing-store';

// Object form: a bare SF name renders nothing on Android.
const PLAY = { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' } as const;
const PAUSE = { ios: 'pause.fill', android: 'pause', web: 'pause' } as const;
const CLOSE = { ios: 'xmark', android: 'close', web: 'close' } as const;

// 32pt art inside the 48pt capsule, as Apple Music measures it.
const ART = { width: 32, height: 32, borderRadius: 5, borderCurve: 'continuous' } as const;

/**
 * The Browse mini-player in the iOS 26 tab bar (S4). The tab bar mounts this
 * twice (regular + inline placement), so it holds no state: both copies read
 * the one now-playing store.
 */
export function MiniPlayerAccessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  return <MiniPlayerContent inline={placement === 'inline'} />;
}

/**
 * The mini-player's row, shared by the iOS 26 accessory and the overlay capsule
 * elsewhere. The body opens the full player, which re-checks the Plus gate
 * like every other way in.
 */
export function MiniPlayerContent({ inline }: { inline: boolean }) {
  const np = useNowPlaying();
  const p = useNowPlayingPlayback();
  const posthog = usePostHog();
  const [foreground, muted] = useThemeColor(['foreground', 'muted']);
  // Under Reduce Transparency the bar's glass goes flat; give the content a solid fill.
  const { reduceTransparencyEnabled } = useAccessibilityInfo();
  const track = p.track;
  if (!np || !track) return null;

  const open = () => {
    playSoftPress();
    router.push({
      pathname: '/browse-player',
      params: { slug: np.slug, ...(np.stepId && { stepId: np.stepId }), ...(np.from && { from: np.from }) },
    });
  };
  const toggle = () => {
    playSoftPress();
    togglePlayback(p, posthog);
  };
  const dismiss = () => {
    playSoftPress();
    if (p.isPlaying) p.toggle();
    clearNowPlaying();
  };

  const playGlyph = (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      className="p-1.5"
      accessibilityRole="button"
      accessibilityLabel={p.isPlaying ? 'Pause' : 'Play'}
    >
      <SymbolView name={p.isPlaying ? PAUSE : PLAY} size={inline ? 16 : 20} tintColor={foreground} />
    </Pressable>
  );

  return (
    <View
      className={cn(
        'flex-1 flex-row items-center py-2',
        inline ? 'gap-2 pl-4 pr-6' : 'gap-2.5 pl-[15px] pr-3.5',
        reduceTransparencyEnabled && 'rounded-full bg-surface',
      )}
    >
      <Pressable
        onPress={open}
        className="flex-1 flex-row items-center gap-2.5"
        accessibilityRole="button"
        accessibilityLabel={inline ? track.title : `${track.title}, ${FAMILY_LABEL[track.family]}`}
        accessibilityHint="Opens the player"
      >
        <Image source={imageSource(track.thumbUrl)} style={ART} />
        <View className="min-w-0 flex-1">
          <AppText numberOfLines={1} className={cn('font-semibold text-foreground', inline ? 'text-[13px]' : 'text-[15px]')}>
            {track.title}
          </AppText>
          {!inline && (
            <AppText numberOfLines={1} className="text-[13px] text-muted">
              {FAMILY_LABEL[track.family]}
            </AppText>
          )}
        </View>
      </Pressable>
      {playGlyph}
      {!inline && (
        <Pressable
          onPress={dismiss}
          hitSlop={8}
          className="p-1.5"
          accessibilityRole="button"
          accessibilityLabel="Stop and close"
          accessibilityHint="Stops this track and removes the mini-player"
        >
          <SymbolView name={CLOSE} size={16} weight="semibold" tintColor={muted} />
        </Pressable>
      )}
    </View>
  );
}
