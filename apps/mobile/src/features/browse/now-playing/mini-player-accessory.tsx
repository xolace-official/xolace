import { Image } from "expo-image";
import { router } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import { FAMILY_LABEL } from "@/features/browse/components/track-row";
import {
	MarqueeTitle,
	useAttentionPulse,
} from "@/features/browse/now-playing/mini-player-motion";
import {
	clearNowPlaying,
	togglePlayback,
	useNowPlaying,
	useNowPlayingPlayback,
} from "@/features/browse/now-playing/now-playing-store";
import { useAccessibilityInfo } from "@/helpers/hooks/use-accessability-info";
import { playSoftPress } from "@/lib/haptics";
import { imageSource } from "@/lib/image-source";
import { cn } from "@/lib/utils";

// Object form: a bare SF name renders nothing on Android.
const PLAY = {
	android: "play_arrow",
	ios: "play.fill",
	web: "play_arrow",
} as const;
const PAUSE = { android: "pause", ios: "pause.fill", web: "pause" } as const;
const CLOSE = { android: "close", ios: "xmark", web: "close" } as const;

// 32pt art inside the 48pt capsule, as Apple Music measures it.
const ART = {
	borderCurve: "continuous",
	borderRadius: 5,
	height: 32,
	width: 32,
} as const;

/**
 * The Browse mini-player in the iOS 26 tab bar (S4). The tab bar mounts this
 * twice (regular + inline placement), so it holds no state: both copies read
 * the one now-playing store.
 */
export function MiniPlayerAccessory() {
	const placement = NativeTabs.BottomAccessory.usePlacement();
	return <MiniPlayerContent inline={placement === "inline"} />;
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
	const [foreground, muted] = useThemeColor(["foreground", "muted"]);
	// Under Reduce Transparency the bar's glass goes flat; give the content a solid fill.
	const { reduceTransparencyEnabled } = useAccessibilityInfo();
	const pulse = useAttentionPulse();
	const track = p.track;
	if (!(np && track)) {
		return null;
	}

	const open = () => {
		playSoftPress();
		router.push({
			params: {
				slug: np.slug,
				...(np.stepId && { stepId: np.stepId }),
				...(np.from && { from: np.from }),
			},
			pathname: "/browse-player",
		});
	};
	const toggle = () => {
		playSoftPress();
		togglePlayback(p, posthog);
	};
	const dismiss = () => {
		playSoftPress();
		if (p.isPlaying) {
			p.toggle();
		}
		clearNowPlaying();
	};

	const playGlyph = (
		<Pressable
			accessibilityLabel={p.isPlaying ? "Pause" : "Play"}
			accessibilityRole="button"
			className="p-1.5"
			hitSlop={8}
			onPress={toggle}
		>
			<SymbolView
				name={p.isPlaying ? PAUSE : PLAY}
				size={inline ? 16 : 20}
				tintColor={foreground}
			/>
		</Pressable>
	);

	return (
		<Animated.View
			className={cn(
				"flex-1 flex-row items-center py-2",
				inline ? "gap-2 pr-6 pl-4" : "gap-2.5 pr-3.5 pl-[15px]",
				reduceTransparencyEnabled && "rounded-full bg-surface"
			)}
			style={pulse}
		>
			<Pressable
				accessibilityHint="Opens the player"
				accessibilityLabel={
					inline ? track.title : `${track.title}, ${FAMILY_LABEL[track.family]}`
				}
				accessibilityRole="button"
				className="flex-1 flex-row items-center gap-2.5"
				onPress={open}
			>
				<Image source={imageSource(track.thumbUrl)} style={ART} />
				<View className="min-w-0 flex-1">
					<MarqueeTitle
						className={cn(
							"font-semibold text-foreground",
							inline ? "text-[13px]" : "text-[15px]"
						)}
						title={track.title}
					/>
					{!inline && (
						<AppText className="text-[13px] text-muted" numberOfLines={1}>
							{FAMILY_LABEL[track.family]}
						</AppText>
					)}
				</View>
			</Pressable>
			{playGlyph}
			{!inline && (
				<Pressable
					accessibilityHint="Stops this track and removes the mini-player"
					accessibilityLabel="Stop and close"
					accessibilityRole="button"
					className="p-1.5"
					hitSlop={8}
					onPress={dismiss}
				>
					<SymbolView
						name={CLOSE}
						size={16}
						tintColor={muted}
						weight="semibold"
					/>
				</Pressable>
			)}
		</Animated.View>
	);
}
