import type { Metadata } from "next";

import { PlannedPage } from "@/features/shell/planned-page";

export const metadata: Metadata = { title: "Tracks · Xolace Admin" };

export default function AudioTracksPage() {
	return (
		<PlannedPage
			description="Kindling support audio and music: files, tags and licences."
			replaces="scripts/kindling/ingest.ts"
			title="Tracks"
		/>
	);
}
