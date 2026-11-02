// The Companion view: the companion large over the aurora, posed by what the talk is doing
// and leaning in with your voice, the state word under it, and the latest line as a caption
// so nothing is lost. Touch it and it smiles back. A talk error shows here too, since the
// transcript that carries it is hidden.

import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useRef } from "react";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import Animated, {
	FadeIn,
	useAnimatedReaction,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { LOOKS } from "@/features/talk/companion/companion-look";
import { poseForPresence } from "@/features/talk/presence-pose";
import { useCompanionName } from "@/features/talk/use-companion-name";
import type { Talk } from "@/features/talk/use-talk";
import { useTalkStyle } from "@/features/talk/use-talk-style";
import { PRESETS } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** Room the view switch takes under the header. */
export const SWITCH_SPACE = 52;
const FACE = 0.5; // of the screen width
// The state word and the gap above it, kept clear under the face.
const PRESENCE_ROOM = 40;
// The smallest it gets when the keyboard leaves little room.
const MIN_FACE = 64;
const CAPTION_FADE_MS = 260;
const CAPTION_LINES = 4;
// How long a touch keeps it smiling before it goes back to the talk.
const GLAD_HOLD_MS = 1600;

type Props = {
	talk: Talk;
	/** `false` while the Conversation view shows or the talk is out of sight: the face's
	 * clock stops. */
	visible: boolean;
};

export function CompanionStage({ talk, visible }: Props) {
	const name = useCompanionName();
	const { look } = useTalkStyle();
	const pose = poseForPresence(talk.presence);
	const face = useFace(pose, visible);
	const { width } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	// The height left for the face and its state word; the keyboard can take most of it. The
	// keyboard changes it every frame, so it stays a shared value: the face is drawn once at
	// full size and scaled to fit on the UI thread, with no render and no canvas resize.
	const room = useSharedValue(Number.POSITIVE_INFINITY);
	const full = width * FACE;
	const size = useDerivedValue(() =>
		Math.max(MIN_FACE, Math.min(full, room.get() - PRESENCE_ROOM))
	);
	const fitStyle = useAnimatedStyle(() => ({
		height: size.get(),
		width: size.get(),
	}));
	const scaleStyle = useAnimatedStyle(() => ({
		transform: [{ scale: size.get() / full }],
	}));
	const headerHeight = useHeaderHeight();
	const top = (Platform.OS === "ios" ? headerHeight : 0) + SWITCH_SPACE;
	const latest = talk.turns.at(-1);
	const heard = talk.turns.filter((t) => t.speaker === "person").length;
	const glad = useRef<ReturnType<typeof setTimeout>>(undefined);

	// The talk moved on: back to its pose now, even mid-smile.
	useEffect(() => {
		clearTimeout(glad.current);
		face.to(pose);
	}, [face.to, pose]);
	useEffect(() => () => clearTimeout(glad.current), []);
	// You finished a line: a small "I heard you".
	useEffect(() => {
		if (heard > 0) {
			face.nod();
		}
	}, [face.nod, heard]);
	// It leans in with your voice. Only shared values cross into the worklet. Hidden, it
	// stops reading the mic, so the face isn't redrawn behind the Conversation view.
	const mic = talk.micLevel;
	const listen = face.listen;
	useAnimatedReaction(
		() => (visible ? mic.get() : 0),
		(level) => listen.set(level),
		[visible]
	);

	const smileBack = () => {
		playSoftPress();
		face.to(PRESETS.glad);
		face.nod();
		clearTimeout(glad.current);
		glad.current = setTimeout(() => face.to(pose), GLAD_HOLD_MS);
	};

	return (
		<View className="flex-1 items-center px-8" style={{ paddingTop: top }}>
			<View
				className="flex-1 items-center justify-center gap-4"
				onLayout={(e) => room.set(e.nativeEvent.layout.height)}
			>
				<Pressable
					accessibilityHint="Smiles back"
					accessibilityLabel={name}
					accessibilityRole="button"
					onPress={smileBack}
				>
					<Animated.View
						className="items-center justify-center"
						style={fitStyle}
					>
						<Animated.View style={scaleStyle}>
							<XolaceFace {...LOOKS[look].look} face={face} size={full} />
						</Animated.View>
					</Animated.View>
				</Pressable>
				<AppText className="text-muted text-sm">{talk.presence}</AppText>
			</View>
			<View className="min-h-36 w-full items-center gap-1.5 pb-6">
				{talk.error ? (
					<AppText className="text-center text-danger text-xs">
						{talk.error}
					</AppText>
				) : null}
				{latest && (
					<Animated.View
						className="items-center gap-1.5"
						entering={reduced ? undefined : FadeIn.duration(CAPTION_FADE_MS)}
						key={latest.id}
					>
						<AppText className="font-semibold text-accent text-xs">
							{latest.speaker === "person" ? "You" : name}
						</AppText>
						<AppText
							className="text-center text-[17px] text-foreground leading-7"
							numberOfLines={CAPTION_LINES}
						>
							{latest.text || "…"}
						</AppText>
					</Animated.View>
				)}
			</View>
		</View>
	);
}
