import type { Metadata } from "next";

import { PlannedPage } from "@/features/shell/planned-page";

export const metadata: Metadata = { title: "Imports · Xolace Admin" };

export default function ImportsPage() {
	return (
		<PlannedPage
			description="Upload a manifest, review what changes, apply it, and watch each item go live."
			replaces="the kindling and library ingest scripts' bulk runs"
			title="Imports"
		/>
	);
}
