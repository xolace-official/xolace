import { useEffect, useState } from "react";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { usePostHog } from "posthog-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { type BrowseFrom, FAMILY_LABEL } from "@/src/features/browse/components/track-row";
import {
  clearNowPlaying,
  setNowPlaying,
  togglePlayback,
  useNowPlayingPlayback,
} from "@/src/features/browse/now-playing/now-playing-store";
import type { PaywallSurface } from "@/src/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/src/lib/haptics";
import { cn } from "@/src/lib/utils";
import { imageSource } from "@/src/lib/image-source";
import { formatTime } from "./format-time";
import { CrisisLine, GlyphButton, VolumeRow, usePlayerInk } from "./player-controls";
import { PLAYER_SCRIM } from "./player-palette";

type Params = { slug: string; from?: BrowseFrom; stepId?: Id<"path_steps"> };

const ABSOLUTE_FILL = { position: "absolute", inset: 0 } as const;
const TILE = 72;
// Sized to the pill and wrapping the icon, so every touch inside lands on the glass (its press swell).
const CLOSE_GLASS = { width: 36, height: 36, borderRadius: 18, borderCurve: "continuous", overflow: "visible", alignItems: "center", justifyContent: "center" } as const;

/**
 * The Browse player (#340, §9.3) — and the second half of the free-user gate
 * (§9.4). The row tap already intercepts a free user before navigation; this
 * catches every other way in (deep link, a kindling twig, a lapsed
 * entitlement) and swaps to the paywall without mounting the player, so no
 * half-loaded player ever sits behind a sheet.
 */
export function PlayerScreen() {
  const { slug, from } = useLocalSearchParams<Params>();
  const { isPlus, isLoading } = usePlusEntitlement();
  const posthog = usePostHog();
  const gated = !isLoading && !isPlus;

  useEffect(() => {
    if (!gated) return;
    // A lapsed entitlement takes the mini-player down with the player.
    clearNowPlaying();
    posthog.capture("browse_paywall_shown", { slug, from: from ?? null });
    // Replace, not push: the paywall's close pops back to wherever the player
    // was opened from, and the player never re-enters the stack.
    router.replace({ pathname: "/(paywall)", params: { surface: "browse" satisfies PaywallSurface } });
  }, [gated, slug, from, posthog]);

  if (!isPlus) return <View className="flex-1 bg-player-scrim" />;
  return <Player />;
}

