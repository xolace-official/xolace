import type { Metadata } from "next";

import { PlannedPage } from "@/features/shell/planned-page";

export const metadata: Metadata = { title: "Entries · Xolace Admin" };

export default function LibraryEntriesPage() {
	return (
		<PlannedPage
			description="Explainers, advice and stories: edit, review and publish."
			replaces="scripts/library/ingest.ts"
			title="Entries"
		/>
	);
}
