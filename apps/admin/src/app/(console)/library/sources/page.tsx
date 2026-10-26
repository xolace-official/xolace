import type { Metadata } from "next";

import { SourcesScreen } from "@/features/library/sources/sources-screen";

export const metadata: Metadata = { title: "Sources · Xolace Admin" };

export default function LibrarySourcesPage() {
	return <SourcesScreen />;
}
