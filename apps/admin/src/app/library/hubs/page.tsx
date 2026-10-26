import type { Metadata } from "next";

import { PlannedPage } from "@/features/shell/planned-page";

export const metadata: Metadata = { title: "Hubs · Xolace Admin" };

export default function LibraryHubsPage() {
	return (
		<PlannedPage
			description="Curated runs of entries and audio, in reading order."
			replaces="scripts/library/*/hubs.json"
			title="Hubs"
		/>
	);
}
