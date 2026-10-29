import type { Metadata } from "next";

import { SearchIndexScreen } from "@/features/search-index/search-index-screen";

export const metadata: Metadata = { title: "Search index · Xolace Admin" };

export default function SearchIndexPage() {
	return <SearchIndexScreen />;
}
