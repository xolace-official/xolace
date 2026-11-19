import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LETTERS } from "../copy";
import { LetterLine } from "../letter-sheet";
import { type SentLetter, sentShown } from "../letters-model";
import { ReceivedMark } from "../received-mark";

const WITHDRAW = "withdraw";
const HIT = 10;

/**
 * One sent letter: its opening line, its status and the received mark. Nothing about the
 * recipient. The mark lights (800 ms along the ignite curve) the first time the sender sees a new
 * status: the first time this screen is in front with `seen` false. Then it's marked seen and
 * stays lit.
 */
export function SentRow({
	letter,
	onSeen,
	onWithdraw,
}: {
	letter: SentLetter;
	onSeen: (id: string) => void;
	onWithdraw: (id: string) => void;
}) {
	const focused = useIsFocused();
	const fresh = !letter.seen;
	// The key remounts the mark when it lights.
	const shown = sentShown(letter, focused);
	useEffect(() => {
		if (focused && fresh) {
			onSeen(letter.id);
		}
	}, [focused, fresh, letter.id, onSeen]);

	const status = LETTERS.status[letter.status];
	const waiting = letter.status === "waiting";
	return (
		<View
			accessibilityActions={
				waiting
					? [{ label: LETTERS.withdraw.action, name: WITHDRAW }]
					: undefined
			}
			accessibilityLabel={`${letter.line}, ${status}`}
			accessible
			className="mx-4 flex-row items-center gap-2.5 border-separator border-b px-4 py-3"
			onAccessibilityAction={(e) => {
				if (e.nativeEvent.actionName === WITHDRAW) {
					onWithdraw(letter.id);
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
			{waiting ? (
				<PressScale
					accessibilityLabel={LETTERS.withdraw.action}
					accessibilityRole="button"
					hitSlop={HIT}
					onPress={() => onWithdraw(letter.id)}
				>
					<AppText color="dangerInk" variant="detail" weight="semibold">
						{LETTERS.withdraw.action}
					</AppText>
				</PressScale>
			) : null}
			<ReceivedMark ignite={fresh} key={shown} status={shown} />
		</View>
	);
}
