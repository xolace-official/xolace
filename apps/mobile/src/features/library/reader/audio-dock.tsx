// Reader audio (#411): the Listen pill starts it, then a one-row dock slides
// up. Free readers get the server's 30s preview, then "Keep listening" opens
// the paywall. The transcript is Plus only, never during the preview.
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { BlurView } from "expo-blur";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import type { ViewInstance } from "react-native";
import {
	AccessibilityInfo,
	findNodeHandle,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import Animated, {
	Easing,
	SlideInDown,
	SlideOutDown,
} from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import { trackLibrary } from "@/features/library/analytics";
import { CoverImage } from "@/features/library/cover-image";
import { usePaywall } from "@/features/purchases/use-paywall";
import { formatTime } from "@/lib/format-time";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { TranscriptSheet } from "./transcript-sheet";
import type { EntryAudio } from "./use-entry-audio";

// Capped so the bar stays one row; the full text is in the labels (#400).
export const BAR_MAX_SCALE = 1.5;

const ICON = {
	back15: { android: "replay", ios: "gobackward.15", web: "replay" },
	close: { android: "close", ios: "xmark", web: "close" },
	listen: { android: "headphones", ios: "headphones", web: "headphones" },
	pause: { android: "pause", ios: "pause.fill", web: "pause" },
	play: { android: "play_arrow", ios: "play.fill", web: "play_arrow" },
	plus: { android: "auto_awesome", ios: "sparkles", web: "auto_awesome" },
	transcript: { android: "notes", ios: "text.quote", web: "notes" },
} as const satisfies Record<string, SymbolViewProps["name"]>;

function Glyph({
	name,
	size = 18,
	color,
}: {
	name: SymbolViewProps["name"];
	size?: number;
	color?: string;
}) {
	const foreground = useThemeColor("foreground");
	return <SymbolView name={name} size={size} tintColor={color ?? foreground} />;
}

/** Beside the source credit: starts the audio and, with it, the dock. */
export function ListenPill({
	audio,
	listenMin,
}: {
	audio: EntryAudio;
	listenMin: number;
}) {
	return (
		<Pressable
			accessibilityLabel={
				audio.started
					? audio.isPlaying
						? "Pause"
						: "Play"
					: `Listen, ${listenMin} ${listenMin === 1 ? "minute" : "minutes"}`
			}
			accessibilityRole="button"
			className="flex-row items-center gap-2 rounded-full bg-surface-secondary px-4 py-2 active:opacity-70"
			onPress={audio.toggle}
		>
			<Glyph name={audio.isPlaying ? ICON.pause : ICON.listen} size={14} />
			<AppText className="font-semibold text-sm">
				{audio.started ? "Playing" : `Listen · ${listenMin}m`}
			</AppText>
		</Pressable>
	);
}

type DockProps = {
	audio: EntryAudio;
	entryId: Id<"library_entries">;
	title: string;
	coverUrl?: string;
	bottom: number;
};

export function AudioDock({
	audio,
	entryId,
	title,
	coverUrl,
	bottom,
}: DockProps) {
	const [transcriptOpen, setTranscriptOpen] = useState(false);
	const reduced = useEffectiveReducedMotion();
	if (!audio.started) {
		return null;
	}
	const pct =
		audio.duration > 0 ? Math.min(audio.currentTime / audio.duration, 1) : 0;

	return (
		<Animated.View
			accessibilityLabel="Audio player"
			// Its own group, reached after the body; appearing never takes focus.
			accessibilityRole="toolbar"
			className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[28px] border-border border-t"
			entering={
				reduced
					? undefined
					: SlideInDown.duration(280).easing(Easing.out(Easing.cubic))
			}
			exiting={
				reduced
					? undefined
					: SlideOutDown.duration(200).easing(Easing.in(Easing.cubic))
			}
			style={{ borderCurve: "continuous", paddingBottom: bottom + 8 }}
		>
			<BlurView intensity={60} style={StyleSheet.absoluteFill} tint="default" />
			<View className="absolute inset-0 bg-surface/70" />
			<View className="h-0.75 bg-separator">
				<View className="h-full bg-accent" style={{ width: `${pct * 100}%` }} />
			</View>

			<View className="flex-row items-center gap-3 p-3">
				<View className="h-11 w-11 overflow-hidden rounded-xl bg-cover-scrim">
					<CoverImage
						contentFit="cover"
						style={StyleSheet.absoluteFill}
						uri={coverUrl}
					/>
				</View>
				<View className="flex-1">
					<AppText
						className="font-semibold text-sm"
						maxFontSizeMultiplier={BAR_MAX_SCALE}
						numberOfLines={1}
					>
						{title}
					</AppText>
					<AppText
						className="text-muted text-xs"
						maxFontSizeMultiplier={BAR_MAX_SCALE}
						numberOfLines={1}
					>
						{audio.error
							? "Audio unavailable"
							: audio.previewEnded
								? "Free preview · 0:30"
								: `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`}
					</AppText>
				</View>

				{audio.previewEnded ? (
					<KeepListening slug={audio.slug} />
				) : (
					<Transport audio={audio} title={title} />
				)}
				{audio.track && !audio.preview && (
					<Pressable
						accessibilityLabel="Transcript"
						accessibilityRole="button"
						hitSlop={8}
						onPress={() => setTranscriptOpen(true)}
					>
						<Glyph name={ICON.transcript} size={18} />
					</Pressable>
				)}
				<Pressable
					accessibilityLabel="Close player"
					accessibilityRole="button"
					hitSlop={8}
					onPress={audio.close}
				>
					<Glyph name={ICON.close} size={14} />
				</Pressable>
			</View>
			{!audio.preview && (
				<TranscriptSheet
					entryId={entryId}
					isOpen={transcriptOpen}
					onClose={() => setTranscriptOpen(false)}
				/>
			)}
		</Animated.View>
	);
}

function Transport({ audio, title }: { audio: EntryAudio; title: string }) {
	const background = useThemeColor("background");
	const remaining = Math.max(audio.duration - audio.currentTime, 0);
	return (
		<>
			<Pressable
				accessibilityLabel="Back 15 seconds"
				accessibilityRole="button"
				hitSlop={8}
				onPress={() => audio.skip(-15)}
			>
				<Glyph name={ICON.back15} size={20} />
			</Pressable>
			<Pressable
				accessibilityActions={[
					{ name: "activate" },
					{ name: "increment" },
					{ name: "decrement" },
				]}
				accessibilityLabel={`${audio.isPlaying ? "Pause" : "Play"} ${title}`}
				// Skip ±15s by swiping up/down on play, not a scrubber (#400).
				accessibilityRole="adjustable"
				accessibilityValue={{
					text: `${formatTime(audio.currentTime)} elapsed, ${formatTime(remaining)} remaining`,
				}}
				className="h-10 w-10 items-center justify-center rounded-full bg-foreground active:opacity-70"
				disabled={!audio.track}
				hitSlop={8}
				onAccessibilityAction={(e) => {
					const a = e.nativeEvent.actionName;
					if (a === "activate") {
						audio.toggle();
					} else {
						audio.skip(a === "increment" ? 15 : -15);
					}
				}}
				onPress={audio.toggle}
			>
				<Glyph
					color={background}
					name={audio.isPlaying ? ICON.pause : ICON.play}
					size={16}
				/>
			</Pressable>
		</>
	);
}

/** In place of the transport once the 30s preview is spent. */
function KeepListening({ slug }: { slug: string }) {
	const accentInk = useThemeColor("accent-foreground");
	const openPaywall = usePaywall((s) => s.open);
	const posthog = usePostHog();
	// Mounts the moment the preview ends: announce it and focus the way on.
	const ref = useRef<ViewInstance>(null);
	useEffect(() => {
		// Focus set before the first layout is dropped.
		const t = setTimeout(() => {
			const node = findNodeHandle(ref.current);
			if (node) {
				AccessibilityInfo.setAccessibilityFocus(node);
			}
			// Queued so the focus move does not cut it off (iOS).
			AccessibilityInfo.announceForAccessibilityWithOptions(
				"Preview ended. Xolace+ unlocks the full listen",
				{ queue: true }
			);
		}, 300);
		return () => clearTimeout(t);
	}, []);
	return (
		<Pressable
			accessibilityLabel="Keep listening with Xolace+"
			accessibilityRole="button"
			className="flex-row items-center gap-2 rounded-full bg-accent px-4 py-2 active:opacity-80"
			onPress={() => {
				trackLibrary(posthog, "library_paywall_tapped", {
					slug,
					trigger: "audio_preview",
				});
				openPaywall("library_audio");
			}}
			ref={ref}
		>
			<Glyph color={accentInk} name={ICON.plus} size={14} />
			<AppText
				className="font-semibold text-accent-foreground text-sm"
				maxFontSizeMultiplier={BAR_MAX_SCALE}
			>
				Keep listening
			</AppText>
		</Pressable>
	);
}
