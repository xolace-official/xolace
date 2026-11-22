import { useLocalSearchParams } from "expo-router";
import { detectCountry } from "@/features/care/help/detect-country";
import { ReaderData } from "@/features/lantern/reader/reader-data";
import { ReaderScreen } from "@/features/lantern/reader/reader-screen";

export default function LanternReaderRoute() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	return (
		<ReaderData showHelpline={detectCountry() !== null} slug={slug}>
			<ReaderScreen />
		</ReaderData>
	);
}
