import { SearchSectionData } from "@/features/explore/search/search-data";
import { SearchSectionScreen } from "@/features/explore/search/search-section-screen";

export default function SearchSectionRoute() {
	return (
		<SearchSectionData>
			<SearchSectionScreen />
		</SearchSectionData>
	);
}
