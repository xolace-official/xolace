// The voices as orbs in a snapping carousel, after Claude's voice settings: the centred
// voice is large, its neighbours peek in smaller and dimmer. Landing on a voice picks it
// and plays its sample; tapping the centre one stops it or plays it again.

import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { useEffect, useRef } from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	type ScrollViewInstance,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedScrollHandler,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { TALK_CAST } from "@/features/talk/voice-options";
import { playSoftPress, tap } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { VoiceSlot } from "./voice-slot";

const SLOT = 0.5; // of the screen width
const TICK_INTENSITY = 0.35;
const TICK_SHARPNESS = 0.6;
// A drag released this close to a voice has nothing left to snap: it has landed.
const LANDED_PX = 1;

type VoicePreview = {
	playingSlug: VoiceSlug | null;
	play: (slug: VoiceSlug) => Promise<void>;
	toggle: (slug: VoiceSlug) => void;
	/** The playing sample's level, 0–1. */
	level: SharedValue<number>;
};

type Props = {
	voice: VoiceSlug;
	onPick: (slug: VoiceSlug) => void;
	preview: VoicePreview;
	/** `false` stops the orbs turning while the sheet is closed. */
	running: boolean;
};

export function VoiceCarousel({ voice, onPick, preview, running }: Props) {
	const { width } = useWindowDimensions();
	const slot = width * SLOT;
	// The saved voice is the only state; the centred orb and its text follow it.
	const chosen = Math.max(
		0,
		TALK_CAST.findIndex((o) => o.value === voice)
	);
	const x = useSharedValue(chosen * slot);
	const ref = useRef<ScrollViewInstance>(null);
	// The voice last landed on, so a tap and the scroll that follows it pick it once.
	const landed = useRef(chosen);

	// The saved voice changed from elsewhere (it loaded, or settings): go to it. A voice
	// the carousel picked itself is already there or gliding there; a jump would cut
	// the glide short.
	useEffect(() => {
		if (landed.current === chosen) {
			return;
		}
		landed.current = chosen;
		if (Math.round(x.get() / slot) !== chosen) {
			ref.current?.scrollTo({ animated: false, x: chosen * slot });
		}
	}, [chosen, slot, x]);

	const onScroll = useAnimatedScrollHandler((e) => {
		x.set(e.contentOffset.x);
	});
	// A light tick as each voice passes the centre.
	useAnimatedReaction(
		() => Math.round(x.get() / slot),
		(i, prev) => {
			if (prev !== null && i !== prev) {
				scheduleOnRN(tap, TICK_INTENSITY, TICK_SHARPNESS);
			}
		}
	);

	const land = (i: number) => {
		const slug = TALK_CAST[i]?.value;
		if (!slug || i === landed.current) {
			return;
		}
		landed.current = i;
		onPick(slug);
		void preview.play(slug);
	};
	const landAt = (offset: number) =>
		land(
			Math.min(TALK_CAST.length - 1, Math.max(0, Math.round(offset / slot)))
		);
	const onDragEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offset = e.nativeEvent.contentOffset.x;
		if (Math.abs(offset - Math.round(offset / slot) * slot) < LANDED_PX) {
			landAt(offset);
		}
	};

	const centred = TALK_CAST[chosen];
	return (
		<View className="gap-4">
			<Animated.ScrollView
				contentContainerStyle={{ paddingHorizontal: (width - slot) / 2 }}
				contentOffset={{ x: chosen * slot, y: 0 }}
				decelerationRate="fast"
				horizontal
				onMomentumScrollEnd={(e) => landAt(e.nativeEvent.contentOffset.x)}
				onScroll={onScroll}
				onScrollEndDrag={onDragEnd}
				ref={ref}
				scrollEventThrottle={16}
				showsHorizontalScrollIndicator={false}
				snapToInterval={slot}
			>
				{TALK_CAST.map((o, i) => (
					<VoiceSlot
						index={i}
						key={o.value}
						label={o.label}
						level={preview.playingSlug === o.value ? preview.level : undefined}
						onPress={() => {
							if (i === chosen) {
								playSoftPress();
								preview.toggle(o.value);
								return;
							}
							ref.current?.scrollTo({ animated: true, x: i * slot });
							land(i);
						}}
						// Only the centred orb turns; the dimmed neighbours hold still.
						running={running && i === chosen}
						selected={i === chosen}
						slot={slot}
						slug={o.value}
						x={x}
					/>
				))}
			</Animated.ScrollView>
			<View
				accessibilityElementsHidden
				className="flex-row justify-center gap-2"
				importantForAccessibility="no-hide-descendants"
			>
				{TALK_CAST.map((o, i) => (
					<View
						className={cn(
							"size-1.5 rounded-full",
							i === chosen ? "bg-foreground" : "bg-foreground/25"
						)}
						key={o.value}
					/>
				))}
			</View>
			<View className="min-h-16 items-center gap-1 px-8">
				<AppText className="text-center text-muted text-sm leading-5">
					{centred?.description}
				</AppText>
				<AppText className="text-[11px] text-muted/70">
					{preview.playingSlug ? "Tap to stop" : "Tap to hear again"}
				</AppText>
			</View>
		</View>
	);
}
