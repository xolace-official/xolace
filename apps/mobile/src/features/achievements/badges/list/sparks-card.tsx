import { useEffect } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { BadgeArt } from "@/components/shared/badge-art";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import type { SparksView } from "@/features/achievements/badges/badges-model";
import {
	LATEST_SLOT,
	openBadge,
	prepareBadge,
	useHeld,
} from "@/features/achievements/badges/held-store";
import {
	Tipped,
	usePressTip,
} from "@/features/achievements/badges/list/press-tip";
import { RollDigits } from "@/features/achievements/badges/list/roll-digits";
import { COPY } from "@/features/achievements/copy";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const LATEST = 96;
const ROLL_MS = 1000;
const BAR_MS = 600;
const NUMBER_LINE = 40;

/** The top card (production's `sparks-card.tsx`): latest badge, sparks earned, then the next rung. */
export function SparksCard({ sparks }: { sparks: SparksView }) {
	const window = useWindowDimensions();
	const { latest, nextUp } = sparks;
	const out = useHeld((s) => s.out?.opts.latest === true && s.out.slot);
	const tip = usePressTip(LATEST / 2, LATEST / 2, LATEST / 2);
	return (
		// The board: 20 pt sides, 24 corners, 20 padding.
		<View className="mx-5 rounded-card bg-surface p-5">
			<View className="flex-row items-center gap-4">
				{latest ? (
					<Pressable
						accessibilityLabel={COPY.list.latestLabel(latest.title)}
						accessibilityRole="button"
						className={out ? "opacity-0" : undefined}
						onPress={() => {
							Presets.System.selection();
							openBadge(latest.id, window, { latest: true });
						}}
						onPressIn={(e) => {
							tip.onPressIn(e);
							prepareBadge(latest.id);
						}}
						onPressOut={tip.onPressOut}
					>
						<Tipped id={latest.id} size={LATEST} slot={LATEST_SLOT} tip={tip}>
							<BadgeArt
								lit={!latest.art.unlit}
								size={LATEST}
								source={latest.art.source}
								thumbhash={latest.art.thumbhash}
							/>
						</Tipped>
					</Pressable>
				) : null}
				<View className="min-w-0 flex-1">
					<AppText
						className="text-[11px] leading-3.5 tracking-[0.66px]"
						color="subtle"
						variant="caption"
						weight="semibold"
					>
						{COPY.list.sparksEarned}
					</AppText>
					<RollDigits
						className="text-[34px] text-ember-ink tracking-[-0.68px]"
						durationMs={ROLL_MS}
						lineHeight={NUMBER_LINE}
						value={sparks.earned}
						variant="display"
					/>
					<AppText
						className="text-[13px] leading-[17px]"
						color="subtle"
						variant="body"
					>
						{sparks.spend}
					</AppText>
					{latest ? (
						<AppText
							className="mt-1 text-[12.5px] text-foreground/72 leading-4"
							numberOfLines={1}
							variant="body"
						>
							{COPY.list.latest(latest.title)}
						</AppText>
					) : null}
				</View>
			</View>
			{nextUp ? (
				<View className="mt-4 border-t-[0.5px] border-t-separator pt-3">
					<View className="flex-row justify-between gap-3">
						<AppText
							className="flex-1 text-[12.5px] text-foreground/72 leading-4"
							numberOfLines={1}
							variant="body"
						>
							{COPY.list.nextUp(nextUp.title)}
						</AppText>
						<AppText
							className="text-[12.5px] tabular-nums leading-4"
							color="subtle"
							variant="body"
						>
							{nextUp.current}/{nextUp.target}
						</AppText>
					</View>
					<FillBar
						label={nextUp.label}
						share={nextUp.current / nextUp.target}
					/>
				</View>
			) : null}
		</View>
	);
}

/** The next-up bar fills over 600 ms once per visit (a transform, not a width). */
function FillBar({ share, label }: { share: number; label: string }) {
	const reduced = useEffectiveReducedMotion();
	const fill = useSharedValue(reduced ? share : 0);
	useEffect(() => {
		fill.set(
			reduced
				? share
				: withTiming(share, {
						duration: BAR_MS,
						easing: Easing.out(Easing.cubic),
						...PLAY_AS_CHOSEN,
					})
		);
	}, [fill, reduced, share]);
	const style = useAnimatedStyle(() => ({
		transform: [{ scaleX: fill.get() }],
	}));
	return (
		<View
			accessibilityLabel={label}
			accessibilityRole="progressbar"
			// The bar is 6 pt.
			className="mt-2 h-1.5 overflow-hidden rounded-full bg-separator"
		>
			<Animated.View
				className="h-1.5 rounded-full bg-ember"
				style={[{ transformOrigin: "left" }, style]}
			/>
		</View>
	);
}
