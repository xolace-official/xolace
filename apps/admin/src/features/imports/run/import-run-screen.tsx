"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xolace/ui/components/alert";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@xolace/ui/components/breadcrumb";
import { buttonVariants } from "@xolace/ui/components/button";
import { FlaskConicalIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/features/flux/empty-state";
import { formatDate } from "@/features/library/types";
import {
	PageHeader,
	PageHeaderActions,
	PageHeaderBreadcrumbs,
	PageHeaderHeading,
	PageHeaderMeta,
	PageHeaderTitle,
} from "@/features/shell/page-header";

import { useImports } from "../imports-provider";
import { DIFF_ACTIONS, TARGET_LABEL } from "../types";
import { ActionBadge } from "./diff-parts";
import { ImportRunProvider, useImportRun } from "./import-run-provider";
import { ReviewList } from "./review-list";
import { ApplyButton, ApplySummary, DiscardRunButton } from "./run-actions";
import { RunStatus } from "./run-status";

/** `/imports/[id]`: review a run's diff and apply it, then watch it process. */
export function ImportRunScreen({ id }: { id: string }) {
	const {
		state: { runs },
	} = useImports();
	const run = runs.find((r) => r.id === id);

	if (!run) {
		return (
			<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
				<EmptyState
					action={
						<Link
							className={buttonVariants({ variant: "outline" })}
							href="/imports"
						>
							Back to imports
						</Link>
					}
					description={
						<>
							No import has the id <code>{id}</code>.
						</>
					}
					pose="map"
					title="Import not found"
				/>
			</div>
		);
	}

	return (
		<ImportRunProvider run={run}>
			<RunHeader />
			<RunBody />
		</ImportRunProvider>
	);
}

function RunHeader() {
	const {
		state: { run, counts },
	} = useImportRun();
	return (
		<PageHeader>
			<PageHeaderBreadcrumbs>
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink render={<Link href="/imports" />}>
								Imports
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{run.id}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</PageHeaderBreadcrumbs>
			<PageHeaderHeading>
				<PageHeaderTitle>{TARGET_LABEL[run.target]} import</PageHeaderTitle>
				{run.state === "review" ? (
					<PageHeaderActions>
						<DiscardRunButton />
						<ApplyButton />
					</PageHeaderActions>
				) : null}
			</PageHeaderHeading>
			<PageHeaderMeta>
				<span>
					{run.createdBy} · {formatDate(run.createdAt)} · {run.files}
				</span>
				<span className="flex flex-wrap gap-2">
					{DIFF_ACTIONS.filter((action) => counts[action] > 0).map((action) => (
						<span className="flex items-center gap-1.5" key={action}>
							<ActionBadge action={action} />
							<span className="type-body-strong text-ink">
								{counts[action]}
							</span>
						</span>
					))}
				</span>
			</PageHeaderMeta>
		</PageHeader>
	);
}

function RunBody() {
	const {
		state: { run },
	} = useImportRun();
	const {
		meta: { backend },
	} = useImports();

	if (run.state === "discarded") {
		return (
			<div className="lip depth-md rounded-xl border-2 border-line bg-surface">
				<EmptyState
					description="This import was discarded before it was applied. Nothing was written."
					pose="curious"
					title="Discarded"
				/>
			</div>
		);
	}

	if (run.state !== "review") {
		return <RunStatus />;
	}

	return (
		<div className="flex flex-col gap-6">
			{backend === "fixtures" ? (
				<Alert variant="lavender">
					<FlaskConicalIcon />
					<AlertTitle>Sample diff</AlertTitle>
					<AlertDescription>
						The compare isn't wired to Convex yet, so every import shows this
						sample of the library tree.
					</AlertDescription>
				</Alert>
			) : null}
			<ApplySummary />
			<ReviewList />
		</div>
	);
}
