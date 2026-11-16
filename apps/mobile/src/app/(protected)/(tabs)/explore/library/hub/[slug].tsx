import { useLocalSearchParams } from "expo-router";
import { LibraryListScreen } from "@/features/browse/components/library-list-screen";

export default function LibraryHubRoute() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	return <LibraryListScreen by={{ hub: slug }} />;
}
