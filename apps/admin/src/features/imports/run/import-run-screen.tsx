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
import { Spinner } from "@xolace/ui/components/spinner";
import { UploadIcon } from "lucide-react";
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

import { useImportRunQuery } from "../imports-provider";
import { DIFF_ACTIONS, runLabel, TARGET_LABEL } from "../types";
import { ActionBadge } from "./diff-parts";
import { ImportRunProvider, useImportRun } from "./import-run-provider";
import { ReviewList } from "./review-list";
import { ApplyButton, ApplySummary, DiscardRunButton } from "./run-actions";
import { RunStatus } from "./run-status";

/** `/imports/[id]`: review a run's diff and apply it, then watch it process. */
export function ImportRunScreen({ id }: { id: string }) {
	const run = useImportRunQuery(Number(id));

	if (run === undefined) {
		return (
			<div
				aria-live="polite"
				className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground"
			>
				<Spinner />
				Loading import…
			</div>
		);
	}

	if (run === null) {
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
					description={<>There's no import #{id}.</>}
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
							<BreadcrumbPage>{runLabel(run)}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</PageHeaderBreadcrumbs>
			<PageHeaderHeading>
				<PageHeaderTitle>{TARGET_LABEL[run.target]} import</PageHeaderTitle>
				{run.state === "review" || run.state === "uploading" ? (
					<PageHeaderActions>
						<DiscardRunButton />
						{run.state === "review" ? <ApplyButton /> : null}
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

	if (run.state === "uploading") {
		return (
			<Alert variant="ember">
				<UploadIcon />
				<AlertTitle>Waiting for its files</AlertTitle>
				<AlertDescription>
					The browser that started this import is still uploading them, and it
					opens for review when they're all in. If that tab was closed, discard
					this import and start again.
				</AlertDescription>
			</Alert>
		);
	}

	if (run.state !== "review") {
		return <RunStatus />;
	}

	return (
		<div className="flex flex-col gap-6">
			<ApplySummary />
			<ReviewList />
		</div>
	);
}
