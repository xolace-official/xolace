import type { Metadata } from "next";

import { PlannedPage } from "@/features/shell/planned-page";

export const metadata: Metadata = { title: "Sources · Xolace Admin" };

export default function LibrarySourcesPage() {
	return (
		<PlannedPage
			description="Who we credit, under which licence, and when to refresh."
			replaces="scripts/library/*/sources.json"
			title="Sources"
		/>
	);
}
