import { useEffect, useEffectEvent } from "react";
import { BackHandler, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { PressScale } from "@/components/shared/press-scale";
import { BlurView } from "@/components/shared/styled";
import { useScheme } from "@/design/scheme";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { TALK_COPY } from "../copy";

const FADE_MS = 200;
const ZOOM_MS = 250;
const ZOOM_FROM = 0.94;
const BLUR = 12;
const IN = FadeIn.duration(FADE_MS).reduceMotion(PLAY_AS_CHOSEN.reduceMotion);
const OUT = FadeOut.duration(FADE_MS).reduceMotion(PLAY_AS_CHOSEN.reduceMotion);
const BUTTON = "h-11.5 items-center justify-center rounded-full";

type Props = {
	reduced: boolean;
	onMirror: () => void;
	onJustEnd: () => void;
	onKeep: () => void;
};

export function TalkLeave({ reduced, onMirror, onJustEnd, onKeep }: Props) {
	const scheme = useScheme();
	const { leave, justEnd } = TALK_COPY.live;
	const keep = useEffectEvent(() => onKeep());
	useEffect(() => {
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			keep();
			return true;
		});
		return () => sub.remove();
	}, []);
	return (
		<Animated.View
			accessibilityViewIsModal
			className="absolute inset-0 items-center justify-center"
			entering={IN}
			exiting={OUT}
		>
			<BlurView className="absolute inset-0" intensity={BLUR} tint={scheme} />
			<Pressable
				accessibilityLabel={leave.keep}
				className="absolute inset-0 bg-talk-scrim"
				onPress={onKeep}
			/>
			<Animated.View
				className="w-80 rounded-[28px] bg-surface p-5.5"
				entering={
					reduced
						? undefined
						: ZoomIn.duration(ZOOM_MS)
								.withInitialValues({ transform: [{ scale: ZOOM_FROM }] })
								.reduceMotion(PLAY_AS_CHOSEN.reduceMotion)
				}
				style={{ borderCurve: "continuous" }}
			>
				<AppText
					accessibilityRole="header"
					className="mb-1.5 text-[18px] leading-[23px]"
					variant="callout"
					weight="semibold"
				>
					{leave.title}
				</AppText>
				<AppText
					className="mb-2.5 text-[14px] leading-[20px]"
					color="muted"
					variant="footnote"
				>
					{leave.body}
				</AppText>
				<View className="gap-2">
					<GlassButton className={BUTTON} onPress={onMirror}>
						<AppText
							className="text-[15px]"
							color="background"
							variant="callout"
							weight="semibold"
						>
							{leave.mirror}
						</AppText>
					</GlassButton>
					<PressScale
						className={cn(BUTTON, "bg-surface-secondary")}
						onPress={onJustEnd}
					>
						<AppText
							className="text-[15px]"
							variant="callout"
							weight="semibold"
						>
							{justEnd}
						</AppText>
					</PressScale>
					<PressScale className={BUTTON} onPress={onKeep}>
						<AppText
							className="text-[15px]"
							color="accent"
							variant="callout"
							weight="semibold"
						>
							{leave.keep}
						</AppText>
					</PressScale>
				</View>
			</Animated.View>
		</Animated.View>
	);
}
