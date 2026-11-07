// The Talk demo, full screen over the Xolace+ step (#714, README § I): Flux tinted by the
// picked voice, its line and the person's, and the controls for where it stands. Closing it
// (the X, or "Back to the week") returns to the step as it was.
import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { Modal, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/features/intake/v2/flux";
import { DemoControls } from "@/features/intake/v2/plus/talk-demo/demo-controls";
import type { DemoPhase } from "@/features/intake/v2/plus/talk-demo/demo-machine";
import { useTalkDemo } from "@/features/intake/v2/plus/talk-demo/use-talk-demo";
import { SafetyStep } from "@/features/intake/v2/safety-step";
import { TALK_CAST } from "@/features/talk/voice-options";
import type { PaletteName } from "@/features/xolace-face/face-palette";
import type { Mood } from "@/features/xolace-face/pose";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const FLUX_SIZE = 168;
const CLOSE_ICON = { android: "close", ios: "xmark", web: "close" } as const;
const CLOSE_ICON_SIZE = 16;
const MIN_BOTTOM_PADDING = 16;
const FLEX_1 = { flex: 1 };

/** Flux tinted per voice (README § Live Flux): Sage green, Wren warm, Vesper violet, Ash cool. */
const VOICE_PALETTE: Record<VoiceSlug, PaletteName> = {
	ash: "sea",
	sage: "moss",
	vesper: "dusk",
	wren: "ember",
};

export type TalkDemoProps = {
	/** "Keep talking", named for the plan it buys. */
	keepTalkingLabel: string;
	/** The X, "Back to the week", Android's back, or on from crisis support. */
	onClose: () => void;
	onKeepTalking: () => void;
	/**
	 * The safeguard ended the demo: its close then goes past the step, nothing sold (#704).
	 * Can come after the demo closed, while the answer was on its way.
	 */
	onSafety: () => void;
	visible: boolean;
};

export function TalkDemo({ visible, ...props }: TalkDemoProps) {
	return (
		<Modal
			animationType="slide"
			onRequestClose={props.onClose}
			presentationStyle="fullScreen"
			visible={visible}
		>
			{/* Mounted per opening: each one opens the demo on the server afresh. */}
			{visible ? <DemoScreen {...props} /> : null}
		</Modal>
	);
}

function moodOf(phase: DemoPhase, saying: boolean): Mood {
	switch (phase) {
		case "listening":
			return "listening";
		case "thinking":
			return "thinking";
		case "done":
			return "happy";
		default:
			return saying ? "talking" : "idle";
	}
}

function DemoScreen(props: Omit<TalkDemoProps, "visible">) {
	const insets = useSafeAreaInsets();
	const foreground = useTokenColor("foreground");
	const demo = useTalkDemo({ onSafety: props.onSafety });
	const { state } = demo;
	const voice = TALK_CAST.find((o) => o.value === state.voice);
	const replying = state.phase === "reply" || state.phase === "done";
	const fluxLine = replying ? demo.reply : demo.intro;
	const saying =
		(state.phase === "intro" && !demo.intro.done) ||
		(state.phase === "reply" && !demo.reply.done);
	const showsLine = state.phase === "intro" || replying;
	const showsTheirs =
		state.line.length > 0 && (state.phase === "thinking" || replying);

	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_PADDING),
				paddingTop: insets.top,
			}}
		>
			<View className="flex-row items-center justify-between px-5 pt-3">
				<View className="rounded-full bg-accent/15 px-2.5 py-1">
					<AppText className="font-[Poppins-SemiBold] text-[12px] text-accent">
						Talk · demo
					</AppText>
				</View>
				<PressableFeedback
					accessibilityLabel="Close demo"
					accessibilityRole="button"
					className="size-11 items-center justify-center rounded-full border border-border bg-surface"
					onPress={() => {
						playSoftPress();
						props.onClose();
					}}
				>
					<SymbolView
						name={CLOSE_ICON}
						size={CLOSE_ICON_SIZE}
						tintColor={foreground}
					/>
				</PressableFeedback>
			</View>

			{/* Crisis support isn't a mascot's moment: Flux steps out of it, and nothing is sold. */}
			{state.phase === "safety" ? (
				<SafetyStep onContinue={props.onClose} resources={state.resources} />
			) : (
				<KeyboardAvoidingView automaticOffset behavior="padding" style={FLEX_1}>
					<View className="items-center pt-2">
						<Flux
							mood={moodOf(state.phase, saying)}
							palette={VOICE_PALETTE[state.voice]}
							size={FLUX_SIZE}
						/>
						{voice ? (
							<AppText className="mt-1 px-10 text-center text-[13px] text-muted">
								{`${voice.label} · ${voice.description}`}
							</AppText>
						) : null}
					</View>

					<ScrollView
						className="mt-4 flex-1"
						contentContainerClassName="gap-3 px-5 pb-4"
						showsVerticalScrollIndicator={false}
					>
						{showsTheirs ? (
							<View
								className="max-w-[85%] self-end rounded-[18px] rounded-br-[4px] bg-accent/15 px-3.5 py-2.5"
								style={{ borderCurve: "continuous" }}
							>
								<AppText className="text-[15px] text-foreground leading-[21px]">
									{state.line}
								</AppText>
							</View>
						) : null}
						{showsLine ? (
							<AppText
								accessibilityLiveRegion="polite"
								className="font-[Poppins-Medium] text-[19px] text-foreground leading-[27px]"
							>
								{fluxLine.text}
								{saying ? <AppText className="text-ember">▍</AppText> : null}
							</AppText>
						) : null}
					</ScrollView>

					<DemoControls {...props} demo={demo} />
				</KeyboardAvoidingView>
			)}
		</View>
	);
}
