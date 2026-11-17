import { useLocalSearchParams } from "expo-router";
import { SourcesSheet } from "@/features/lantern/reader/sheets/page-sheets";
import { SourcesData } from "@/features/lantern/reader/sheets/sheets-data";

/** View sources, over the reader: `?slug=` names the read. */
export default function ReaderSourcesRoute() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	return (
		<SourcesData slug={slug}>
			<SourcesSheet />
		</SourcesData>
	);
}
