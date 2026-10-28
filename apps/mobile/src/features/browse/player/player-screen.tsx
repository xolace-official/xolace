import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import {
	type BrowseFrom,
	FAMILY_LABEL,
} from "@/features/browse/components/track-row";
import {
	clearNowPlaying,
	releaseMiniPlayerAttention,
	setNowPlaying,
	togglePlayback,
	useNowPlayingPlayback,
} from "@/features/browse/now-playing/now-playing-store";
import type { PaywallSurface } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { formatTime } from "@/lib/format-time";
import { playSoftPress } from "@/lib/haptics";
import { imageSource } from "@/lib/image-source";
import { cn } from "@/lib/utils";
import {
	CrisisLine,
	GlyphButton,
	usePlayerInk,
	VolumeRow,
} from "./player-controls";
import { PLAYER_SCRIM } from "./player-palette";

type Params = { slug: string; from?: BrowseFrom; stepId?: Id<"path_steps"> };

const ABSOLUTE_FILL = { inset: 0, position: "absolute" } as const;
const TILE = 72;
// Sized to the pill and wrapping the icon, so every touch inside lands on the glass (its press swell).
const CLOSE_GLASS = {
	alignItems: "center",
	borderCurve: "continuous",
	borderRadius: 18,
	height: 36,
	justifyContent: "center",
	overflow: "visible",
	width: 36,
} as const;

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
	const gated = !(isLoading || isPlus);

	useEffect(() => {
		if (!gated) {
			return;
		}
		// A lapsed entitlement takes the mini-player down with the player.
		clearNowPlaying();
		posthog.capture("browse_paywall_shown", { from: from ?? null, slug });
		// Replace, not push: the paywall's close pops back to wherever the player
		// was opened from, and the player never re-enters the stack.
		router.replace({
			params: { surface: "browse" satisfies PaywallSurface },
			pathname: "/upgrade",
		});
	}, [gated, slug, from, posthog]);

	if (!isPlus) {
		return <View className="flex-1 bg-player-scrim" />;
	}
	return <Player />;
}

