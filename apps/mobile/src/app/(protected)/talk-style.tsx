import { TalkStyleSheet } from "@/features/talk/sheets/talk-style-sheet";
import { TalkSheetsData } from "@/features/talk/talk-sheets-data";

export default function TalkStyleRoute() {
	return (
		<TalkSheetsData>
			<TalkStyleSheet />
		</TalkSheetsData>
	);
}