function Player() {
  const { slug, from, stepId } = useLocalSearchParams<Params>();
  // The audio lives in NowPlayingHost; opening for the loaded slug (e.g. from
  // the mini-player) keeps playing, another slug swaps the track.
  useEffect(() => {
    setNowPlaying({ slug, stepId, from });
    // Only iOS 26 has the tab-bar mini-player to keep it reachable; elsewhere
    // closing the player stops the audio, as it always has.
    return () => {
      if (!isLiquidGlassAvailable()) clearNowPlaying();
    };
  }, [slug, stepId, from]);
  const p = useNowPlayingPlayback(slug);
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const ink = usePlayerInk();
  const scrim = String(useCSSVariable("--color-player-scrim"));
  const [barWidth, setBarWidth] = useState(0);
  const glass = isLiquidGlassAvailable();
  const closeIcon = <SymbolView name={{ ios: "chevron.down", android: "keyboard_arrow_down", web: "keyboard_arrow_down" }} size={16} weight="semibold" tintColor={ink} />;

  const track = p.track;
  const progress = p.duration ? p.currentTime / p.duration : 0;

  const toggle = () => {
    playSoftPress();
    togglePlayback(p, posthog);
  };

  return (
    <View className="flex-1 bg-player-scrim">
      {track && (
        <Image source={imageSource(track.thumbUrl)} style={ABSOLUTE_FILL} contentFit="cover" blurRadius={40} />
      )}
      <LinearGradient colors={PLAYER_SCRIM.colors} locations={PLAYER_SCRIM.locations} style={ABSOLUTE_FILL} />

      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close player"
        className={cn(
          "absolute left-5 h-9 w-9 items-center justify-center rounded-full",
          !glass && "bg-player-ink/15 active:opacity-60",
        )}
        style={{ top: insets.top + 8 }}
      >
        {/* Fixed palette over the artwork: dark clear glass; its own press response replaces the opacity dip. */}
        {glass ? <GlassView glassEffectStyle="clear" colorScheme="dark" isInteractive style={CLOSE_GLASS}>{closeIcon}</GlassView> : closeIcon}
      </Pressable>

      {track === null || p.error ? (
        <View className="flex-1 items-center justify-center px-8">
          <AppText className="text-center text-[15px] text-player-ink/70">
            {p.error ? "Couldn't reach this one right now." : "This one isn’t here anymore."}
          </AppText>
        </View>
      ) : (
        <View className="flex-1 justify-end px-6 pb-30">
          <View className="flex-row items-center gap-4">
            <View className="overflow-hidden rounded-lg bg-player-ink/10" style={{ width: TILE, height: TILE }}>
              {track && <Image source={imageSource(track.thumbUrl)} style={{ width: TILE, height: TILE }} />}
            </View>
            <View className="flex-1">
              <AppText className="text-[11px] font-semibold uppercase tracking-wider text-player-ink/50">
                {track ? FAMILY_LABEL[track.family] : " "}
              </AppText>
              <AppText className="mt-0.5 text-[20px] font-semibold text-player-ink" numberOfLines={2}>
                {track?.title ?? " "}
              </AppText>
            </View>
          </View>

          <View className="mt-7">
            <Pressable
              className="h-1 w-full overflow-hidden rounded-full bg-player-ink/25"
              hitSlop={{ top: 16, bottom: 16 }}
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              onPress={(e) => barWidth && p.seekTo((e.nativeEvent.locationX / barWidth) * p.duration)}
              accessibilityRole="adjustable"
              accessibilityLabel="Progress"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            >
              <View className="h-full rounded-full bg-player-ink" style={{ width: `${Math.max(1, progress * 100)}%` }} />
            </Pressable>
            <View className="mt-2 flex-row justify-between">
              <AppText className="text-[12px] text-player-ink/60 tabular-nums">{formatTime(p.currentTime)}</AppText>
              <AppText className="text-[12px] text-player-ink/60 tabular-nums">{formatTime(p.duration)}</AppText>
            </View>
          </View>

          <View className="mt-6 flex-row items-center justify-center gap-10">
            <GlyphButton name={{ ios: "gobackward.15", android: "fast_rewind", web: "fast_rewind" }} size={28} label="Back 15 seconds" onPress={() => p.seekTo(p.currentTime - 15)} />
            <Pressable
              onPress={toggle}
              disabled={!track}
              accessibilityRole="button"
              accessibilityLabel={p.isPlaying ? "Pause" : "Play"}
              className="h-19 w-19 items-center justify-center rounded-full bg-player-ink active:opacity-80 disabled:opacity-40"
            >
              <SymbolView name={
                  p.isPlaying
                    ? { ios: "pause.fill", android: "pause", web: "pause" }
                    : { ios: "play.fill", android: "play_arrow", web: "play_arrow" }
                } size={32} tintColor={scrim} />
            </Pressable>
            <GlyphButton name={{ ios: "goforward.15", android: "fast_forward", web: "fast_forward" }} size={28} label="Forward 15 seconds" onPress={() => p.seekTo(p.currentTime + 15)} />
          </View>

          <View className="mt-8 items-center gap-10">
            <VolumeRow value={p.volume} onChange={p.setVolume} />
            {track?.attributionText && (
              <AppText numberOfLines={2} className="text-[12px] text-player-ink/50">
                {track.attributionText}
              </AppText>
            )}
            {track?.showCrisisLine && <CrisisLine />}
          </View>
        </View>
      )}
    </View>
  );
}
