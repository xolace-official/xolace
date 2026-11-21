import { useLocalSearchParams } from "expo-router";
import { TranscriptSheet } from "@/features/lantern/reader/sheets/page-sheets";
import { TranscriptData } from "@/features/lantern/reader/sheets/sheets-data";

export default function ReaderTranscriptRoute() {
	const { entryId } = useLocalSearchParams<{ entryId: string }>();
	return (
		<TranscriptData entryId={entryId}>
			<TranscriptSheet />
		</TranscriptData>
	);
}
