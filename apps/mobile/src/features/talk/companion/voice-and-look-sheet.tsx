// Everything you set about the companion before a talk, in one sheet (after Claude's voice
// settings): its voice as orbs, then its look, pace and directness. Name, voice and look
// make one profile. The sheet's foot glows in the voice's colour.

import {
	type BottomSheetBackgroundProps,
	BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { BottomSheet, useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { AppText } from "@/components/shared/app-text";
import { TalkChips } from "@/features/talk/talk-chips";
import {
	DIRECTNESS_OPTIONS,
	PACE_OPTIONS,
} from "@/features/talk/talk-style-options";
import { useCompanionName } from "@/features/talk/use-companion-name";
import { useTalkStyle } from "@/features/talk/use-talk-style";
import { useVoicePreview } from "@/features/talk/use-voice-preview";
import { GlassClose } from "./glass-close";
import { LookTiles } from "./look-tiles";
import { useClipLevel } from "./use-clip-level";
import { VoiceCarousel } from "./voice-carousel";
import { useOrbTones } from "./voice-orb";

// Room left above the sheet, under the Dynamic Island.
const TOP_GAP = 12;
// Gorhom's drag handle, which sits above the content view.
const HANDLE = 24;
const FOOT_PAD = 24;
const GLOW_HEIGHT = 260;
const GLOW_ALPHA = "55";

type Props = { isOpen: boolean; onOpenChange: (open: boolean) => void };

/** Keep it mounted and flip `isOpen`: the sheet presents on a closed → open change. */
export function VoiceAndLookSheet({ isOpen, onOpenChange }: Props) {
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const name = useCompanionName();
	const style = useTalkStyle();
	const voicePreview = useVoicePreview();
	const level = useClipLevel(
		voicePreview.player,
		voicePreview.playingSlug !== null
	);
	const preview = { ...voicePreview, level };
	const sheetHeight = height - insets.top - TOP_GAP;
	const change = (open: boolean) => {
		if (!open) {
			voicePreview.stop();
		}
		onOpenChange(open);
	};
	return (
		<BottomSheet isOpen={isOpen} onOpenChange={change}>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					accessible={false}
					backgroundComponent={GlowBackground}
					contentContainerClassName="px-0"
					// Gorhom's content view is absolute and sized by its content; give it the
					// sheet's height so the list has a bounded height to scroll in, and drop
					// HeroUI's foot padding: the list runs to the bottom edge and pads itself.
					contentContainerProps={{
						style: { height: sheetHeight - HANDLE, paddingBottom: 0 },
					}}
					// One fixed height, dragged by its handle only. Gorhom locks a sheet's list
					// unless it reads the sheet as fully open, which a content-sized sheet
					// stopped doing after a voice change; without content panning it never locks.
					enableContentPanningGesture={false}
					enableDynamicSizing={false}
					handleIndicatorClassName="bg-foreground/20"
					snapPoints={[sheetHeight]}
				>
					<View className="min-h-11 flex-row items-center justify-center px-5 pb-1">
						<View className="absolute left-5">
							<GlassClose onPress={() => change(false)} />
						</View>
						<BottomSheet.Title className="px-14 text-center text-lg">
							{`${name}'s voice and look`}
						</BottomSheet.Title>
					</View>
					<BottomSheetScrollView
						contentContainerClassName="gap-5"
						contentContainerStyle={{ paddingBottom: insets.bottom + FOOT_PAD }}
						showsVerticalScrollIndicator={false}
						style={{ flex: 1 }}
					>
						<VoiceCarousel
							onPick={style.setVoice}
							preview={preview}
							running={isOpen}
							voice={style.voice}
						/>
						<Group title="Look">
							<LookTiles
								onChange={style.setLook}
								running={isOpen}
								value={style.look}
							/>
						</Group>
						<Group title="Pace">
							<View className="px-5">
								<TalkChips
									onPress={style.setPace}
									options={PACE_OPTIONS}
									value={style.pace}
								/>
							</View>
						</Group>
						<Group title="Directness">
							<View className="px-5">
								<TalkChips
									onPress={style.setDirectness}
									options={DIRECTNESS_OPTIONS}
									value={style.directness}
								/>
							</View>
						</Group>
						<AppText className="px-8 text-center text-muted text-xs">
							{`Kept for every talk. You can also ask ${name} to slow down mid-talk.`}
						</AppText>
					</BottomSheetScrollView>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

/** The sheet's surface, its foot washed in the chosen voice's colour. */
function GlowBackground({ style }: BottomSheetBackgroundProps) {
	const { voice } = useTalkStyle();
	const [, , deep] = useOrbTones(voice);
	const background = useThemeColor("background");
	return (
		<View
			className="bottom-sheet__content-background overflow-hidden"
			pointerEvents="none"
			style={[style, { backgroundColor: background }]}
		>
			<LinearGradient
				colors={["transparent", `${deep}${GLOW_ALPHA}`]}
				style={{
					bottom: 0,
					height: GLOW_HEIGHT,
					left: 0,
					position: "absolute",
					right: 0,
				}}
			/>
		</View>
	);
}

function Group({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View
			className="mx-4 gap-3 rounded-3xl bg-surface/70 py-4"
			style={{ borderCurve: "continuous" }}
		>
			<AppText className="px-5 font-medium text-foreground">{title}</AppText>
			{children}
		</View>
	);
}
