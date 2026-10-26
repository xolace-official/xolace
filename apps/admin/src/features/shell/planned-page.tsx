import { EmptyState } from "@/features/flux/empty-state";

import {
	PageHeader,
	PageHeaderDescription,
	PageHeaderTitle,
} from "./page-header";

/** Stand-in for an admin v1 screen that isn't built yet (docs/plan/admin-v1.md). */
export function PlannedPage({
	title,
	description,
	replaces,
}: {
	title: string;
	description: string;
	/** What it takes over from today ("scripts/library/ingest.ts"). */
	replaces?: string;
}) {
	return (
		<>
			<PageHeader>
				<PageHeaderTitle>{title}</PageHeaderTitle>
				<PageHeaderDescription>{description}</PageHeaderDescription>
			</PageHeader>
			<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
				<EmptyState
					description={
						replaces ? (
							<>
								This screen replaces <code>{replaces}</code>.
							</>
						) : undefined
					}
					pose="writer"
					title="Not built yet"
				/>
			</div>
		</>
	);
}
