/** The Lantern reader (#407, #393): one route for every way into an entry, incl.
 * `xolace://library/<slug>`. Full screen, no tab bar. */
import { useLocalSearchParams } from "expo-router";
import { detectCountry } from "@/features/crisis-resources/use-crisis-resources";
import { ReaderData } from "@/features/lantern/reader/reader-data";
import { ReaderScreen } from "@/features/lantern/reader/reader-screen";

export default function LanternReaderRoute() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	// Explainers end on a way to support only where there are crisis resources (#403).
	return (
		<ReaderData showHelpline={detectCountry() !== null} slug={slug}>
			<ReaderScreen />
		</ReaderData>
	);
}
