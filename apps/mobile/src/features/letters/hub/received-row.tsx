import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LetterLine } from "../letter-sheet";
import {
	openingLine,
	type ReceivedLetter,
	receivedRowSub,
} from "../letters-model";
import { openLetter } from "../letters-routes";
import { ReceivedMark } from "../received-mark";

/**
 * Hidden rows' opening line is dimmed (board `.hrow .ln`). On a wrapper: LetterLine's own
 * opacity holds the line unseen until its face loads.
 */
const HIDDEN_LINE_OPACITY = 0.6;

/**
 * A letter you've opened, to reread: its opening line and whether you acknowledged it. Hidden
 * letters keep their line, dimmed, and say Hidden; they open in the same reader, with Unhide.
 */
export function ReceivedRow({ letter }: { letter: ReceivedLetter }) {
	const sub = receivedRowSub(letter);
	const line = openingLine(letter.text);
	return (
		<PressScale
			accessibilityLabel={`${line}, ${sub}`}
			accessibilityRole="button"
			card
			className="mx-4 flex-row items-center gap-2.5 border-separator border-b px-4 py-3"
			onPress={() => openLetter(letter.id)}
		>
			<View className="flex-1 gap-0.5">
				<View style={letter.hidden ? { opacity: HIDDEN_LINE_OPACITY } : null}>
					<LetterLine
						className="text-foreground"
						numberOfLines={1}
						size="row"
						text={line}
					/>
				</View>
				<AppText color="muted" variant="footnote">
					{sub}
				</AppText>
			</View>
			{letter.hidden ? null : (
				<ReceivedMark
					status={letter.acknowledged ? "acknowledged" : "received"}
				/>
			)}
		</PressScale>
	);
}
