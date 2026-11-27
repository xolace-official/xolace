import { Image } from "expo-image";
import { NativeTabs } from "expo-router/native-tabs";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import { PLAYER_COPY } from "@/features/player/copy";
import {
	MarqueeTitle,
	useAttentionPulse,
} from "@/features/player/now-playing/mini-player-motion";
import {
	type MiniPlayer,
	useMiniPlayer,
} from "@/features/player/now-playing/use-mini-player";
import { useAccessibilityInfo } from "@/helpers/hooks/use-accessability-info";
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
const MOON = { android: "bedtime", ios: "moon.fill", web: "bedtime" } as const;

const ART = {
	borderCurve: "continuous",
	borderRadius: 5,
	height: 32,
	width: 32,
} as const;

export function MiniPlayerAccessory() {
	const placement = NativeTabs.BottomAccessory.usePlacement();
	const player = useMiniPlayer();
	return <MiniPlayerContent inline={placement === "inline"} player={player} />;
}

export function MiniPlayerContent({
	inline,
	player,
}: {
	inline: boolean;
	player: MiniPlayer | null;
}) {
	const [foreground, muted] = useThemeColor(["foreground", "muted"]);
	const { reduceTransparencyEnabled } = useAccessibilityInfo();
	const pulse = useAttentionPulse();
	if (!player) {
		return null;
	}
	const {
		state: { track, isPlaying, sleeping },
		actions: { open, toggle, dismiss },
	} = player;
	const family = PLAYER_COPY.family[track.family];

	const playGlyph = (
		<Pressable
			accessibilityLabel={isPlaying ? PLAYER_COPY.pause : PLAYER_COPY.play}
			accessibilityRole="button"
			className="p-1.5"
			hitSlop={8}
			onPress={toggle}
		>
			<SymbolView
				name={isPlaying ? PAUSE : PLAY}
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
				accessibilityHint={PLAYER_COPY.mini.openHint}
				accessibilityLabel={
					(inline ? track.title : `${track.title}, ${family}`) +
					(sleeping ? PLAYER_COPY.mini.sleeping : "")
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
						<View className="flex-row items-center gap-1">
							{sleeping ? (
								<SymbolView name={MOON} size={12} tintColor={muted} />
							) : null}
							<AppText
								className="flex-1 text-[13px] text-muted"
								numberOfLines={1}
							>
								{family}
							</AppText>
						</View>
					)}
				</View>
			</Pressable>
			{playGlyph}
			{!inline && (
				<Pressable
					accessibilityHint={PLAYER_COPY.mini.closeHint}
					accessibilityLabel={PLAYER_COPY.mini.close}
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
