import type { Metadata } from "next";

import { PlannedPage } from "@/features/shell/planned-page";

export const metadata: Metadata = { title: "Topics · Xolace Admin" };

export default function AudioTopicsPage() {
	return (
		<PlannedPage
			description="Topic titles and cover art."
			replaces="scripts/kindling/*/topics.json"
			title="Topics"
		/>
	);
}
