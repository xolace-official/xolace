import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	FadeIn,
	FadeOut,
	SlideInDown,
	SlideOutDown,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { BlurView } from "@/components/shared/styled";
import { useScheme } from "@/design/scheme";
import { REDUCED_FADE_MS } from "@/design/springs";
import { COPY } from "@/features/lantern/copy";
import {
	ICON,
	IconButton,
	KeepListening,
	Progress,
	Transport,
} from "@/features/lantern/reader/dock-controls";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import { mmss } from "@/features/lantern/reader/reader-model";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** The dock's height above the safe area: the 3 pt line, a 68 pt row and 8 under it. */
export const DOCK_H = 3 + 68 + 8;
const IN_MS = 280;
const OUT_MS = 200;
const BAR_MAX_SCALE = 1.5;

/**
 * Production's `AudioDock` (handoff §5.4): pinned to the bottom, under a violet progress line, one
 * row: the cover, the title and the time, back 15, play, the transcript and close. Once a free
 * reader's preview ends, Keep listening takes the transport's place. Its own toolbar group after
 * the body; appearing never takes focus.
 */
export function AudioDock({ bottom }: { bottom: number }) {
	const { state, actions } = useReaderScreen();
	const reduced = useEffectiveReducedMotion();
	const dark = useScheme() === "dark";
	const a = state.audio;
	if (!a.started) {
		return null;
	}
	const share = a.duration > 0 ? Math.min(a.currentTime / a.duration, 1) : 0;
	return (
		<Animated.View
			accessibilityLabel={COPY.reader.dock.label}
			accessibilityRole="toolbar"
			className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[28px] border-separator border-t"
			entering={
				reduced
					? FadeIn.duration(REDUCED_FADE_MS)
					: SlideInDown.duration(IN_MS).easing(Easing.out(Easing.cubic))
			}
			exiting={
				reduced
					? FadeOut.duration(REDUCED_FADE_MS)
					: SlideOutDown.duration(OUT_MS).easing(Easing.in(Easing.cubic))
			}
			style={{ borderCurve: "continuous", paddingBottom: bottom + 8 }}
		>
			<BlurView
				intensity={60}
				style={StyleSheet.absoluteFill}
				tint={dark ? "dark" : "light"}
			/>
			<View className="absolute inset-0 bg-surface/80" />
			<Progress reduced={reduced} share={share} />
			<View className="flex-row items-center gap-2.5 p-3">
				<View className="size-11 overflow-hidden rounded-row bg-cover-scrim">
					<CoverImage
						style={StyleSheet.absoluteFill}
						uri={state.entry.coverUrl}
					/>
				</View>
				<View className="min-w-0 flex-1">
					<AppText
						className="text-[14px] leading-[18px]"
						maxFontSizeMultiplier={BAR_MAX_SCALE}
						numberOfLines={1}
						variant="callout"
						weight="semibold"
					>
						{state.entry.title}
					</AppText>
					<AppText
						className="text-[12px] tabular-nums leading-[16px]"
						color="muted"
						maxFontSizeMultiplier={BAR_MAX_SCALE}
						numberOfLines={1}
						variant="caption"
					>
						{a.failed
							? COPY.reader.dock.unavailable
							: a.previewEnded
								? COPY.reader.dock.previewEnded
								: `${mmss(a.currentTime)} / ${mmss(a.duration)}`}
					</AppText>
				</View>
				{a.previewEnded ? (
					<KeepListening onPress={actions.audio.keepListening} />
				) : (
					<Transport />
				)}
				{a.transcript && !a.previewEnded ? (
					<IconButton
						icon={ICON.transcript}
						label={COPY.reader.dock.transcript}
						onPress={actions.audio.openTranscript}
						size={18}
					/>
				) : null}
				<IconButton
					icon={ICON.close}
					label={COPY.reader.dock.close}
					onPress={actions.audio.close}
					size={14}
				/>
			</View>
		</Animated.View>
	);
}
