// `ask`: Flux asks the one question while it types out, then the ways to answer: a quick
// reply, typing, talking (the mic, #709), or Skip.
import { SymbolView } from "expo-symbols";
import { Button, PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/features/intake/v2/flux";
import { useTypedLine } from "@/features/intake/v2/use-typed-line";
import { playSoftPress } from "@/lib/haptics";

const ASK_LINE =
	"Hey, I'm Flux. Before anything else… what's been sitting with you lately?";

const QUICK_REPLIES = [
	"Work's been a lot",
	"I can't name it",
	"I feel really alone lately",
] as const;

const FLUX_SIZE = 190;
const MIC_ICON = { android: "mic", ios: "mic.fill", web: "mic" } as const;
const MIC_ICON_SIZE = 22;

type Props = {
	onQuickReply: (text: string) => void;
	onSkip: () => void;
	onTalk: () => void;
	onType: () => void;
};

export function AskStep({ onQuickReply, onSkip, onTalk, onType }: Props) {
	const typed = useTypedLine(ASK_LINE);
	const [micTint] = useThemeColor(["accent-foreground"]);

	return (
		<View className="flex-1 items-center px-5 pt-4">
			<Flux mood={typed.done ? "idle" : "talking"} size={FLUX_SIZE} />
			<View className="mt-3.5 self-stretch rounded-3xl border border-border bg-surface px-5 py-4">
				{/* Tail up at Flux. */}
				<View className="absolute -top-2 left-1/2 -ml-2 size-4 rotate-45 border-border border-t border-l bg-surface" />
				{/* The whole line for screen readers; the typing is for sighted users. */}
				<AppText
					accessibilityLabel={ASK_LINE}
					className="min-h-[84px] font-[Poppins-Medium] text-[21px] text-foreground leading-[29px]"
				>
					{typed.text}
					{typed.done ? null : <AppText className="text-ember">▍</AppText>}
				</AppText>
			</View>

			<View className="flex-1" />

			{typed.done ? (
				<Animated.View
					className="gap-3 self-stretch"
					entering={FadeInDown.duration(400)}
				>
					<View className="flex-row flex-wrap justify-center gap-2">
						{QUICK_REPLIES.map((reply) => (
							<Button
								key={reply}
								onPress={() => {
									playSoftPress();
									onQuickReply(reply);
								}}
								size="sm"
								variant="outline"
							>
								<Button.Label>{reply}</Button.Label>
							</Button>
						))}
					</View>
					<View className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface-secondary p-1.5">
						{/* Looks like the field it opens, not a button. */}
						<PressableFeedback
							accessibilityRole="button"
							className="min-h-12 flex-1 justify-center px-3.5"
							onPress={onType}
						>
							<AppText className="font-[Poppins-Regular] text-[16px] text-muted">
								Tell Flux anything…
							</AppText>
						</PressableFeedback>
						{/* The mic permission is asked only after this tap. */}
						<PressableFeedback
							accessibilityLabel="Talk instead of typing"
							accessibilityRole="button"
							className="size-12 items-center justify-center rounded-full bg-accent"
							onPress={() => {
								playSoftPress();
								onTalk();
							}}
						>
							<SymbolView
								name={MIC_ICON}
								size={MIC_ICON_SIZE}
								tintColor={micTint}
							/>
						</PressableFeedback>
					</View>
					<View className="flex-row items-center justify-between gap-3">
						{/* True of the speech recognizer used: no recording is kept, only the words reach Xolace (#709). */}
						<AppText className="flex-1 font-[Poppins-Regular] text-[12px] text-muted">
							Talk or type. Flux keeps the words, never the audio.
						</AppText>
						<Button onPress={onSkip} size="sm" variant="ghost">
							<Button.Label>Skip</Button.Label>
						</Button>
					</View>
				</Animated.View>
			) : null}
		</View>
	);
}
