// `type`: the same question with room to answer, and "Talk instead" while the mic is on. After
// a take that fell back here, one short line says why (#709).
import { Button, useThemeColor } from "heroui-native";
import { TextInput, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/features/intake/v2/flux";
import {
	ANSWER_MAX_CHARS,
	type ListenFailure,
} from "@/features/intake/v2/machine";
import { playSoftPress } from "@/lib/haptics";

const FLUX_SIZE = 64;

const FAILURE_LINES: Record<ListenFailure, string> = {
	denied: "No mic access, so let's type it instead.",
	nothing_heard: "I didn't catch that. Type it, or talk again.",
	unavailable: "Talking isn't working right now, so let's type it.",
};

type Props = {
	draft: string;
	listenFailed: ListenFailure | null;
	onChange: (text: string) => void;
	onSend: () => void;
	/** Null once the mic is off: no "Talk instead". */
	onTalk: (() => void) | null;
};

export function TypeStep({
	draft,
	listenFailed,
	onChange,
	onSend,
	onTalk,
}: Props) {
	const [placeholderColor] = useThemeColor(["muted"]);
	const empty = draft.trim().length === 0;

	return (
		<View className="flex-1">
			<View className="flex-1 px-6 pt-6">
				<View className="flex-row items-center gap-3">
					<Flux mood="idle" size={FLUX_SIZE} />
					<AppText
						accessibilityRole="header"
						className="flex-1 font-[Poppins-SemiBold] text-[20px] text-foreground leading-[26px]"
					>
						What&apos;s been sitting with you lately?
					</AppText>
				</View>
				{listenFailed ? (
					<AppText
						accessibilityLiveRegion="polite"
						className="mt-4 font-[Poppins-Regular] text-[14px] text-foreground/80 leading-5"
					>
						{FAILURE_LINES[listenFailed]}
					</AppText>
				) : null}
				<AppText className="mt-5 font-[Poppins-Regular] text-[13px] text-muted">
					A sentence is plenty
				</AppText>
				<TextInput
					accessibilityLabel="Your answer"
					autoFocus
					className="mt-2 min-h-[160px] rounded-[18px] border border-border bg-surface-secondary p-4 font-[Poppins-Regular] text-[17px] text-foreground leading-[25px]"
					maxLength={ANSWER_MAX_CHARS}
					multiline
					onChangeText={onChange}
					placeholder="Start anywhere…"
					placeholderTextColor={placeholderColor}
					textAlignVertical="top"
					value={draft}
				/>
			</View>

			<KeyboardStickyView>
				<View className="gap-1 px-6 pb-4">
					<Button
						isDisabled={empty}
						onPress={() => {
							playSoftPress();
							onSend();
						}}
					>
						<Button.Label>Send to Flux</Button.Label>
					</Button>
					{onTalk ? (
						<Button
							onPress={() => {
								playSoftPress();
								onTalk();
							}}
							variant="ghost"
						>
							<Button.Label>Talk instead</Button.Label>
						</Button>
					) : null}
				</View>
			</KeyboardStickyView>
		</View>
	);
}
