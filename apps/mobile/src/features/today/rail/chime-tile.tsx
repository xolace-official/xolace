import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { EaseView, PRESS_TIMING, stateTransition } from "@/design/ease";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { Meter, Wave } from "./rail-eq";
import { type RailTile, TILE } from "./rail-model";
import { TileLock } from "./tile-lock";

type Props = {
	tile: RailTile;
	angle: SharedValue<number>;
	playing: boolean;
	locked: boolean;
	live: boolean;
	reduced: boolean;
	onPlay: () => void;
};

export function ChimeTile({
	tile,
	angle,
	playing,
	locked,
	live,
	reduced,
	onPlay,
}: Props) {
	const [preview, setPreview] = useState(false);
	const lift = stateTransition(reduced, PRESS_TIMING);
	const liftShadow = `0 14px 26px -12px ${useTokenColor("today-rail-lift-shadow")}`;

	const swing = useAnimatedStyle(() => ({
		transform: [{ rotate: `${TILE.turn * angle.get()}rad` }],
	}));

	return (
		<Animated.View
			className="gap-2"
			style={[
				{ transformOrigin: [TILE.w / 2, -TILE.hang, 0], width: TILE.w },
				swing,
			]}
		>
			<View
				className="absolute w-px bg-subtle opacity-30"
				style={{ height: TILE.hang, left: TILE.stringInset, top: -TILE.hang }}
			/>
			<View
				className="absolute w-px bg-subtle opacity-30"
				style={{ height: TILE.hang, right: TILE.stringInset, top: -TILE.hang }}
			/>
			<Pressable
				accessibilityHint={locked ? COPY.listen.lockedHint : COPY.listen.hint}
				accessibilityLabel={`${tile.title}, ${tile.sub}${playing ? COPY.listen.playing : ""}${locked ? COPY.listen.locked : ""}`}
				accessibilityRole="button"
				className="gap-2"
				delayLongPress={TILE.previewMs}
				onLongPress={() => {}}
				onPress={onPlay}
				onPressIn={() => setPreview(true)}
				onPressOut={() => setPreview(false)}
				unstable_pressDelay={TILE.pressDelayMs}
			>
				{/* The art lifts while held: up 2 pt, 1.04, its shadow faded in (press, 150 ms). */}
				<EaseView animate={preview ? ART_UP : ART_REST} transition={lift}>
					{/* The lifted shadow is a fixed shadow faded in: opacity only. */}
					<EaseView
						animate={{ opacity: preview ? 1 : 0 }}
						className="absolute inset-0"
						initialAnimate={{ opacity: 0 }}
						pointerEvents="none"
						style={{ borderRadius: TILE.r, boxShadow: liftShadow }}
						transition={lift}
					/>
					<View
						className="overflow-hidden border-continuous bg-surface-secondary"
						style={{ borderRadius: TILE.r, height: TILE.w, width: TILE.w }}
					>
						<CoverImage
							accessible={false}
							style={{ height: TILE.w, width: TILE.w }}
							thumbhash={tile.thumbhash}
							uri={tile.cover}
						/>
						{playing ? <Meter running={live} /> : null}
						{locked ? <TileLock /> : null}
						{preview ? <Wave running={live} /> : null}
					</View>
				</EaseView>
				<View className="gap-[3px]">
					<AppText
						className="text-[14px] leading-[17.5px]"
						numberOfLines={2}
						variant="footnote"
						weight="semibold"
					>
						{tile.title}
					</AppText>
					<AppText className="text-[12.5px]" color="muted" variant="caption">
						{tile.sub}
					</AppText>
				</View>
			</Pressable>
		</Animated.View>
	);
}

const ART_REST = { scale: 1, translateY: 0 };
const ART_UP = { scale: 1.04, translateY: -2 };
