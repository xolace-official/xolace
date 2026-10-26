import type { Metadata } from "next";

import { DesignPreview } from "@/features/design-preview/design-preview";
import { AdminShell } from "@/features/shell/admin-shell";

export const metadata: Metadata = { title: "Design system · Xolace Admin" };

export default function DesignPage() {
	return (
		<AdminShell current="design">
			<h1 className="type-h1 text-ink">Design system</h1>
			<p className="type-body-lg mt-2 max-w-2xl text-ink-muted">
				Every shared component in the chunky Xolace style. Sample data only.
			</p>
			<DesignPreview />
		</AdminShell>
	);
}