function Player() {
	const { slug, from, stepId } = useLocalSearchParams<Params>();
	// The audio lives in NowPlayingHost; opening for the loaded slug (e.g. from
	// the mini-player) keeps playing, another slug swaps the track.
	// Closing the player leaves it playing; the mini-player keeps it reachable.
	useEffect(() => {
		setNowPlaying({ from, slug, stepId });
	}, [slug, stepId, from]);
	useEffect(() => releaseMiniPlayerAttention, []);
	const p = useNowPlayingPlayback(slug);
	const insets = useSafeAreaInsets();
	const posthog = usePostHog();
	const ink = usePlayerInk();
	const scrim = String(useCSSVariable("--color-player-scrim"));
	const [barWidth, setBarWidth] = useState(0);
	const glass = isLiquidGlassAvailable();
	const closeIcon = (
		<SymbolView
			name={{
				android: "keyboard_arrow_down",
				ios: "chevron.down",
				web: "keyboard_arrow_down",
			}}
			size={16}
			tintColor={ink}
			weight="semibold"
		/>
	);

	const track = p.track;
	const progress = p.duration ? p.currentTime / p.duration : 0;

	const toggle = () => {
		playSoftPress();
		togglePlayback(p, posthog);
	};

	return (
		<View className="flex-1 bg-player-scrim">
			{track && (
				<Image
					blurRadius={40}
					contentFit="cover"
					source={imageSource(track.thumbUrl)}
					style={ABSOLUTE_FILL}
				/>
			)}
			<LinearGradient
				colors={PLAYER_SCRIM.colors}
				locations={PLAYER_SCRIM.locations}
				style={ABSOLUTE_FILL}
			/>

			<Pressable
				accessibilityLabel="Close player"
				accessibilityRole="button"
				className={cn(
					"absolute left-5 h-9 w-9 items-center justify-center rounded-full",
					!glass && "bg-player-ink/15 active:opacity-60"
				)}
				hitSlop={12}
				onPress={() => router.back()}
				style={{ top: insets.top + 8 }}
			>
				{/* Fixed palette over the artwork: dark clear glass; its own press response replaces the opacity dip. */}
				{glass ? (
					<GlassView
						colorScheme="dark"
						glassEffectStyle="clear"
						isInteractive
						style={CLOSE_GLASS}
					>
						{closeIcon}
					</GlassView>
				) : (
					closeIcon
				)}
			</Pressable>

			{track === null || p.error ? (
				<View className="flex-1 items-center justify-center px-8">
					<AppText className="text-center text-[15px] text-player-ink/70">
						{p.error
							? "Couldn't reach this one right now."
							: "This one isn’t here anymore."}
					</AppText>
				</View>
			) : (
				<View className="flex-1 justify-end px-6 pb-30">
					<View className="flex-row items-center gap-4">
						<View
							className="overflow-hidden rounded-lg bg-player-ink/10"
							style={{ height: TILE, width: TILE }}
						>
							{track && (
								<Image
									source={imageSource(track.thumbUrl)}
									style={{ height: TILE, width: TILE }}
								/>
							)}
						</View>
						<View className="flex-1">
							<AppText className="font-semibold text-[11px] text-player-ink/50 uppercase tracking-wider">
								{track ? FAMILY_LABEL[track.family] : " "}
							</AppText>
							<AppText
								className="mt-0.5 font-semibold text-[20px] text-player-ink"
								numberOfLines={2}
							>
								{track?.title ?? " "}
							</AppText>
						</View>
					</View>

					<View className="mt-7">
						<Pressable
							accessibilityLabel="Progress"
							accessibilityRole="adjustable"
							accessibilityValue={{
								max: 100,
								min: 0,
								now: Math.round(progress * 100),
							}}
							className="h-1 w-full overflow-hidden rounded-full bg-player-ink/25"
							hitSlop={{ bottom: 16, top: 16 }}
							onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
							onPress={(e) =>
								barWidth &&
								p.seekTo((e.nativeEvent.locationX / barWidth) * p.duration)
							}
						>
							<View
								className="h-full rounded-full bg-player-ink"
								style={{ width: `${Math.max(1, progress * 100)}%` }}
							/>
						</Pressable>
						<View className="mt-2 flex-row justify-between">
							<AppText className="text-[12px] text-player-ink/60 tabular-nums">
								{formatTime(p.currentTime)}
							</AppText>
							<AppText className="text-[12px] text-player-ink/60 tabular-nums">
								{formatTime(p.duration)}
							</AppText>
						</View>
					</View>

					<View className="mt-6 flex-row items-center justify-center gap-10">
						<GlyphButton
							label="Back 15 seconds"
							name={{
								android: "fast_rewind",
								ios: "gobackward.15",
								web: "fast_rewind",
							}}
							onPress={() => p.seekTo(p.currentTime - 15)}
							size={28}
						/>
						<Pressable
							accessibilityLabel={p.isPlaying ? "Pause" : "Play"}
							accessibilityRole="button"
							className="h-19 w-19 items-center justify-center rounded-full bg-player-ink active:opacity-80 disabled:opacity-40"
							disabled={!track}
							onPress={toggle}
						>
							<SymbolView
								name={
									p.isPlaying
										? { android: "pause", ios: "pause.fill", web: "pause" }
										: {
												android: "play_arrow",
												ios: "play.fill",
												web: "play_arrow",
											}
								}
								size={32}
								tintColor={scrim}
							/>
						</Pressable>
						<GlyphButton
							label="Forward 15 seconds"
							name={{
								android: "fast_forward",
								ios: "goforward.15",
								web: "fast_forward",
							}}
							onPress={() => p.seekTo(p.currentTime + 15)}
							size={28}
						/>
					</View>

					<View className="mt-8 items-center gap-10">
						<VolumeRow onChange={p.setVolume} value={p.volume} />
						{track?.attributionText && (
							<AppText
								className="text-[12px] text-player-ink/50"
								numberOfLines={2}
							>
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
