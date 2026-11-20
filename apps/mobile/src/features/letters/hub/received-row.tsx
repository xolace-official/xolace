import { letterOpeningLine } from "@xolace/backend/shared";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LetterLine } from "../letter-sheet";
import { type ReceivedLetter, receivedRowSub } from "../letters-model";
import { openLetter } from "../letters-routes";
import { ReceivedMark } from "../received-mark";

const HIDDEN_LINE_OPACITY = 0.6;

export function ReceivedRow({ letter }: { letter: ReceivedLetter }) {
	const sub = receivedRowSub(letter);
	const line = letterOpeningLine(letter.text);
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
