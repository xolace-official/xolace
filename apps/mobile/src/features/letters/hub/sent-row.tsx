import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LETTERS } from "../copy";
import { LetterLine } from "../letter-sheet";
import { type SentLetter, sentDismissable, sentShown } from "../letters-model";
import { ReceivedMark } from "../received-mark";

const WITHDRAW = "withdraw";
const DISMISS = "dismiss";
const HIT = 10;

export function SentRow({
	letter,
	onSeen,
	onWithdraw,
	onDismiss,
}: {
	letter: SentLetter;
	onSeen: (id: string) => void;
	onWithdraw: (id: string) => void;
	onDismiss: (id: string) => void;
}) {
	const focused = useIsFocused();
	const fresh = !letter.seen;
	const shown = sentShown(letter, focused);
	useEffect(() => {
		if (focused && fresh) {
			onSeen(letter.id);
		}
	}, [focused, fresh, letter.id, onSeen]);

	const status = LETTERS.status[letter.status] ?? LETTERS.status.waiting;
	const waiting = letter.status === "waiting";
	const act = waiting
		? { label: LETTERS.withdraw.action, name: WITHDRAW, run: onWithdraw }
		: sentDismissable(letter.status)
			? { label: LETTERS.dismiss, name: DISMISS, run: onDismiss }
			: null;
	return (
		<View
			accessibilityActions={
				act ? [{ label: act.label, name: act.name }] : undefined
			}
			accessibilityLabel={`${letter.line}, ${status}`}
			accessible
			className="mx-4 flex-row items-center gap-2.5 border-separator border-b px-4 py-3"
			onAccessibilityAction={(e) => {
				if (act && e.nativeEvent.actionName === act.name) {
					act.run(letter.id);
				}
			}}
		>
			<View className="flex-1 gap-0.5">
				<LetterLine
					className="text-foreground"
					numberOfLines={1}
					size="row"
					text={letter.line}
				/>
				<AppText color="muted" variant="footnote">
					{status}
				</AppText>
			</View>
			{act ? (
				<PressScale
					accessibilityLabel={act.label}
					accessibilityRole="button"
					hitSlop={HIT}
					onPress={() => act.run(letter.id)}
				>
					<AppText
						color={waiting ? "dangerInk" : "muted"}
						variant="detail"
						weight="semibold"
					>
						{act.label}
					</AppText>
				</PressScale>
			) : null}
			<ReceivedMark ignite={fresh} key={shown} status={shown} />
		</View>
	);
}
