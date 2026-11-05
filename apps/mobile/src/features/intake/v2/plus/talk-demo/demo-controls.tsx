// The bottom of the Talk demo, by where it stands (#714): voices and "Try me" first, then the
// mic (or a field, with the mic off), then the way on.
import { SymbolView } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import { TextInput, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { DemoListen } from "@/features/intake/v2/plus/talk-demo/demo-listen";
import { LINE_MAX_CHARS } from "@/features/intake/v2/plus/talk-demo/demo-machine";
import type { useTalkDemo } from "@/features/intake/v2/plus/talk-demo/use-talk-demo";
import { TalkChips } from "@/features/talk/talk-chips";
import { TALK_CAST } from "@/features/talk/voice-options";
import { playSoftPress } from "@/lib/haptics";

const MIC_ICON = { android: "mic", ios: "mic.fill", web: "mic" } as const;
const PLAY_ICON = {
	android: "play_arrow",
	ios: "play.fill",
	web: "play_arrow",
} as const;
const STOP_ICON = { android: "stop", ios: "stop.fill", web: "stop" } as const;
const MIC_ICON_SIZE = 18;
const CHIP_ICON_SIZE = 11;

type Props = {
	demo: ReturnType<typeof useTalkDemo>;
	keepTalkingLabel: string;
	onClose: () => void;
	onKeepTalking: () => void;
};

export function DemoControls({ demo, ...props }: Props) {
	const { dispatch, state } = demo;
	switch (state.phase) {
		case "intro":
			return <Intro demo={demo} />;
		case "listening":
			return (
				<DemoListen
					onDone={(transcript) => dispatch({ transcript, type: "HEARD" })}
					onUnavailable={() => dispatch({ type: "MIC_FAILED" })}
				/>
			);
		case "typing":
			return <Typing demo={demo} />;
		case "thinking":
			return <Note>Flux is thinking…</Note>;
		case "done":
			return <WayOn {...props} />;
		case "used":
			return (
				<WayOn {...props}>
					<Note>
						You&apos;ve had your try. The rest of the talk is in Plus.
					</Note>
				</WayOn>
			);
		case "expired":
			return (
				<WayOn {...props} onKeepTalking={null}>
					<Note>
						That sat a while, so the demo closed. Open it again to try.
					</Note>
				</WayOn>
			);
		case "failed":
			return (
				<WayOn {...props} onKeepTalking={null}>
					<Note>Flux couldn&apos;t answer just now.</Note>
				</WayOn>
			);
		default:
			return null;
	}
}

function Note({ children }: { children: string }) {
	return (
		<AppText
			accessibilityLiveRegion="polite"
			className="px-5 pb-3 text-center text-[14px] text-muted"
		>
			{children}
		</AppText>
	);
}

function Intro({ demo }: Pick<Props, "demo">) {
	const [accent, muted, onAccent] = useThemeColor([
		"accent",
		"muted",
		"accent-foreground",
	]);
	return (
		<View className="gap-3 px-5 pt-2">
			<TalkChips
				onPress={(slug) => {
					playSoftPress();
					demo.pickVoice(slug);
				}}
				options={TALK_CAST.map((o) => ({
					accessory: (
						<SymbolView
							name={demo.playingVoice === o.value ? STOP_ICON : PLAY_ICON}
							size={CHIP_ICON_SIZE}
							tintColor={o.value === demo.state.voice ? accent : muted}
						/>
					),
					hint:
						demo.playingVoice === o.value
							? "Stops the preview"
							: "Picks this voice and plays a preview",
					label: o.label,
					value: o.value,
				}))}
				value={demo.state.voice}
			/>
			<Button
				onPress={() => {
					playSoftPress();
					demo.stopPreview();
					demo.dispatch({ type: "TRY" });
				}}
			>
				<SymbolView name={MIC_ICON} size={MIC_ICON_SIZE} tintColor={onAccent} />
				<Button.Label>Try me: say anything</Button.Label>
			</Button>
		</View>
	);
}

function Typing({ demo }: Pick<Props, "demo">) {
	const [placeholderColor] = useThemeColor(["muted"]);
	const { dispatch, state } = demo;
	return (
		<View className="gap-2 px-5 pt-2 pb-4">
			<AppText className="text-[13px] text-muted">
				The mic&apos;s off, so type it instead.
			</AppText>
			<TextInput
				accessibilityLabel="Say anything to Flux"
				autoFocus
				className="max-h-32 min-h-20 rounded-2xl border border-border bg-surface px-4 py-3 font-[Poppins-Regular] text-[16px] text-foreground"
				maxLength={LINE_MAX_CHARS}
				multiline
				onChangeText={(text) => dispatch({ text, type: "DRAFT" })}
				placeholder="Say anything…"
				placeholderTextColor={placeholderColor}
				value={state.draft}
			/>
			<Button
				isDisabled={state.draft.trim().length === 0}
				onPress={() => {
					playSoftPress();
					dispatch({ type: "SEND" });
				}}
			>
				<Button.Label>Send to Flux</Button.Label>
			</Button>
		</View>
	);
}

function WayOn({
	children,
	keepTalkingLabel,
	onClose,
	onKeepTalking,
}: Omit<Props, "demo" | "onKeepTalking"> & {
	children?: React.ReactNode;
	/** Null when nothing is on offer from here. */
	onKeepTalking: (() => void) | null;
}) {
	return (
		<View className="gap-1.5 px-5 pt-2">
			{children}
			{onKeepTalking ? (
				<Button className="bg-ember" onPress={onKeepTalking}>
					<Button.Label className="text-offer-ink">
						{keepTalkingLabel}
					</Button.Label>
				</Button>
			) : null}
			<Button className="self-center" onPress={onClose} variant="ghost">
				<Button.Label>Back to the week</Button.Label>
			</Button>
		</View>
	);
}
