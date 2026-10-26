import type { Metadata } from "next";

import { DesignPreview } from "@/features/design-preview/design-preview";
import { ShellPieces } from "@/features/design-preview/shell-pieces";
import {
	PageHeader,
	PageHeaderDescription,
	PageHeaderTitle,
} from "@/features/shell/page-header";

export const metadata: Metadata = { title: "Design system · Xolace Admin" };

export default function DesignPage() {
	return (
		<>
			<PageHeader className="mb-0">
				<PageHeaderTitle>Design system</PageHeaderTitle>
				<PageHeaderDescription>
					Every shared component in the chunky Xolace style. Sample data only.
				</PageHeaderDescription>
			</PageHeader>
			<DesignPreview />
			<ShellPieces />
		</>
	);
}
