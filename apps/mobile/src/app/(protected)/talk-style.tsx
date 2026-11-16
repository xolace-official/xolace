// How the companion talks: pace and directness, a sheet over Talk's start screen.
import { TalkStyleSheet } from "@/features/talk/sheets/talk-style-sheet";
import { TalkSheetsData } from "@/features/talk/talk-sheets-data";

export default function TalkStyleRoute() {
	return (
		<TalkSheetsData>
			<TalkStyleSheet />
		</TalkSheetsData>
	);
}
